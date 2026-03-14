import hashlib
import json
from datetime import datetime, timezone


class Block:
    def __init__(
        self,
        index: int,
        transactions: list,
        previous_hash: str,
        nonce: int = 0,
        timestamp: str = None,
    ):
        self.index = index
        self.transactions = transactions
        self.previous_hash = previous_hash
        self.nonce = nonce
        self.timestamp = timestamp or datetime.now(timezone.utc).isoformat()
        self.hash = self.compute_hash()

    def compute_hash(self) -> str:
        block_string = json.dumps({
            "index":         self.index,
            "transactions":  self.transactions,
            "previous_hash": self.previous_hash,
            "nonce":         self.nonce,
            "timestamp":     self.timestamp,
        }, sort_keys=True)
        return hashlib.sha256(block_string.encode()).hexdigest()

    def to_dict(self) -> dict:
        return {
            "index":         self.index,
            "transactions":  self.transactions,
            "previous_hash": self.previous_hash,
            "nonce":         self.nonce,
            "timestamp":     self.timestamp,
            "hash":          self.hash,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "Block":
        block = cls(
            index=data["index"],
            transactions=data["transactions"],
            previous_hash=data["previous_hash"],
            nonce=data["nonce"],
            timestamp=data["timestamp"],
        )
        block.hash = data["hash"]
        return block

    def __repr__(self):
        return (
            f"Block(index={self.index}, "
            f"hash={self.hash[:12]}..., "
            f"prev={self.previous_hash[:12]}..., "
            f"txns={len(self.transactions)}, "
            f"nonce={self.nonce})"
        )
