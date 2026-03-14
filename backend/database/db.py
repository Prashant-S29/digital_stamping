from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from config import config


class Base(DeclarativeBase):
    pass


engine = create_engine(
    config.DATABASE_URL,
    pool_pre_ping=True,    # auto-reconnect if connection drops
    pool_size=5,
    max_overflow=10,
)

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def get_db():
    """Dependency — yields a DB session and closes it after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
