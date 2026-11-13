"""
UrbanFlow AI - Dynamic Routing Request & Response Schemas
Defines structured Pydantic models for routing inputs, step-by-step
traversal instructions, GeoJSON route outputs, and dynamic reasoning explanations.
"""

from typing import List, Dict, Any, Optional, Literal
from pydantic import BaseModel, Field


class RouteRequest(BaseModel):
    """Routing computation request model."""
    source: str = Field(
        ...,
        description="Origin junction ID (e.g. 'node_cyber_towers'), hub name, or 'lat,lon'"
    )
    destination: str = Field(
        ...,
        description="Destination junction ID (e.g. 'node_secunderabad_clock_tower'), hub name, or 'lat,lon'"
    )
    algorithm: Literal["a_star", "dijkstra"] = Field(
        default="a_star",
        description="Pathfinding algorithm to execute ('a_star' or 'dijkstra')"
    )
    preference: Literal["time", "distance"] = Field(
        default="time",
        description="Cost metric optimization target ('time' for fastest route or 'distance' for shortest route)"
    )
    vehicle_type: Literal["standard", "ambulance", "fire", "police"] = Field(
        default="standard",
        description="Vehicle classification. Emergency vehicles get signal priority and green wave speed allowances."
    )
    custom_road_conditions: Optional[Dict[str, Dict[str, Any]]] = Field(
        default=None,
        description="Optional manual road condition overrides for simulation testing (e.g. {'road_cyber_kothaguda': {'status': 'BLOCKED'}})"
    )
    include_alternative: bool = Field(
        default=True,
        description="Whether to also calculate a secondary alternative detour route"
    )


class RouteStep(BaseModel):
    """Detailed information for each traversed road segment."""
    step_number: int
    road_id: str
    road_name: str
    highway: str
    from_node: str
    from_name: str
    to_node: str
    to_name: str
    length_m: float
    base_speed_kmh: float
    effective_speed_kmh: float
    travel_time_sec: float
    condition_status: str  # NORMAL, CONGESTED, BLOCKED
    has_signal: bool
    geometry: List[List[float]]


class AlternativeRoute(BaseModel):
    """Secondary or detour route alternative."""
    algorithm: str
    total_distance_m: float
    total_distance_km: float
    estimated_time_sec: float
    estimated_time_min: float
    road_sequence: List[str]
    node_sequence: List[str]
    divergence_explanation: str
    geojson: Optional[Dict[str, Any]] = None


class RouteResponse(BaseModel):
    """Complete dynamic routing output model."""
    status: Literal["success", "no_route_found", "error"]
    algorithm_used: str
    preference: str
    vehicle_type: str
    source_node: str
    source_name: str
    destination_node: str
    destination_name: str
    total_distance_m: float
    total_distance_km: float
    estimated_time_sec: float
    estimated_time_min: float
    road_sequence: List[str]
    node_sequence: List[str]
    steps: List[RouteStep]
    geojson: Dict[str, Any]
    active_incidents_considered: int
    avoided_blocked_roads: List[str]
    congested_roads_encountered: List[str]
    alternative_route: Optional[AlternativeRoute] = None
    reasoning: str


class RoutableNode(BaseModel):
    """Junction node summary for UI selection."""
    id: str
    name: str
    area: str
    node_type: str
    lat: float
    lon: float
    has_signal: bool


class RoutingStatusResponse(BaseModel):
    """Current health and configuration of the routing engine."""
    status: str
    total_nodes: int
    total_directed_edges: int
    supported_algorithms: List[str]
    active_incidents_count: int
    active_blocked_roads: List[str]
    active_congested_roads: List[str]
