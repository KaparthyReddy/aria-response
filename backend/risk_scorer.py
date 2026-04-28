from typing import List
from models import Incident, Resource, Scorecard, IncidentStatus, ResourceStatus


def compute_scorecard(incidents: List[Incident], resources: List[Resource]) -> Scorecard:
    active = [i for i in incidents if i.status == IncidentStatus.active]
    critical = [i for i in active if i.severity >= 70]

    available_resources = [r for r in resources if r.status == ResourceStatus.available]
    deployed_resources = [r for r in resources if r.status == ResourceStatus.deployed]

    # Overall risk: weighted avg severity of active incidents
    if active:
        overall_risk = int(
            sum(i.severity * _severity_weight(i.severity) for i in active)
            / sum(_severity_weight(i.severity) for i in active)
        )
    else:
        overall_risk = 0

    # Coverage gap: ratio of critical incidents without assigned resources
    if critical:
        covered = sum(
            1 for i in critical
            if any(r.assigned_incident_id == i.id for r in deployed_resources)
        )
        coverage_gap = int((1 - covered / len(critical)) * 100)
    else:
        coverage_gap = 0

    # Resource readiness: ratio of available to total
    total_resources = len(resources)
    if total_resources > 0:
        resource_readiness = int((len(available_resources) / total_resources) * 100)
    else:
        resource_readiness = 0

    return Scorecard(
        overall_risk=overall_risk,
        coverage_gap=coverage_gap,
        resource_readiness=resource_readiness,
        active_incidents=len(active),
        critical_incidents=len(critical),
        available_resources=len(available_resources),
        deployed_resources=len(deployed_resources),
    )


def _severity_weight(severity: int) -> float:
    """Higher severity incidents count more toward overall risk."""
    if severity >= 80:
        return 2.0
    elif severity >= 60:
        return 1.5
    elif severity >= 40:
        return 1.0
    return 0.5


def prioritize_incidents(incidents: List[Incident]) -> List[Incident]:
    """Sort incidents by urgency score (severity + recency bonus)."""
    def urgency(incident: Incident) -> float:
        base = incident.severity
        population_bonus = min(10, (incident.affected_population or 0) / 10000)
        return base + population_bonus

    active = [i for i in incidents if i.status == "active"]
    return sorted(active, key=urgency, reverse=True)
