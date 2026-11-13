
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from ..core.demo_state import (
    get_state,
    create_incident,
    resolve_incident,
    reset_state
)
from ..core.security import require_role

router = APIRouter(prefix="/api/demo", tags=["Demo Simulation"])


class IncidentRequest(BaseModel):
    road_id: str = Field(min_length=1)
    incident_type: str = "ACCIDENT"
    severity: str = "HIGH"
    description: str = ""


@router.get("/state")
def read_state():
    return get_state()


@router.post("/incidents")
def add_incident(
    request: IncidentRequest,
    user: dict = Depends(require_role("ADMIN"))
):
    if request.severity not in {"LOW", "MEDIUM", "HIGH"}:
        raise HTTPException(400, "Invalid severity")

    return create_incident(
        request.road_id,
        request.incident_type,
        request.severity,
        request.description
    )


@router.post("/incidents/{incident_id}/resolve")
def resolve(
    incident_id: str,
    user: dict = Depends(require_role("ADMIN"))
):
    incident = resolve_incident(incident_id)

    if not incident:
        raise HTTPException(404, "Active incident not found")

    return incident


@router.post("/reset")
def reset(
    user: dict = Depends(require_role("ADMIN"))
):
    reset_state()
    return {"message": "Simulation reset successfully"}
