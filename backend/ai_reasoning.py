import json
from pathlib import Path
from typing import List
from datetime import datetime

import anthropic

from config import get_settings
from models import (
    Incident, Resource, ReasoningOutput, QueryResponse,
    BriefingOutput, ActionRecommendation, Priority
)

PROMPTS_PATH = Path(__file__).parent / "prompts"


def _load_prompt(name: str) -> str:
    return (PROMPTS_PATH / name).read_text()


def _load_region_context() -> str:
    ctx_file = Path(__file__).parent.parent / "data" / "region_context.txt"
    return ctx_file.read_text() if ctx_file.exists() else ""


def _incidents_summary(incidents: List[Incident]) -> str:
    lines = []
    for i in incidents:
        lines.append(
            f"- [{i.id[:8]}] {i.title} | {i.disaster_type.value} | "
            f"severity={i.severity} | {i.location_name}, {i.district}, {i.state} | "
            f"status={i.status.value} | pop={i.affected_population or 'unknown'}"
        )
    return "\n".join(lines) if lines else "No active incidents."


def _resources_summary(resources: List[Resource]) -> str:
    lines = []
    for r in resources:
        lines.append(
            f"- [{r.id[:8]}] {r.name} | {r.resource_type.value} | "
            f"status={r.status.value} | location={r.location_name} | "
            f"assigned_to={r.assigned_incident_id or 'none'}"
        )
    return "\n".join(lines) if lines else "No resources registered."


def _get_client() -> anthropic.Anthropic:
    settings = get_settings()
    return anthropic.Anthropic(api_key=settings.anthropic_api_key)


def _fallback_reasoning(incidents: List[Incident], resources: List[Resource]) -> ReasoningOutput:
    active = [i for i in incidents if i.status == "active"]
    critical = [i for i in active if i.severity >= 70]
    available = [r for r in resources if r.status == "available"]

    risks = [f"{i.title} (SEV {i.severity}) in {i.district} has no assigned resources"
             for i in critical if not any(r.assigned_incident_id == i.id for r in resources)]

    recs = []
    for idx, inc in enumerate(critical[:3]):
        nearby = [r for r in available if r.resource_type.value in ["rescue_team", "medical_unit"]]
        recs.append(ActionRecommendation(
            action_id=f"fallback-{idx+1}",
            priority=Priority.critical if inc.severity >= 80 else Priority.high,
            action=f"Deploy response team to {inc.title}",
            rationale=f"Severity {inc.severity} incident in {inc.district} requires immediate attention",
            resources_needed=[nearby[0].name if nearby else "rescue_team"],
            estimated_impact=f"Reduce risk at {inc.location_name}"
        ))

    if not recs:
        recs.append(ActionRecommendation(
            action_id="fallback-1",
            priority=Priority.medium,
            action="Continue monitoring all active incidents",
            rationale="No critical incidents require immediate deployment",
            resources_needed=[],
            estimated_impact="Maintain situational awareness"
        ))

    return ReasoningOutput(
        assessment_summary=f"{len(active)} active incidents across multiple states. "
                           f"{len(critical)} critical incidents require immediate response. "
                           f"{len(available)} resources currently available for deployment.",
        key_risks=risks if risks else ["Monitor developing situations closely"],
        recommendations=recs,
        assumptions=["All resource availability data is current", "Incident severities are self-reported"],
        projected_outcome="With recommended deployments, critical incident coverage improves within 2-4 hours.",
        confidence=60,
        based_on_incident_ids=[i.id for i in active[:5]],
        based_on_resource_ids=[r.id for r in resources[:5]]
    )


def _fallback_briefing(incidents: List[Incident], resources: List[Resource]) -> BriefingOutput:
    active = [i for i in incidents if i.status == "active"]
    critical = [i for i in active if i.severity >= 70]
    available = [r for r in resources if r.status == "available"]
    deployed = [r for r in resources if r.status == "deployed"]

    return BriefingOutput(
        situation=f"{len(active)} active incidents across India. "
                  f"Highest severity: {max((i.severity for i in active), default=0)}.",
        active_threats=[f"{i.title} — SEV {i.severity} — {i.district}" for i in critical],
        resource_status=f"{len(available)} resources available, {len(deployed)} deployed.",
        immediate_actions=[
            f"Prioritise response to {critical[0].title}" if critical else "Continue monitoring",
            "Verify resource positions",
            "Coordinate with state EOC for critical incidents"
        ],
        outlook="Situation requires active monitoring. "
                "Deploy available resources to critical incidents immediately.",
        generated_at=datetime.utcnow()
    )


async def run_assessment(incidents: List[Incident], resources: List[Resource]) -> ReasoningOutput:
    settings = get_settings()
    if settings.fallback_mode or not settings.anthropic_api_key or settings.anthropic_api_key == "dummy":
        return _fallback_reasoning(incidents, resources)

    try:
        template = _load_prompt("incident_assessment.txt")
        region_ctx = _load_region_context()
        prompt = template.format(
            incidents=_incidents_summary(incidents),
            resources=_resources_summary(resources),
            region_context=region_ctx,
        )
        client = _get_client()
        response = client.messages.create(
            model=settings.ai_model,
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = response.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = json.loads(raw.strip())
        data["based_on_incident_ids"] = [i.id for i in incidents[:5]]
        data["based_on_resource_ids"] = [r.id for r in resources[:5]]
        return ReasoningOutput(**data)
    except Exception as e:
        print(f"[ai_reasoning] assessment failed: {e}")
        return _fallback_reasoning(incidents, resources)


async def run_resource_allocation(incidents: List[Incident], resources: List[Resource]) -> ReasoningOutput:
    settings = get_settings()
    if settings.fallback_mode or not settings.anthropic_api_key or settings.anthropic_api_key == "dummy":
        return _fallback_reasoning(incidents, resources)

    try:
        template = _load_prompt("resource_allocation.txt")
        region_ctx = _load_region_context()
        prompt = template.format(
            incidents=_incidents_summary(incidents),
            resources=_resources_summary(resources),
            region_context=region_ctx,
        )
        client = _get_client()
        response = client.messages.create(
            model=settings.ai_model,
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = response.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = json.loads(raw.strip())
        data["based_on_incident_ids"] = [i.id for i in incidents[:5]]
        data["based_on_resource_ids"] = [r.id for r in resources[:5]]
        return ReasoningOutput(**data)
    except Exception as e:
        print(f"[ai_reasoning] allocation failed: {e}")
        return _fallback_reasoning(incidents, resources)


async def answer_query(question: str, incidents: List[Incident], resources: List[Resource]) -> QueryResponse:
    settings = get_settings()
    if settings.fallback_mode or not settings.anthropic_api_key or settings.anthropic_api_key == "dummy":
        active = [i for i in incidents if i.status == "active"]
        return QueryResponse(
            answer=f"Currently tracking {len(active)} active incidents. "
                   f"Highest priority: {active[0].title if active else 'none'} "
                   f"(SEV {active[0].severity if active else 0}).",
            supporting_points=[
                f"{i.title} — {i.district}, {i.state} — SEV {i.severity}"
                for i in active[:3]
            ],
            confidence=60
        )

    try:
        template = _load_prompt("query_response.txt")
        prompt = template.format(
            question=question,
            incidents=_incidents_summary(incidents),
            resources=_resources_summary(resources),
        )
        client = _get_client()
        response = client.messages.create(
            model=settings.ai_model,
            max_tokens=800,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = response.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = json.loads(raw.strip())
        return QueryResponse(**data)
    except Exception as e:
        print(f"[ai_reasoning] query failed: {e}")
        return QueryResponse(answer=f"Query failed: {str(e)}", confidence=0)


async def generate_briefing(incidents: List[Incident], resources: List[Resource]) -> BriefingOutput:
    settings = get_settings()
    if settings.fallback_mode or not settings.anthropic_api_key or settings.anthropic_api_key == "dummy":
        return _fallback_briefing(incidents, resources)

    try:
        template = _load_prompt("situation_brief.txt")
        region_ctx = _load_region_context()
        prompt = template.format(
            incidents=_incidents_summary(incidents),
            resources=_resources_summary(resources),
            region_context=region_ctx,
        )
        client = _get_client()
        response = client.messages.create(
            model=settings.ai_model,
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = response.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = json.loads(raw.strip())
        data["generated_at"] = datetime.utcnow().isoformat()
        return BriefingOutput(**data)
    except Exception as e:
        print(f"[ai_reasoning] briefing failed: {e}")
        return _fallback_briefing(incidents, resources)
