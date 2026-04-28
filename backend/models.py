from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum
from datetime import datetime


# ── Enums ──────────────────────────────────────────────────────────────────────

class DisasterType(str, Enum):
    flood = "flood"
    earthquake = "earthquake"
    cyclone = "cyclone"
    fire = "fire"
    landslide = "landslide"
    industrial = "industrial"
    drought = "drought"
    other = "other"


class IncidentStatus(str, Enum):
    active = "active"
    contained = "contained"
    resolved = "resolved"
    monitoring = "monitoring"


class ResourceType(str, Enum):
    rescue_team = "rescue_team"
    medical_unit = "medical_unit"
    vehicle = "vehicle"
    helicopter = "helicopter"
    supplies = "supplies"
    shelter = "shelter"


class ResourceStatus(str, Enum):
    available = "available"
    deployed = "deployed"
    unavailable = "unavailable"


class UserRole(str, Enum):
    field = "field"
    analyst = "analyst"
    commander = "commander"


class Priority(str, Enum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"


# ── Incidents ──────────────────────────────────────────────────────────────────

class IncidentBase(BaseModel):
    title: str
    disaster_type: DisasterType
    severity: int = Field(..., ge=0, le=100)
    latitude: float
    longitude: float
    location_name: str
    district: str
    state: str
    description: str
    affected_population: Optional[int] = None
    source: str = "field_report"


class IncidentCreate(IncidentBase):
    pass


class Incident(IncidentBase):
    id: str
    status: IncidentStatus = IncidentStatus.active
    created_at: datetime
    updated_at: datetime
    reported_by: Optional[str] = None


# ── Resources ──────────────────────────────────────────────────────────────────

class Resource(BaseModel):
    id: str
    name: str
    resource_type: ResourceType
    status: ResourceStatus
    latitude: float
    longitude: float
    location_name: str
    capacity: Optional[int] = None
    assigned_incident_id: Optional[str] = None
    contact: Optional[str] = None


class ResourceUpdate(BaseModel):
    status: Optional[ResourceStatus] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_name: Optional[str] = None
    assigned_incident_id: Optional[str] = None


# ── Scoring ────────────────────────────────────────────────────────────────────

class Scorecard(BaseModel):
    overall_risk: int = Field(..., ge=0, le=100)
    coverage_gap: int = Field(..., ge=0, le=100)
    resource_readiness: int = Field(..., ge=0, le=100)
    active_incidents: int
    critical_incidents: int
    available_resources: int
    deployed_resources: int


# ── AI Reasoning ───────────────────────────────────────────────────────────────

class ActionRecommendation(BaseModel):
    action_id: str
    priority: Priority
    action: str
    rationale: str
    resources_needed: List[str] = []
    estimated_impact: str


class ReasoningOutput(BaseModel):
    assessment_summary: str
    key_risks: List[str]
    recommendations: List[ActionRecommendation]
    assumptions: List[str]
    projected_outcome: str
    confidence: int = Field(..., ge=0, le=100)
    based_on_incident_ids: List[str] = []
    based_on_resource_ids: List[str] = []


class QueryResponse(BaseModel):
    answer: str
    supporting_points: List[str] = []
    confidence: int = Field(..., ge=0, le=100)


class BriefingOutput(BaseModel):
    situation: str
    active_threats: List[str]
    resource_status: str
    immediate_actions: List[str]
    outlook: str
    generated_at: datetime


# ── World State (full snapshot) ────────────────────────────────────────────────

class WorldState(BaseModel):
    incidents: List[Incident] = []
    resources: List[Resource] = []
    scorecard: Optional[Scorecard] = None
    reasoning: Optional[ReasoningOutput] = None
    alerts: List[str] = []
    last_updated: datetime


# ── Auth ───────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: str
    password: str
    role: UserRole = UserRole.analyst
    full_name: str


class UserLogin(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    role: UserRole


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ── Chatbot / Intake ───────────────────────────────────────────────────────────

class IntakeField(BaseModel):
    key: str
    label: str
    question: str
    input_type: str  # text | number | select | coordinates
    options: Optional[List[str]] = None


class IntakeSubmission(BaseModel):
    title: str
    disaster_type: str
    severity: int
    location_name: str
    district: str
    state: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    description: str
    affected_population: Optional[int] = None


class IntakeReport(BaseModel):
    incident: Incident
    reasoning: ReasoningOutput
    briefing: BriefingOutput
