# Digital Stamping of Electronic Communication

> Blockchain-powered origin, timestamp & spread verification for electronic messages.

## Live Demo
- Frontend: _coming in M16_
- Backend API: _coming in M16_

## What It Does
Every message sent through this system is:
1. **Stamped** — cryptographically sealed with sender identity, timestamp, device & location
2. **Encrypted** — AES-256 message body + RSA-protected key exchange
3. **Mined onto a blockchain** — immutable, tamper-evident record
4. **Traceable** — every forward is logged, producing a full spread map

## Tech Stack
| Layer | Technology |
|---|---|
| Frontend | Next.js 14, Tailwind CSS, shadcn/ui |
| Blockchain Visualizer | D3.js |
| Spread Map | Vis.js |
| Backend | Python 3.11 + Flask |
| Blockchain | Custom Python (SHA-256, Proof of Work) |
| Encryption | AES-256 + RSA-2048 |
| Database | PostgreSQL |
| Frontend Deploy | Vercel |
| Backend Deploy | Render |

## Local Setup

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # Fill in your values
python app.py
```
Backend runs at: http://localhost:5000
Health check: http://localhost:5000/health

### Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local   # Fill in your values
npm run dev
```
Frontend runs at: http://localhost:3000

## Project Structure
See [architecture.md](./architecture.md) for full system design.
See [milestone.md](./milestone.md) for incremental build plan.

## Current Status
| Milestone | Status |
|---|---|
| M0 — Scaffold | ✅ Complete |
| M1 — Database | ⬜ Not Started |
| M2 — Auth | ⬜ Not Started |
| M3 — Blockchain Core | ⬜ Not Started |
| ... | ... |
