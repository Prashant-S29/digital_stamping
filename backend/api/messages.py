import uuid
from flask import Blueprint, request, jsonify, g, current_app

from api.middleware import require_auth
from database.db import SessionLocal
from database.models import User, Message, Stamp, MessageSpread
from database.blockchain_store import save_block
from stamping.hasher import hash_message
from stamping.aes_encryption import (
    generate_aes_key, encrypt, decrypt,
    encrypt_aes_key_with_rsa, decrypt_aes_key_with_rsa,
)
from stamping.stamp import create_stamp, stamp_to_transaction, get_request_metadata
import base64

messages_bp = Blueprint("messages", __name__)


def _mine_stamp(stamp: dict, action: str = "SEND") -> int:
    """Add stamp as transaction, mine it, persist block. Returns block index."""
    bc = current_app.config["BLOCKCHAIN"]
    txn = stamp_to_transaction(stamp, action=action)
    bc.add_transaction(txn)
    block = bc.mine_pending_transactions()
    save_block(block)
    return block.index


# ---------------------------------------------------------------------------
# Send
# ---------------------------------------------------------------------------

@messages_bp.route("/send", methods=["POST"])
@require_auth
def send_message():
    data = request.get_json(silent=True) or {}
    recipient_email = (data.get("recipient") or "").strip().lower()
    body = (data.get("body") or "").strip()
    private_key_pem = (data.get("private_key") or "").strip()

    if not recipient_email or not body:
        return jsonify({"error": "recipient and body are required"}), 400

    if not private_key_pem:
        return jsonify({"error": "private_key is required to sign the stamp"}), 400

    db = SessionLocal()
    try:
        sender = db.query(User).filter(User.id == g.user_id).first()
        recipient = db.query(User).filter(
            User.email == recipient_email).first()

        if not recipient:
            return jsonify({"error": f"User '{recipient_email}' not found"}), 404

        if str(sender.id) == str(recipient.id):
            return jsonify({"error": "Cannot send a message to yourself"}), 400

        # 1. Hash raw body
        msg_hash = hash_message(body)

        # 2. AES-256 encrypt body
        aes_key, iv = generate_aes_key()
        encrypted_body = encrypt(body, aes_key, iv)

        # 3. Wrap AES key with recipient's RSA public key
        encrypted_aes_key = encrypt_aes_key_with_rsa(
            aes_key, recipient.public_key)
        iv_b64 = base64.b64encode(iv).decode("utf-8")

        # 4. Create message record (get ID first)
        message_id = str(uuid.uuid4())

        # 5. Create digital stamp
        ip, device = get_request_metadata()
        stamp = create_stamp(
            message_id=message_id,
            sender_id=str(sender.id),
            message_hash=msg_hash,
            private_key_pem=private_key_pem,
            origin_ip=ip,
            origin_device=device,
        )

        # 6. Mine stamp onto blockchain
        block_index = _mine_stamp(stamp, action="SEND")

        # 7. Save stamp to DB
        stamp_record = Stamp(
            id=uuid.UUID(stamp["stamp_id"]),
            message_id=uuid.UUID(message_id),
            sender_id=sender.id,
            origin_ip=stamp["origin_ip"],
            origin_device=stamp["origin_device"],
            rsa_signature=stamp["rsa_signature"],
            block_index=block_index,
            is_verified=True,
        )
        db.add(stamp_record)

        # 8. Save message to DB
        message = Message(
            id=uuid.UUID(message_id),
            sender_id=sender.id,
            recipient_id=recipient.id,
            encrypted_body=encrypted_body,
            encrypted_aes_key=encrypted_aes_key,
            iv=iv_b64,
            message_hash=msg_hash,
        )
        db.add(message)
        db.commit()

        return jsonify({
            "message_id":  message_id,
            "stamp_id":    stamp["stamp_id"],
            "block_index": block_index,
            "timestamp":   stamp["timestamp"],
            "message":     "Message sent and stamped on blockchain",
        }), 201

    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Inbox / Sent
# ---------------------------------------------------------------------------

@messages_bp.route("/inbox", methods=["GET"])
@require_auth
def inbox():
    db = SessionLocal()
    try:
        messages = (
            db.query(Message)
            .filter(Message.recipient_id == g.user_id)
            .order_by(Message.created_at.desc())
            .all()
        )
        return jsonify([_message_summary(m) for m in messages]), 200
    finally:
        db.close()


@messages_bp.route("/sent", methods=["GET"])
@require_auth
def sent():
    db = SessionLocal()
    try:
        messages = (
            db.query(Message)
            .filter(Message.sender_id == g.user_id)
            .order_by(Message.created_at.desc())
            .all()
        )
        return jsonify([_message_summary(m) for m in messages]), 200
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Single message — decrypts body for recipient
# ---------------------------------------------------------------------------

@messages_bp.route("/<message_id>", methods=["GET"])
@require_auth
def get_message(message_id):
    private_key_pem = (request.headers.get("X-Private-Key") or "").strip()

    db = SessionLocal()
    try:
        message = db.query(Message).filter(Message.id == message_id).first()
        if not message:
            return jsonify({"error": "Message not found"}), 404

        is_sender = str(message.sender_id) == str(g.user_id)
        is_recipient = str(message.recipient_id) == str(g.user_id)

        if not is_sender and not is_recipient:
            return jsonify({"error": "Forbidden"}), 403

        # Decrypt body only for recipient (needs their private key)
        decrypted_body = None
        if is_recipient and private_key_pem:
            try:
                iv = base64.b64decode(message.iv)
                aes_key = decrypt_aes_key_with_rsa(
                    message.encrypted_aes_key, private_key_pem)
                decrypted_body = decrypt(message.encrypted_body, aes_key, iv)
            except Exception:
                decrypted_body = None

        stamp = message.stamp
        return jsonify({
            "id":             str(message.id),
            "sender_id":      str(message.sender_id),
            "recipient_id":   str(message.recipient_id),
            "message_hash":   message.message_hash,
            "created_at":     message.created_at.isoformat(),
            "decrypted_body": decrypted_body,
            "stamp": _stamp_summary(stamp) if stamp else None,
        }), 200
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Forward
# ---------------------------------------------------------------------------

@messages_bp.route("/forward/<message_id>", methods=["POST"])
@require_auth
def forward_message(message_id):
    data = request.get_json(silent=True) or {}
    recipient_email = (data.get("recipient") or "").strip().lower()
    private_key_pem = (data.get("private_key") or "").strip()

    if not recipient_email or not private_key_pem:
        return jsonify({"error": "recipient and private_key are required"}), 400

    db = SessionLocal()
    try:
        original = db.query(Message).filter(Message.id == message_id).first()
        if not original:
            return jsonify({"error": "Message not found"}), 404

        forwarder = db.query(User).filter(User.id == g.user_id).first()
        recipient = db.query(User).filter(
            User.email == recipient_email).first()

        if not recipient:
            return jsonify({"error": f"User '{recipient_email}' not found"}), 404

        # Determine hop number
        last_hop = (
            db.query(MessageSpread)
            .filter(MessageSpread.message_id == message_id)
            .order_by(MessageSpread.hop_number.desc())
            .first()
        )
        hop_number = (last_hop.hop_number + 1) if last_hop else 1

        # New stamp for this forward action
        ip, device = get_request_metadata()
        stamp = create_stamp(
            message_id=message_id,
            sender_id=str(forwarder.id),
            message_hash=original.message_hash,
            private_key_pem=private_key_pem,
            origin_ip=ip,
            origin_device=device,
        )

        # Mine onto blockchain
        block_index = _mine_stamp(stamp, action="FORWARD")

        # Log spread
        spread = MessageSpread(
            message_id=uuid.UUID(message_id),
            forwarded_by=forwarder.id,
            forwarded_to=recipient.id,
            hop_number=hop_number,
            block_index=block_index,
        )
        db.add(spread)
        db.commit()

        return jsonify({
            "message":     "Message forwarded and recorded on blockchain",
            "message_id":  message_id,
            "stamp_id":    stamp["stamp_id"],
            "block_index": block_index,
            "hop_number":  hop_number,
            "forwarded_to": recipient_email,
        }), 200

    except Exception as e:
        db.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _message_summary(m: Message) -> dict:
    return {
        "id":           str(m.id),
        "sender_id":    str(m.sender_id),
        "recipient_id": str(m.recipient_id),
        "message_hash": m.message_hash,
        "created_at":   m.created_at.isoformat(),
        "has_stamp":    m.stamp is not None,
        "block_index":  m.stamp.block_index if m.stamp else None,
    }


def _stamp_summary(s: Stamp) -> dict:
    return {
        "stamp_id":      str(s.id),
        "origin_ip":     s.origin_ip,
        "origin_device": s.origin_device,
        "timestamp":     s.timestamp.isoformat(),
        "rsa_signature": s.rsa_signature,
        "block_index":   s.block_index,
        "is_verified":   s.is_verified,
    }
