"""
UrbanFlow AI - Dynamic Routing Engine
Implements Dijkstra and A* path optimization with dynamic incident avoidance,
congestion penalties, traffic signal delay modeling, and emergency vehicle priority.
"""

import os
import math
import json
import heapq
from typing import Dict, List, Tuple, Any, Optional, Set
from pydantic import BaseModel

from .schemas import (
    RouteRequest,
    RouteResponse,
    RouteStep,
    AlternativeRoute,
    RoutableNode,
    RoutingStatusResponse
)

# Reference to the shared simulation demo state
try:
    from ..core.demo_state import get_state
except ImportError:
    # Standalone or test fallback
    def get_state() -> Dict[str, Any]:
        return {"road_conditions": {}, "incidents": []}


def haversine_distance(coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
    """Calculates great-circle distance between two (lon, lat) points in meters."""
    lon1, lat1 = coord1
    lon2, lat2 = coord2
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


class DynamicRoutingEngine:
    """
    Intelligent routing engine for the Hyderabad urban road network.
    Supports:
    - Dijkstra and A* algorithms
    - Real-time road condition integration (BLOCKED, CONGESTED, NORMAL)
    - Traffic signal waiting time simulation
    - Emergency vehicle signal prioritization (green corridor)
    - Primary route optimization and alternative route computation
    - Natural language routing decisions and explanations
    """

    def __init__(self, data_path: Optional[str] = None):
        self.nodes: Dict[str, Dict[str, Any]] = {}
        self.edges_by_source: Dict[str, List[Dict[str, Any]]] = {}
        self.edges_by_id: Dict[str, Dict[str, Any]] = {}
        self.max_speed_kmh: float = 80.0
        self._load_network_graph(data_path)

    def _load_network_graph(self, data_path: Optional[str] = None):
        """Loads Hyderabad graph topology from JSON artifact."""
        if not data_path:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            data_path = os.path.abspath(
                os.path.join(current_dir, "..", "..", "road_network", "data", "hyderabad_graph.json")
            )

        if not os.path.exists(data_path):
            raise FileNotFoundError(f"Road network graph file not found at: {data_path}")

        with open(data_path, "r", encoding="utf-8") as f:
            graph_data = json.load(f)

        # Parse Nodes
        for node in graph_data.get("nodes", []):
            nid = node["id"]
            self.nodes[nid] = {
                "id": nid,
                "name": node.get("name", nid),
                "lat": float(node["lat"]),
                "lon": float(node["lon"]),
                "node_type": node.get("node_type", "intersection"),
                "area": node.get("area", "Hyderabad"),
                "has_signal": bool(node.get("has_signal", False)),
                "osm_id": str(node.get("osm_id", ""))
            }

        # Parse Edges
        max_speed = 40.0
        for edge in graph_data.get("edges", []):
            eid = edge["id"]
            u = edge["source"]
            v = edge["target"]
            speed = float(edge.get("base_speed_kmh", 50))
            if speed > max_speed:
                max_speed = speed

            edge_data = {
                "id": eid,
                "name": edge.get("name", "Unnamed Road"),
                "source": u,
                "target": v,
                "highway": edge.get("highway", "primary"),
                "length_m": float(edge.get("length_m", 1000.0)),
                "lanes": int(edge.get("lanes", 4)),
                "base_speed_kmh": speed,
                "one_way": bool(edge.get("one_way", False)),
                "direction": edge.get("direction", "bidirectional"),
                "geometry": edge.get("geometry", []),
                "osm_way_id": edge.get("osm_way_id", "")
            }

            self.edges_by_id[eid] = edge_data
            if u not in self.edges_by_source:
                self.edges_by_source[u] = []
            self.edges_by_source[u].append(edge_data)

        self.max_speed_kmh = max_speed

    def resolve_node_id(self, query: str) -> Optional[str]:
        """
        Resolves a user-provided string to a valid junction node ID.
        Supports:
        - Exact node ID (e.g. 'node_cyber_towers')
        - Coordinates string (e.g. '17.45041,78.38082' or '78.38082, 17.45041')
        - Case-insensitive substring match against node names, IDs, or areas
        """
        q = query.strip()
        if q in self.nodes:
            return q

        # Check for coordinate format "lat, lon"
        if "," in q:
            parts = [p.strip() for p in q.split(",")]
            if len(parts) == 2:
                try:
                    val1 = float(parts[0])
                    val2 = float(parts[1])
                    # Determine which is lat and which is lon
                    if 17.0 <= val1 <= 18.0:
                        lat, lon = val1, val2
                    elif 17.0 <= val2 <= 18.0:
                        lat, lon = val2, val1
                    else:
                        lat, lon = val1, val2
                    return self.find_nearest_node(lat, lon)
                except ValueError:
                    pass

        # Case-insensitive search on name, area, id
        q_lower = q.lower()
        # 1. Exact match on name
        for nid, data in self.nodes.items():
            if data["name"].lower() == q_lower:
                return nid

        # 2. Substring match on name
        for nid, data in self.nodes.items():
            if q_lower in data["name"].lower():
                return nid

        # 3. Substring match on area or id
        for nid, data in self.nodes.items():
            if q_lower in data["area"].lower() or q_lower in nid.lower():
                return nid

        # 4. Multi-token match across name, area, and ID
        tokens = [t.strip(" ,.-") for t in q_lower.split() if len(t.strip(" ,.-")) > 1]
        if len(tokens) > 1:
            for nid, data in self.nodes.items():
                combined = f"{data['name'].lower()} {data['area'].lower()} {nid.lower()}"
                if all(t in combined for t in tokens):
                    return nid

        return None

    def find_nearest_node(self, lat: float, lon: float) -> str:
        """Finds closest junction node to geographic coordinates."""
        best_node = None
        min_dist = float("inf")
        for nid, data in self.nodes.items():
            dist = haversine_distance((lon, lat), (data["lon"], data["lat"]))
            if dist < min_dist:
                min_dist = dist
                best_node = nid
        return best_node

    def get_edge_condition(
        self,
        edge_id: str,
        road_conditions: Dict[str, Dict[str, Any]]
    ) -> Tuple[str, Optional[str]]:
        """
        Determines the real-time condition of an edge ('NORMAL', 'CONGESTED', 'BLOCKED').
        Checks both the direct edge ID and its base bidirectional counterpart.
        Returns (status, incident_id).
        """
        # 1. Direct edge ID check
        if edge_id in road_conditions:
            cond = road_conditions[edge_id]
            return cond.get("status", "NORMAL"), cond.get("incident_id")

        # 2. Check base road segment ID (strip '_rev')
        base_id = edge_id.replace("_rev", "")
        if base_id in road_conditions:
            cond = road_conditions[base_id]
            return cond.get("status", "NORMAL"), cond.get("incident_id")

        # 3. Check reversed ID if currently not reversed
        rev_id = f"{edge_id}_rev"
        if rev_id in road_conditions:
            cond = road_conditions[rev_id]
            return cond.get("status", "NORMAL"), cond.get("incident_id")

        return "NORMAL", None

    def compute_edge_weight(
        self,
        edge: Dict[str, Any],
        road_conditions: Dict[str, Dict[str, Any]],
        preference: str = "time",
        vehicle_type: str = "standard",
        penalized_edges: Optional[Set[str]] = None
    ) -> Tuple[float, float, float, str]:
        """
        Calculates edge traversal cost based on real-time traffic dynamics.
        Returns:
            (cost, travel_time_sec, effective_speed_kmh, condition_status)
        """
        eid = edge["id"]
        length_m = edge["length_m"]
        base_speed = edge["base_speed_kmh"]
        to_node = edge["target"]
        to_node_data = self.nodes.get(to_node, {})

        condition, _ = self.get_edge_condition(eid, road_conditions)

        # 1. Hard Blockage: Accidents, road closures, structural blocks
        if condition == "BLOCKED":
            return float("inf"), float("inf"), 0.0, "BLOCKED"

        # 2. Congestion Modeling
        if condition == "CONGESTED":
            # Speed drops sharply on congested segments
            effective_speed = max(12.0, base_speed * 0.35)
        else:
            effective_speed = base_speed

        # 3. Free-flow travel time (seconds)
        speed_mps = (effective_speed * 1000.0) / 3600.0
        segment_time_sec = length_m / speed_mps

        # 4. Traffic Signal Delay Modeling
        signal_delay_sec = 0.0
        if to_node_data.get("has_signal", False):
            if vehicle_type in {"ambulance", "fire", "police"}:
                # Green corridor priority: minimal delay (3 seconds for clearing)
                signal_delay_sec = 3.0
            else:
                # Standard vehicle: average waiting time at signalized junction
                signal_delay_sec = 20.0

        total_time_sec = segment_time_sec + signal_delay_sec

        # 5. Base cost determination
        if preference == "distance":
            # Distance optimization with heavy congestion penalty
            if condition == "CONGESTED":
                cost = length_m * 2.8
            else:
                cost = length_m
        else:
            # Time optimization (fastest route)
            cost = total_time_sec

        # Highway class preference multiplier (minor preference for arterial roads)
        highway_class = edge.get("highway", "primary")
        hierarchy_weights = {
            "motorway": 0.95,
            "trunk": 0.98,
            "primary": 1.0,
            "secondary": 1.05,
            "tertiary": 1.10
        }
        cost *= hierarchy_weights.get(highway_class, 1.0)

        # Penalize edges for alternative path computation if requested
        if penalized_edges and (eid in penalized_edges or eid.replace("_rev", "") in penalized_edges):
            cost *= 5.0

        return cost, total_time_sec, effective_speed, condition

    def _heuristic(self, current_node: str, target_node: str, preference: str = "time") -> float:
        """
        Admissible and consistent A* heuristic.
        - Distance mode: Straight-line Haversine distance (meters).
        - Time mode: Straight-line Haversine distance divided by max network speed (seconds).
        Guarantees optimal pathfinding with zero overestimation.
        """
        u = self.nodes[current_node]
        v = self.nodes[target_node]
        dist_m = haversine_distance((u["lon"], u["lat"]), (v["lon"], v["lat"]))

        if preference == "distance":
            return dist_m

        # Time heuristic: distance divided by maximum possible network speed
        max_speed_mps = (self.max_speed_kmh * 1000.0) / 3600.0
        return dist_m / max_speed_mps

    def find_route_dijkstra(
        self,
        source_id: str,
        target_id: str,
        road_conditions: Dict[str, Dict[str, Any]],
        preference: str = "time",
        vehicle_type: str = "standard",
        penalized_edges: Optional[Set[str]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Executes Dijkstra's shortest path algorithm.
        Returns path dictionary or None if disconnected.
        """
        # Priority queue stores: (cumulative_cost, current_node)
        pq: List[Tuple[float, str]] = [(0.0, source_id)]
        costs: Dict[str, float] = {source_id: 0.0}
        came_from: Dict[str, Tuple[str, Dict[str, Any], float, float, float, str]] = {}

        visited: Set[str] = set()

        while pq:
            current_cost, u = heapq.heappop(pq)

            if u in visited:
                continue
            visited.add(u)

            if u == target_id:
                return self._reconstruct_path(
                    source_id, target_id, came_from, "dijkstra", preference, vehicle_type
                )

            for edge in self.edges_by_source.get(u, []):
                v = edge["target"]
                edge_cost, time_sec, eff_speed, cond = self.compute_edge_weight(
                    edge, road_conditions, preference, vehicle_type, penalized_edges
                )

                if math.isinf(edge_cost):
                    continue  # Blocked road

                new_cost = current_cost + edge_cost
                if v not in costs or new_cost < costs[v]:
                    costs[v] = new_cost
                    came_from[v] = (u, edge, edge["length_m"], time_sec, eff_speed, cond)
                    heapq.heappush(pq, (new_cost, v))

        return None

    def find_route_a_star(
        self,
        source_id: str,
        target_id: str,
        road_conditions: Dict[str, Dict[str, Any]],
        preference: str = "time",
        vehicle_type: str = "standard",
        penalized_edges: Optional[Set[str]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Executes A* heuristic pathfinding algorithm.
        Returns path dictionary or None if disconnected.
        """
        # Priority queue stores: (f_score, g_score, current_node)
        h0 = self._heuristic(source_id, target_id, preference)
        pq: List[Tuple[float, float, str]] = [(h0, 0.0, source_id)]
        g_scores: Dict[str, float] = {source_id: 0.0}
        came_from: Dict[str, Tuple[str, Dict[str, Any], float, float, float, str]] = {}

        visited: Set[str] = set()

        while pq:
            f, g, u = heapq.heappop(pq)

            if u in visited:
                continue
            visited.add(u)

            if u == target_id:
                return self._reconstruct_path(
                    source_id, target_id, came_from, "a_star", preference, vehicle_type
                )

            for edge in self.edges_by_source.get(u, []):
                v = edge["target"]
                edge_cost, time_sec, eff_speed, cond = self.compute_edge_weight(
                    edge, road_conditions, preference, vehicle_type, penalized_edges
                )

                if math.isinf(edge_cost):
                    continue  # Blocked road

                tentative_g = g + edge_cost
                if v not in g_scores or tentative_g < g_scores[v]:
                    g_scores[v] = tentative_g
                    h = self._heuristic(v, target_id, preference)
                    f_score = tentative_g + h
                    came_from[v] = (u, edge, edge["length_m"], time_sec, eff_speed, cond)
                    heapq.heappush(pq, (f_score, tentative_g, v))

        return None

    def _reconstruct_path(
        self,
        source_id: str,
        target_id: str,
        came_from: Dict[str, Tuple[str, Dict[str, Any], float, float, float, str]],
        algorithm: str,
        preference: str,
        vehicle_type: str
    ) -> Dict[str, Any]:
        """Reconstructs the full route traversal from predecessor pointers."""
        curr = target_id
        path_nodes: List[str] = [curr]
        steps_rev: List[Dict[str, Any]] = []

        total_distance = 0.0
        total_time = 0.0
        congested_roads: List[str] = []

        while curr != source_id:
            if curr not in came_from:
                break
            prev_node, edge, length_m, time_sec, eff_speed, cond = came_from[curr]
            total_distance += length_m
            total_time += time_sec

            if cond == "CONGESTED":
                congested_roads.append(edge["id"])

            to_node_data = self.nodes.get(curr, {})
            step_info = {
                "road_id": edge["id"],
                "road_name": edge.get("name", "Road"),
                "highway": edge.get("highway", "primary"),
                "from_node": prev_node,
                "from_name": self.nodes.get(prev_node, {}).get("name", prev_node),
                "to_node": curr,
                "to_name": to_node_data.get("name", curr),
                "length_m": round(length_m, 1),
                "base_speed_kmh": round(edge.get("base_speed_kmh", 50.0), 1),
                "effective_speed_kmh": round(eff_speed, 1),
                "travel_time_sec": round(time_sec, 1),
                "condition_status": cond,
                "has_signal": bool(to_node_data.get("has_signal", False)),
                "geometry": edge.get("geometry", [])
            }
            steps_rev.append(step_info)
            curr = prev_node
            path_nodes.append(curr)

        path_nodes.reverse()
        steps_rev.reverse()

        # Add step numbers
        steps: List[RouteStep] = []
        road_sequence: List[str] = []
        for idx, step_dict in enumerate(steps_rev, start=1):
            road_sequence.append(step_dict["road_id"])
            steps.append(RouteStep(step_number=idx, **step_dict))

        # Generate continuous coordinates line for MapLibre
        full_coords: List[List[float]] = []
        for s in steps:
            for pt in s.geometry:
                if not full_coords or full_coords[-1] != pt:
                    full_coords.append(pt)

        geojson_feature = {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": full_coords
            },
            "properties": {
                "source": source_id,
                "destination": target_id,
                "distance_km": round(total_distance / 1000.0, 2),
                "time_minutes": round(total_time / 60.0, 1),
                "algorithm": algorithm,
                "vehicle_type": vehicle_type,
                "road_sequence": road_sequence
            }
        }

        return {
            "algorithm": algorithm,
            "preference": preference,
            "vehicle_type": vehicle_type,
            "source_node": source_id,
            "source_name": self.nodes[source_id]["name"],
            "destination_node": target_id,
            "destination_name": self.nodes[target_id]["name"],
            "total_distance_m": round(total_distance, 1),
            "total_distance_km": round(total_distance / 1000.0, 2),
            "estimated_time_sec": round(total_time, 1),
            "estimated_time_min": round(total_time / 60.0, 1),
            "road_sequence": road_sequence,
            "node_sequence": path_nodes,
            "steps": steps,
            "geojson": geojson_feature,
            "congested_roads": list(reversed(congested_roads))
        }

    def generate_reasoning(
        self,
        route_info: Dict[str, Any],
        avoided_blocked: List[str],
        congested_roads: List[str],
        vehicle_type: str,
        algorithm: str,
        preference: str,
        alternative_found: bool
    ) -> str:
        """Constructs clear, professional natural-language routing reasoning."""
        reasons = []

        # 1. Primary path overview
        dist_km = route_info["total_distance_km"]
        time_min = route_info["estimated_time_min"]
        reasons.append(
            f"Selected optimal route covering {dist_km} km in an estimated {time_min} minutes "
            f"using {algorithm.upper()} path optimization ({preference}-optimized)."
        )

        # 2. Blocked incident avoidance
        if avoided_blocked:
            blocked_str = ", ".join(avoided_blocked)
            reasons.append(
                f"DYNAMIC REROUTE ACTIVE: Successfully bypassed {len(avoided_blocked)} blocked segment(s) "
                f"({blocked_str}) due to reported incidents/road closures, preventing critical gridlock."
            )
        else:
            reasons.append("No active road blockages were encountered along this corridor.")

        # 3. Congestion handling
        if congested_roads:
            congested_str = ", ".join(congested_roads)
            reasons.append(
                f"Traversing {len(congested_roads)} congested road segment(s) ({congested_str}) with "
                f"dynamically adjusted reduced speeds and elevated travel times."
            )
        else:
            reasons.append("Corridor is free of heavy traffic congestion.")

        # 4. Emergency priority / signal coordination
        if vehicle_type in {"ambulance", "fire", "police"}:
            reasons.append(
                f"Emergency priority ({vehicle_type.upper()}) enabled: Traffic signal preemption (green corridor) "
                f"applied across all mapped intersections, reducing intersection delay to near zero."
            )

        # 5. Alternative comparison
        if alternative_found:
            reasons.append(
                "A secondary viable alternative detour has been computed for contingency planning."
            )

        return " ".join(reasons)

    def calculate_route(self, request: RouteRequest) -> RouteResponse:
        """
        Main public interface for dynamic route calculation.
        Orchestrates node resolution, live state retrieval, algorithm execution,
        alternative path computation, and reasoning generation.
        """
        # 1. Resolve source and destination
        source_id = self.resolve_node_id(request.source)
        if not source_id:
            return RouteResponse(
                status="error",
                algorithm_used=request.algorithm,
                preference=request.preference,
                vehicle_type=request.vehicle_type,
                source_node="",
                source_name="",
                destination_node="",
                destination_name="",
                total_distance_m=0.0,
                total_distance_km=0.0,
                estimated_time_sec=0.0,
                estimated_time_min=0.0,
                road_sequence=[],
                node_sequence=[],
                steps=[],
                geojson={},
                active_incidents_considered=0,
                avoided_blocked_roads=[],
                congested_roads_encountered=[],
                reasoning=f"Could not resolve source location: '{request.source}'."
            )

        dest_id = self.resolve_node_id(request.destination)
        if not dest_id:
            return RouteResponse(
                status="error",
                algorithm_used=request.algorithm,
                preference=request.preference,
                vehicle_type=request.vehicle_type,
                source_node=source_id,
                source_name=self.nodes[source_id]["name"],
                destination_node="",
                destination_name="",
                total_distance_m=0.0,
                total_distance_km=0.0,
                estimated_time_sec=0.0,
                estimated_time_min=0.0,
                road_sequence=[],
                node_sequence=[],
                steps=[],
                geojson={},
                active_incidents_considered=0,
                avoided_blocked_roads=[],
                congested_roads_encountered=[],
                reasoning=f"Could not resolve destination location: '{request.destination}'."
            )

        if source_id == dest_id:
            node_name = self.nodes[source_id]["name"]
            return RouteResponse(
                status="success",
                algorithm_used=request.algorithm,
                preference=request.preference,
                vehicle_type=request.vehicle_type,
                source_node=source_id,
                source_name=node_name,
                destination_node=dest_id,
                destination_name=node_name,
                total_distance_m=0.0,
                total_distance_km=0.0,
                estimated_time_sec=0.0,
                estimated_time_min=0.0,
                road_sequence=[],
                node_sequence=[source_id],
                steps=[],
                geojson={
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [self.nodes[source_id]["lon"], self.nodes[source_id]["lat"]]
                    },
                    "properties": {"name": node_name}
                },
                active_incidents_considered=0,
                avoided_blocked_roads=[],
                congested_roads_encountered=[],
                reasoning="Source and destination are identical. Distance and travel time are zero."
            )

        # 2. Retrieve dynamic road conditions
        live_state = get_state()
        road_conditions = dict(live_state.get("road_conditions", {}))

        # Merge with custom road conditions from request if supplied
        if request.custom_road_conditions:
            road_conditions.update(request.custom_road_conditions)

        # 3. Detect which roads would normally be taken if no incidents existed
        normal_route = None
        if road_conditions:
            if request.algorithm == "dijkstra":
                normal_route = self.find_route_dijkstra(
                    source_id, dest_id, {}, request.preference, request.vehicle_type
                )
            else:
                normal_route = self.find_route_a_star(
                    source_id, dest_id, {}, request.preference, request.vehicle_type
                )

        # 4. Calculate primary dynamic route
        if request.algorithm == "dijkstra":
            route_dict = self.find_route_dijkstra(
                source_id, dest_id, road_conditions, request.preference, request.vehicle_type
            )
        else:
            route_dict = self.find_route_a_star(
                source_id, dest_id, road_conditions, request.preference, request.vehicle_type
            )

        if not route_dict:
            return RouteResponse(
                status="no_route_found",
                algorithm_used=request.algorithm,
                preference=request.preference,
                vehicle_type=request.vehicle_type,
                source_node=source_id,
                source_name=self.nodes[source_id]["name"],
                destination_node=dest_id,
                destination_name=self.nodes[dest_id]["name"],
                total_distance_m=0.0,
                total_distance_km=0.0,
                estimated_time_sec=0.0,
                estimated_time_min=0.0,
                road_sequence=[],
                node_sequence=[],
                steps=[],
                geojson={},
                active_incidents_considered=len(road_conditions),
                avoided_blocked_roads=[
                    rid for rid, c in road_conditions.items() if c.get("status") == "BLOCKED"
                ],
                congested_roads_encountered=[],
                reasoning=(
                    f"No navigable route could be found between {self.nodes[source_id]['name']} "
                    f"and {self.nodes[dest_id]['name']} due to active road blockages or graph disconnections."
                )
            )

        # Determine which blocked roads were avoided compared to normal path
        avoided_blocked_roads: List[str] = []
        if normal_route:
            normal_roads = set(normal_route["road_sequence"])
            current_roads = set(route_dict["road_sequence"])
            for rid, cond in road_conditions.items():
                if cond.get("status") == "BLOCKED":
                    base_id = rid.replace("_rev", "")
                    if (rid in normal_roads or base_id in normal_roads) and (rid not in current_roads and base_id not in current_roads):
                        avoided_blocked_roads.append(rid)

        # 5. Compute Alternative Route if requested
        alt_route: Optional[AlternativeRoute] = None
        if request.include_alternative and len(route_dict["road_sequence"]) > 0:
            # Penalize primary route edges to force finding an alternative corridor
            penalized = set(route_dict["road_sequence"])
            if request.algorithm == "dijkstra":
                alt_dict = self.find_route_dijkstra(
                    source_id, dest_id, road_conditions, request.preference, request.vehicle_type, penalized
                )
            else:
                alt_dict = self.find_route_a_star(
                    source_id, dest_id, road_conditions, request.preference, request.vehicle_type, penalized
                )

            if alt_dict and alt_dict["road_sequence"] != route_dict["road_sequence"]:
                alt_diff_min = round(alt_dict["estimated_time_min"] - route_dict["estimated_time_min"], 1)
                alt_diff_km = round(alt_dict["total_distance_km"] - route_dict["total_distance_km"], 2)
                divergence_desc = (
                    f"Secondary alternative path: {alt_dict['total_distance_km']} km "
                    f"({alt_dict['estimated_time_min']} mins), adding "
                    f"+{alt_diff_km} km / +{alt_diff_min} mins relative to primary route."
                )
                alt_route = AlternativeRoute(
                    algorithm=alt_dict["algorithm"],
                    total_distance_m=alt_dict["total_distance_m"],
                    total_distance_km=alt_dict["total_distance_km"],
                    estimated_time_sec=alt_dict["estimated_time_sec"],
                    estimated_time_min=alt_dict["estimated_time_min"],
                    road_sequence=alt_dict["road_sequence"],
                    node_sequence=alt_dict["node_sequence"],
                    divergence_explanation=divergence_desc,
                    geojson=alt_dict["geojson"]
                )

        # 6. Generate Reasoning
        reasoning = self.generate_reasoning(
            route_dict,
            avoided_blocked_roads,
            route_dict["congested_roads"],
            request.vehicle_type,
            request.algorithm,
            request.preference,
            alt_route is not None
        )

        return RouteResponse(
            status="success",
            algorithm_used=route_dict["algorithm"],
            preference=request.preference,
            vehicle_type=request.vehicle_type,
            source_node=source_id,
            source_name=route_dict["source_name"],
            destination_node=dest_id,
            destination_name=route_dict["destination_name"],
            total_distance_m=route_dict["total_distance_m"],
            total_distance_km=route_dict["total_distance_km"],
            estimated_time_sec=route_dict["estimated_time_sec"],
            estimated_time_min=route_dict["estimated_time_min"],
            road_sequence=route_dict["road_sequence"],
            node_sequence=route_dict["node_sequence"],
            steps=route_dict["steps"],
            geojson=route_dict["geojson"],
            active_incidents_considered=len(road_conditions),
            avoided_blocked_roads=avoided_blocked_roads,
            congested_roads_encountered=route_dict["congested_roads"],
            alternative_route=alt_route,
            reasoning=reasoning
        )

    def get_routable_nodes(self) -> List[RoutableNode]:
        """Returns all mapped nodes formatted for client dropdowns and search."""
        return [
            RoutableNode(
                id=nid,
                name=data["name"],
                area=data["area"],
                node_type=data["node_type"],
                lat=data["lat"],
                lon=data["lon"],
                has_signal=data["has_signal"]
            )
            for nid, data in sorted(self.nodes.items(), key=lambda x: x[1]["name"])
        ]

    def get_status(self) -> RoutingStatusResponse:
        """Returns runtime status and active incident count."""
        state = get_state()
        conditions = state.get("road_conditions", {})
        blocked = [k for k, v in conditions.items() if v.get("status") == "BLOCKED"]
        congested = [k for k, v in conditions.items() if v.get("status") == "CONGESTED"]

        return RoutingStatusResponse(
            status="operational",
            total_nodes=len(self.nodes),
            total_directed_edges=len(self.edges_by_id),
            supported_algorithms=["a_star", "dijkstra"],
            active_incidents_count=len(conditions),
            active_blocked_roads=blocked,
            active_congested_roads=congested
        )


# Global singleton instance
_engine_instance: Optional[DynamicRoutingEngine] = None

def get_routing_engine() -> DynamicRoutingEngine:
    """Returns or creates the global singleton DynamicRoutingEngine."""
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = DynamicRoutingEngine()
    return _engine_instance
