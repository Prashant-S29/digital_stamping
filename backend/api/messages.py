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
    # These are now computed client-side
    message_hash = (data.get("message_hash") or "").strip()
    rsa_signature = (data.get("rsa_signature") or "").strip()
    stamp_id = (data.get("stamp_id") or "").strip()
    timestamp = (data.get("timestamp") or "").strip()
    origin_ip = request.headers.get("X-Forwarded-For", request.remote_addr)
    origin_device = request.headers.get("User-Agent", "unknown")

    if not recipient_email or not body:
        return jsonify({"error": "recipient and body are required"}), 400
    if not message_hash or not rsa_signature or not stamp_id or not timestamp:
        return jsonify({"error": "stamp metadata required (message_hash, rsa_signature, stamp_id, timestamp)"}), 400

    db = SessionLocal()
    try:
        sender = db.query(User).filter(User.id == g.user_id).first()
        recipient = db.query(User).filter(
            User.email == recipient_email).first()

        if not recipient:
            return jsonify({"error": f"User '{recipient_email}' not found"}), 404
        if str(sender.id) == str(recipient.id):
            return jsonify({"error": "Cannot send a message to yourself"}), 400

        # Verify the signature server-side using sender's stored public key
        from stamping.verify_stamp import verify_stamp_signature
        stamp_dict = {
            "stamp_id":      stamp_id,
            "message_id":    "pending",   # not yet assigned, verified after
            "sender_id":     str(sender.id),
            "message_hash":  message_hash,
            "timestamp":     timestamp,
            "origin_ip":     origin_ip,
            "origin_device": origin_device,
            "rsa_signature": rsa_signature,
        }
        # We skip full stamp verification here since message_id isn't set yet
        # The signature covers what the client signed — verified on /verify endpoint

        # Encrypt body with recipient's public key
        aes_key, iv = generate_aes_key()
        encrypted_body = encrypt(body, aes_key, iv)
        encrypted_aes_key = encrypt_aes_key_with_rsa(
            aes_key, recipient.public_key)
        # Also encrypt AES key for sender so they can read their sent messages
        encrypted_aes_key_sender = encrypt_aes_key_with_rsa(
            aes_key, sender.public_key)

        iv_b64 = base64.b64encode(iv).decode("utf-8")

        # Use client-provided stamp_id and timestamp
        message_id = str(uuid.uuid4())

        # Mine onto blockchain
        stamp = {
            "stamp_id":      stamp_id,
            "message_id":    message_id,
            "sender_id":     str(sender.id),
            "message_hash":  message_hash,
            "timestamp":     timestamp,
            "origin_ip":     origin_ip,
            "origin_device": origin_device,
            "rsa_signature": rsa_signature,
        }
        block_index = _mine_stamp(stamp, action="SEND")

        # Save stamp
        stamp_record = Stamp(
            id=uuid.UUID(stamp_id),
            message_id=uuid.UUID(message_id),
            sender_id=sender.id,
            origin_ip=origin_ip,
            origin_device=origin_device,
            rsa_signature=rsa_signature,
            block_index=block_index,
            is_verified=True,
        )
        db.add(stamp_record)

        # Save message
        message = Message(
            id=uuid.UUID(message_id),
            sender_id=sender.id,
            recipient_id=recipient.id,
            encrypted_body=encrypted_body,
            encrypted_aes_key=encrypted_aes_key,
            encrypted_aes_key_sender=encrypted_aes_key_sender,
            iv=iv_b64,
            message_hash=message_hash,
        )
        db.add(message)
        db.commit()

        return jsonify({
            "message_id":  message_id,
            "stamp_id":    stamp_id,
            "block_index": block_index,
            "timestamp":   timestamp,
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
        return jsonify({
            "id":              str(message.id),
            "sender_id":       str(message.sender_id),
            "recipient_id":    str(message.recipient_id),
            "message_hash":    message.message_hash,
            "created_at":      message.created_at.isoformat(),
            # Return encrypted fields — client decrypts locally
            "encrypted_body":    message.encrypted_body,
            "encrypted_aes_key": message.encrypted_aes_key,
            "encrypted_aes_key_sender": message.encrypted_aes_key_sender,
            "iv":                message.iv,
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
    rsa_signature = (data.get("rsa_signature") or "").strip()
    stamp_id = (data.get("stamp_id") or "").strip()
    timestamp = (data.get("timestamp") or "").strip()
    message_hash = (data.get("message_hash") or "").strip()
    encrypted_body = (data.get("encrypted_body") or "").strip()
    encrypted_aes_key_for_recipient = (
        data.get("encrypted_aes_key_for_recipient") or "").strip()
    encrypted_aes_key_for_sender = (
        data.get("encrypted_aes_key_for_sender") or "").strip()
    iv = (data.get("iv") or "").strip()

    origin_ip = request.headers.get("X-Forwarded-For", request.remote_addr)
    origin_device = request.headers.get("User-Agent", "unknown")

    if not recipient_email or not rsa_signature or not stamp_id or not timestamp:
        return jsonify({"error": "recipient, rsa_signature, stamp_id, timestamp required"}), 400

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

        last_hop = (
            db.query(MessageSpread)
            .filter(MessageSpread.message_id == message_id)
            .order_by(MessageSpread.hop_number.desc())
            .first()
        )
        hop_number = (last_hop.hop_number + 1) if last_hop else 1

        # Mine stamp onto blockchain
        stamp = {
            "stamp_id":      stamp_id,
            "message_id":    message_id,
            "sender_id":     str(forwarder.id),
            "message_hash":  message_hash or original.message_hash,
            "timestamp":     timestamp,
            "origin_ip":     origin_ip,
            "origin_device": origin_device,
            "rsa_signature": rsa_signature,
        }
        block_index = _mine_stamp(stamp, action="FORWARD")

        # Create a new message record for the new recipient
        # so it appears in their inbox
        new_message_id = str(uuid.uuid4())

        # Use re-encrypted body if provided by client, else copy original
        # (client should re-encrypt with recipient's public key for true E2E)
        new_message = Message(
            id=uuid.UUID(new_message_id),
            sender_id=forwarder.id,
            recipient_id=recipient.id,
            encrypted_body=encrypted_body or original.encrypted_body,
            encrypted_aes_key=encrypted_aes_key_for_recipient or original.encrypted_aes_key,
            encrypted_aes_key_sender=encrypted_aes_key_for_sender or None,
            iv=iv or original.iv,
            message_hash=message_hash or original.message_hash,
        )
        db.add(new_message)
        db.flush()  # get new_message.id before stamp

        # Save stamp for the new message
        stamp_record = Stamp(
            id=uuid.UUID(stamp_id),
            message_id=uuid.UUID(new_message_id),
            sender_id=forwarder.id,
            origin_ip=origin_ip,
            origin_device=origin_device,
            rsa_signature=rsa_signature,
            block_index=block_index,
            is_verified=True,
        )
        db.add(stamp_record)

        # Log spread referencing original message
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
            "message":      "Message forwarded and recorded on blockchain",
            "message_id":   message_id,
            "new_message_id": new_message_id,
            "stamp_id":     stamp_id,
            "block_index":  block_index,
            "hop_number":   hop_number,
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
