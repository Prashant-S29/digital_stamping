import base64
import os
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import hashes, serialization


def generate_aes_key() -> tuple[bytes, bytes]:
    """Generate a random AES-256 key and IV. Returns (key, iv)."""
    key = os.urandom(32)   # 256 bits
    iv = os.urandom(16)   # 128 bits
    return key, iv


def encrypt(message_body: str, aes_key: bytes, iv: bytes) -> str:
    """AES-256 CBC encrypt. Returns base64 ciphertext string."""
    cipher = AES.new(aes_key, AES.MODE_CBC, iv)
    padded = pad(message_body.encode("utf-8"), AES.block_size)
    encrypted = cipher.encrypt(padded)
    return base64.b64encode(encrypted).decode("utf-8")


def decrypt(ciphertext_b64: str, aes_key: bytes, iv: bytes) -> str:
    """AES-256 CBC decrypt. Returns original message body string."""
    cipher = AES.new(aes_key, AES.MODE_CBC, iv)
    decrypted = cipher.decrypt(base64.b64decode(ciphertext_b64))
    return unpad(decrypted, AES.block_size).decode("utf-8")


def encrypt_aes_key_with_rsa(aes_key: bytes, public_key_pem: str) -> str:
    """Encrypt AES key with recipient's RSA public key (OAEP). Returns base64 string."""
    public_key = serialization.load_pem_public_key(
        public_key_pem.encode("utf-8"))
    encrypted = public_key.encrypt(
        aes_key,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None,
        ),
    )
    return base64.b64encode(encrypted).decode("utf-8")


def decrypt_aes_key_with_rsa(encrypted_aes_key_b64: str, private_key_pem: str) -> bytes:
    """Decrypt AES key with recipient's RSA private key. Returns raw AES key bytes."""
    private_key = serialization.load_pem_private_key(
        private_key_pem.encode("utf-8"),
        password=None,
    )
    return private_key.decrypt(
        base64.b64decode(encrypted_aes_key_b64),
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None,
        ),
    )
