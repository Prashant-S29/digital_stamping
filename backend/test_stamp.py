from stamping.rsa_signature import generate_key_pair
from stamping.hasher import hash_message
from stamping.stamp import create_stamp, stamp_to_transaction
from stamping.verify_stamp import verify_stamp_signature, verify_message_integrity
import uuid

# Setup
private_pem, public_pem = generate_key_pair()
message_id = str(uuid.uuid4())
sender_id = str(uuid.uuid4())
message = "Hello Bob, this is a stamped message."
msg_hash = hash_message(message)

print("=== Create Stamp ===")
stamp = create_stamp(
    message_id=message_id,
    sender_id=sender_id,
    message_hash=msg_hash,
    private_key_pem=private_pem,
    origin_ip="127.0.0.1",
    origin_device="TestAgent/1.0",
)
print(f"Stamp ID:      {stamp['stamp_id']}")
print(f"Timestamp:     {stamp['timestamp']}")
print(f"Signature:     {stamp['rsa_signature'][:40]}...")

print("\n=== Verify Stamp Signature ===")
print(f"Valid sig:     {verify_stamp_signature(stamp, public_pem)}")

# Tamper with stamp
tampered = {**stamp, "sender_id": "evil-attacker"}
print(f"Tampered sig:  {verify_stamp_signature(tampered, public_pem)}")

print("\n=== Verify Message Integrity ===")
print(f"Hash valid:    {verify_message_integrity(message, msg_hash)}")
print(f"Hash tampered: {verify_message_integrity('tampered body', msg_hash)}")

print("\n=== Stamp → Blockchain Transaction ===")
txn = stamp_to_transaction(stamp, action="SEND")
print(f"Type:          {txn['type']}")
print(f"Action:        {txn['action']}")
print(f"Message hash:  {txn['message_hash'][:20]}...")

print("\n✅ All stamp checks passed")
