from stamping.aes_encryption import (
    generate_aes_key, encrypt, decrypt,
    encrypt_aes_key_with_rsa, decrypt_aes_key_with_rsa,
)
from stamping.rsa_signature import generate_key_pair, sign, verify
from stamping.hasher import hash_message, verify_hash

print("=== RSA Key Pair ===")
private_pem, public_pem = generate_key_pair()
print("Generated RSA-2048 key pair")

print("\n=== SHA-256 Hash ===")
msg = "Hello, Digital Stamp!"
h = hash_message(msg)
print(f"Hash:          {h}")
print(f"Verify OK:     {verify_hash(msg, h)}")
print(f"Verify tamper: {verify_hash('tampered!', h)}")

print("\n=== RSA Sign / Verify ===")
sig = sign(msg, private_pem)
print(f"Signature:     {sig[:40]}...")
print(f"Verify OK:     {verify(msg, sig, public_pem)}")
print(f"Verify tamper: {verify('tampered!', sig, public_pem)}")

print("\n=== AES-256 Encrypt / Decrypt ===")
key, iv = generate_aes_key()
ciphertext = encrypt(msg, key, iv)
print(f"Ciphertext:    {ciphertext[:40]}...")
decrypted = decrypt(ciphertext, key, iv)
print(f"Decrypted:     {decrypted}")
print(f"Match:         {decrypted == msg}")

print("\n=== Hybrid: AES key wrapped with RSA ===")
enc_key = encrypt_aes_key_with_rsa(key, public_pem)
print(f"Encrypted key: {enc_key[:40]}...")
dec_key = decrypt_aes_key_with_rsa(enc_key, private_pem)
print(f"Key match:     {dec_key == key}")

# Full pipeline
re_decrypted = decrypt(ciphertext, dec_key, iv)
print(f"Full pipeline: {re_decrypted == msg}")

print("\n✅ All crypto checks passed")
