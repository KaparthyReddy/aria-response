# ARIA — Adaptive Response Intelligence for Agencies

> AI-native disaster response intelligence platform for commanders, analysts, and field officers.

ARIA fuses live incident data, resource state, and field reports into one explainable decision surface — deterministic risk scoring, structured AI reasoning, resource allocation recommendations, and real-time situational briefings.

---

## What it does

| Surface | What you get |
|---|---|
| **Operations Dashboard** | Live map of all active incidents across India, severity-coded markers, resource overlays, live alert feed |
| **Scorecards** | Deterministic risk scoring — Overall Risk, Coverage Gap, Resource Readiness, Active Incidents (no LLM dependency) |
| **AI Assessment** | Claude-powered structured reasoning — situation summary, key risks, prioritised recommendations, projected outcome |
| **Incident Detail** | Per-incident deep-dive — status management, resource deployment, AI Q&A |
| **Resource Tracker** | Full asset inventory — NDRF teams, medical units, helicopters, supplies, shelters |
| **ARIA Copilot** | Guided conversational intake — field officers report incidents via chatbot, AI pipeline runs automatically |
| **Role-based Access** | Commander / Analyst / Field Officer — different permissions per role |

---

## Stack

- **Frontend** — React 19 + Vite + Tailwind CSS 3
- **Backend** — FastAPI + Pydantic + aiosqlite
- **AI** — Anthropic Claude (`claude-sonnet-4-20250514`) with structured JSON prompts
- **Auth** — JWT with role-based access control (bcrypt password hashing)
- **Maps** — Leaflet + react-leaflet
- **Deployment** — Render (backend) + Vercel (frontend)

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│  React 19 + Vite + Tailwind                      │  ← Frontend
│  Dashboard · IncidentDetail · CopilotChat        │
│  useIncidentState · useAuth · useAlerts (SSE)    │
├─────────────────────────────────────────────────┤
│  FastAPI + Pydantic                              │  ← Backend
│  IncidentStore · ResourceTracker                 │
│  RiskScorer (deterministic) · AlertRouter        │
│  JWT Auth (commander / analyst / field)          │
├─────────────────────────────────────────────────┤
│  Anthropic Claude API                            │  ← AI Layer
│  incident_assessment · resource_allocation       │
│  query_response · situation_brief                │
│  Fallback mode — works without API key           │
├─────────────────────────────────────────────────┤
│  SQLite — auth · JSON — seed data               │  ← Data
│  region_context.txt — India operations doctrine  │
└─────────────────────────────────────────────────┘
```

---

## Quick Start

### 1. Clone

```bash
git clone https://github.com/YOUR_USERNAME/aria-response.git
cd aria-response
```

### 2. Backend

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example ../.env
```

Edit `.env` — set `ANTHROPIC_API_KEY` and `JWT_SECRET`. To run without an API key, set `FALLBACK_MODE=true`.

```bash
uvicorn main:app --reload --port 8000
```

### 3. Seed demo users

```bash
cd ..
python3 -c "
import aiosqlite, asyncio, uuid
from datetime import datetime
from passlib.context import CryptContext
pwd = CryptContext(schemes=['bcrypt'], deprecated='auto')
users = [
    ('commander@aria.gov', 'Commander Singh', 'commander'),
    ('analyst@aria.gov', 'Analyst Sharma', 'analyst'),
    ('field@aria.gov', 'Field Officer Rao', 'field'),
]
async def seed():
    async with aiosqlite.connect('data/aria.db') as db:
        await db.execute('''CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL,
            full_name TEXT NOT NULL, hashed_password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'analyst', created_at TEXT NOT NULL)''')
        for email, name, role in users:
            await db.execute(
                'INSERT OR IGNORE INTO users (id,email,full_name,hashed_password,role,created_at) VALUES (?,?,?,?,?,?)',
                (str(uuid.uuid4()), email, name, pwd.hash('aria2026'), role, datetime.utcnow().isoformat())
            )
        await db.commit()
asyncio.run(seed())
"
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Commander | commander@aria.gov | aria2026 |
| Analyst | analyst@aria.gov | aria2026 |
| Field Officer | field@aria.gov | aria2026 |

**Commander** — full access including resource deployment and status updates
**Analyst** — assessment, briefing, resource management
**Field** — dashboard view and copilot intake only

---

## Environment Variables

```env
ANTHROPIC_API_KEY=sk-ant-...
AI_MODEL=claude-sonnet-4-20250514
AI_TIMEOUT=20
FALLBACK_MODE=false
FRONTEND_URL=http://localhost:5173
JWT_SECRET=your-random-secret
JWT_EXPIRE_HOURS=12
VITE_BACKEND_URL=http://localhost:8000
```

---

## Deployment

**Backend → Render.com**
- Root: `backend`
- Build: `pip install -r requirements.txt`
- Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Set env vars: `ANTHROPIC_API_KEY`, `JWT_SECRET`, `FALLBACK_MODE`, `FRONTEND_URL`

**Frontend → Vercel**
- Root: `frontend`
- Build: `npm run build`
- Output: `dist`
- Env var: `VITE_BACKEND_URL=https://your-render-url.onrender.com`

---

## Fallback Mode

Set `FALLBACK_MODE=true` in `.env` to run without an Anthropic API key. All AI surfaces return realistic data-driven responses generated from live incident and resource state. Every feature works — login, map, scoring, assessment, copilot, briefing.

---

Built with React, FastAPI, and Anthropic Claude.
