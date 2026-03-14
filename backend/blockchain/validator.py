from blockchain.blockchain import Blockchain


def validate_chain(blockchain: Blockchain) -> dict:
    """
    Full chain validation report.
    Returns a dict with validity status and details.
    """
    is_valid = blockchain.is_chain_valid()
    tampered_index = blockchain.get_tampered_index()

    return {
        "is_valid":       is_valid,
        "chain_length":   blockchain.length(),
        "tampered_block": tampered_index,
        "message": (
            "Chain is valid — all blocks verified."
            if is_valid
            else f"Chain tampered at block index {tampered_index}."
        ),
    }
