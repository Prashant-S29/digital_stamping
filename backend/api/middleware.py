import jwt
from functools import wraps
from flask import request, jsonify, g
from config import config


def require_auth(f):
    """JWT auth decorator. Injects current user id into flask.g.user_id."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Unauthorized", "message": "Missing token"}), 401

        token = auth_header.split(" ", 1)[1]

        try:
            payload = jwt.decode(
                token, config.JWT_SECRET_KEY, algorithms=["HS256"])
            g.user_id = payload["user_id"]
            g.email = payload["email"]
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Unauthorized", "message": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Unauthorized", "message": "Invalid token"}), 401

        return f(*args, **kwargs)
    return decorated
