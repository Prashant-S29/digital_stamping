from flask import Blueprint, jsonify, g
from api.middleware import require_auth
from database.db import SessionLocal
from database.models import Message, Stamp, MessageSpread, User
from stamping.verify_stamp import verify_stamp_signature, verify_message_integrity
from blockchain.validator import validate_chain
import base64
from stamping.aes_encryption import decrypt, decrypt_aes_key_with_rsa

verify_bp = Blueprint("verify", __name__)


def _get_blockchain():
    from flask import current_app
    return current_app.config["BLOCKCHAIN"]


# ---------------------------------------------------------------------------
# Verify a message stamp
# ---------------------------------------------------------------------------

@verify_bp.route("/<message_id>", methods=["GET"])
@require_auth
def verify_message(message_id):
    db = SessionLocal()
    try:
        message = db.query(Message).filter(Message.id == message_id).first()
        if not message:
            return jsonify({"error": "Message not found"}), 404

        is_sender = str(message.sender_id) == str(g.user_id)
        is_recipient = str(message.recipient_id) == str(g.user_id)
        if not is_sender and not is_recipient:
            return jsonify({"error": "Forbidden"}), 403

        stamp = message.stamp
        if not stamp:
            return jsonify({"error": "No stamp found for this message"}), 404

        sender = db.query(User).filter(User.id == stamp.sender_id).first()

        # ------------------------------------------------------------------
        # Check 1 — Message hash integrity
        # We can't decrypt without the private key here, so we verify the
        # stored hash is present and matches what's on the blockchain block
        # ------------------------------------------------------------------
        bc = _get_blockchain()
        block = bc.get_block_by_index(stamp.block_index)
        block_valid = False
        chain_hash_match = False
        original_timestamp = stamp.timestamp.isoformat()

        if block:
            block_valid = block.hash == block.compute_hash()
            for txn in block.transactions:
                if txn.get("stamp_id") == str(stamp.id):
                    original_timestamp = txn.get("timestamp")
                    chain_hash_match = txn.get(
                        "message_hash") == message.message_hash
                    break

        # ------------------------------------------------------------------
        # Check 2 — RSA signature on stamp
        # ------------------------------------------------------------------
        # Get the original timestamp from the block transaction (exactly as it was signed)
        original_timestamp = stamp.timestamp.isoformat()
        if block:
            for txn in block.transactions:
                if txn.get("stamp_id") == str(stamp.id):
                    original_timestamp = txn.get("timestamp")
                    chain_hash_match = txn.get(
                        "message_hash") == message.message_hash
                    break

        stamp_dict = {
            "stamp_id":      str(stamp.id),
            "message_id":    str(stamp.message_id),
            "sender_id":     str(stamp.sender_id),
            "message_hash":  message.message_hash,
            # ← use blockchain version, not DB version
            "timestamp":     original_timestamp,
            "origin_ip":     stamp.origin_ip,
            "origin_device": stamp.origin_device,
        }
        sig_valid = verify_stamp_signature(
            {**stamp_dict, "rsa_signature": stamp.rsa_signature},
            sender.public_key,
        )

        # ------------------------------------------------------------------
        # Check 3 — Full chain integrity
        # ------------------------------------------------------------------
        chain_report = validate_chain(bc)
        chain_valid = chain_report["is_valid"]

        # ------------------------------------------------------------------
        # Overall verdict
        # ------------------------------------------------------------------
        all_valid = sig_valid and block_valid and chain_hash_match and chain_valid
        verdict = "VERIFIED" if all_valid else "TAMPERED"

        return jsonify({
            "verdict": verdict,
            "checks": {
                "signature_valid":   sig_valid,
                "block_valid":       block_valid,
                "chain_hash_match":  chain_hash_match,
                "chain_valid":       chain_valid,
            },
            "stamp": {
                "stamp_id":      str(stamp.id),
                "sender_id":     str(stamp.sender_id),
                "sender_email":  sender.email,
                "origin_ip":     stamp.origin_ip,
                "origin_device": stamp.origin_device,
                "timestamp":     stamp.timestamp.isoformat(),
                "block_index":   stamp.block_index,
            },
            "message_id":  str(message.id),
            "message_hash": message.message_hash,
        }), 200

    finally:
        db.close()


# ---------------------------------------------------------------------------
# Spread — full message journey
# ---------------------------------------------------------------------------

@verify_bp.route("/spread/<message_id>", methods=["GET"])
@require_auth
def get_spread(message_id):
    db = SessionLocal()
    try:
        message = db.query(Message).filter(Message.id == message_id).first()
        if not message:
            return jsonify({"error": "Message not found"}), 404

        is_sender = str(message.sender_id) == str(g.user_id)
        is_recipient = str(message.recipient_id) == str(g.user_id)
        if not is_sender and not is_recipient:
            return jsonify({"error": "Forbidden"}), 403

        # Original sender as hop 0
        sender = db.query(User).filter(User.id == message.sender_id).first()
        hops = [
            {
                "hop":         0,
                "action":      "SEND",
                "from_user":   None,
                "to_user":     sender.email,
                "timestamp":   message.created_at.isoformat(),
                "block_index": message.stamp.block_index if message.stamp else None,
            }
        ]

        # Subsequent forwards
        spreads = (
            db.query(MessageSpread)
            .filter(MessageSpread.message_id == message_id)
            .order_by(MessageSpread.hop_number)
            .all()
        )

        for s in spreads:
            fwd_by = db.query(User).filter(User.id == s.forwarded_by).first()
            fwd_to = db.query(User).filter(User.id == s.forwarded_to).first()
            hops.append({
                "hop":         s.hop_number,
                "action":      "FORWARD",
                "from_user":   fwd_by.email if fwd_by else None,
                "to_user":     fwd_to.email if fwd_to else None,
                "timestamp":   s.forwarded_at.isoformat(),
                "block_index": s.block_index,
            })

        return jsonify({
            "message_id":  str(message.id),
            "total_hops":  len(spreads),
            "origin":      sender.email,
            "spread":      hops,
        }), 200

    finally:
        db.close()
