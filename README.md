# ARIA — Adaptive Response Intelligence for Agencies

AI-native disaster response intelligence platform. Fuses live incident data, resource state, and field reports into one explainable decision surface for commanders and analysts.

## Stack
- **Frontend**: React 19 + Vite + Tailwind CSS
- **Backend**: FastAPI + Pydantic + SQLite
- **AI**: Anthropic Claude (structured reasoning, resource allocation, Q&A)
- **Auth**: JWT with role-based access (field / analyst / commander)

## Quick Start

### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example ../.env       # Fill in your API key and JWT secret
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

### Demo credentials
| Role | Email | Password |
|------|-------|----------|
| Commander | commander@aria.gov | aria2026 |
| Analyst | analyst@aria.gov | aria2026 |
| Field Officer | field@aria.gov | aria2026 |

## Environment Variables
See `.env.example` for all required variables.

## Deployment
- Backend → Render.com (see `render.yaml`)
- Frontend → Vercel (root: `frontend`, build: `npm run build`, output: `dist`)
