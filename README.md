# Digital Stamping of Electronic Communication

> A blockchain-powered system to verify the **origin, date, time, and spread** of electronic messages using cryptographic stamping.

Every message sent through this system is cryptographically signed by the sender, encrypted end-to-end, and permanently recorded on a custom-built blockchain — making it tamper-evident, traceable, and verifiable by anyone.

---

## What This Project Does

When a message is sent:

1. The sender's browser signs a **digital stamp** using their RSA private key (never leaves the device)
2. The message body is **AES-256 encrypted** for the recipient
3. The stamp is **mined onto a custom blockchain** using Proof of Work
4. Every forward is recorded as a new block — building a full **spread map**
5. Anyone can **verify** the stamp's authenticity at any time

---

## Complete System Flow

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                        DIGITAL STAMP — SYSTEM FLOW                         ║
╚══════════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────────┐
│  REGISTRATION                                                               │
│                                                                             │
│  Browser                    Backend (Flask)            PostgreSQL           │
│  ───────                    ──────────────             ─────────            │
│  Fill form    ──POST──▶     generate_key_pair()    ──▶ store user           │
│  (email,pass)               RSA-2048 keygen             + public_key        │
│               ◀──201────    return JWT                                      │
│  Show private               + private_key (once)                           │
│  key ⚠                      + warning                                      │
│  Store in                                                                   │
│  sessionStorage                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  SENDING A MESSAGE                                                          │
│                                                                             │
│  Browser (WebCrypto API)    Backend (Flask)            Blockchain           │
│  ───────────────────        ──────────────             ─────────────        │
│                                                                             │
│  1. sha256(body)                                                            │
│     → message_hash                                                          │
│                                                                             │
│  2. PKCS1v15.sign({         ──POST /messages/send──▶                       │
│       stamp_id,                                                             │
│       sender_id,             3. AES-256-CBC encrypt body                   │
│       message_hash,             random key + IV                             │
│       timestamp                                                             │
│     }, private_key)          4. RSA-OAEP wrap AES key                      │
│     → rsa_signature             with recipient pubkey                      │
│                                 + sender pubkey                             │
│                                                                             │
│                              5. stamp → transaction  ──▶ mine()            │
│                                                           find nonce where  │
│                                                           SHA256(block)     │
│                                                           starts "0000"     │
│                                                                             │
│                              6. persist block        ──▶ blockchain_blocks  │
│                                 persist message      ──▶ messages           │
│                                 persist stamp        ──▶ stamps             │
│                                                                             │
│               ◀──201────    return message_id,                              │
│                             stamp_id, block_index                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  READING A MESSAGE (RECIPIENT)                                              │
│                                                                             │
│  Browser (WebCrypto API)    Backend (Flask)            PostgreSQL           │
│  ───────────────────        ──────────────             ─────────            │
│                                                                             │
│               ──GET /messages/:id──▶                                        │
│                             fetch message             ──▶ messages          │
│               ◀──200────    return encrypted_body,                          │
│                             encrypted_aes_key, iv                           │
│                                                                             │
│  1. RSA-OAEP decrypt                                                        │
│     encrypted_aes_key                                                       │
│     with private_key                                                        │
│     → raw AES key                                                           │
│                                                                             │
│  2. AES-256-CBC decrypt                                                     │
│     encrypted_body                                                          │
│     → plaintext message                                                     │
│                                                                             │
│  (private key never leaves browser)                                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  STAMP VERIFICATION (4-LAYER CHECK)                                         │
│                                                                             │
│  Browser                    Backend (Flask)            Blockchain           │
│  ───────                    ──────────────             ─────────────        │
│                                                                             │
│               ──GET /verify/:id──▶                                          │
│                                                                             │
│                             CHECK 1: Message Hash                           │
│                             block.txn.message_hash                          │
│                             == messages.message_hash    ✓ / ✗              │
│                                                                             │
│                             CHECK 2: RSA Signature                          │
│                             payload = {stamp_id,                            │
│                               sender_id, message_hash,                     │
│                               timestamp}                                   │
│                             PKCS1v15.verify(payload,                        │
│                               sig, sender.public_key)   ✓ / ✗              │
│                                                                             │
│                             CHECK 3: Block Hash                             │
│                             SHA256(block_data)                              │
│                             == block.stored_hash         ✓ / ✗             │
│                                                                             │
│                             CHECK 4: Chain Integrity                        │
│                             for each block:                                 │
│                             block.previous_hash                             │
│                             == prev_block.hash           ✓ / ✗             │
│                                                                             │
│               ◀──200────    verdict: VERIFIED | TAMPERED                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  FORWARDING + SPREAD TRACKING                                               │
│                                                                             │
│  Browser (WebCrypto API)    Backend (Flask)            Blockchain           │
│  ───────────────────        ──────────────             ─────────────        │
│                                                                             │
│  Fetch recipient pubkey  ──GET /auth/pubkey/:email──▶                      │
│                          ◀── public_key ──────────                          │
│                                                                             │
│  Decrypt AES key with                                                       │
│  own private_key                                                            │
│                                                                             │
│  Re-encrypt AES key with                                                    │
│  recipient's public_key                                                     │
│                                                                             │
│  Sign new stamp          ──POST /messages/forward/:id──▶                   │
│                                                                             │
│                             Create new Message record  ──▶ messages        │
│                             Log MessageSpread hop      ──▶ message_spread  │
│                             Mine new block             ──▶ blockchain      │
│                                                                             │
│  Spread map:  Alice ──block1──▶ Bob ──block2──▶ Carol ──block3──▶ Dave     │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  BLOCKCHAIN STRUCTURE                                                       │
│                                                                             │
│  Block 0 (GENESIS)     Block 1 (SEND)          Block 2 (FORWARD)           │
│  ┌───────────────┐     ┌───────────────┐       ┌───────────────┐           │
│  │ index:  0     │     │ index:  1     │       │ index:  2     │           │
│  │ prev:   "0"   │◀────│ prev:   hash0 │◀──────│ prev:   hash1 │           │
│  │ nonce:  13519 │     │ nonce:  9044  │       │ nonce:  5821  │           │
│  │ hash:   0000… │     │ hash:   0000… │       │ hash:   0000… │           │
│  │ txn:          │     │ txn:          │       │ txn:          │           │
│  │  GENESIS      │     │  type: STAMP  │       │  type: STAMP  │           │
│  └───────────────┘     │  action: SEND │       │  action: FWD  │           │
│                        │  stamp_id     │       │  stamp_id     │           │
│                        │  sender_id    │       │  sender_id    │           │
│                        │  message_hash │       │  message_hash │           │
│                        │  timestamp    │       │  timestamp    │           │
│                        │  rsa_sig      │       │  rsa_sig      │           │
│                        └───────────────┘       └───────────────┘           │
│                                                                             │
│  PoW: SHA256(index+txns+prev_hash+nonce) must start with "0000"            │
│  Tamper block N → hash changes → block N+1 previous_hash mismatch          │
│  → entire chain from N onwards is invalid                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Backend
| Layer | Technology | Purpose |
|---|---|---|
| Web framework | Python 3.11 + Flask | REST API, blueprints |
| Blockchain | Custom Python | Block, PoW, chain validation |
| Hashing | SHA-256 (`hashlib`) | Block hashing, message integrity |
| Signing | RSA-2048 PKCS1v15 (`cryptography`) | Stamp signatures |
| Encryption | AES-256-CBC (`pycryptodome`) | Message body encryption |
| Key exchange | RSA-OAEP (`cryptography`) | AES key wrapping |
| Authentication | JWT (`pyjwt`) + bcrypt | Stateless auth |
| ORM | SQLAlchemy 2.0 | Database models |
| Database | PostgreSQL | Persistent storage |
| Production server | Gunicorn | Render deployment |

### Frontend
| Layer | Technology | Purpose |
|---|---|---|
| Framework | Next.js 16 (App Router) | React SSR + routing |
| Styling | Tailwind CSS v4 + shadcn/ui | UI components |
| Crypto | WebCrypto API (browser native) | Client-side signing + decryption |
| Data fetching | TanStack Query v5 | Server state, caching |
| Package manager | pnpm | Fast installs |
| Deployment | Vercel | Frontend hosting |

### Database Schema
```
users              — id, email, username, password (bcrypt), public_key
messages           — id, sender_id, recipient_id, encrypted_body,
                     encrypted_aes_key, encrypted_aes_key_sender,
                     iv, message_hash, created_at
stamps             — id, message_id, sender_id, origin_ip, origin_device,
                     timestamp, rsa_signature, block_index, is_verified
message_spread     — id, message_id, forwarded_by, forwarded_to,
                     forwarded_at, hop_number, block_index
blockchain_blocks  — block_index, block_hash, previous_hash, nonce,
                     timestamp, block_data (JSONB)
```

---

## Local Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- pnpm (`npm install -g pnpm`)
- PostgreSQL (via pgAdmin or CLI)

---

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd digital_stamping
```

---

### 2. Create PostgreSQL database

Open pgAdmin or psql and run:

```sql
CREATE DATABASE digital_stamp_db;
```

---

### 3. Backend setup

```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
```

Edit `.env` with your values:
```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/digital_stamp_db
JWT_SECRET_KEY=your-super-secret-key-change-this
FLASK_ENV=development
FLASK_DEBUG=1
PORT=5000
ALLOWED_ORIGINS=http://localhost:3000
BLOCKCHAIN_DIFFICULTY=4
JWT_EXPIRY_HOURS=24
```

Run database migrations:
```bash
PYTHONPATH=. python database/migrate.py
```

Start the backend:
```bash
python app.py
```

Verify it's running:
```bash
curl http://localhost:5000/health
# → {"status": "ok", "env": "development", "version": "1.0.0"}
```

---

### 4. Frontend setup

```bash
cd ../frontend

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Start the frontend:
```bash
pnpm dev
```

Visit `http://localhost:3000` — you will be redirected to the login page.

---

### 5. First run walkthrough

**Register accounts (minimum 2):**
- Go to `http://localhost:3000/register`
- Create accounts for e.g. Alice and Bob
- ⚠️ **Download or copy the private key** shown after registration — it will never be shown again
- The key is saved to your `sessionStorage` automatically for the current tab

**Send a message:**
- Log in as Alice → go to `/compose`
- Send a message to Bob's email
- The stamp is signed client-side and mined onto the blockchain (takes a moment)
- On success, you see the stamp ID and block number

**Read and decrypt:**
- Log in as Bob → `/dashboard` → Inbox
- Click the message
- If the private key is not in session, go to `/profile` and upload/paste the `.pem` file
- The message decrypts in the browser — the private key never reaches the server

**Verify the stamp:**
- On the message page, click "Verify stamp"
- All 4 checks should show PASS → verdict: **VERIFIED**

**Forward the message:**
- Bob can forward to Carol
- This re-encrypts the AES key for Carol and mines a new block
- The spread map at `/spread/:id` shows the full A → B → C chain

**Explore the blockchain:**
- Go to `/explorer`
- Click any block to inspect its full transaction data

---

## Private Key Management

The private key is the core of your identity. It signs your stamps and decrypts your messages.

| Storage location | Lifetime | Security |
|---|---|---|
| `sessionStorage` (auto) | Cleared when tab closes | In-memory only |
| `.pem` file (download) | Until you delete it | You manage it |
| Backend server | Never stored | Not applicable |

**To reload your key after a new session:**
1. Go to `/profile`
2. Upload your `.pem` file or paste the key text
3. Click "Load key into session"

---

## Security Model

| Threat | Protection |
|---|---|
| Message interception | AES-256-CBC — only recipient's private key can decrypt |
| Identity spoofing | RSA-2048 PKCS1v15 signatures — only key owner can sign |
| Timestamp forgery | Server-side timestamping — client provides but server records |
| Message tampering | SHA-256 hash mismatch detected during verification |
| Blockchain tampering | PoW + hash chain — changing one block breaks all subsequent |
| Private key exposure | Never sent to server — WebCrypto API keeps it in browser memory |
| Unauthorized access | JWT tokens required on all authenticated endpoints |

---

## Project Structure

```
digital_stamping/
├── backend/
│   ├── api/
│   │   ├── auth.py              # Register, login, JWT, pubkey lookup
│   │   ├── messages.py          # Send, inbox, sent, forward
│   │   ├── verify.py            # 4-check verification + spread map
│   │   ├── blockchain_routes.py # Chain explorer endpoints
│   │   └── middleware.py        # JWT auth decorator
│   ├── blockchain/
│   │   ├── block.py             # Block structure + SHA-256 hashing
│   │   ├── blockchain.py        # Chain: genesis, mine, validate
│   │   ├── pow.py               # Proof of Work algorithm
│   │   └── validator.py         # Full chain integrity checker
│   ├── stamping/
│   │   ├── stamp.py             # Stamp creation
│   │   ├── verify_stamp.py      # RSA signature verification
│   │   ├── aes_encryption.py    # AES-256 + RSA-OAEP key wrapping
│   │   ├── rsa_signature.py     # RSA keygen, sign, verify (PKCS1v15)
│   │   └── hasher.py            # SHA-256 utilities
│   ├── database/
│   │   ├── models.py            # SQLAlchemy ORM models (5 tables)
│   │   ├── db.py                # Engine + session factory
│   │   ├── migrate.py           # Table creation script
│   │   └── blockchain_store.py  # Persist / load chain from DB
│   ├── config.py                # Environment configuration
│   ├── app.py                   # Flask application entry point
│   └── requirements.txt
│
└── frontend/
    ├── app/
    │   ├── login/               # Sign in page
    │   ├── register/            # Sign up + private key display
    │   ├── dashboard/           # Inbox + sent message tabs
    │   ├── messages/[id]/       # Message detail + forward form
    │   ├── compose/             # Write and send a message
    │   ├── verify/[id]/         # 4-layer stamp verification UI
    │   ├── spread/[id]/         # Message spread timeline
    │   ├── explorer/            # Blockchain block explorer
    │   └── profile/             # Load private key into session
    ├── components/
    │   ├── AppShell.tsx         # Auth guard + layout wrapper
    │   ├── Sidebar.tsx          # Navigation sidebar
    │   ├── StampCard.tsx        # Stamp metadata card
    │   ├── VerifyBadge.tsx      # VERIFIED / TAMPERED badge
    │   └── NoKeyBanner.tsx      # Missing private key warning
    └── lib/
        ├── api.ts               # Base fetch wrapper
        ├── crypto.ts            # WebCrypto: sign, decrypt, re-encrypt
        ├── queries.ts           # TanStack Query hooks + TypeScript types
        └── query-client.ts      # QueryClient configuration
```

---

## API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/health` | — | Health check |
| POST | `/api/v1/auth/register` | — | Register user, generate RSA key pair |
| POST | `/api/v1/auth/login` | — | Login, receive JWT |
| GET | `/api/v1/auth/me` | JWT | Current user info |
| GET | `/api/v1/auth/pubkey/:email` | JWT | Fetch a user's public key |
| POST | `/api/v1/messages/send` | JWT | Send stamped encrypted message |
| GET | `/api/v1/messages/inbox` | JWT | Received messages |
| GET | `/api/v1/messages/sent` | JWT | Sent messages |
| GET | `/api/v1/messages/:id` | JWT | Message detail (encrypted fields) |
| POST | `/api/v1/messages/forward/:id` | JWT | Forward message to new recipient |
| GET | `/api/v1/verify/:id` | JWT | Verify stamp — 4 cryptographic checks |
| GET | `/api/v1/verify/spread/:id` | JWT | Full message spread map |
| GET | `/api/v1/blockchain/chain` | — | Full blockchain as JSON |
| GET | `/api/v1/blockchain/block/:index` | — | Single block by index |
| GET | `/api/v1/blockchain/validate` | — | Chain validity status |
