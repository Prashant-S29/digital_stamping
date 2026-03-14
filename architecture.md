# ARCHITECTURE.md
# Digital Stamping of Electronic Communication
> Source of Truth — Origin, Date, Time & Spread Verification System

---

## 1. Project Overview

This system provides a **tamper-proof digital stamping mechanism** for electronic communications. Every message created within the system is cryptographically stamped with verified metadata — sender identity, timestamp, and device/location origin — and every forward or share is permanently recorded on a custom-built blockchain. The result is an auditable, unforgeable chain of evidence showing exactly where a message came from and how it spread.

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     FRONTEND (Vercel)                   │
│              Next.js + Tailwind + shadcn/ui             │
│   Dashboard │ Compose │ Verify │ Spread Map │ Explorer  │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS / REST API
┌────────────────────────▼────────────────────────────────┐
│                     BACKEND (Render)                    │
│                    Python + Flask                       │
│   Stamping Engine │ Blockchain Core │ Crypto Layer      │
└──────────┬──────────────────────────────────┬───────────┘
           │                                  │
┌──────────▼──────────┐          ┌────────────▼───────────┐
│   PostgreSQL DB      │          │  Mini Blockchain        │
│   (pgAdmin Local /   │          │  (Python, in-memory +  │
│    Render Postgres)  │          │   persisted to DB)     │
└─────────────────────┘          └────────────────────────┘
```

---

## 3. System Layers

### 3.1 Presentation Layer — Frontend
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS + shadcn/ui components
- **Visualizations:** D3.js (blockchain block explorer), Vis.js (spread network map)
- **Deployment:** Vercel
- **Communication:** REST API calls to Flask backend via `fetch`

**Pages / Views:**
| Route | Purpose |
|---|---|
| `/` | Landing + Login / Register |
| `/dashboard` | Overview of sent/received messages |
| `/compose` | Write and send a stamped message |
| `/verify/:id` | Verify a message stamp and view its blockchain record |
| `/spread/:id` | Visual map of how a message has spread |
| `/explorer` | Full blockchain block explorer |
| `/profile` | User keys and identity info |

---

### 3.2 API Layer — Flask Backend
- **Framework:** Python 3.11 + Flask
- **Deployment:** Render (Web Service)
- **Pattern:** RESTful API, JSON responses
- **Auth:** JWT tokens (PyJWT)

**Core API Endpoints:**
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register user, generate RSA key pair |
| POST | `/api/auth/login` | Authenticate, return JWT |
| POST | `/api/messages/send` | Create, stamp, encrypt, and mine message |
| POST | `/api/messages/forward/:id` | Forward a message, log on blockchain |
| GET | `/api/messages/:id` | Retrieve a message with its stamp |
| GET | `/api/verify/:id` | Verify stamp integrity of a message |
| GET | `/api/spread/:id` | Get full spread tree of a message |
| GET | `/api/blockchain/chain` | Return full blockchain |
| GET | `/api/blockchain/block/:index` | Get specific block |
| GET | `/api/blockchain/validate` | Validate chain integrity |

---

### 3.3 Blockchain Core Layer
The blockchain is built entirely in Python from scratch, replicating all real-world blockchain properties.

**Block Structure:**
```json
{
  "index": 4,
  "timestamp": "2025-03-14T10:23:45.123Z",
  "transactions": [
    {
      "stamp_id": "uuid-v4",
      "message_id": "uuid-v4",
      "sender": "alice@example.com",
      "recipient": "bob@example.com",
      "action": "SEND | FORWARD",
      "message_hash": "sha256-of-encrypted-message",
      "origin_ip": "192.168.x.x",
      "origin_device": "user-agent-string",
      "aes_encrypted": true,
      "rsa_signature": "base64-encoded-signature"
    }
  ],
  "previous_hash": "0000a3f9bc...",
  "nonce": 48291,
  "hash": "0000b7c2de..."
}
```

**Real Blockchain Properties Implemented:**

| Property | Implementation |
|---|---|
| **Genesis Block** | Hardcoded first block, index 0, previous_hash = "0" |
| **SHA-256 Hashing** | Each block hashed using `hashlib.sha256` |
| **Proof of Work** | Hash must start with N leading zeros (difficulty = 4) |
| **Immutability** | Each block stores hash of previous block |
| **Chain Validation** | Full chain re-verification on every critical operation |
| **Tamper Detection** | Any edit to any block breaks all subsequent hashes |
| **Transactions** | Message stamps are treated as blockchain transactions |
| **Persistence** | Chain serialized as JSON and stored in PostgreSQL |

**Blockchain Files:**
```
backend/blockchain/
├── block.py          # Block class — structure, hashing, repr
├── blockchain.py     # Chain class — add block, mine, validate
├── pow.py            # Proof of Work mining logic
└── validator.py      # Full chain integrity checker
```

---

### 3.4 Cryptography Layer

Three cryptographic mechanisms work together:

#### AES-256 — Message Encryption
- Every message body is encrypted using AES-256 (CBC mode) before storage
- A unique AES key + IV is generated per message
- The AES key is encrypted with the recipient's RSA public key (hybrid encryption)
- Only the intended recipient can decrypt the message body

#### RSA — Digital Signature (Identity Proof)
- Every user gets an RSA-2048 key pair on registration
- Public key stored in PostgreSQL
- Private key delivered to user (stored client-side or securely)
- Every stamp is signed with the sender's RSA private key
- Anyone can verify the stamp using the sender's public key

#### SHA-256 — Integrity Hashing
- The raw message content is hashed with SHA-256 before encryption
- This hash is embedded in the stamp and on the blockchain
- Any modification to the message after stamping = hash mismatch = tampered

**Crypto Files:**
```
backend/stamping/
├── stamp.py             # Generates the full digital stamp object
├── aes_encryption.py    # AES-256 encrypt/decrypt message body
└── rsa_signature.py     # RSA key generation, sign, verify
```

---

### 3.5 Database Layer — PostgreSQL

**Local Development:** pgAdmin (local PostgreSQL instance)
**Production:** Render managed PostgreSQL

**Schema:**

```sql
-- Users and identity
users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  username TEXT,
  public_key TEXT,         -- RSA public key
  created_at TIMESTAMP
)

-- Messages (encrypted)
messages (
  id UUID PRIMARY KEY,
  sender_id UUID REFERENCES users(id),
  recipient_id UUID REFERENCES users(id),
  encrypted_body TEXT,     -- AES-256 encrypted content
  encrypted_aes_key TEXT,  -- AES key encrypted with recipient RSA public key
  iv TEXT,                 -- AES initialization vector
  message_hash TEXT,       -- SHA-256 of raw message body
  stamp_id UUID,
  created_at TIMESTAMP
)

-- Digital stamps
stamps (
  id UUID PRIMARY KEY,
  message_id UUID REFERENCES messages(id),
  sender_id UUID REFERENCES users(id),
  origin_ip TEXT,
  origin_device TEXT,
  timestamp TIMESTAMP,
  rsa_signature TEXT,      -- Sender's RSA signature over the stamp
  block_index INTEGER,     -- Which block on the blockchain
  is_verified BOOLEAN
)

-- Spread / forwarding log
message_spread (
  id UUID PRIMARY KEY,
  message_id UUID REFERENCES messages(id),
  forwarded_by UUID REFERENCES users(id),
  forwarded_to UUID REFERENCES users(id),
  forwarded_at TIMESTAMP,
  hop_number INTEGER,      -- 1st forward, 2nd forward, etc.
  block_index INTEGER      -- Blockchain block recording this hop
)

-- Blockchain persistence
blockchain_blocks (
  block_index INTEGER PRIMARY KEY,
  block_hash TEXT,
  previous_hash TEXT,
  nonce INTEGER,
  timestamp TIMESTAMP,
  block_data JSONB         -- Full block serialized as JSON
)
```

---

## 4. Complete Message Flow

```
1. USER COMPOSES MESSAGE
   └── Types message in /compose (Frontend)

2. FRONTEND → BACKEND (POST /api/messages/send)
   └── Sends: { recipient, message_body, sender_jwt }

3. STAMP GENERATION (backend/stamping/stamp.py)
   ├── Capture: sender identity, timestamp, IP, device
   ├── Hash message body with SHA-256
   └── Sign stamp with sender's RSA private key

4. ENCRYPTION (backend/stamping/aes_encryption.py)
   ├── Generate AES-256 key + IV
   ├── Encrypt message body with AES-256
   └── Encrypt AES key with recipient's RSA public key

5. BLOCKCHAIN MINING (backend/blockchain/blockchain.py)
   ├── Create new transaction object from stamp
   ├── Run Proof of Work (find nonce where hash starts with 0000)
   ├── Add new block to chain
   └── Validate full chain integrity

6. DATABASE SAVE (backend/database/db.py)
   ├── Save encrypted message to messages table
   ├── Save stamp to stamps table
   └── Persist new block to blockchain_blocks table

7. RECIPIENT VIEWS MESSAGE
   ├── Frontend fetches message + stamp
   ├── Backend decrypts AES key using recipient's RSA private key
   ├── Decrypts message body with AES key
   └── Displays message with verified stamp info

8. RECIPIENT FORWARDS MESSAGE
   ├── Frontend calls POST /api/messages/forward/:id
   ├── New stamp created for the forward action
   ├── New blockchain transaction mined for this hop
   ├── Spread log updated (hop_number++)
   └── message_spread table updated

9. VERIFICATION (/verify/:id)
   ├── Fetch stamp from DB
   ├── Re-hash message body → compare to stored hash
   ├── Verify RSA signature using sender's public key
   ├── Locate block on blockchain → validate block hash
   └── Return: VERIFIED ✅ or TAMPERED ❌

10. SPREAD MAP (/spread/:id)
    └── Query message_spread → render as network graph via Vis.js
```

---

## 5. Tech Stack Summary

| Layer | Technology |
|---|---|
| **Frontend Framework** | Next.js 14 (App Router) |
| **UI Styling** | Tailwind CSS + shadcn/ui |
| **Blockchain Visualizer** | D3.js |
| **Spread Map** | Vis.js |
| **Backend Framework** | Python 3.11 + Flask |
| **Blockchain** | Custom Python (SHA-256, PoW, chain validation) |
| **Message Encryption** | AES-256 CBC (PyCryptodome) |
| **Identity / Signing** | RSA-2048 (cryptography library) |
| **Hashing** | SHA-256 (hashlib) |
| **Authentication** | JWT (PyJWT) |
| **Database** | PostgreSQL (pgAdmin locally, Render in prod) |
| **ORM** | SQLAlchemy |
| **Frontend Deployment** | Vercel |
| **Backend Deployment** | Render (Web Service + PostgreSQL) |
| **Environment Config** | python-dotenv / Vercel env vars |

---

## 6. Project Folder Structure

```
digital-stamp-project/
│
├── backend/                          # Python Flask backend
│   ├── app.py                        # Entry point
│   ├── config.py                     # Environment config
│   ├── requirements.txt
│   │
│   ├── blockchain/
│   │   ├── block.py                  # Block structure + hashing
│   │   ├── blockchain.py             # Chain: add, mine, validate
│   │   ├── pow.py                    # Proof of Work
│   │   └── validator.py              # Full chain integrity check
│   │
│   ├── stamping/
│   │   ├── stamp.py                  # Stamp generation
│   │   ├── aes_encryption.py         # AES-256 encrypt/decrypt
│   │   └── rsa_signature.py          # RSA keygen, sign, verify
│   │
│   ├── api/
│   │   ├── auth.py                   # Register, login routes
│   │   ├── messages.py               # Send, forward, fetch routes
│   │   ├── blockchain_routes.py      # Chain explorer routes
│   │   └── verify.py                 # Verification routes
│   │
│   └── database/
│       ├── db.py                     # SQLAlchemy setup
│       └── models.py                 # ORM models
│
└── frontend/                         # Next.js frontend
    ├── app/
    │   ├── page.tsx                  # Landing / Login
    │   ├── dashboard/page.tsx
    │   ├── compose/page.tsx
    │   ├── verify/[id]/page.tsx
    │   ├── spread/[id]/page.tsx
    │   └── explorer/page.tsx
    │
    ├── components/
    │   ├── ui/                       # shadcn components
    │   ├── BlockchainExplorer.tsx    # D3.js block visualizer
    │   ├── SpreadMap.tsx             # Vis.js spread graph
    │   ├── StampCard.tsx             # Stamp display component
    │   └── VerifyBadge.tsx           # Verified / Tampered badge
    │
    ├── lib/
    │   └── api.ts                    # API call helpers
    │
    ├── tailwind.config.ts
    └── package.json
```

---

## 7. Deployment Architecture

```
┌─────────────────────────┐       ┌──────────────────────────┐
│        VERCEL            │       │          RENDER           │
│                         │       │                          │
│  Next.js Frontend       │──────▶│  Flask Backend API       │
│  - Auto HTTPS           │ HTTPS │  - Web Service           │
│  - CDN globally         │       │  - Auto HTTPS            │
│  - Preview deployments  │       │                          │
└─────────────────────────┘       │  PostgreSQL Database     │
                                  │  - Managed by Render     │
                                  │  - Persistent storage    │
                                  └──────────────────────────┘
```

**Environment Variables:**

Backend (Render):
```
DATABASE_URL=postgresql://...
JWT_SECRET_KEY=...
FLASK_ENV=production
```

Frontend (Vercel):
```
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
```

---

## 8. Security Model

| Threat | Mitigation |
|---|---|
| Message interception | AES-256 encryption of all message bodies |
| Identity spoofing | RSA digital signatures on every stamp |
| Timestamp forgery | Server-side timestamping only, stored on blockchain |
| Message tampering | SHA-256 hash mismatch detection |
| Blockchain tampering | PoW + chain hash linkage — edit one block, break all |
| Unauthorized access | JWT authentication on all API endpoints |

---

## 9. What Makes This a "Real" Blockchain

Even though this is a single-node demonstration, the following real-world blockchain properties are fully implemented and functional:

1. **Genesis Block** — hardcoded origin block
2. **Cryptographic Linking** — every block contains the hash of the previous block
3. **Proof of Work** — mining requires finding a nonce that produces a hash with N leading zeros
4. **SHA-256 Hashing** — industry standard, same as Bitcoin
5. **Tamper Evidence** — modifying any block invalidates all subsequent blocks
6. **Transaction Model** — stamps are modeled as blockchain transactions
7. **Chain Validation** — full verification function traverses the entire chain
8. **Persistence** — chain survives restarts via PostgreSQL storage

> The only difference from a public blockchain is that this runs on a single node instead of thousands. The cryptographic principles are identical.

---

*Last updated: Project Kickoff*
*Version: 1.0*
