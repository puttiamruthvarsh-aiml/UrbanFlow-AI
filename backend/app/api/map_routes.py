"""
UrbanFlow AI - Map and Road Network API Endpoints
Provides endpoints for retrieving:
- Network summary and graph topology metrics
- Road network GeoJSON (for MapLibre GL JS rendering)
- Specific road segment inspection details
- Intersections and junction nodes GeoJSON
- Physical traffic signals GeoJSON
- Emergency facilities (hospitals, police, fire stations) GeoJSON
"""

import json
import os
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/api/network", tags=["road-network"])

# Base data directory
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.abspath(os.path.join(CURRENT_DIR, "..", "..", "road_network", "data"))

def _read_json_file(filename: str) -> Dict[str, Any]:
    file_path = os.path.join(DATA_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"Data artifact {filename} not found.")
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)

@router.get("/summary")
def get_network_summary():
    """Returns high-level graph metrics, statistics, and geographic extent."""
    metadata = _read_json_file("metadata.json")
    emergency = _read_json_file("emergency_locations.json")
    signals = _read_json_file("traffic_signals.json")
    
    return {
        "status": "success",
        "city": "Hyderabad, Telangana, India",
        "coverage_areas": [
            "Hitech City", "Madhapur", "Gachibowli", "Jubilee Hills",
            "Banjara Hills", "Ameerpet", "Secunderabad", "Uppal", "LB Nagar"
        ],
        "graph_statistics": metadata,
        "emergency_facilities_count": {
            "hospitals": len(emergency.get("hospitals", [])),
            "police_stations": len(emergency.get("police_stations", [])),
            "fire_stations": len(emergency.get("fire_stations", [])),
            "total": emergency.get("total_facilities", 0)
        },
        "traffic_signals_count": len(signals),
        "data_attribution": "Map data © OpenStreetMap contributors, ODbL 1.0"
    }

@router.get("/roads")
def get_road_network_geojson():
    """Returns the complete Hyderabad road network as a GeoJSON FeatureCollection."""
    return _read_json_file("hyderabad_roads.geojson")

@router.get("/roads/{road_id}")
def get_road_segment_detail(road_id: str):
    """Returns comprehensive inspection details for a specific road segment."""
    graph_data = _read_json_file("hyderabad_graph.json")
    for edge in graph_data.get("edges", []):
        if edge.get("id") == road_id or edge.get("id") == f"{road_id}_rev":
            return {
                "status": "success",
                "road_segment": edge
            }
    raise HTTPException(status_code=404, detail=f"Road segment with ID '{road_id}' not found.")

@router.get("/junctions")
def get_junctions_geojson():
    """Returns all intersections and junctions as a GeoJSON FeatureCollection."""
    return _read_json_file("junctions.geojson")

@router.get("/signals")
def get_traffic_signals_geojson():
    """Returns all mapped traffic signals as a GeoJSON FeatureCollection."""
    return _read_json_file("traffic_signals.geojson")

@router.get("/emergency")
def get_emergency_locations_geojson(category: Optional[str] = Query(None, description="hospital, police, fire_station")):
    """Returns hospitals, police stations, and fire stations as a GeoJSON FeatureCollection."""
    data = _read_json_file("emergency_locations.geojson")
    if category:
        filtered = [f for f in data.get("features", []) if f.get("properties", {}).get("category") == category]
        return {"type": "FeatureCollection", "features": filtered}
    return data

@router.get("/graph")
def get_full_graph_topology():
    """Returns full graph topology (nodes, directed edges, adjacency list) for algorithms."""
    return _read_json_file("hyderabad_graph.json")
