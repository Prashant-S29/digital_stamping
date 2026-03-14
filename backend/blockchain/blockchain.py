from datetime import datetime, timezone
from blockchain.block import Block
from blockchain.pow import proof_of_work
from config import config


class Blockchain:
    def __init__(self, difficulty: int = None):
        self.difficulty = difficulty or config.BLOCKCHAIN_DIFFICULTY
        self.chain: list[Block] = []
        self.pending_transactions = []

    # ------------------------------------------------------------------
    # Genesis
    # ------------------------------------------------------------------

    def create_genesis_block(self) -> Block:
        genesis = Block(
            index=0,
            transactions=[
                {"type": "GENESIS", "message": "Digital Stamp Chain — Origin Block"}],
            previous_hash="0",
            timestamp=datetime.now(timezone.utc).isoformat(),
        )
        genesis = proof_of_work(genesis, self.difficulty)
        self.chain.append(genesis)
        return genesis

    # ------------------------------------------------------------------
    # Chain accessors
    # ------------------------------------------------------------------

    def get_last_block(self) -> Block:
        return self.chain[-1]

    def get_block_by_index(self, index: int) -> Block | None:
        if 0 <= index < len(self.chain):
            return self.chain[index]
        return None

    def length(self) -> int:
        return len(self.chain)

    # ------------------------------------------------------------------
    # Transactions + mining
    # ------------------------------------------------------------------

    def add_transaction(self, transaction: dict) -> int:
        """Add a transaction to the pending pool. Returns pool size."""
        self.pending_transactions.append(transaction)
        return len(self.pending_transactions)

    def mine_pending_transactions(self) -> Block:
        """
        Mine all pending transactions into a new block.
        Clears the pending pool after mining.
        Returns the newly mined block.
        """
        if not self.pending_transactions:
            raise ValueError("No pending transactions to mine")

        new_block = Block(
            index=len(self.chain),
            transactions=self.pending_transactions.copy(),
            previous_hash=self.get_last_block().hash,
        )
        new_block = proof_of_work(new_block, self.difficulty)

        self.chain.append(new_block)
        self.pending_transactions = []

        return new_block

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    def is_chain_valid(self) -> bool:
        """
        Traverse the full chain and verify:
        1. Each block's stored hash matches its recomputed hash
        2. Each block's previous_hash matches the actual hash of the prior block
        """
        for i in range(1, len(self.chain)):
            current = self.chain[i]
            previous = self.chain[i - 1]

            # Re-compute hash and compare
            if current.hash != current.compute_hash():
                return False

            # Check linkage
            if current.previous_hash != previous.hash:
                return False

        return True

    def get_tampered_index(self) -> int | None:
        """Returns index of first tampered block, or None if chain is valid."""
        for i in range(1, len(self.chain)):
            current = self.chain[i]
            previous = self.chain[i - 1]

            if current.hash != current.compute_hash():
                return i
            if current.previous_hash != previous.hash:
                return i

        return None

    # ------------------------------------------------------------------
    # Serialization
    # ------------------------------------------------------------------

    def to_dict(self) -> dict:
        return {
            "length":     len(self.chain),
            "difficulty": self.difficulty,
            "chain":      [block.to_dict() for block in self.chain],
        }

    @classmethod
    def from_dict(cls, data: dict) -> "Blockchain":
        bc = cls(difficulty=data.get("difficulty", 4))
        bc.chain = [Block.from_dict(b) for b in data["chain"]]
        return bc
