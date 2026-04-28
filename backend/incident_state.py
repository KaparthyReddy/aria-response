import uuid
import json
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict

from models import Incident, IncidentCreate, IncidentStatus

DATA_PATH = Path(__file__).parent.parent / "data"


class IncidentStore:
    def __init__(self):
        self._incidents: Dict[str, Incident] = {}
        self._subscribers: List = []  # SSE queues

    async def load_seed(self):
        seed_file = DATA_PATH / "seed_incidents.json"
        if seed_file.exists():
            raw = json.loads(seed_file.read_text())
            for item in raw:
                incident = Incident(**item)
                self._incidents[incident.id] = incident

    def all(self) -> List[Incident]:
        return sorted(
            self._incidents.values(),
            key=lambda i: (i.severity * -1, i.created_at),
        )

    def get(self, incident_id: str) -> Optional[Incident]:
        return self._incidents.get(incident_id)

    def active(self) -> List[Incident]:
        return [i for i in self.all() if i.status == IncidentStatus.active]

    def critical(self) -> List[Incident]:
        return [i for i in self.active() if i.severity >= 70]

    def create(self, data: IncidentCreate, reported_by: Optional[str] = None) -> Incident:
        now = datetime.utcnow()
        incident = Incident(
            id=str(uuid.uuid4()),
            **data.model_dump(),
            status=IncidentStatus.active,
            created_at=now,
            updated_at=now,
            reported_by=reported_by,
        )
        self._incidents[incident.id] = incident
        self._notify(f"NEW_INCIDENT:{incident.id}:{incident.title}")
        return incident

    def update_status(self, incident_id: str, status: IncidentStatus) -> Optional[Incident]:
        incident = self._incidents.get(incident_id)
        if not incident:
            return None
        updated = incident.model_copy(update={"status": status, "updated_at": datetime.utcnow()})
        self._incidents[incident_id] = updated
        self._notify(f"INCIDENT_UPDATE:{incident_id}:{status.value}")
        return updated

    def subscribe(self, queue):
        self._subscribers.append(queue)

    def unsubscribe(self, queue):
        self._subscribers.remove(queue)

    def _notify(self, message: str):
        for queue in self._subscribers:
            try:
                queue.put_nowait(message)
            except Exception:
                pass


# Singleton
incident_store = IncidentStore()
