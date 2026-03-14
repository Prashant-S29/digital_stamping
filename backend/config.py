import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # Database
    DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:password@localhost:5432/digital_stamp_db")

    # JWT
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-secret-change-in-production")
    JWT_EXPIRY_HOURS = int(os.environ.get("JWT_EXPIRY_HOURS", 24))

    # Flask
    FLASK_ENV = os.environ.get("FLASK_ENV", "development")
    DEBUG = FLASK_ENV == "development"
    PORT = int(os.environ.get("PORT", 5000))

    # Blockchain
    BLOCKCHAIN_DIFFICULTY = int(os.environ.get("BLOCKCHAIN_DIFFICULTY", 4))  # number of leading zeros

    # CORS — allow frontend origins
    ALLOWED_ORIGINS = os.environ.get(
        "ALLOWED_ORIGINS",
        "http://localhost:3000"
    ).split(",")


config = Config()
