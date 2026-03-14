from database.db import SessionLocal
from database.models import BlockchainBlock
from blockchain.blockchain import Blockchain
from blockchain.block import Block


def save_block(block: Block):
    """Persist a single newly mined block to the DB."""
    db = SessionLocal()
    try:
        record = BlockchainBlock(
            block_index=block.index,
            block_hash=block.hash,
            previous_hash=block.previous_hash,
            nonce=block.nonce,
            block_data=block.to_dict(),
        )
        db.merge(record)
        db.commit()
    finally:
        db.close()


def load_chain() -> Blockchain | None:
    """
    Load the full chain from DB on startup.
    Returns a Blockchain instance, or None if DB is empty.
    """
    db = SessionLocal()
    try:
        records = (
            db.query(BlockchainBlock)
            .order_by(BlockchainBlock.block_index)
            .all()
        )
        if not records:
            return None

        bc = Blockchain()
        bc.chain = [Block.from_dict(r.block_data) for r in records]
        return bc
    finally:
        db.close()
