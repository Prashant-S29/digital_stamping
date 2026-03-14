from api.blockchain_routes import blockchain_bp
from database.blockchain_store import load_chain, save_block
from blockchain.blockchain import Blockchain
from api.auth import auth_bp
import os

from config import config
from flask import Flask, jsonify
from flask_cors import CORS
from database import models

app = Flask(__name__)
CORS(app, origins=config.ALLOWED_ORIGINS)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "env": config.FLASK_ENV, "version": "1.0.0"}), 200


# ---------------------------------------------------------------------------
# Blueprints — registered as milestones are completed
# ---------------------------------------------------------------------------

# M2 — Auth (uncomment when M2 is complete)
app.register_blueprint(auth_bp, url_prefix="/api/v1/auth")

# M3 — Blockchain routes

with app.app_context():
    bc = load_chain()
    if bc is None:
        bc = Blockchain()
        genesis = bc.create_genesis_block()
        save_block(genesis)
        print(f"[blockchain] Genesis block created: {genesis.hash[:16]}...")
    else:
        print(f"[blockchain] Loaded {bc.length()} blocks from DB")
    app.config["BLOCKCHAIN"] = bc

# M3 — Blockchain routes
app.register_blueprint(blockchain_bp, url_prefix="/api/v1/blockchain")


# M6 — Messages (uncomment when M6 is complete)
# from api.messages import messages_bp
# app.register_blueprint(messages_bp, url_prefix="/api/v1/messages")

# M7 — Verify (uncomment when M7 is complete)
# from api.verify import verify_bp
# app.register_blueprint(verify_bp, url_prefix="/api/v1/verify")


# ---------------------------------------------------------------------------
# Error handlers
# ---------------------------------------------------------------------------


@app.errorhandler(400)
def bad_request(e):
    return jsonify({"error": "Bad request", "message": str(e)}), 400


@app.errorhandler(401)
def unauthorized(e):
    return jsonify(
        {"error": "Unauthorized", "message": "Valid authentication required"}
    ), 401


@app.errorhandler(403)
def forbidden(e):
    return jsonify(
        {"error": "Forbidden", "message": "You do not have access to this resource"}
    ), 403


@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Not found", "message": str(e)}), 404


@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Internal server error", "message": str(e)}), 500


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=config.PORT, debug=config.DEBUG)
