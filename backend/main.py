import asyncio
import json
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from config import get_settings
from auth import (
    init_db, create_user, get_user_by_email,
    create_access_token, get_current_user, require_role
)
from models import (
    UserCreate, UserLogin, UserOut, TokenResponse,
    IncidentCreate, IncidentStatus, ResourceUpdate,
    WorldState, UserRole, IntakeSubmission, IntakeReport,
    IntakeField
)
from incident_state import incident_store
from resource_tracker import resource_tracker
from risk_scorer import compute_scorecard, prioritize_incidents
from ai_reasoning import run_assessment, run_resource_allocation, answer_query
from briefing import get_briefing
from alert_router import normalize

settings = get_settings()
app = FastAPI(title="ARIA API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Startup ────────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    await init_db()
    await incident_store.load_seed()
    await resource_tracker.load_registry()


# ── Health ─────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


# ── Auth ───────────────────────────────────────────────────────────────────────

@app.post("/auth/login", response_model=TokenResponse)
async def login(body: UserLogin):
    user_data = await get_user_by_email(body.email)
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    from passlib.context import CryptContext
    pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
    if not pwd.verify(body.password, user_data["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user = UserOut(
        id=user_data["id"],
        email=user_data["email"],
        full_name=user_data["full_name"],
        role=UserRole(user_data["role"])
    )
    token = create_access_token(user)
    return TokenResponse(access_token=token, user=user)


@app.get("/auth/me", response_model=UserOut)
async def me(current_user: UserOut = Depends(get_current_user)):
    return current_user


@app.post("/auth/register", response_model=UserOut)
async def register(
    body: UserCreate,
    current_user: UserOut = Depends(require_role(UserRole.commander))
):
    """Only commanders can create new accounts."""
    return await create_user(body)


# ── State ──────────────────────────────────────────────────────────────────────

@app.get("/state", response_model=WorldState)
async def get_state(current_user: UserOut = Depends(get_current_user)):
    incidents = incident_store.all()
    resources = resource_tracker.all()
    scorecard = compute_scorecard(incidents, resources)
    return WorldState(
        incidents=incidents,
        resources=resources,
        scorecard=scorecard,
        reasoning=None,
        alerts=[],
        last_updated=datetime.utcnow()
    )


# ── Incidents ──────────────────────────────────────────────────────────────────

@app.get("/incidents")
async def list_incidents(current_user: UserOut = Depends(get_current_user)):
    return incident_store.all()


@app.post("/incidents")
async def create_incident(
    body: IncidentCreate,
    current_user: UserOut = Depends(get_current_user)
):
    incident = incident_store.create(body, reported_by=current_user.id)
    return incident


@app.get("/incidents/{incident_id}")
async def get_incident(
    incident_id: str,
    current_user: UserOut = Depends(get_current_user)
):
    incident = incident_store.get(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@app.patch("/incidents/{incident_id}/status")
async def update_incident_status(
    incident_id: str,
    status: IncidentStatus,
    current_user: UserOut = Depends(require_role(UserRole.analyst, UserRole.commander))
):
    updated = incident_store.update_status(incident_id, status)
    if not updated:
        raise HTTPException(status_code=404, detail="Incident not found")
    return updated


# ── Resources ──────────────────────────────────────────────────────────────────

@app.get("/resources")
async def list_resources(current_user: UserOut = Depends(get_current_user)):
    return resource_tracker.all()


@app.patch("/resources/{resource_id}")
async def update_resource(
    resource_id: str,
    body: ResourceUpdate,
    current_user: UserOut = Depends(require_role(UserRole.analyst, UserRole.commander))
):
    updated = resource_tracker.update(resource_id, body)
    if not updated:
        raise HTTPException(status_code=404, detail="Resource not found")
    return updated


@app.post("/resources/{resource_id}/deploy/{incident_id}")
async def deploy_resource(
    resource_id: str,
    incident_id: str,
    current_user: UserOut = Depends(require_role(UserRole.analyst, UserRole.commander))
):
    updated = resource_tracker.deploy(resource_id, incident_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Resource not found")
    return updated


@app.post("/resources/{resource_id}/release")
async def release_resource(
    resource_id: str,
    current_user: UserOut = Depends(require_role(UserRole.analyst, UserRole.commander))
):
    updated = resource_tracker.release(resource_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Resource not found")
    return updated


# ── AI ─────────────────────────────────────────────────────────────────────────

@app.get("/ai/assessment")
async def get_assessment(
    current_user: UserOut = Depends(require_role(UserRole.analyst, UserRole.commander))
):
    incidents = incident_store.active()
    resources = resource_tracker.all()
    return await run_assessment(incidents, resources)


@app.get("/ai/allocation")
async def get_allocation(
    current_user: UserOut = Depends(require_role(UserRole.analyst, UserRole.commander))
):
    incidents = incident_store.active()
    resources = resource_tracker.all()
    return await run_resource_allocation(incidents, resources)


@app.post("/ai/query")
async def query(
    body: dict,
    current_user: UserOut = Depends(get_current_user)
):
    question = body.get("question", "")
    if not question:
        raise HTTPException(status_code=400, detail="question is required")
    incidents = incident_store.all()
    resources = resource_tracker.all()
    return await answer_query(question, incidents, resources)


@app.get("/ai/briefing")
async def briefing(
    current_user: UserOut = Depends(require_role(UserRole.analyst, UserRole.commander))
):
    incidents = incident_store.active()
    resources = resource_tracker.all()
    return await get_briefing(incidents, resources)


# ── Alert webhook (external sources) ──────────────────────────────────────────

@app.post("/alerts/ingest/{source}")
async def ingest_alert(source: str, payload: dict):
    """Receives alerts from IMD, NDMA, or field forms."""
    incident_data = normalize(source, payload)
    if not incident_data:
        raise HTTPException(status_code=422, detail="Could not parse alert payload")
    incident = incident_store.create(incident_data)
    return {"status": "created", "incident_id": incident.id}


# ── Copilot intake ─────────────────────────────────────────────────────────────

@app.get("/copilot/fields", response_model=list[IntakeField])
async def get_intake_fields():
    """Returns the guided intake field definitions for the chatbot."""
    return [
        IntakeField(key="title", label="Incident title",
                    question="What is the name or brief title of this incident?",
                    input_type="text"),
        IntakeField(key="disaster_type", label="Disaster type",
                    question="What type of disaster is this?",
                    input_type="select",
                    options=["flood", "earthquake", "cyclone", "fire", "landslide", "industrial", "drought", "other"]),
        IntakeField(key="severity", label="Severity (0–100)",
                    question="How severe is this incident? (0 = minor, 100 = catastrophic)",
                    input_type="number"),
        IntakeField(key="location_name", label="Location",
                    question="What is the specific location or area name?",
                    input_type="text"),
        IntakeField(key="district", label="District",
                    question="Which district is this in?",
                    input_type="text"),
        IntakeField(key="state", label="State",
                    question="Which state?",
                    input_type="text"),
        IntakeField(key="description", label="Description",
                    question="Describe the situation — what is happening on the ground?",
                    input_type="text"),
        IntakeField(key="affected_population", label="Affected population",
                    question="Approximately how many people are affected? (leave blank if unknown)",
                    input_type="number"),
    ]


@app.post("/copilot/submit", response_model=IntakeReport)
async def submit_intake(
    body: IntakeSubmission,
    current_user: UserOut = Depends(get_current_user)
):
    """Accepts completed intake, creates incident, runs full AI pipeline."""
    from models import IncidentCreate, DisasterType
    incident_data = IncidentCreate(
        title=body.title,
        disaster_type=DisasterType(body.disaster_type),
        severity=body.severity,
        latitude=body.latitude or 20.5937,
        longitude=body.longitude or 78.9629,
        location_name=body.location_name,
        district=body.district,
        state=body.state,
        description=body.description,
        affected_population=body.affected_population,
        source="copilot_intake",
    )
    incident = incident_store.create(incident_data, reported_by=current_user.id)
    incidents = incident_store.active()
    resources = resource_tracker.all()
    reasoning = await run_assessment(incidents, resources)
    briefing_out = await get_briefing(incidents, resources)
    return IntakeReport(incident=incident, reasoning=reasoning, briefing=briefing_out)


# ── SSE — live alert stream ────────────────────────────────────────────────────

@app.get("/stream/alerts")
async def stream_alerts(current_user: UserOut = Depends(get_current_user)):
    import asyncio
    queue: asyncio.Queue = asyncio.Queue()
    incident_store.subscribe(queue)

    async def event_generator():
        try:
            while True:
                try:
                    message = await asyncio.wait_for(queue.get(), timeout=30)
                    yield f"data: {message}\n\n"
                except asyncio.TimeoutError:
                    yield "data: ping\n\n"
        finally:
            incident_store.unsubscribe(queue)

    return StreamingResponse(event_generator(), media_type="text/event-stream")
