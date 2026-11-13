"""
UrbanFlow AI - Emergency Vehicle Priority & Graph Routing Engine
Implements Dijkstra and A* graph search algorithms on the Hyderabad Road Network
with dynamic road condition integration, blocked road avoidance, congestion-aware
speed penalties, highway hierarchy safety prioritization, and simulated green-wave
priority corridors for emergency vehicles (Ambulance, Fire Rescue, Police Patrol).
"""

import json
import math
import os
import heapq
from typing import Dict, List, Tuple, Any, Optional

# Locate data files relative to this file
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.abspath(os.path.join(CURRENT_DIR, "..", "..", "road_network", "data"))

# Earth radius in meters for Haversine
EARTH_RADIUS_M = 6371000.0

# Road classification safety and capacity weights for emergency routing
# Lower factor = higher preference (emergency vehicles prefer wide multilane corridors)
HIGHWAY_PRIORITY_FACTORS = {
    "motorway": 0.85,    # ORR, PVNR Expressway (wide, divided, highest speed)
    "trunk": 0.90,       # NH 65, Inner Ring Road
    "primary": 0.95,     # Major city arterials (Cyber Towers, Jubilee Hills)
    "secondary": 1.10,   # Connecting arterials (moderate width)
    "tertiary": 1.25     # Narrower local links
}

# Signal delays (seconds)
NORMAL_SIGNAL_DELAY_SEC = 35.0      # Average signal wait for standard vehicles
EMERGENCY_SIGNAL_DELAY_SEC = 3.0    # Simulated green-wave preemption (minor clearance caution)

# Congestion speed multipliers
# For normal vehicles: severe delay
NORMAL_CONGESTION_SPEED_FACTOR = 0.35
# For emergency vehicles: sirens enable vehicle yielding, partially mitigating congestion
EMERGENCY_CONGESTION_SPEED_FACTOR = 0.65

# Emergency vehicle cruising boost on clear roads (e.g. 15-20% above posted base speed)
EMERGENCY_CRUISING_BOOST = 1.15


def haversine_distance(coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
    """Calculates great-circle distance between two (lon, lat) points in meters."""
    lon1, lat1 = coord1
    lon2, lat2 = coord2
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return EARTH_RADIUS_M * c


class EmergencyRouterEngine:
    """
    Core graph routing engine for UrbanFlow AI emergency prioritization.
    Operates directly on the shared Hyderabad road graph topology.
    """

    def __init__(self, data_dir: Optional[str] = None):
        self.data_dir = data_dir or DATA_DIR
        self.nodes: Dict[str, Dict[str, Any]] = {}
        self.edges: Dict[str, Dict[str, Any]] = {}
        self.adjacency: Dict[str, List[Dict[str, Any]]] = {}
        self.facilities: List[Dict[str, Any]] = []
        self.facilities_by_id: Dict[str, Dict[str, Any]] = {}
        self.traffic_signals: List[Dict[str, Any]] = []
        self._load_datasets()

    def _load_datasets(self):
        """Loads and indexes the Hyderabad graph, facilities, and traffic signals."""
        graph_path = os.path.join(self.data_dir, "hyderabad_graph.json")
        if os.path.exists(graph_path):
            with open(graph_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                for node in data.get("nodes", []):
                    self.nodes[node["id"]] = node
                    self.adjacency[node["id"]] = []
                for edge in data.get("edges", []):
                    self.edges[edge["id"]] = edge
                    u = edge["from_node"]
                    if u in self.adjacency:
                        self.adjacency[u].append(edge)

        facilities_path = os.path.join(self.data_dir, "emergency_locations.json")
        if os.path.exists(facilities_path):
            with open(facilities_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                for cat in ["hospitals", "police_stations", "fire_stations"]:
                    for fac in data.get(cat, []):
                        self.facilities.append(fac)
                        self.facilities_by_id[fac["id"]] = fac

        signals_path = os.path.join(self.data_dir, "traffic_signals.json")
        if os.path.exists(signals_path):
            with open(signals_path, "r", encoding="utf-8") as f:
                self.traffic_signals = json.load(f)

    @staticmethod
    def get_base_road_id(edge_id: str) -> str:
        """Strips reverse suffix to retrieve the underlying physical road segment ID."""
        if edge_id.endswith("_rev"):
            return edge_id[:-4]
        return edge_id

    def get_edge_condition(self, edge_id: str, road_conditions: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Retrieves active road condition (BLOCKED or CONGESTED) for this edge or its physical road.
        Checks base road ID, reverse ID, and exact ID.
        """
        if not road_conditions:
            return None

        base_id = self.get_base_road_id(edge_id)
        if edge_id in road_conditions:
            return road_conditions[edge_id]
        if base_id in road_conditions:
            return road_conditions[base_id]
        rev_id = f"{base_id}_rev"
        if rev_id in road_conditions:
            return road_conditions[rev_id]

        return None

    def find_nearest_node(self, lat: float, lon: float) -> Tuple[Optional[Dict[str, Any]], float]:
        """Finds closest node in the road network to given coordinates."""
        best_node = None
        min_dist = float("inf")
        for node in self.nodes.values():
            dist = haversine_distance((lon, lat), (node["lon"], node["lat"]))
            if dist < min_dist:
                min_dist = dist
                best_node = node
        return best_node, round(min_dist, 1)

    def calculate_edge_metrics(
        self,
        edge: Dict[str, Any],
        is_emergency: bool = True,
        road_conditions: Optional[Dict[str, Any]] = None
    ) -> Tuple[Optional[float], float, float, Optional[str]]:
        """
        Computes (routing_cost, travel_time_sec, effective_speed_kmh, status) for a graph edge.
        Returns (None, inf, 0.0, 'BLOCKED') if the edge is impassable.
        """
        road_conditions = road_conditions or {}
        condition = self.get_edge_condition(edge["id"], road_conditions)

        status = "FREE_FLOW"
        if condition:
            cond_status = condition.get("status")
            if cond_status == "BLOCKED":
                # Impassable road - infinite cost avoids it completely
                return None, float("inf"), 0.0, "BLOCKED"
            elif cond_status == "CONGESTED":
                status = "CONGESTED"

        length_m = edge.get("length_m", 100.0)
        base_speed = edge.get("base_speed_kmh", 40.0)
        highway_type = edge.get("highway", "primary")

        # Determine effective speed
        if is_emergency:
            if status == "CONGESTED":
                effective_speed_kmh = max(15.0, base_speed * EMERGENCY_CONGESTION_SPEED_FACTOR)
            else:
                effective_speed_kmh = base_speed * EMERGENCY_CRUISING_BOOST
        else:
            if status == "CONGESTED":
                effective_speed_kmh = max(8.0, base_speed * NORMAL_CONGESTION_SPEED_FACTOR)
            else:
                effective_speed_kmh = base_speed

        speed_ms = effective_speed_kmh / 3.6
        transit_time_sec = length_m / max(0.5, speed_ms)

        # Signal clearance delay at target node
        to_node = self.nodes.get(edge["to_node"], {})
        signal_delay_sec = 0.0
        if to_node.get("has_signal", False):
            if is_emergency:
                # Simulated green wave preemption clears the signal
                signal_delay_sec = EMERGENCY_SIGNAL_DELAY_SEC
            else:
                signal_delay_sec = NORMAL_SIGNAL_DELAY_SEC

        total_travel_time_sec = transit_time_sec + signal_delay_sec

        # Highway hierarchy preference factor (lower = preferred)
        class_factor = HIGHWAY_PRIORITY_FACTORS.get(highway_type, 1.0)
        if not is_emergency:
            class_factor = 1.0

        # Routing cost for graph search
        routing_cost = total_travel_time_sec * class_factor

        return routing_cost, total_travel_time_sec, effective_speed_kmh, status

    def astar_heuristic(self, node_id: str, target_id: str) -> float:
        """
        Admissible Haversine heuristic (estimated minimum travel time in seconds).
        Calculated assuming maximum allowable emergency cruising speed (80 km/h = 22.22 m/s).
        """
        n1 = self.nodes.get(node_id)
        n2 = self.nodes.get(target_id)
        if not n1 or not n2:
            return 0.0
        dist = haversine_distance((n1["lon"], n1["lat"]), (n2["lon"], n2["lat"]))
        max_speed_ms = 80.0 / 3.6
        return dist / max_speed_ms

    def find_route(
        self,
        source_id: str,
        target_id: str,
        is_emergency: bool = True,
        road_conditions: Optional[Dict[str, Any]] = None,
        algorithm: str = "A*"
    ) -> Optional[Dict[str, Any]]:
        """
        Finds the optimal path between source_id and target_id using A* or Dijkstra.
        Completely avoids roads marked as BLOCKED.
        Returns path details or None if target is unreachable.
        """
        if source_id not in self.nodes or target_id not in self.nodes:
            return None

        if source_id == target_id:
            node = self.nodes[source_id]
            return {
                "nodes": [node],
                "edges": [],
                "total_distance_m": 0.0,
                "total_travel_time_sec": 0.0,
                "preempted_signals_count": 0,
                "algorithm": algorithm
            }

        road_conditions = road_conditions or {}

        # Priority queue entries: (f_score, current_node_id)
        # Dijkstra sets heuristic to 0.0
        pq: List[Tuple[float, str]] = []
        heapq.heappush(pq, (0.0, source_id))

        g_score: Dict[str, float] = {source_id: 0.0}
        came_from_edge: Dict[str, Dict[str, Any]] = {}
        came_from_node: Dict[str, str] = {}
        visited = set()

        while pq:
            current_f, current_u = heapq.heappop(pq)

            if current_u in visited:
                continue
            visited.add(current_u)

            if current_u == target_id:
                break

            current_g = g_score[current_u]

            for edge in self.adjacency.get(current_u, []):
                v = edge["to_node"]
                if v in visited:
                    continue

                cost, travel_time, speed, status = self.calculate_edge_metrics(
                    edge, is_emergency=is_emergency, road_conditions=road_conditions
                )

                # Cost is None if edge is BLOCKED
                if cost is None:
                    continue

                tentative_g = current_g + cost

                if v not in g_score or tentative_g < g_score[v]:
                    g_score[v] = tentative_g
                    came_from_edge[v] = edge
                    came_from_node[v] = current_u

                    h = self.astar_heuristic(v, target_id) if algorithm == "A*" else 0.0
                    f_score = tentative_g + h
                    heapq.heappush(pq, (f_score, v))

        if target_id not in came_from_node:
            return None

        # Reconstruct path
        path_edges: List[Dict[str, Any]] = []
        path_nodes: List[Dict[str, Any]] = []
        curr = target_id

        while curr != source_id:
            edge = came_from_edge[curr]
            path_edges.append(edge)
            path_nodes.append(self.nodes[curr])
            curr = came_from_node[curr]
        path_nodes.append(self.nodes[source_id])

        path_edges.reverse()
        path_nodes.reverse()

        total_distance = sum(e.get("length_m", 0.0) for e in path_edges)
        total_time = 0.0
        preempted_signals = 0

        for edge in path_edges:
            _, edge_time, _, _ = self.calculate_edge_metrics(
                edge, is_emergency=is_emergency, road_conditions=road_conditions
            )
            total_time += edge_time
            to_n = self.nodes.get(edge["to_node"], {})
            if to_n.get("has_signal", False):
                preempted_signals += 1

        return {
            "nodes": path_nodes,
            "edges": path_edges,
            "total_distance_m": round(total_distance, 1),
            "total_travel_time_sec": round(total_time, 1),
            "preempted_signals_count": preempted_signals if is_emergency else 0,
            "algorithm": algorithm
        }

    def generate_explanation(
        self,
        emergency_route: Dict[str, Any],
        normal_route: Optional[Dict[str, Any]],
        road_conditions: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Builds transparent, human-readable reasoning explaining why the emergency route was selected,
        which blocked and congested roads were avoided, and the exact priority corridor advantages.
        """
        corridor_edge_ids = {e["id"] for e in emergency_route["edges"]}
        corridor_base_ids = {self.get_base_road_id(e["id"]) for e in emergency_route["edges"]}

        blocked_roads_avoided = []
        congested_roads_bypassed = []
        corridor_congested_traversed = []

        for road_id, cond in road_conditions.items():
            status = cond.get("status")
            base_id = self.get_base_road_id(road_id)

            if status == "BLOCKED":
                if base_id not in corridor_base_ids and road_id not in corridor_edge_ids:
                    blocked_roads_avoided.append(road_id)
            elif status == "CONGESTED":
                if base_id in corridor_base_ids or road_id in corridor_edge_ids:
                    corridor_congested_traversed.append(road_id)
                else:
                    congested_roads_bypassed.append(road_id)

        priority_factors = []

        if blocked_roads_avoided:
            count = len(blocked_roads_avoided)
            names = ", ".join(blocked_roads_avoided[:2])
            priority_factors.append(
                f"Rerouted around {count} blocked road segment(s) ({names}) with infinite cost penalty."
            )

        if congested_roads_bypassed:
            priority_factors.append(
                f"Bypassed {len(congested_roads_bypassed)} congested corridor segment(s) in favor of higher-speed alternatives."
            )

        if corridor_congested_traversed:
            priority_factors.append(
                f"Traversing {len(corridor_congested_traversed)} congested road segment(s) with active siren clearance override."
            )

        # Hierarchy highlights
        highway_counts = {}
        for e in emergency_route["edges"]:
            hw = e.get("highway", "primary")
            highway_counts[hw] = highway_counts.get(hw, 0) + 1

        primary_types = [k for k, v in highway_counts.items() if k in ["motorway", "trunk", "primary"]]
        if primary_types:
            priority_factors.append(
                f"Prioritized high-capacity {', '.join(primary_types)} arterials for safe passing and multi-lane overtaking."
            )

        signals_count = emergency_route.get("preempted_signals_count", 0)
        if signals_count > 0:
            priority_factors.append(
                f"Simulated green-wave preemption active across {signals_count} mapped traffic signal junction(s)."
            )

        priority_factors.append(
            "Simulated priority corridor for demonstration (traffic-signal preemption simulated; no physical signal hardware actuated)."
        )

        time_saved_sec = 0.0
        if normal_route:
            time_saved_sec = max(0.0, normal_route["total_travel_time_sec"] - emergency_route["total_travel_time_sec"])

        summary = f"Optimal emergency corridor identified: {emergency_route['total_distance_m']/1000:.2f} km in {emergency_route['total_travel_time_sec']/60:.1f} mins."
        if time_saved_sec > 0:
            summary += f" Saves ~{time_saved_sec/60:.1f} mins vs standard vehicle transit."

        return {
            "summary": summary,
            "blocked_roads_avoided": blocked_roads_avoided,
            "congested_roads_bypassed": congested_roads_bypassed,
            "corridor_congested_traversed": corridor_congested_traversed,
            "priority_factors": priority_factors
        }

    def compute_emergency_corridor(
        self,
        source_node_id: Optional[str] = None,
        target_node_id: Optional[str] = None,
        vehicle_type: str = "AMBULANCE",
        source_facility_id: Optional[str] = None,
        target_facility_id: Optional[str] = None,
        source_coords: Optional[Tuple[float, float]] = None,
        target_coords: Optional[Tuple[float, float]] = None,
        road_conditions: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Primary coordinator for emergency corridor computation.
        Resolves endpoints, runs A* for emergency vehicle and normal comparison vehicle,
        constructs GeoJSON geometries, and generates full priority analytics.
        """
        # Resolve source
        resolved_source_node = None
        if source_node_id and source_node_id in self.nodes:
            resolved_source_node = self.nodes[source_node_id]
        elif source_facility_id and source_facility_id in self.facilities_by_id:
            fac = self.facilities_by_id[source_facility_id]
            resolved_source_node, _ = self.find_nearest_node(fac["lat"], fac["lon"])
        elif source_coords:
            resolved_source_node, _ = self.find_nearest_node(source_coords[1], source_coords[0])

        # Resolve target
        resolved_target_node = None
        if target_node_id and target_node_id in self.nodes:
            resolved_target_node = self.nodes[target_node_id]
        elif target_facility_id and target_facility_id in self.facilities_by_id:
            fac = self.facilities_by_id[target_facility_id]
            resolved_target_node, _ = self.find_nearest_node(fac["lat"], fac["lon"])
        elif target_coords:
            resolved_target_node, _ = self.find_nearest_node(target_coords[1], target_coords[0])

        if not resolved_source_node or not resolved_target_node:
            return {
                "status": "ERROR",
                "route_found": false,
                "message": "Invalid source or destination coordinates/nodes provided."
            }

        s_id = resolved_source_node["id"]
        t_id = resolved_target_node["id"]

        # Run emergency routing (with priority preemption and safety factors)
        emergency_route = self.find_route(
            s_id, t_id, is_emergency=True, road_conditions=road_conditions, algorithm="A*"
        )

        if not emergency_route:
            # Check if source or target itself is blocked
            return {
                "status": "UNREACHABLE",
                "route_found": False,
                "source": resolved_source_node,
                "destination": resolved_target_node,
                "message": f"No passable route available between {resolved_source_node['name']} and {resolved_target_node['name']}. Active road blockages isolate the destination.",
                "explanation": {
                    "summary": "Route could not be calculated due to surrounding road blockages.",
                    "blocked_roads_avoided": list(road_conditions.keys()) if road_conditions else [],
                    "priority_factors": [
                        "All candidate corridors are severed by active high-severity road closures.",
                        "Clearance or resolution of upstream incidents is required."
                    ]
                }
            }

        # Run baseline normal vehicle routing for comparison under same conditions
        normal_route = self.find_route(
            s_id, t_id, is_emergency=False, road_conditions=road_conditions, algorithm="A*"
        )

        # Assemble GeoJSON LineString coordinates
        linestring_coords = []
        for i, edge in enumerate(emergency_route["edges"]):
            coords = edge.get("geometry", [])
            if i == 0:
                linestring_coords.extend(coords)
            else:
                # Avoid duplicate coordinate between adjacent segments
                if coords:
                    if linestring_coords and coords[0] == linestring_coords[-1]:
                        linestring_coords.extend(coords[1:])
                    else:
                        linestring_coords.extend(coords)

        if not linestring_coords:
            for n in emergency_route["nodes"]:
                linestring_coords.append([n["lon"], n["lat"]])

        # Corridor road segment details
        corridor_roads = []
        for edge in emergency_route["edges"]:
            _, edge_time, eff_speed, status = self.calculate_edge_metrics(
                edge, is_emergency=True, road_conditions=road_conditions
            )
            to_n = self.nodes.get(edge["to_node"], {})
            corridor_roads.append({
                "edge_id": edge["id"],
                "base_road_id": self.get_base_road_id(edge["id"]),
                "name": edge.get("name", "Unnamed Road"),
                "from_node": edge["from_node"],
                "to_node": edge["to_node"],
                "highway": edge.get("highway", "primary"),
                "lanes": edge.get("lanes", 2),
                "length_m": edge.get("length_m", 0.0),
                "base_speed_kmh": edge.get("base_speed_kmh", 40.0),
                "priority_speed_kmh": round(eff_speed, 1),
                "travel_time_sec": round(edge_time, 1),
                "status": status,
                "has_signal": to_n.get("has_signal", False),
                "signal_preempted": to_n.get("has_signal", False)
            })

        # Calculations & metrics
        dist_m = emergency_route["total_distance_m"]
        dist_km = round(dist_m / 1000.0, 2)
        em_time_sec = emergency_route["total_travel_time_sec"]
        em_eta_min = round(em_time_sec / 60.0, 1)

        norm_time_sec = normal_route["total_travel_time_sec"] if normal_route else em_time_sec * 1.5
        norm_eta_min = round(norm_time_sec / 60.0, 1)

        time_saved_sec = max(0.0, round(norm_time_sec - em_time_sec, 1))
        time_saved_min = round(time_saved_sec / 60.0, 1)

        speed_advantage_pct = 0.0
        if norm_time_sec > 0:
            speed_advantage_pct = round(((norm_time_sec - em_time_sec) / norm_time_sec) * 100.0, 1)

        explanation = self.generate_explanation(emergency_route, normal_route, road_conditions or {})

        geojson_feature = {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": linestring_coords
            },
            "properties": {
                "corridor_type": "EMERGENCY_PRIORITY",
                "vehicle_type": vehicle_type,
                "total_distance_km": dist_km,
                "emergency_eta_min": em_eta_min,
                "preempted_signals": emergency_route["preempted_signals_count"],
                "is_simulated_corridor": True
            }
        }

        return {
            "status": "SUCCESS",
            "route_found": True,
            "algorithm": "A*",
            "vehicle_type": vehicle_type,
            "source": resolved_source_node,
            "destination": resolved_target_node,
            "summary": {
                "total_distance_m": dist_m,
                "total_distance_km": dist_km,
                "normal_travel_time_sec": round(norm_time_sec, 1),
                "normal_eta_formatted": f"{norm_eta_min} mins",
                "emergency_travel_time_sec": round(em_time_sec, 1),
                "emergency_eta_formatted": f"{em_eta_min} mins",
                "time_saved_sec": time_saved_sec,
                "time_saved_formatted": f"{time_saved_min} mins",
                "speed_advantage_percent": speed_advantage_pct,
                "preempted_signals_count": emergency_route["preempted_signals_count"],
                "corridor_road_segments_count": len(corridor_roads)
            },
            "corridor_roads": corridor_roads,
            "path_node_ids": [n["id"] for n in emergency_route["nodes"]],
            "geojson_linestring": geojson_feature,
            "explanation": explanation
        }


# Global singleton instance
_router_instance: Optional[EmergencyRouterEngine] = None

def get_emergency_router() -> EmergencyRouterEngine:
    """Returns the cached global EmergencyRouterEngine singleton."""
    global _router_instance
    if _router_instance is None:
        _router_instance = EmergencyRouterEngine()
    return _router_instance
