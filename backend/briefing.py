from typing import List
from models import Incident, Resource, BriefingOutput
from ai_reasoning import generate_briefing


async def get_briefing(incidents: List[Incident], resources: List[Resource]) -> BriefingOutput:
    """Thin wrapper — briefing logic lives in ai_reasoning."""
    return await generate_briefing(incidents, resources)
