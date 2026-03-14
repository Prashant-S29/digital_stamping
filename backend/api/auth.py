import jwt
import bcrypt
from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify, g
from sqlalchemy.exc import IntegrityError

from config import config
from database.db import SessionLocal
from database.models import User
from stamping.rsa_signature import generate_key_pair
from api.middleware import require_auth

auth_bp = Blueprint("auth", __name__)


def _make_token(user_id: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email":   email,
        "exp":     datetime.now(timezone.utc) + timedelta(hours=config.JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, config.JWT_SECRET_KEY, algorithm="HS256")


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()

    if not email or not username or not password:
        return jsonify({"error": "email, username and password are required"}), 400

    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    # Hash password
    hashed_pw = bcrypt.hashpw(password.encode(
        "utf-8"), bcrypt.gensalt()).decode("utf-8")

    # Generate RSA key pair
    private_key_pem, public_key_pem = generate_key_pair()

    db = SessionLocal()
    try:
        user = User(
            email=email,
            username=username,
            password=hashed_pw,
            public_key=public_key_pem,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        return jsonify({"error": "Email already registered"}), 409
    finally:
        db.close()

    token = _make_token(str(user.id), user.email)

    return jsonify({
        "message":     "User registered successfully",
        "token":       token,
        "user": {
            "id":       str(user.id),
            "email":    user.email,
            "username": user.username,
        },
        # Private key returned ONCE — user must save it
        "private_key": private_key_pem,
        "warning":     "Save your private key now. It will never be shown again.",
    }), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = (data.get("password") or "").strip()

    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
    finally:
        db.close()

    if not user or not bcrypt.checkpw(password.encode("utf-8"), user.password.encode("utf-8")):
        return jsonify({"error": "Invalid email or password"}), 401

    token = _make_token(str(user.id), user.email)

    return jsonify({
        "token": token,
        "user": {
            "id":       str(user.id),
            "email":    user.email,
            "username": user.username,
        },
    }), 200


@auth_bp.route("/me", methods=["GET"])
@require_auth
def me():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == g.user_id).first()
    finally:
        db.close()

    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "id":         str(user.id),
        "email":      user.email,
        "username":   user.username,
        "created_at": user.created_at.isoformat(),
    }), 200
