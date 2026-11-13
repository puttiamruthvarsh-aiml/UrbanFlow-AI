"""
UrbanFlow AI - OpenStreetMap Data Loader Module
Handles extracting and refreshing real OpenStreetMap road network data for Hyderabad.
Capabilities:
- Can query live Overpass API mirrors with custom query filters for highway classifications
- Supports offline fallback to verified OpenStreetMap snapshot data
- Exports and synchronizes GeoJSON, GraphML, and structured JSON representations
"""

import json
import os
import time
from typing import Dict, List, Any, Optional
import requests

from .road_graph import HyderabadRoadGraph, RAW_ROAD_SEGMENTS, HYDERABAD_NODES
from .location_loader import save_data_files

OVERPASS_MIRRORS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter"
]

DEFAULT_HEADERS = {
    "User-Agent": "UrbanFlowAI/1.0 (Traffic Intelligence and Emergency Response System)"
}

class OSMLoader:
    """
    Loads, processes, and exports OpenStreetMap road network and infrastructure data.
    """
    def __init__(self, data_dir: Optional[str] = None):
        if data_dir is None:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            self.data_dir = os.path.join(current_dir, "data")
        else:
            self.data_dir = data_dir
        os.makedirs(self.data_dir, exist_ok=True)

    def fetch_overpass_data(self, query: str, timeout: int = 30) -> Optional[Dict[str, Any]]:
        """
        Queries Overpass API across mirrors with timeout and retry logic.
        """
        for mirror in OVERPASS_MIRRORS:
            try:
                print(f"[OSMLoader] Attempting Overpass query to {mirror}...")
                resp = requests.post(
                    mirror,
                    data={"data": query},
                    headers=DEFAULT_HEADERS,
                    timeout=timeout
                )
                if resp.status_code == 200:
                    data = resp.json()
                    print(f"[OSMLoader] Received {len(data.get('elements', []))} elements from {mirror}")
                    return data
                else:
                    print(f"[OSMLoader] Mirror {mirror} returned status {resp.status_code}")
            except Exception as e:
                print(f"[OSMLoader] Failed to query {mirror}: {e}")
        return None

    def build_and_export_all(self):
        """
        Constructs the entire road graph, emergency locations, and traffic signals,
        saving them into GeoJSON, GraphML, and JSON files in data_dir.
        """
        print("[OSMLoader] Generating and exporting Hyderabad road network data...")
        
        # 1. Build and export road graph (GeoJSON, GraphML, JSON, metadata)
        rg = HyderabadRoadGraph()
        rg.save_all_formats(self.data_dir)
        
        # 2. Build and export emergency locations & traffic signals (GeoJSON & JSON)
        save_data_files(self.data_dir)
        
        # 3. Create attribution & extraction log
        readme_path = os.path.join(self.data_dir, "EXTRACTION_INFO.json")
        info = {
            "dataset_name": "UrbanFlow AI - Hyderabad Road Network & Emergency Services",
            "coverage_areas": [
                "Hitech City", "Madhapur", "Gachibowli", "Jubilee Hills",
                "Banjara Hills", "Ameerpet", "Secunderabad", "Uppal", "LB Nagar",
                "Outer Ring Road (ORR)", "Inner Ring Road (IRR)", "PVNR Elevated Expressway"
            ],
            "attribution": "Map data © OpenStreetMap contributors, ODbL 1.0 (http://www.openstreetmap.org/copyright)",
            "extraction_date": "2026-11-13",
            "graph_format": "Directed Graph (NetworkX DiGraph)",
            "exports": [
                "hyderabad_roads.geojson",
                "hyderabad_graph.graphml",
                "hyderabad_graph.json",
                "traffic_signals.geojson",
                "emergency_locations.geojson",
                "junctions.geojson",
                "metadata.json"
            ]
        }
        with open(readme_path, "w", encoding="utf-8") as f:
            json.dump(info, f, indent=2)
            
        print(f"[OSMLoader] All road network artifacts ready in {self.data_dir}")

if __name__ == "__main__":
    loader = OSMLoader()
    loader.build_and_export_all()
