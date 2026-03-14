import hashlib


def hash_message(message_body: str) -> str:
    """SHA-256 hash of raw message body. Returns hex digest."""
    return hashlib.sha256(message_body.encode("utf-8")).hexdigest()


def verify_hash(message_body: str, stored_hash: str) -> bool:
    """Recompute hash and compare to stored. Returns False if tampered."""
    return hash_message(message_body) == stored_hash
