import uuid
import json
from datetime import datetime, timezone
from flask import request as flask_request

from stamping.hasher import hash_message
from stamping.rsa_signature import sign


def create_stamp(
    message_id: str,
    sender_id: str,
    message_hash: str,
    private_key_pem: str,
    origin_ip: str = None,
    origin_device: str = None,
) -> dict:
    """
    Create a cryptographically signed digital stamp for a message.

    The stamp payload is signed with the sender's RSA private key —
    anyone with the sender's public key can verify it was genuinely them.
    """
    stamp_id = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).isoformat()

    payload = {
        "stamp_id":     stamp_id,
        "sender_id":    sender_id,
        "message_hash": message_hash,
        "timestamp":    timestamp,
    }

    payload_str = json.dumps(payload, sort_keys=True)
    rsa_signature = sign(payload_str, private_key_pem)

    return {
        "stamp_id":      stamp_id,
        "message_id":    message_id,
        "sender_id":     sender_id,
        "message_hash":  message_hash,
        "timestamp":     timestamp,
        "origin_ip":     origin_ip,
        "origin_device": origin_device,
        "rsa_signature": rsa_signature,
    }


def stamp_to_transaction(stamp: dict, action: str = "SEND") -> dict:
    """
    Format a stamp as a blockchain transaction.
    This is what gets mined into a block.
    """
    return {
        "type":          "STAMP",
        "action":        action,           # SEND | FORWARD
        "stamp_id":      stamp["stamp_id"],
        "message_id":    stamp["message_id"],
        "sender_id":     stamp["sender_id"],
        "message_hash":  stamp["message_hash"],
        "timestamp":     stamp["timestamp"],
        "origin_ip":     stamp["origin_ip"],
        "origin_device": stamp["origin_device"],
        "rsa_signature": stamp["rsa_signature"],
    }


def get_request_metadata() -> tuple[str, str]:
    """
    Extract origin IP and device info from the current Flask request context.
    Returns (ip, user_agent).
    """
    ip = flask_request.headers.get(
        "X-Forwarded-For", flask_request.remote_addr)
    user_agent = flask_request.headers.get("User-Agent", "unknown")
    return ip, user_agent
