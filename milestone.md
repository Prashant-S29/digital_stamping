# MILESTONE.md
# Digital Stamping of Electronic Communication
> Incremental Build Plan — From Scaffold to Deployment

---

## Ground Rules
- Every milestone produces **working, runnable code**
- New milestones **never break** previously completed features
- Each milestone ends with a **checklist** — only move forward when all boxes are ticked
- Database migrations are **additive only** — no destructive changes to existing tables
- All API contracts are **versioned** (`/api/v1/...`) so frontend never breaks on backend changes

---

## Milestone Overview

| Milestone | Name | Focus |
|---|---|---|
| M0 | Project Scaffold | Repo, folder structure, tooling, env setup |
| M1 | Database Foundation | PostgreSQL schema, models, migrations |
| M2 | Authentication | Register, login, JWT, RSA key generation |
| M3 | Blockchain Core | Block, chain, Proof of Work, validation |
| M4 | Cryptography Layer | AES-256 encryption, RSA signing, SHA-256 hashing |
| M5 | Digital Stamping Engine | Stamp generation, linking stamp to blockchain |
| M6 | Messaging System | Send, receive, forward messages with stamps |
| M7 | Verification Engine | Stamp verify, tamper detection, chain check |
| M8 | Frontend Scaffold | Next.js setup, Tailwind, shadcn, routing |
| M9 | Frontend Auth UI | Login, register pages wired to backend |
| M10 | Frontend Dashboard | Message list, inbox, sent view |
| M11 | Frontend Compose | Write and send stamped message UI |
| M12 | Frontend Verify | Stamp verification page with result badge |
| M13 | Blockchain Explorer UI | D3.js block visualizer |
| M14 | Spread Map UI | Vis.js message spread network graph |
| M15 | Integration & E2E Testing | Full flow tests, edge cases |
| M16 | Deployment | Render backend, Vercel frontend, production config |
| M17 | Final Polish | Demo data, UI cleanup, presentation mode |

---

## M0 — Project Scaffold
> Goal: Both repos exist, run locally, and talk to each other with a health check.

### Tasks
- [ ] Create GitHub repo: `digital-stamp-backend`
- [ ] Create GitHub repo: `digital-stamp-frontend`
- [ ] Backend: Initialize Python project with virtual environment
- [ ] Backend: Install and pin dependencies in `requirements.txt`
  ```
  flask
  flask-cors
  python-dotenv
  sqlalchemy
  psycopg2-binary
  pyjwt
  pycryptodome
  cryptography
  uuid
  ```
- [ ] Backend: Create folder structure as per ARCHITECTURE.md
- [ ] Backend: Create `app.py` with a single `/health` route returning `{ status: ok }`
- [ ] Backend: Create `.env` file with `DATABASE_URL`, `JWT_SECRET_KEY`, `FLASK_ENV`
- [ ] Backend: Create `.env.example` (no real secrets)
- [ ] Frontend: Initialize Next.js 14 project (`npx create-next-app`)
- [ ] Frontend: Install Tailwind CSS and configure `tailwind.config.ts`
- [ ] Frontend: Install and initialize shadcn/ui
- [ ] Frontend: Install D3.js and Vis.js
- [ ] Frontend: Create `.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:5000`
- [ ] Frontend: Create a single `/` page that calls `/health` and displays `Backend: OK`
- [ ] Verify both run locally without errors

### Completion Criteria
- `python app.py` starts Flask on port 5000
- `npm run dev` starts Next.js on port 3000
- Frontend health check page shows "Backend: OK"

---

## M1 — Database Foundation
> Goal: PostgreSQL running locally via pgAdmin with all tables created.

### Tasks
- [ ] Create local PostgreSQL database: `digital_stamp_db`
- [ ] Set up pgAdmin and connect to local instance
- [ ] Create `database/db.py` — SQLAlchemy engine + session setup
- [ ] Create `database/models.py` with all ORM models:
  - `User` — id, email, username, public_key, created_at
  - `Message` — id, sender_id, recipient_id, encrypted_body, encrypted_aes_key, iv, message_hash, stamp_id, created_at
  - `Stamp` — id, message_id, sender_id, origin_ip, origin_device, timestamp, rsa_signature, block_index, is_verified
  - `MessageSpread` — id, message_id, forwarded_by, forwarded_to, forwarded_at, hop_number, block_index
  - `BlockchainBlock` — block_index, block_hash, previous_hash, nonce, timestamp, block_data
- [ ] Create `database/migrate.py` — script to create all tables
- [ ] Run migration: all 5 tables created in pgAdmin
- [ ] Verify tables visible in pgAdmin with correct columns

### Completion Criteria
- All 5 tables exist in `digital_stamp_db`
- `python database/migrate.py` runs without errors
- No existing features broken (health check still works)

---

## M2 — Authentication System
> Goal: Users can register and login. JWT tokens issued. RSA key pairs generated on register.

### Tasks
- [ ] Create `stamping/rsa_signature.py`:
  - `generate_key_pair()` → returns (private_key_pem, public_key_pem)
  - `sign(data, private_key_pem)` → returns base64 signature
  - `verify(data, signature, public_key_pem)` → returns True/False
- [ ] Create `api/auth.py` with routes:
  - `POST /api/v1/auth/register` — create user, generate RSA key pair, store public key in DB, return private key to user (once only)
  - `POST /api/v1/auth/login` — verify credentials, return JWT token
  - `GET /api/v1/auth/me` — return current user info (JWT protected)
- [ ] Create `api/middleware.py` — JWT decode middleware / decorator
- [ ] Register auth blueprint in `app.py`
- [ ] Hash user passwords with `bcrypt` before storing
- [ ] Write manual tests:
  - Register new user → get back private key + JWT
  - Login with same user → get JWT
  - Call `/me` with JWT → get user info
  - Call `/me` without JWT → 401 Unauthorized

### Completion Criteria
- Register returns RSA private key (user must save it)
- Login returns valid JWT
- Protected routes reject requests without valid JWT
- Health check and DB still working

---

## M3 — Blockchain Core
> Goal: A fully functional mini blockchain running in Python. Mine blocks, validate chain, detect tampering.

### Tasks
- [ ] Create `blockchain/block.py`:
  - `Block` class with fields: index, timestamp, transactions, previous_hash, nonce, hash
  - `compute_hash()` method — SHA-256 of entire block content
  - `__repr__()` for clean printing
- [ ] Create `blockchain/pow.py`:
  - `proof_of_work(block, difficulty=4)` — increments nonce until hash starts with `0000`
  - Returns mined block with valid nonce and hash
- [ ] Create `blockchain/blockchain.py`:
  - `Blockchain` class
  - `create_genesis_block()` — hardcoded first block, previous_hash = "0"
  - `get_last_block()` — returns tip of chain
  - `add_transaction(transaction)` — adds to pending transactions pool
  - `mine_pending_transactions()` — mines new block with all pending transactions
  - `is_chain_valid()` — traverses full chain, re-verifies every hash and linkage
  - `to_dict()` / `from_dict()` — serialize/deserialize chain for DB storage
- [ ] Create `blockchain/validator.py`:
  - `validate_chain(chain)` — standalone validation function
  - `detect_tamper(chain)` — returns index of first tampered block if any
- [ ] Create `api/blockchain_routes.py`:
  - `GET /api/v1/blockchain/chain` — return full chain as JSON
  - `GET /api/v1/blockchain/block/<index>` — return single block
  - `GET /api/v1/blockchain/validate` — return chain validity status
- [ ] Create `database/blockchain_store.py`:
  - `save_chain(blockchain)` — persist entire chain to DB
  - `load_chain()` — load chain from DB on startup
- [ ] On `app.py` startup: load chain from DB or create new chain with genesis block
- [ ] Write manual tests:
  - Mine 3 blocks → verify chain valid
  - Manually alter a block's data → verify chain reports tampered
  - Restart app → chain loads from DB correctly

### Completion Criteria
- Blockchain mines blocks with valid PoW (hash starts with `0000`)
- Chain validation correctly identifies tampered chains
- Chain persists across app restarts
- All previous features still working

---

## M4 — Cryptography Layer
> Goal: AES-256 message encryption and SHA-256 message hashing fully working.

### Tasks
- [ ] Create `stamping/aes_encryption.py`:
  - `generate_aes_key()` → returns 32-byte AES key + 16-byte IV
  - `encrypt(message_body, aes_key, iv)` → returns encrypted ciphertext (base64)
  - `decrypt(ciphertext, aes_key, iv)` → returns original message body
  - `encrypt_aes_key_with_rsa(aes_key, recipient_public_key_pem)` → RSA-OAEP encrypted AES key
  - `decrypt_aes_key_with_rsa(encrypted_aes_key, private_key_pem)` → original AES key
- [ ] Update `stamping/rsa_signature.py` to ensure sign/verify work on arbitrary byte strings
- [ ] Create `stamping/hasher.py`:
  - `hash_message(message_body)` → SHA-256 hex digest
  - `verify_hash(message_body, stored_hash)` → True/False
- [ ] Write manual tests:
  - Encrypt a message → decrypt → verify matches original
  - Hash a message → verify hash matches
  - Tamper with message → verify hash mismatch detected
  - Encrypt AES key with RSA → decrypt with RSA → use to decrypt message

### Completion Criteria
- Full hybrid encryption pipeline works end-to-end
- SHA-256 hashing correctly detects any message tampering
- All previous features still working

---

## M5 — Digital Stamping Engine
> Goal: Every message gets a complete digital stamp. Stamp is mined onto the blockchain.

### Tasks
- [ ] Create `stamping/stamp.py`:
  - `create_stamp(message_id, sender_id, message_hash, origin_ip, origin_device, private_key_pem)`:
    - Generates UUID stamp id
    - Captures server-side timestamp (never trust client time)
    - Builds stamp payload dict
    - Signs entire stamp payload with sender's RSA private key
    - Returns complete stamp object
  - `stamp_to_transaction(stamp)` → formats stamp as blockchain transaction
- [ ] Wire stamp creation into the blockchain:
  - On stamp creation → call `blockchain.add_transaction(stamp_to_transaction(stamp))`
  - Call `blockchain.mine_pending_transactions()` → returns new block
  - Store `block_index` back into the stamp record
- [ ] Save stamp to `stamps` table in DB
- [ ] Write manual tests:
  - Create a stamp → verify RSA signature is valid
  - Confirm stamp transaction appears in newly mined block
  - Confirm block is valid in chain

### Completion Criteria
- Stamps are created with all required fields
- Every stamp results in a mined blockchain block
- Stamp's `block_index` correctly references its block in the chain
- All previous features still working

---

## M6 — Messaging System
> Goal: Users can send, receive, and forward messages. All actions recorded on blockchain.

### Tasks
- [ ] Create `api/messages.py` with routes:
  - `POST /api/v1/messages/send`:
    1. Validate JWT → get sender
    2. Look up recipient by email
    3. Hash message body (SHA-256)
    4. Encrypt message body (AES-256)
    5. Encrypt AES key with recipient's RSA public key
    6. Create digital stamp
    7. Mine stamp onto blockchain
    8. Save message + stamp to DB
    9. Return message id + stamp id
  - `GET /api/v1/messages/inbox` — get all received messages for JWT user
  - `GET /api/v1/messages/sent` — get all sent messages for JWT user
  - `GET /api/v1/messages/<id>` — get single message, decrypt body for recipient
  - `POST /api/v1/messages/forward/<id>`:
    1. Validate JWT → get forwarder
    2. Look up new recipient
    3. Create new stamp for this forward action
    4. Mine new stamp onto blockchain
    5. Add record to `message_spread` table (increment hop_number)
    6. Return updated spread info
- [ ] Write manual tests:
  - Send message A→B → verify encrypted in DB, stamp created, block mined
  - B reads message → verify decrypted correctly
  - B forwards to C → verify new stamp, new block, hop_number = 1
  - C forwards to D → verify hop_number = 2

### Completion Criteria
- Full send → receive → forward cycle works via API (test with Postman or curl)
- Each action produces a distinct blockchain block
- Message body is never stored in plaintext in DB
- All previous features still working

---

## M7 — Verification Engine
> Goal: Any message can be verified for authenticity. Tampering is detected instantly.

### Tasks
- [ ] Create `api/verify.py` with routes:
  - `GET /api/v1/verify/<message_id>`:
    1. Fetch message + stamp from DB
    2. Re-hash decrypted message body → compare to stored hash
    3. Re-verify RSA signature on stamp using sender's public key
    4. Locate block on blockchain by `block_index`
    5. Re-validate that block's hash
    6. Re-validate full chain integrity
    7. Return full verification report: `{ hash_valid, signature_valid, block_valid, chain_valid, overall: VERIFIED | TAMPERED }`
  - `GET /api/v1/spread/<message_id>`:
    - Query `message_spread` table for all hops
    - Return ordered list: sender → hop1 → hop2 → ... with timestamps
- [ ] Write manual tests:
  - Verify untampered message → all checks pass
  - Manually edit `encrypted_body` in DB → hash check fails
  - Manually edit a block in DB → block/chain check fails
  - Verify spread data returns correct hop chain

### Completion Criteria
- Verification returns correct VERIFIED result for untampered messages
- Any tampering is detected at the correct layer (hash / signature / block / chain)
- Spread data correctly reconstructs message journey
- All previous features still working

---

## M8 — Frontend Scaffold
> Goal: Next.js app running with Tailwind + shadcn configured, all routes stubbed out.

### Tasks
- [ ] Confirm Next.js 14 App Router setup
- [ ] Configure Tailwind CSS — custom color palette, fonts
- [ ] Initialize shadcn/ui — add base components: Button, Card, Input, Badge, Dialog, Toast
- [ ] Install and configure D3.js and Vis.js
- [ ] Create route stubs (pages with placeholder text):
  - `/` — Landing
  - `/login` — Login
  - `/register` — Register
  - `/dashboard` — Dashboard
  - `/compose` — Compose
  - `/verify/[id]` — Verify
  - `/spread/[id]` — Spread Map
  - `/explorer` — Blockchain Explorer
- [ ] Create `lib/api.ts` — base fetch wrapper pointing to `NEXT_PUBLIC_API_URL`
- [ ] Create shared layout with sidebar navigation
- [ ] Verify all routes load without errors

### Completion Criteria
- All route stubs accessible
- Tailwind styles applying correctly
- shadcn components render correctly
- Navigation between pages works

---

## M9 — Frontend Auth UI
> Goal: Users can register and login through the UI. JWT stored, protected routes enforced.

### Tasks
- [ ] Build `/register` page:
  - Form: username, email, password
  - On success: show private key in modal with "Download & Copy" — warn user to save it
  - Redirect to `/login`
- [ ] Build `/login` page:
  - Form: email, password
  - On success: store JWT in `httpOnly` cookie or `localStorage`
  - Redirect to `/dashboard`
- [ ] Create `lib/auth.ts` — helper functions: `getToken()`, `isLoggedIn()`, `logout()`
- [ ] Create auth middleware in Next.js — redirect unauthenticated users from protected routes to `/login`
- [ ] Add logout button to navigation

### Completion Criteria
- Full register → login → dashboard flow works in browser
- Private key is displayed once and downloadable
- Unauthenticated users redirected to login
- JWT persists across page refreshes

---

## M10 — Frontend Dashboard
> Goal: Logged-in users see their inbox and sent messages.

### Tasks
- [ ] Build `/dashboard` page:
  - Tabs: Inbox | Sent
  - Each message shows: sender/recipient, timestamp, subject preview, stamp badge
  - Click message → navigate to message detail view
- [ ] Build `/messages/[id]` page:
  - Show decrypted message body
  - Show stamp details: origin, timestamp, device, signature status
  - Show "Forward" button
  - Show "Verify" button → links to `/verify/[id]`
- [ ] Create `StampCard` component — displays stamp metadata cleanly
- [ ] Wire to backend: `GET /api/v1/messages/inbox` and `GET /api/v1/messages/sent`

### Completion Criteria
- Inbox and sent tabs populate with real messages from backend
- Clicking a message shows full decrypted content + stamp info
- All auth protections still working

---

## M11 — Frontend Compose
> Goal: Users can write and send a stamped message through the UI.

### Tasks
- [ ] Build `/compose` page:
  - Input: recipient email, message body
  - On send: call `POST /api/v1/messages/send`
  - Show loading state during mining (PoW can take a moment)
  - On success: show confirmation with stamp ID and block index
  - Navigate to sent message detail
- [ ] Add "Forward" functionality on message detail page:
  - Input: new recipient email
  - Call `POST /api/v1/messages/forward/<id>`
  - Show new stamp and block confirmation

### Completion Criteria
- Full compose → send → view in sent box flow works
- Mining confirmation shows stamp ID and block number
- Forward creates new hop visible in sent detail

---

## M12 — Frontend Verify
> Goal: Users can verify any message stamp from the UI.

### Tasks
- [ ] Build `/verify/[id]` page:
  - Show 4 verification checks with pass/fail indicators:
    - Hash Integrity ✅/❌
    - RSA Signature ✅/❌
    - Block Hash ✅/❌
    - Chain Integrity ✅/❌
  - Show overall verdict: large VERIFIED ✅ or TAMPERED ❌ badge
  - Show full stamp details below verdict
- [ ] Create `VerifyBadge` component
- [ ] Wire to `GET /api/v1/verify/<message_id>`

### Completion Criteria
- Verified messages show all 4 green checks + VERIFIED badge
- Demo of tampered message shows correct failing check + TAMPERED badge

---

## M13 — Blockchain Explorer UI
> Goal: Users can browse the entire blockchain visually using D3.js.

### Tasks
- [ ] Build `/explorer` page:
  - D3.js visualization: blocks rendered as connected rectangles in a horizontal chain
  - Each block shows: index, hash (truncated), timestamp, transaction count
  - Click a block → expand to show full block data (transactions, nonce, full hash)
  - Genesis block clearly labelled
  - Chain scrollable horizontally as blocks grow
- [ ] Create `BlockchainExplorer` component
- [ ] Wire to `GET /api/v1/blockchain/chain`
- [ ] Show chain validity status at top of page (green bar = valid, red = tampered)

### Completion Criteria
- Full blockchain renders visually with all blocks
- Block click expands to show full data
- Chain validity indicator works correctly

---

## M14 — Spread Map UI
> Goal: Users can see the full visual journey of any message as a network graph.

### Tasks
- [ ] Build `/spread/[id]` page:
  - Vis.js network graph: each node = a user, each edge = a forward action
  - Origin node highlighted differently (star/different color)
  - Edge labels show hop number and timestamp
  - Hover on node → show user info + timestamp
  - Hover on edge → show block index where this hop was recorded
- [ ] Create `SpreadMap` component
- [ ] Wire to `GET /api/v1/spread/<message_id>`
- [ ] Handle single-recipient (no spread) gracefully — show origin only

### Completion Criteria
- Spread map renders correctly for a message forwarded 3+ times
- Node and edge hover info works
- Origin is clearly distinguishable from forwarded nodes

---

## M15 — Integration & End-to-End Testing
> Goal: Full user journey tested. All edge cases handled. No broken flows.

### Tasks
- [ ] Test full E2E flow:
  - Register User A, User B, User C
  - A sends message to B
  - B reads, verifies → VERIFIED
  - B forwards to C
  - C reads, verifies → VERIFIED
  - View spread map → shows A → B → C
  - View blockchain explorer → all blocks present
- [ ] Test tamper detection:
  - Manually corrupt message in DB → verify shows TAMPERED
  - Manually corrupt a block in DB → chain shows invalid
- [ ] Test edge cases:
  - Send to non-existent user → clear error message
  - Access message you didn't send/receive → 403 Forbidden
  - Invalid JWT → 401 Unauthorized
  - Forward already-forwarded message multiple times → hops increment correctly
- [ ] Fix all bugs found during testing
- [ ] Confirm all pages render correctly on mobile viewport

### Completion Criteria
- Full E2E demo flow runs without any errors
- Tamper detection works on both message and blockchain layers
- All error states show user-friendly messages

---

## M16 — Deployment
> Goal: Backend live on Render, Frontend live on Vercel, connected and working.

### Tasks

#### Backend — Render
- [ ] Create `Procfile`: `web: python app.py`
- [ ] Create Render Web Service — connect GitHub repo
- [ ] Create Render PostgreSQL instance
- [ ] Set environment variables on Render:
  - `DATABASE_URL` (from Render PostgreSQL)
  - `JWT_SECRET_KEY`
  - `FLASK_ENV=production`
- [ ] Update Flask to use `PORT` from environment: `app.run(port=os.environ.get("PORT", 5000))`
- [ ] Run DB migration on Render (one-time)
- [ ] Verify `/health` endpoint live on Render URL

#### Frontend — Vercel
- [ ] Connect GitHub repo to Vercel
- [ ] Set environment variable: `NEXT_PUBLIC_API_URL=https://your-backend.onrender.com`
- [ ] Trigger deployment
- [ ] Verify frontend loads and can reach backend `/health`

#### Final Connection Test
- [ ] Register a user on live deployment
- [ ] Send a message end-to-end on live deployment
- [ ] Verify blockchain explorer shows blocks on live deployment
- [ ] Test spread map on live deployment

### Completion Criteria
- Backend accessible at `https://your-project.onrender.com`
- Frontend accessible at `https://your-project.vercel.app`
- Full send → verify → explore flow works on live URLs
- No CORS errors

---

## M17 — Final Polish & Demo Prep
> Goal: Project is demo-ready. Looks great, has sample data, presentation mode works.

### Tasks
- [ ] Seed demo data:
  - 3 pre-created users (Alice, Bob, Carol)
  - 5 pre-sent messages with varying spread chains
  - A pre-tampered message to demo tamper detection
  - Blockchain with 10+ blocks already mined
- [ ] UI polish:
  - Loading skeletons on all data-fetching pages
  - Empty states for inbox/sent with helpful messages
  - Consistent color theme across all pages
  - Mobile responsive check on all pages
- [ ] Add a "Demo Mode" banner/button on landing page that auto-logs in as Alice
- [ ] Prepare demo script:
  - Show live message compose + mining
  - Show VERIFIED stamp
  - Show blockchain explorer with block details
  - Show spread map
  - Show TAMPERED detection on the pre-tampered message
- [ ] Final README.md:
  - Project description
  - Live demo link (Vercel URL)
  - Local setup instructions
  - Tech stack summary

### Completion Criteria
- Demo can be run from the live URL with zero local setup
- All demo scenarios work without errors
- Project is presentable and self-explanatory to a new viewer

---

## Summary Checklist

| Milestone | Status |
|---|---|
| M0 — Scaffold | ⬜ Not Started |
| M1 — Database | ⬜ Not Started |
| M2 — Auth | ⬜ Not Started |
| M3 — Blockchain Core | ⬜ Not Started |
| M4 — Cryptography | ⬜ Not Started |
| M5 — Stamping Engine | ⬜ Not Started |
| M6 — Messaging System | ⬜ Not Started |
| M7 — Verification Engine | ⬜ Not Started |
| M8 — Frontend Scaffold | ⬜ Not Started |
| M9 — Frontend Auth UI | ⬜ Not Started |
| M10 — Frontend Dashboard | ⬜ Not Started |
| M11 — Frontend Compose | ⬜ Not Started |
| M12 — Frontend Verify | ⬜ Not Started |
| M13 — Blockchain Explorer UI | ⬜ Not Started |
| M14 — Spread Map UI | ⬜ Not Started |
| M15 — Integration Testing | ⬜ Not Started |
| M16 — Deployment | ⬜ Not Started |
| M17 — Final Polish | ⬜ Not Started |

---

*Last updated: Project Kickoff*
*Version: 1.0*
