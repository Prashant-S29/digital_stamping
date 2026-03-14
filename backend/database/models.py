import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Text, Boolean, Integer,
    DateTime, ForeignKey, JSON
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from database.db import Base


def now_utc():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), nullable=False)
    password = Column(String(255), nullable=False)      # bcrypt hash
    public_key = Column(Text, nullable=False)             # RSA public key PEM
    created_at = Column(DateTime(timezone=True), default=now_utc)

    sent_messages = relationship(
        "Message", foreign_keys="Message.sender_id",    back_populates="sender")
    received_messages = relationship(
        "Message", foreign_keys="Message.recipient_id", back_populates="recipient")
    stamps = relationship("Stamp",   back_populates="sender")


class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sender_id = Column(UUID(as_uuid=True), ForeignKey(
        "users.id"), nullable=False)
    recipient_id = Column(UUID(as_uuid=True),
                          ForeignKey("users.id"), nullable=False)
    encrypted_body = Column(Text, nullable=False)
    encrypted_aes_key = Column(Text, nullable=False)
    iv = Column(String(64), nullable=False)
    message_hash = Column(String(64), nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc)

    sender = relationship("User", foreign_keys=[
                          sender_id],    back_populates="sent_messages")
    recipient = relationship("User", foreign_keys=[
                             recipient_id], back_populates="received_messages")
    stamp = relationship("Stamp", back_populates="message", uselist=False)
    spread = relationship("MessageSpread", back_populates="message")


class Stamp(Base):
    __tablename__ = "stamps"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = Column(UUID(as_uuid=True), ForeignKey(
        "messages.id"), nullable=True)
    sender_id = Column(UUID(as_uuid=True), ForeignKey(
        "users.id"),    nullable=False)
    origin_ip = Column(String(64),  nullable=True)
    origin_device = Column(Text,        nullable=True)
    timestamp = Column(DateTime(timezone=True), default=now_utc)
    rsa_signature = Column(Text,        nullable=False)
    block_index = Column(Integer,     nullable=True)
    is_verified = Column(Boolean,     default=False)

    message = relationship("Message", back_populates="stamp")
    sender = relationship("User",    back_populates="stamps")


class MessageSpread(Base):
    __tablename__ = "message_spread"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = Column(UUID(as_uuid=True), ForeignKey(
        "messages.id"), nullable=False)
    forwarded_by = Column(UUID(as_uuid=True), ForeignKey(
        "users.id"),    nullable=False)
    forwarded_to = Column(UUID(as_uuid=True), ForeignKey(
        "users.id"),    nullable=False)
    forwarded_at = Column(DateTime(timezone=True), default=now_utc)
    hop_number = Column(Integer, nullable=False, default=1)
    block_index = Column(Integer, nullable=True)

    message = relationship("Message", back_populates="spread")


class BlockchainBlock(Base):
    __tablename__ = "blockchain_blocks"

    block_index = Column(Integer, primary_key=True)
    block_hash = Column(String(64), nullable=False, unique=True)
    previous_hash = Column(String(64), nullable=False)
    nonce = Column(Integer,    nullable=False)
    timestamp = Column(DateTime(timezone=True), default=now_utc)
    block_data = Column(JSON, nullable=False)          # full block serialized
