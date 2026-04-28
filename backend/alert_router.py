"""
Normalizes incoming alert payloads from heterogeneous sources
(IMD webhooks, NDMA feeds, field SMS forms, social triage)
into the standard IncidentCreate schema.
"""

from typing import Optional
from models import IncidentCreate, DisasterType


# ── Source-specific normalizers ────────────────────────────────────────────────

def from_imd_webhook(payload: dict) -> Optional[IncidentCreate]:
    """
    IMD (India Meteorological Department) webhook format.
    Expected keys: alert_type, district, state, severity_code,
                   lat, lon, description
    """
    try:
        disaster_map = {
            "HEAVY_RAIN": DisasterType.flood,
            "CYCLONE": DisasterType.cyclone,
            "EARTHQUAKE": DisasterType.earthquake,
            "LANDSLIDE": DisasterType.landslide,
            "DROUGHT": DisasterType.drought,
        }
        disaster_type = disaster_map.get(payload.get("alert_type", ""), DisasterType.other)
        severity_code = int(payload.get("severity_code", 3))
        severity = min(100, severity_code * 20)  # 1–5 → 20–100

        return IncidentCreate(
            title=f"{disaster_type.value.title()} Alert — {payload['district']}",
            disaster_type=disaster_type,
            severity=severity,
            latitude=float(payload["lat"]),
            longitude=float(payload["lon"]),
            location_name=payload.get("location_name", payload["district"]),
            district=payload["district"],
            state=payload["state"],
            description=payload.get("description", "IMD automated alert"),
            source="imd_webhook",
        )
    except Exception as e:
        print(f"[alert_router] IMD parse error: {e}")
        return None


def from_ndma_feed(payload: dict) -> Optional[IncidentCreate]:
    """
    NDMA (National Disaster Management Authority) feed format.
    Expected keys: event_type, location, severity, coordinates, summary
    """
    try:
        coords = payload.get("coordinates", {})
        return IncidentCreate(
            title=payload.get("event_type", "NDMA Alert"),
            disaster_type=_infer_disaster_type(payload.get("event_type", "")),
            severity=int(payload.get("severity", 50)),
            latitude=float(coords.get("lat", 20.5)),
            longitude=float(coords.get("lon", 78.9)),
            location_name=payload.get("location", "Unknown"),
            district=payload.get("district", "Unknown"),
            state=payload.get("state", "Unknown"),
            description=payload.get("summary", "NDMA automated feed"),
            source="ndma_feed",
        )
    except Exception as e:
        print(f"[alert_router] NDMA parse error: {e}")
        return None


def from_field_form(payload: dict) -> Optional[IncidentCreate]:
    """
    Direct field officer submission — already in our IncidentCreate shape.
    Light validation + source tagging only.
    """
    try:
        return IncidentCreate(
            **{k: v for k, v in payload.items() if k in IncidentCreate.model_fields},
            source="field_report",
        )
    except Exception as e:
        print(f"[alert_router] field form parse error: {e}")
        return None


def normalize(source: str, payload: dict) -> Optional[IncidentCreate]:
    """Route to the correct normalizer based on source identifier."""
    handlers = {
        "imd": from_imd_webhook,
        "ndma": from_ndma_feed,
        "field": from_field_form,
    }
    handler = handlers.get(source)
    if not handler:
        print(f"[alert_router] unknown source: {source}")
        return None
    return handler(payload)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _infer_disaster_type(text: str) -> DisasterType:
    text_lower = text.lower()
    if any(w in text_lower for w in ["flood", "rain", "inundation"]):
        return DisasterType.flood
    if any(w in text_lower for w in ["earthquake", "seismic", "tremor"]):
        return DisasterType.earthquake
    if any(w in text_lower for w in ["cyclone", "storm", "typhoon"]):
        return DisasterType.cyclone
    if any(w in text_lower for w in ["fire", "blaze", "wildfire"]):
        return DisasterType.fire
    if any(w in text_lower for w in ["landslide", "mudslide"]):
        return DisasterType.landslide
    if "drought" in text_lower:
        return DisasterType.drought
    return DisasterType.other
