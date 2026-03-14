from flask import Blueprint, jsonify, current_app
from blockchain.validator import validate_chain

blockchain_bp = Blueprint("blockchain", __name__)


def _get_chain():
    return current_app.config["BLOCKCHAIN"]


@blockchain_bp.route("/chain", methods=["GET"])
def get_chain():
    bc = _get_chain()
    return jsonify(bc.to_dict()), 200


@blockchain_bp.route("/block/<int:index>", methods=["GET"])
def get_block(index):
    bc = _get_chain()
    block = bc.get_block_by_index(index)

    if block is None:
        return jsonify({"error": f"Block {index} not found"}), 404

    return jsonify(block.to_dict()), 200


@blockchain_bp.route("/validate", methods=["GET"])
def validate():
    bc = _get_chain()
    report = validate_chain(bc)
    return jsonify(report), 200
