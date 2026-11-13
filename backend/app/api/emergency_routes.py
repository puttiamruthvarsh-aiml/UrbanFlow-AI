"""
UrbanFlow AI - Emergency Vehicle Priority API Endpoints
Provides endpoints for:
- Calculating optimal emergency priority corridor routes with A* / Dijkstra
- Live road condition and blockage integration with demo_state.py
- Retrieving candidate nodes and emergency facilities for routing
- Listing active simulated emergency priority corridors
"""

from typing import Dict, Any, Optional, List, Tuple
from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel, Field

from ..core.emergency_router import get_emergency_router
from ..core.demo_state import get_state as get_demo_state

router = APIRouter(prefix="/api/emergency", tags=["Emergency Prioritization"])


class RouteRequest(BaseModel):
    source_node_id: Optional[str] = None
    target_node_id: Optional[str] = None
    vehicle_type: str = Field(default="AMBULANCE", description="AMBULANCE, FIRE, or POLICE")
    source_facility_id: Optional[str] = None
    target_facility_id: Optional[str] = None
    source_coords: Optional[List[float]] = Field(default=None, description="[lon, lat]")
    target_coords: Optional[List[float]] = Field(default=None, description="[lon, lat]")


@router.post("/route")
def calculate_emergency_corridor(request: RouteRequest):
    """
    Calculates the fastest, safest emergency route between source and target.
    Accounts for real-time blocked roads and congestion from shared demo_state.
    Applies simulated green-wave preemption and road hierarchy prioritization.
    """
    router_engine = get_emergency_router()
    shared_state = get_demo_state()
    active_road_conditions = shared_state.get("road_conditions", {})

    s_coords: Optional[Tuple[float, float]] = None
    if request.source_coords and len(request.source_coords) >= 2:
        s_coords = (request.source_coords[0], request.source_coords[1])

    t_coords: Optional[Tuple[float, float]] = None
    if request.target_coords and len(request.target_coords) >= 2:
        t_coords = (request.target_coords[0], request.target_coords[1])

    result = router_engine.compute_emergency_corridor(
        source_node_id=request.source_node_id,
        target_node_id=request.target_node_id,
        vehicle_type=request.vehicle_type,
        source_facility_id=request.source_facility_id,
        target_facility_id=request.target_facility_id,
        source_coords=s_coords,
        target_coords=t_coords,
        road_conditions=active_road_conditions
    )

    if result.get("status") == "ERROR":
        raise HTTPException(status_code=400, detail=result.get("message", "Invalid routing request."))

    return result


@router.get("/nodes")
def get_routing_nodes(area: Optional[str] = Query(None, description="Filter by area")):
    """Returns candidate junction nodes for route endpoint selection."""
    router_engine = get_emergency_router()
    nodes = list(router_engine.nodes.values())
    if area:
        nodes = [n for n in nodes if area.lower() in n.get("area", "").lower()]
    return {
        "status": "success",
        "total_nodes": len(nodes),
        "nodes": sorted(nodes, key=lambda n: n.get("name", ""))
    }


@router.get("/facilities")
def get_routing_facilities(category: Optional[str] = Query(None, description="hospital, police, fire_station")):
    """Returns emergency facilities mapped to nearest network junction nodes."""
    router_engine = get_emergency_router()
    facilities = router_engine.facilities
    if category:
        facilities = [f for f in facilities if f.get("category") == category]

    enriched = []
    for fac in facilities:
        nearest_node, dist = router_engine.find_nearest_node(fac["lat"], fac["lon"])
        enriched.append({
            **fac,
            "nearest_node_id": nearest_node["id"] if nearest_node else None,
            "nearest_node_name": nearest_node["name"] if nearest_node else None,
            "distance_to_network_m": dist
        })

    return {
        "status": "success",
        "total_facilities": len(enriched),
        "facilities": enriched
    }


@router.get("/status")
def get_emergency_system_status():
    """Returns real-time emergency system status, active incidents, and conditions."""
    router_engine = get_emergency_router()
    shared_state = get_demo_state()
    road_conditions = shared_state.get("road_conditions", {})
    incidents = shared_state.get("incidents", [])

    blocked_count = sum(1 for c in road_conditions.values() if c.get("status") == "BLOCKED")
    congested_count = sum(1 for c in road_conditions.values() if c.get("status") == "CONGESTED")

    return {
        "status": "operational",
        "simulation_active": shared_state.get("simulation_active", False),
        "active_incidents_count": len([i for i in incidents if i.get("status") == "ACTIVE"]),
        "blocked_roads_count": blocked_count,
        "congested_roads_count": congested_count,
        "total_network_nodes": len(router_engine.nodes),
        "total_network_edges": len(router_engine.edges),
        "last_state_update": shared_state.get("last_updated")
    }
