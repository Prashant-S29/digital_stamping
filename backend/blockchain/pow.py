from blockchain.block import Block


def proof_of_work(block: Block, difficulty: int = 4) -> Block:
    """
    Increment nonce until block hash starts with `difficulty` leading zeros.
    Same mechanism as Bitcoin's PoW — just with a lower difficulty for demo.
    """
    target = "0" * difficulty
    block.nonce = 0
    block.hash = block.compute_hash()

    while not block.hash.startswith(target):
        block.nonce += 1
        block.hash = block.compute_hash()

    return block
