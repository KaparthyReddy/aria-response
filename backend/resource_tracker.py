import json
import uuid
from pathlib import Path
from typing import List, Optional, Dict

from models import Resource, ResourceUpdate, ResourceStatus, ResourceType

DATA_PATH = Path(__file__).parent.parent / "data"


class ResourceTracker:
    def __init__(self):
        self._resources: Dict[str, Resource] = {}

    async def load_registry(self):
        reg_file = DATA_PATH / "resource_registry.json"
        if reg_file.exists():
            raw = json.loads(reg_file.read_text())
            for item in raw:
                resource = Resource(**item)
                self._resources[resource.id] = resource

    def all(self) -> List[Resource]:
        return list(self._resources.values())

    def get(self, resource_id: str) -> Optional[Resource]:
        return self._resources.get(resource_id)

    def available(self) -> List[Resource]:
        return [r for r in self.all() if r.status == ResourceStatus.available]

    def deployed(self) -> List[Resource]:
        return [r for r in self.all() if r.status == ResourceStatus.deployed]

    def by_type(self, resource_type: ResourceType) -> List[Resource]:
        return [r for r in self.all() if r.resource_type == resource_type]

    def available_by_type(self, resource_type: ResourceType) -> List[Resource]:
        return [r for r in self.available() if r.resource_type == resource_type]

    def assigned_to(self, incident_id: str) -> List[Resource]:
        return [r for r in self.all() if r.assigned_incident_id == incident_id]

    def update(self, resource_id: str, update: ResourceUpdate) -> Optional[Resource]:
        resource = self._resources.get(resource_id)
        if not resource:
            return None
        updated = resource.model_copy(update=update.model_dump(exclude_none=True))
        self._resources[resource_id] = updated
        return updated

    def deploy(self, resource_id: str, incident_id: str) -> Optional[Resource]:
        return self.update(resource_id, ResourceUpdate(
            status=ResourceStatus.deployed,
            assigned_incident_id=incident_id
        ))

    def release(self, resource_id: str) -> Optional[Resource]:
        return self.update(resource_id, ResourceUpdate(
            status=ResourceStatus.available,
            assigned_incident_id=None
        ))

    def summary(self) -> dict:
        all_r = self.all()
        return {
            "total": len(all_r),
            "available": len(self.available()),
            "deployed": len(self.deployed()),
            "by_type": {
                rt.value: {
                    "total": len(self.by_type(rt)),
                    "available": len(self.available_by_type(rt))
                }
                for rt in ResourceType
            }
        }


# Singleton
resource_tracker = ResourceTracker()
