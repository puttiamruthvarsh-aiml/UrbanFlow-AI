"""
UrbanFlow AI - Dynamic Routing API Router
Exposes REST endpoints for:
- Computing dynamic routes between any source and destination (POST & GET)
- Dijkstra and A* pathfinding algorithms
- Live incident avoidance (BLOCKED roads) and congestion adaptation (CONGESTED roads)
- Emergency vehicle prioritization (green corridor)
- Routable node catalog for frontend selectors
- Routing engine health and status
"""

from typing import List, Optional, Literal
from fastapi import APIRouter, HTTPException, Query

from ..routing.engine import get_routing_engine
from ..routing.schemas import (
    RouteRequest,
    RouteResponse,
    RoutableNode,
    RoutingStatusResponse
)

router = APIRouter(prefix="/api/routing", tags=["Dynamic Routing"])


@router.post("/route", response_model=RouteResponse)
def compute_route(request: RouteRequest):
    """
    Computes optimal route between source and destination using Dijkstra or A*.
    Dynamically accounts for real-time incidents, road closures, and traffic congestion.
    """
    engine = get_routing_engine()
    response = engine.calculate_route(request)
    if response.status == "error":
        raise HTTPException(status_code=400, detail=response.reasoning)
    return response


@router.get("/route", response_model=RouteResponse)
def compute_route_get(
    source: str = Query(..., description="Source junction node ID, name, or lat,lon"),
    destination: str = Query(..., description="Destination junction node ID, name, or lat,lon"),
    algorithm: Literal["a_star", "dijkstra"] = Query("a_star", description="Pathfinding algorithm"),
    preference: Literal["time", "distance"] = Query("time", description="Optimization goal: 'time' or 'distance'"),
    vehicle_type: Literal["standard", "ambulance", "fire", "police"] = Query("standard", description="Vehicle classification"),
    include_alternative: bool = Query(True, description="Whether to include alternative detour route")
):
    """
    Convenience GET endpoint for calculating dynamic routes via URL query parameters.
    """
    engine = get_routing_engine()
    req = RouteRequest(
        source=source,
        destination=destination,
        algorithm=algorithm,
        preference=preference,
        vehicle_type=vehicle_type,
        include_alternative=include_alternative
    )
    response = engine.calculate_route(req)
    if response.status == "error":
        raise HTTPException(status_code=400, detail=response.reasoning)
    return response


@router.get("/nodes", response_model=List[RoutableNode])
def get_routable_nodes():
    """
    Returns list of all 56 junction nodes with geographic coordinates and areas.
    Used by frontend origin/destination selectors.
    """
    engine = get_routing_engine()
    return engine.get_routable_nodes()


@router.get("/status", response_model=RoutingStatusResponse)
def get_routing_status():
    """
    Returns runtime metrics of the dynamic routing engine and active incident count.
    """
    engine = get_routing_engine()
    return engine.get_status()
