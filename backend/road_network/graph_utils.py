"""
UrbanFlow AI - Graph Utilities & Validation Module
Provides geospatial utility functions:
- Coordinate bounding box validation
- Snapping latitude/longitude to nearest road node or road segment
- Edge and node topological integrity verification
- Associating traffic signals and emergency locations with the road network
"""

import math
from typing import Dict, List, Tuple, Any, Optional
from shapely.geometry import Point, LineString

HYDERABAD_BBOX = {
    "min_lat": 17.20,
    "max_lat": 17.60,
    "min_lon": 78.20,
    "max_lon": 78.70
}

def validate_coordinates(lat: float, lon: float) -> bool:
    """Verifies that coordinates are within the Hyderabad metropolitan extent."""
    return (HYDERABAD_BBOX["min_lat"] <= lat <= HYDERABAD_BBOX["max_lat"] and
            HYDERABAD_BBOX["min_lon"] <= lon <= HYDERABAD_BBOX["max_lon"])

def find_nearest_node(lat: float, lon: float, nodes: List[Dict[str, Any]]) -> Tuple[Dict[str, Any], float]:
    """
    Finds the closest node to the specified coordinates.
    Returns (nearest_node, distance_in_meters).
    """
    from .road_graph import haversine_distance
    
    best_node = None
    min_dist = float("inf")
    
    for node in nodes:
        dist = haversine_distance((lon, lat), (node["lon"], node["lat"]))
        if dist < min_dist:
            min_dist = dist
            best_node = node
            
    return best_node, round(min_dist, 2)

def find_nearest_road_segment(lat: float, lon: float, segments: List[Dict[str, Any]]) -> Tuple[Dict[str, Any], float]:
    """
    Snaps a geographic coordinate (lat, lon) to the nearest road segment LineString.
    Returns (nearest_segment, distance_in_meters).
    """
    pt = Point(lon, lat)
    best_seg = None
    min_dist_deg = float("inf")
    
    for seg in segments:
        line = LineString(seg["geometry"])
        dist_deg = pt.distance(line)
        if dist_deg < min_dist_deg:
            min_dist_deg = dist_deg
            best_seg = seg
            
    # Approximate degree distance to meters in Hyderabad (~111 km per deg lat, ~105 km per deg lon)
    dist_meters = min_dist_deg * 111000.0
    return best_seg, round(dist_meters, 2)

def validate_road_network_integrity(graph_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Performs comprehensive verification of the road network:
    - Verifies that every edge references valid existing nodes
    - Verifies that every edge has a valid LineString geometry
    - Verifies that road segment IDs are unique
    - Checks that coordinates are geographically accurate
    """
    nodes = {n["id"]: n for n in graph_data["nodes"]}
    edges = graph_data["edges"]
    
    errors = []
    seen_ids = set()
    
    for edge in edges:
        eid = edge["id"]
        # Check uniqueness
        if eid in seen_ids:
            errors.append(f"Duplicate edge ID detected: {eid}")
        seen_ids.add(eid)
        
        # Check endpoint validity
        u = edge["from_node"]
        v = edge["to_node"]
        if u not in nodes:
            errors.append(f"Edge {eid} references missing from_node: {u}")
        if v not in nodes:
            errors.append(f"Edge {eid} references missing to_node: {v}")
            
        # Check geometry
        coords = edge.get("geometry", [])
        if len(coords) < 2:
            errors.append(f"Edge {eid} has invalid LineString coordinates: {coords}")
            
        for pt in coords:
            if not validate_coordinates(pt[1], pt[0]):
                errors.append(f"Edge {eid} contains coordinate outside Hyderabad bbox: {pt}")
                
    return {
        "is_valid": len(errors) == 0,
        "total_nodes_checked": len(nodes),
        "total_edges_checked": len(edges),
        "errors": errors
    }
