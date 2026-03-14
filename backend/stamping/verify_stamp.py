import json
from stamping.rsa_signature import verify
from stamping.hasher import verify_hash


def verify_stamp_signature(stamp: dict, public_key_pem: str) -> bool:
    """
    Re-verify the RSA signature on a stamp using the sender's public key.
    Reconstructs the exact payload that was signed at creation time.
    """
    payload = {
        "stamp_id":      stamp["stamp_id"],
        "message_id":    stamp["message_id"],
        "sender_id":     stamp["sender_id"],
        "message_hash":  stamp["message_hash"],
        "timestamp":     stamp["timestamp"],
        "origin_ip":     stamp["origin_ip"],
        "origin_device": stamp["origin_device"],
    }
    payload_str = json.dumps(payload, sort_keys=True)
    return verify(payload_str, stamp["rsa_signature"], public_key_pem)


def verify_message_integrity(message_body: str, stored_hash: str) -> bool:
    """Check if the message body still matches its original SHA-256 hash."""
    return verify_hash(message_body, stored_hash)
