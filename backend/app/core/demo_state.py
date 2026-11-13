
from datetime import datetime, timezone
from threading import RLock
from uuid import uuid4

_lock = RLock()

INITIAL_STATE = {
    "simulation_active": False,
    "incidents": [],
    "road_conditions": {},
    "emergency_vehicles": [],
    "predictions": [],
    "last_updated": None
}

_state = dict(INITIAL_STATE)


def get_state():
    with _lock:
        return {
            **_state,
            "incidents": list(_state["incidents"]),
            "road_conditions": dict(_state["road_conditions"]),
            "emergency_vehicles": list(_state["emergency_vehicles"]),
            "predictions": list(_state["predictions"])
        }


def create_incident(road_id: str, incident_type: str,
                    severity: str, description: str = ""):
    with _lock:
        incident = {
            "incident_id": str(uuid4()),
            "road_id": road_id,
            "type": incident_type,
            "severity": severity,
            "description": description,
            "status": "ACTIVE",
            "source": "ADMIN_SIMULATION",
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        _state["incidents"].append(incident)

        _state["road_conditions"][road_id] = {
            "status": "BLOCKED" if severity == "HIGH"
                      else "CONGESTED",
            "incident_id": incident["incident_id"]
        }

        _state["simulation_active"] = True
        _state["last_updated"] = datetime.now(timezone.utc).isoformat()

        return incident


def resolve_incident(incident_id: str):
    with _lock:
        incident = next(
            (i for i in _state["incidents"]
             if i["incident_id"] == incident_id),
            None
        )

        if not incident or incident["status"] != "ACTIVE":
            return None

        incident["status"] = "RESOLVED"

        road_id = incident["road_id"]

        # Restore only when no other active incident affects this road.
        another_active = any(
            i["road_id"] == road_id and i["status"] == "ACTIVE"
            for i in _state["incidents"]
        )

        if not another_active:
            _state["road_conditions"].pop(road_id, None)

        _state["simulation_active"] = any(
            i["status"] == "ACTIVE" for i in _state["incidents"]
        )
        _state["last_updated"] = datetime.now(timezone.utc).isoformat()

        return incident


def reset_state():
    global _state

    with _lock:
        _state = {
            **INITIAL_STATE,
            "incidents": [],
            "road_conditions": {},
            "emergency_vehicles": [],
            "predictions": []
        }
