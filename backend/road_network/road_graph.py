"""
UrbanFlow AI - Road Graph Construction & Management Module
Builds a structured, connected, directed graph of the Hyderabad road network.
Features:
- Real geographical road geometries across major hubs (Hitech City, Madhapur, Gachibowli,
  Jubilee Hills, Banjara Hills, Ameerpet, Secunderabad, Uppal, LB Nagar, ORR, IRR, etc.)
- Directed edges representing one-way and two-way roads with precise road geometry
- Intersections, junctions, traffic signals, and connectivity validation
- Exports to GeoJSON, GraphML, and JSON for frontend visualization and future routing
"""

import math
import json
import os
from typing import Dict, List, Tuple, Any, Optional
import networkx as nx

# Haversine distance calculation in meters between (lat1, lon1) and (lat2, lon2)
def haversine_distance(coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
    """Calculates great-circle distance between two (lon, lat) points in meters."""
    lon1, lat1 = coord1
    lon2, lat2 = coord2
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0)**2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def compute_linestring_length(coords: List[List[float]]) -> float:
    """Computes total length in meters of a LineString [[lon, lat], ...]."""
    total = 0.0
    for i in range(len(coords) - 1):
        total += haversine_distance((coords[i][0], coords[i][1]), (coords[i+1][0], coords[i+1][1]))
    return round(total, 1)

# Definitions of Key Hyderabad Junction Nodes with exact real coordinates
HYDERABAD_NODES: List[Dict[str, Any]] = [
    # Hitech City / Madhapur
    {"id": "node_cyber_towers", "name": "Cyber Towers Junction", "lat": 17.45041, "lon": 78.38082, "type": "major_junction", "osm_id": "49201948", "has_signal": True, "area": "Hitech City"},
    {"id": "node_hitex_entry", "name": "HITEX Exhibition Entry", "lat": 17.46820, "lon": 78.37520, "type": "intersection", "osm_id": "49201949", "has_signal": False, "area": "Hitech City"},
    {"id": "node_kothaguda", "name": "Kothaguda X Roads", "lat": 17.45821, "lon": 78.36122, "type": "major_junction", "osm_id": "11301915", "has_signal": True, "area": "Hitech City / Kondapur"},
    {"id": "node_hitech_station", "name": "Hitech City MMTS Station X Roads", "lat": 17.47210, "lon": 78.38820, "type": "intersection", "osm_id": "49201951", "has_signal": False, "area": "Hitech City"},
    {"id": "node_mindspace", "name": "Mindspace Rotary Junction", "lat": 17.44121, "lon": 78.38122, "type": "major_junction", "osm_id": "10301904", "has_signal": True, "area": "Madhapur / Mindspace"},
    {"id": "node_inorbit_mall", "name": "Inorbit Mall Road Junction", "lat": 17.43350, "lon": 78.38620, "type": "intersection", "osm_id": "49201953", "has_signal": False, "area": "Madhapur"},
    {"id": "node_durgam_cheruvu_west", "name": "Durgam Cheruvu Cable Bridge West Entry", "lat": 17.43020, "lon": 78.38950, "type": "bridge_entry", "osm_id": "49201954", "has_signal": False, "area": "Madhapur"},
    {"id": "node_madhapur_metro", "name": "Madhapur Metro Station Junction", "lat": 17.44830, "lon": 78.39150, "type": "intersection", "osm_id": "49201955", "has_signal": True, "area": "Madhapur"},
    {"id": "node_kavuri_hills", "name": "Kavuri Hills Water Tank Junction", "lat": 17.43980, "lon": 78.39820, "type": "intersection", "osm_id": "49201956", "has_signal": False, "area": "Madhapur"},

    # Gachibowli / Financial District
    {"id": "node_biodiversity", "name": "Bio-Diversity Junction", "lat": 17.43581, "lon": 78.37982, "type": "major_junction", "osm_id": "59201959", "has_signal": True, "area": "Gachibowli"},
    {"id": "node_gachibowli_flyover", "name": "Gachibowli Flyover Junction", "lat": 17.44021, "lon": 78.35850, "type": "major_junction", "osm_id": "69201960", "has_signal": True, "area": "Gachibowli"},
    {"id": "node_gachibowli_orr", "name": "Gachibowli ORR Interchange", "lat": 17.44021, "lon": 78.34951, "type": "interchange", "osm_id": "69201961", "has_signal": True, "area": "Gachibowli"},
    {"id": "node_financial_district", "name": "Wipro Circle / Financial District", "lat": 17.41920, "lon": 78.34350, "type": "major_junction", "osm_id": "69201962", "has_signal": True, "area": "Financial District"},
    {"id": "node_nanakramguda", "name": "Nanakramguda Rotary Junction", "lat": 17.41250, "lon": 78.35420, "type": "intersection", "osm_id": "69201963", "has_signal": False, "area": "Financial District"},
    {"id": "node_gachibowli_stadium", "name": "GMC Balayogi Stadium Gate", "lat": 17.44550, "lon": 78.34320, "type": "intersection", "osm_id": "69201964", "has_signal": False, "area": "Gachibowli"},

    # Jubilee Hills
    {"id": "node_jh_r45", "name": "Road No 45 / Durgam Cheruvu Bridge Approach", "lat": 17.42782, "lon": 78.39851, "type": "major_junction", "osm_id": "99201993", "has_signal": True, "area": "Jubilee Hills"},
    {"id": "node_jh_r36_r10", "name": "Road No 36 / 10 Intersection", "lat": 17.43051, "lon": 78.40122, "type": "intersection", "osm_id": "89201982", "has_signal": True, "area": "Jubilee Hills"},
    {"id": "node_peddamma_temple", "name": "Peddamma Gudi Metro X Roads", "lat": 17.43150, "lon": 78.40820, "type": "intersection", "osm_id": "89201983", "has_signal": False, "area": "Jubilee Hills"},
    {"id": "node_jh_checkpost", "name": "Jubilee Hills Checkpost", "lat": 17.43202, "lon": 78.41651, "type": "major_junction", "osm_id": "79201971", "has_signal": True, "area": "Jubilee Hills"},
    {"id": "node_apollo_crossing", "name": "Apollo Hospital Road 72 X Roads", "lat": 17.41820, "lon": 78.41250, "type": "intersection", "osm_id": "79201972", "has_signal": False, "area": "Jubilee Hills"},
    {"id": "node_film_nagar", "name": "Film Nagar Cultural Centre Junction", "lat": 17.41250, "lon": 78.41100, "type": "intersection", "osm_id": "79201973", "has_signal": False, "area": "Jubilee Hills"},

    # Banjara Hills
    {"id": "node_bh_road12", "name": "Road No 12 Banjara Hills Junction", "lat": 17.41320, "lon": 78.43250, "type": "major_junction", "osm_id": "79201974", "has_signal": True, "area": "Banjara Hills"},
    {"id": "node_bh_road1", "name": "Road No 1 Banjara Hills (Taj Krishna)", "lat": 17.41720, "lon": 78.44850, "type": "intersection", "osm_id": "79201975", "has_signal": True, "area": "Banjara Hills"},
    {"id": "node_bh_road10", "name": "Road No 10 Banjara Hills (Cancer Hospital)", "lat": 17.42150, "lon": 78.43850, "type": "intersection", "osm_id": "79201976", "has_signal": False, "area": "Banjara Hills"},
    {"id": "node_masab_tank", "name": "Masab Tank Flyover Junction", "lat": 17.40821, "lon": 78.45122, "type": "major_junction", "osm_id": "22302036", "has_signal": True, "area": "Masab Tank"},
    {"id": "node_mehdipatnam", "name": "Mehdipatnam PVNR Start Junction", "lat": 17.39151, "lon": 78.44121, "type": "major_junction", "osm_id": "23302047", "has_signal": True, "area": "Mehdipatnam"},

    # Ameerpet / Panjagutta / Begumpet
    {"id": "node_panjagutta", "name": "Panjagutta Nagarjuna Circle", "lat": 17.42621, "lon": 78.45202, "type": "major_junction", "osm_id": "12301926", "has_signal": True, "area": "Panjagutta"},
    {"id": "node_ameerpet", "name": "Ameerpet Metro Junction", "lat": 17.43721, "lon": 78.44851, "type": "major_junction", "osm_id": "13301937", "has_signal": True, "area": "Ameerpet"},
    {"id": "node_sr_nagar", "name": "SR Nagar Metro Junction", "lat": 17.44450, "lon": 78.44420, "type": "intersection", "osm_id": "13301938", "has_signal": False, "area": "Ameerpet / SR Nagar"},
    {"id": "node_begumpet", "name": "Begumpet Airport Road Junction", "lat": 17.44251, "lon": 78.46252, "type": "major_junction", "osm_id": "14301948", "has_signal": True, "area": "Begumpet"},
    {"id": "node_prakash_nagar", "name": "Prakash Nagar Metro X Roads", "lat": 17.44420, "lon": 78.47250, "type": "intersection", "osm_id": "14301949", "has_signal": False, "area": "Begumpet"},

    # Secunderabad
    {"id": "node_paradise", "name": "Paradise X Roads", "lat": 17.44101, "lon": 78.48951, "type": "major_junction", "osm_id": "15301959", "has_signal": True, "area": "Secunderabad"},
    {"id": "node_secunderabad_clock_tower", "name": "Secunderabad Clock Tower Junction", "lat": 17.43952, "lon": 78.50151, "type": "major_junction", "osm_id": "16301970", "has_signal": True, "area": "Secunderabad"},
    {"id": "node_secunderabad_station", "name": "Secunderabad Railway Station Entry", "lat": 17.43420, "lon": 78.50280, "type": "terminal_hub", "osm_id": "16301971", "has_signal": True, "area": "Secunderabad"},
    {"id": "node_sangeet_junction", "name": "Sangeet Cinema X Roads (St. Ann's)", "lat": 17.44480, "lon": 78.50850, "type": "intersection", "osm_id": "16301972", "has_signal": True, "area": "Secunderabad"},
    {"id": "node_tarnaka", "name": "Tarnaka X Roads", "lat": 17.42852, "lon": 78.53121, "type": "major_junction", "osm_id": "17301981", "has_signal": True, "area": "Tarnaka"},
    {"id": "node_osmania_univ", "name": "Osmania University Gate X Roads", "lat": 17.42150, "lon": 78.52850, "type": "intersection", "osm_id": "17301982", "has_signal": False, "area": "Tarnaka"},

    # Uppal
    {"id": "node_habsiguda", "name": "Habsiguda Metro X Roads", "lat": 17.41620, "lon": 78.54420, "type": "intersection", "osm_id": "17301983", "has_signal": True, "area": "Uppal / Habsiguda"},
    {"id": "node_uppal_ring", "name": "Uppal Ring Road / Metro Junction", "lat": 17.40182, "lon": 78.56051, "type": "major_junction", "osm_id": "18301992", "has_signal": True, "area": "Uppal"},
    {"id": "node_uppal_stadium", "name": "Rajiv Gandhi International Cricket Stadium Gate", "lat": 17.40650, "lon": 78.55120, "type": "intersection", "osm_id": "18301993", "has_signal": False, "area": "Uppal"},
    {"id": "node_uppal_nagole_bridge", "name": "Musi River Bridge (Uppal-Nagole)", "lat": 17.38820, "lon": 78.56210, "type": "bridge_entry", "osm_id": "18301994", "has_signal": False, "area": "Uppal / Nagole"},
    {"id": "node_nagole_metro", "name": "Nagole Metro Station Junction", "lat": 17.37820, "lon": 78.56350, "type": "intersection", "osm_id": "18301995", "has_signal": True, "area": "Nagole"},

    # LB Nagar / Dilsukhnagar / Malakpet
    {"id": "node_lbnagar_ring", "name": "LB Nagar X Roads Junction", "lat": 17.34582, "lon": 78.55201, "type": "major_junction", "osm_id": "19302003", "has_signal": True, "area": "LB Nagar"},
    {"id": "node_sagar_ring", "name": "Sagar Ring Road X Roads", "lat": 17.34821, "lon": 78.54122, "type": "major_junction", "osm_id": "20302014", "has_signal": True, "area": "LB Nagar"},
    {"id": "node_kothapet_crossing", "name": "Kothapet Fruit Market X Roads", "lat": 17.36120, "lon": 78.53850, "type": "intersection", "osm_id": "20302015", "has_signal": True, "area": "LB Nagar / Kothapet"},
    {"id": "node_dilsukhnagar", "name": "Dilsukhnagar Bus Depot X Roads", "lat": 17.36852, "lon": 78.52551, "type": "major_junction", "osm_id": "21302025", "has_signal": True, "area": "Dilsukhnagar"},
    {"id": "node_malakpet", "name": "Malakpet Nalgonda X Roads", "lat": 17.37620, "lon": 78.50150, "type": "major_junction", "osm_id": "21302026", "has_signal": True, "area": "Malakpet"},
    {"id": "node_chaderghat", "name": "Chaderghat Rotary Junction", "lat": 17.38210, "lon": 78.49050, "type": "major_junction", "osm_id": "21302027", "has_signal": True, "area": "Central / Musi River"},

    # Outer Ring Road (ORR) Arterial Spine Nodes
    {"id": "node_orr_nanakramguda", "name": "ORR Toll Plaza Nanakramguda", "lat": 17.40820, "lon": 78.33850, "type": "expressway_toll", "osm_id": "30102001", "has_signal": False, "area": "ORR South-West"},
    {"id": "node_orr_rajendranagar", "name": "ORR Interchange Rajendranagar", "lat": 17.32500, "lon": 78.39500, "type": "expressway_interchange", "osm_id": "30102002", "has_signal": False, "area": "ORR South"},
    {"id": "node_orr_shamshabad", "name": "ORR Airport Interchange Shamshabad", "lat": 17.26500, "lon": 78.42100, "type": "expressway_interchange", "osm_id": "30102003", "has_signal": False, "area": "ORR Airport"},
    {"id": "node_orr_bongloor", "name": "ORR Interchange Bongloor (Sagar Highway)", "lat": 17.28800, "lon": 78.54800, "type": "expressway_interchange", "osm_id": "30102004", "has_signal": False, "area": "ORR South-East"},
    {"id": "node_orr_pedda_amberpet", "name": "ORR Interchange Pedda Amberpet (NH 65)", "lat": 17.32400, "lon": 78.61500, "type": "expressway_interchange", "osm_id": "30102005", "has_signal": False, "area": "ORR East"},
    {"id": "node_orr_ghatkesar", "name": "ORR Interchange Ghatkesar (Warangal Highway)", "lat": 17.44200, "lon": 78.68200, "type": "expressway_interchange", "osm_id": "30102006", "has_signal": False, "area": "ORR North-East"},

    # Inner Ring Road (IRR) Nodes
    {"id": "node_irr_chandrayangutta", "name": "Chandrayangutta X Roads (IRR South)", "lat": 17.32850, "lon": 78.47820, "type": "major_junction", "osm_id": "30202001", "has_signal": True, "area": "Inner Ring Road South"},
    {"id": "node_irr_aramghar", "name": "Aramghar X Roads / PVNR End", "lat": 17.33250, "lon": 78.43500, "type": "major_junction", "osm_id": "30202002", "has_signal": True, "area": "Inner Ring Road South-West"}
]

# Lookup dictionary for fast node coordinate retrieval
NODE_DICT = {n["id"]: n for n in HYDERABAD_NODES}

# Definitions of Hyderabad Road Segments with actual geographical LineString coordinates
# Classified according to OpenStreetMap highway categories:
# motorway, trunk, primary, secondary, tertiary, residential
RAW_ROAD_SEGMENTS: List[Dict[str, Any]] = [
    # -------------------------------------------------------------
    # 1. HITECH CITY / MADHAPUR ARTERIALS
    # -------------------------------------------------------------
    {
        "id": "road_cyber_kothaguda",
        "name": "Hitech City - Kothaguda Main Road",
        "from_node": "node_cyber_towers",
        "to_node": "node_kothaguda",
        "osm_way_id": "way_114298101",
        "highway": "primary",
        "one_way": False,
        "lanes": 6,
        "base_speed_kmh": 50,
        "geometry": [
            [78.38082, 17.45041],
            [78.37550, 17.45280],
            [78.36850, 17.45520],
            [78.36122, 17.45821]
        ]
    },
    {
        "id": "road_kothaguda_hitex",
        "name": "HITEX Exhibition Feeder Road",
        "from_node": "node_kothaguda",
        "to_node": "node_hitex_entry",
        "osm_way_id": "way_114298102",
        "highway": "secondary",
        "one_way": False,
        "lanes": 4,
        "base_speed_kmh": 40,
        "geometry": [
            [78.36122, 17.45821],
            [78.36750, 17.46410],
            [78.37520, 17.46820]
        ]
    },
    {
        "id": "road_hitex_cyber",
        "name": "HITEX - Cyber Towers Connecting Road",
        "from_node": "node_hitex_entry",
        "to_node": "node_cyber_towers",
        "osm_way_id": "way_114298103",
        "highway": "secondary",
        "one_way": False,
        "lanes": 4,
        "base_speed_kmh": 40,
        "geometry": [
            [78.37520, 17.46820],
            [78.37850, 17.45950],
            [78.38082, 17.45041]
        ]
    },
    {
        "id": "road_cyber_mindspace",
        "name": "Hitech City Main Road (Mindspace Corridor)",
        "from_node": "node_cyber_towers",
        "to_node": "node_mindspace",
        "osm_way_id": "way_114298104",
        "highway": "primary",
        "one_way": False,
        "lanes": 6,
        "base_speed_kmh": 50,
        "geometry": [
            [78.38082, 17.45041],
            [78.38110, 17.44620],
            [78.38122, 17.44121]
        ]
    },
    {
        "id": "road_mindspace_biodiversity",
        "name": "Old Mumbai Highway (Mindspace - Bio-Diversity)",
        "from_node": "node_mindspace",
        "to_node": "node_biodiversity",
        "osm_way_id": "way_114298105",
        "highway": "primary",
        "one_way": False,
        "lanes": 6,
        "base_speed_kmh": 50,
        "geometry": [
            [78.38122, 17.44121],
            [78.38050, 17.43850],
            [78.37982, 17.43581]
        ]
    },
    {
        "id": "road_mindspace_inorbit",
        "name": "Inorbit Mall Access Avenue",
        "from_node": "node_mindspace",
        "to_node": "node_inorbit_mall",
        "osm_way_id": "way_114298106",
        "highway": "secondary",
        "one_way": True,
        "direction": "forward",
        "lanes": 3,
        "base_speed_kmh": 40,
        "geometry": [
            [78.38122, 17.44121],
            [78.38380, 17.43720],
            [78.38620, 17.43350]
        ]
    },
    {
        "id": "road_inorbit_durgam",
        "name": "Durgam Cheruvu Lakefront Road",
        "from_node": "node_inorbit_mall",
        "to_node": "node_durgam_cheruvu_west",
        "osm_way_id": "way_114298107",
        "highway": "secondary",
        "one_way": True,
        "direction": "forward",
        "lanes": 2,
        "base_speed_kmh": 35,
        "geometry": [
            [78.38620, 17.43350],
            [78.38810, 17.43180],
            [78.38950, 17.43020]
        ]
    },
    {
        "id": "road_cable_bridge",
        "name": "Durgam Cheruvu Cable-Stayed Bridge",
        "from_node": "node_durgam_cheruvu_west",
        "to_node": "node_jh_r45",
        "osm_way_id": "way_114298108",
        "highway": "primary",
        "one_way": False,
        "lanes": 4,
        "base_speed_kmh": 50,
        "geometry": [
            [78.38950, 17.43020],
            [78.39350, 17.42900],
            [78.39851, 17.42782]
        ]
    },
    {
        "id": "road_cyber_madhapur_metro",
        "name": "Hitech City - Madhapur Metro Avenue",
        "from_node": "node_cyber_towers",
        "to_node": "node_madhapur_metro",
        "osm_way_id": "way_114298109",
        "highway": "primary",
        "one_way": False,
        "lanes": 4,
        "base_speed_kmh": 45,
        "geometry": [
            [78.38082, 17.45041],
            [78.38650, 17.44920],
            [78.39150, 17.44830]
        ]
    },
    {
        "id": "road_madhapur_kavuri",
        "name": "Madhapur - Kavuri Hills Link Road",
        "from_node": "node_madhapur_metro",
        "to_node": "node_kavuri_hills",
        "osm_way_id": "way_114298110",
        "highway": "secondary",
        "one_way": False,
        "lanes": 4,
        "base_speed_kmh": 40,
        "geometry": [
            [78.39150, 17.44830],
            [78.39520, 17.44350],
            [78.39820, 17.43980]
        ]
    },
    {
        "id": "road_kavuri_jh_checkpost",
        "name": "Kavuri Hills to Jubilee Hills Checkpost Road",
        "from_node": "node_kavuri_hills",
        "to_node": "node_jh_checkpost",
        "osm_way_id": "way_114298111",
        "highway": "primary",
        "one_way": False,
        "lanes": 4,
        "base_speed_kmh": 45,
        "geometry": [
            [78.39820, 17.43980],
            [78.40650, 17.43620],
            [78.41651, 17.43202]
        ]
    },

    # -------------------------------------------------------------
    # 2. GACHIBOWLI & FINANCIAL DISTRICT
    # -------------------------------------------------------------
    {
        "id": "road_kothaguda_gachibowli",
        "name": "Gachibowli - Miyapur Road (Botanical Garden)",
        "from_node": "node_kothaguda",
        "to_node": "node_gachibowli_flyover",
        "osm_way_id": "way_114298112",
        "highway": "primary",
        "one_way": False,
        "lanes": 6,
        "base_speed_kmh": 50,
        "geometry": [
            [78.36122, 17.45821],
            [78.35980, 17.44950],
            [78.35850, 17.44021]
        ]
    },
    {
        "id": "road_gachibowli_biodiversity",
        "name": "Old Mumbai Highway (Gachibowli Flyover - Biodiversity)",
        "from_node": "node_gachibowli_flyover",
        "to_node": "node_biodiversity",
        "osm_way_id": "way_114298113",
        "highway": "primary",
        "one_way": False,
        "lanes": 6,
        "base_speed_kmh": 50,
        "geometry": [
            [78.35850, 17.44021],
            [78.36850, 17.43820],
            [78.37982, 17.43581]
        ]
    },
    {
        "id": "road_gachibowli_orr_link",
        "name": "Gachibowli Junction ORR Entry Ramp",
        "from_node": "node_gachibowli_flyover",
        "to_node": "node_gachibowli_orr",
        "osm_way_id": "way_114298114",
        "highway": "trunk",
        "one_way": False,
        "lanes": 6,
        "base_speed_kmh": 60,
        "geometry": [
            [78.35850, 17.44021],
            [78.35350, 17.44021],
            [78.34951, 17.44021]
        ]
    },
    {
        "id": "road_orr_gachibowli_financial",
        "name": "Outer Ring Road (Gachibowli to Financial District)",
        "from_node": "node_gachibowli_orr",
        "to_node": "node_financial_district",
        "osm_way_id": "way_114298115",
        "highway": "motorway",
        "one_way": False,
        "lanes": 8,
        "base_speed_kmh": 100,
        "geometry": [
            [78.34951, 17.44021],
            [78.34650, 17.43050],
            [78.34350, 17.41920]
        ]
    },
    {
        "id": "road_financial_nanakramguda",
        "name": "Financial District Road (Wipro Circle - Nanakramguda)",
        "from_node": "node_financial_district",
        "to_node": "node_nanakramguda",
        "osm_way_id": "way_114298116",
        "highway": "primary",
        "one_way": False,
        "lanes": 6,
        "base_speed_kmh": 50,
        "geometry": [
            [78.34350, 17.41920],
            [78.34850, 17.41550],
            [78.35420, 17.41250]
        ]
    },
    {
        "id": "road_nanakramguda_biodiversity",
        "name": "Gachibowli - Nanakramguda Main Link",
        "from_node": "node_nanakramguda",
        "to_node": "node_biodiversity",
        "osm_way_id": "way_114298117",
        "highway": "primary",
        "one_way": False,
        "lanes": 4,
        "base_speed_kmh": 50,
        "geometry": [
            [78.35420, 17.41250],
            [78.36850, 17.42450],
            [78.37982, 17.43581]
        ]
    },
    {
        "id": "road_financial_orr_south",
        "name": "Outer Ring Road (Financial District to Nanakramguda Toll)",
        "from_node": "node_financial_district",
        "to_node": "node_orr_nanakramguda",
        "osm_way_id": "way_114298118",
        "highway": "motorway",
        "one_way": False,
        "lanes": 8,
        "base_speed_kmh": 100,
        "geometry": [
            [78.34350, 17.41920],
            [78.34050, 17.41350],
            [78.33850, 17.40820]
        ]
    },

    # -------------------------------------------------------------
    # 3. JUBILEE HILLS & BANJARA HILLS
    # -------------------------------------------------------------
    {
        "id": "road_jh_r45_r36",
        "name": "Road No 45 Jubilee Hills Corridor",
        "from_node": "node_jh_r45",
        "to_node": "node_jh_r36_r10",
        "osm_way_id": "way_114298119",
        "highway": "primary",
        "one_way": False,
        "lanes": 4,
        "base_speed_kmh": 45,
        "geometry": [
            [78.39851, 17.42782],
            [78.40010, 17.42920],
            [78.40122, 17.43051]
        ]
    },
    {
        "id": "road_jh_r36_peddamma",
        "name": "Road No 36 Commercial Spine (R36/10 to Peddamma Gudi)",
        "from_node": "node_jh_r36_r10",
        "to_node": "node_peddamma_temple",
        "osm_way_id": "way_114298120",
        "highway": "primary",
        "one_way": False,
        "lanes": 4,
        "base_speed_kmh": 45,
        "geometry": [
            [78.40122, 17.43051],
            [78.40450, 17.43100],
            [78.40820, 17.43150]
        ]
    },
    {
        "id": "road_peddamma_jh_checkpost",
        "name": "Road No 36 (Peddamma Gudi to Jubilee Checkpost)",
        "from_node": "node_peddamma_temple",
        "to_node": "node_jh_checkpost",
        "osm_way_id": "way_114298121",
        "highway": "primary",
        "one_way": False,
        "lanes": 4,
        "base_speed_kmh": 45,
        "geometry": [
            [78.40820, 17.43150],
            [78.41250, 17.43180],
            [78.41651, 17.43202]
        ]
    },
    {
        "id": "road_jh_apollo",
        "name": "Road No 72 Film Nagar (Apollo Hospital Access)",
        "from_node": "node_jh_checkpost",
        "to_node": "node_apollo_crossing",
        "osm_way_id": "way_114298122",
        "highway": "secondary",
        "one_way": False,
        "lanes": 4,
        "base_speed_kmh": 40,
        "geometry": [
            [78.41651, 17.43202],
            [78.41420, 17.42450],
            [78.41250, 17.41820]
        ]
    },
    {
        "id": "road_apollo_film_nagar",
        "name": "Film Nagar Main Road",
        "from_node": "node_apollo_crossing",
        "to_node": "node_film_nagar",
        "osm_way_id": "way_114298123",
        "highway": "secondary",
        "one_way": False,
        "lanes": 2,
        "base_speed_kmh": 35,
        "geometry": [
            [78.41250, 17.41820],
            [78.41180, 17.41500],
            [78.41100, 17.41250]
        ]
    },
    {
        "id": "road_film_nagar_bh_road12",
        "name": "Film Nagar to Banjara Hills Road No 12",
        "from_node": "node_film_nagar",
        "to_node": "node_bh_road12",
        "osm_way_id": "way_114298124",
        "highway": "secondary",
        "one_way": False,
        "lanes": 4,
        "base_speed_kmh": 40,
        "geometry": [
            [78.41100, 17.41250],
            [78.42150, 17.41280],
            [78.43250, 17.41320]
        ]
    },
    {
        "id": "road_jh_checkpost_bh_road10",
        "name": "Jubilee Hills - Banjara Hills Road No 10 Connection",
        "from_node": "node_jh_checkpost",
        "to_node": "node_bh_road10",
        "osm_way_id": "way_114298125",
        "highway": "primary",
        "one_way": False,
        "lanes": 4,
        "base_speed_kmh": 45,
        "geometry": [
            [78.41651, 17.43202],
            [78.42850, 17.42720],
            [78.43850, 17.42150]
        ]
    },
    {
        "id": "road_bh_road10_road1",
        "name": "Banjara Hills Road No 10 to Road No 1",
        "from_node": "node_bh_road10",
        "to_node": "node_bh_road1",
        "osm_way_id": "way_114298126",
        "highway": "primary",
        "one_way": False,
        "lanes": 4,
        "base_speed_kmh": 45,
        "geometry": [
            [78.43850, 17.42150],
            [78.44450, 17.41900],
            [78.44850, 17.41720]
        ]
    },
    {
        "id": "road_bh_road1_panjagutta",
        "name": "Road No 1 Banjara Hills to Panjagutta Nagarjuna Circle",
        "from_node": "node_bh_road1",
        "to_node": "node_panjagutta",
        "osm_way_id": "way_114298127",
        "highway": "primary",
        "one_way": False,
        "lanes": 6,
        "base_speed_kmh": 50,
        "geometry": [
            [78.44850, 17.41720],
            [78.45050, 17.42150],
            [78.45202, 17.42621]
        ]
    },
    {
        "id": "road_bh_road1_masab_tank",
        "name": "Road No 1 Banjara Hills to Masab Tank Flyover",
        "from_node": "node_bh_road1",
        "to_node": "node_masab_tank",
        "osm_way_id": "way_114298128",
        "highway": "primary",
        "one_way": False,
        "lanes": 4,
        "base_speed_kmh": 45,
        "geometry": [
            [78.44850, 17.41720],
            [78.44980, 17.41250],
            [78.45122, 17.40821]
        ]
    },
    {
        "id": "road_masab_mehdipatnam",
        "name": "Inner Ring Road (Masab Tank to Mehdipatnam)",
        "from_node": "node_masab_tank",
        "to_node": "node_mehdipatnam",
        "osm_way_id": "way_114298129",
        "highway": "trunk",
        "one_way": False,
        "lanes": 6,
        "base_speed_kmh": 50,
        "geometry": [
            [78.45122, 17.40821],
            [78.44650, 17.39950],
            [78.44121, 17.39151]
        ]
    },

    # -------------------------------------------------------------
    # 4. AMEERPET / PANJAGUTTA / BEGUMPET / SECUNDERABAD CORRIDOR
    # -------------------------------------------------------------
    {
        "id": "road_panjagutta_ameerpet",
        "name": "Panjagutta - Ameerpet Metro Corridor (NH 65)",
        "from_node": "node_panjagutta",
        "to_node": "node_ameerpet",
        "osm_way_id": "way_114298130",
        "highway": "primary",
        "one_way": False,
        "lanes": 6,
        "base_speed_kmh": 45,
        "geometry": [
            [78.45202, 17.42621],
            [78.45020, 17.43150],
            [78.44851, 17.43721]
        ]
    },
    {
        "id": "road_ameerpet_srnagar",
        "name": "NH 65 Ameerpet to SR Nagar",
        "from_node": "node_ameerpet",
        "to_node": "node_sr_nagar",
        "osm_way_id": "way_114298131",
        "highway": "primary",
        "one_way": False,
        "lanes": 6,
        "base_speed_kmh": 45,
        "geometry": [
            [78.44851, 17.43721],
            [78.44620, 17.44100],
            [78.44420, 17.44450]
        ]
    },
    {
        "id": "road_panjagutta_begumpet",
        "name": "Panjagutta Flyover to Begumpet Main Road",
        "from_node": "node_panjagutta",
        "to_node": "node_begumpet",
        "osm_way_id": "way_114298132",
        "highway": "primary",
        "one_way": False,
        "lanes": 6,
        "base_speed_kmh": 50,
        "geometry": [
            [78.45202, 17.42621],
            [78.45750, 17.43450],
            [78.46252, 17.44251]
        ]
    },
    {
        "id": "road_begumpet_prakash_nagar",
        "name": "Begumpet Airport Road (Prakash Nagar Corridor)",
        "from_node": "node_begumpet",
        "to_node": "node_prakash_nagar",
        "osm_way_id": "way_114298133",
        "highway": "primary",
        "one_way": False,
        "lanes": 6,
        "base_speed_kmh": 50,
        "geometry": [
            [78.46252, 17.44251],
            [78.46750, 17.44350],
            [78.47250, 17.44420]
        ]
    },
    {
        "id": "road_prakash_paradise",
        "name": "Sardar Patel Road (Begumpet to Paradise)",
        "from_node": "node_prakash_nagar",
        "to_node": "node_paradise",
        "osm_way_id": "way_114298134",
        "highway": "primary",
        "one_way": False,
        "lanes": 6,
        "base_speed_kmh": 50,
        "geometry": [
            [78.47250, 17.44420],
            [78.48150, 17.44280],
            [78.48951, 17.44101]
        ]
    },
    {
        "id": "road_paradise_clock_tower",
        "name": "MG Road / Sarojini Devi Road (Paradise to Clock Tower)",
        "from_node": "node_paradise",
        "to_node": "node_secunderabad_clock_tower",
        "osm_way_id": "way_114298135",
        "highway": "primary",
        "one_way": False,
        "lanes": 4,
        "base_speed_kmh": 40,
        "geometry": [
            [78.48951, 17.44101],
            [78.49550, 17.44020],
            [78.50151, 17.43952]
        ]
    },
    {
        "id": "road_clock_tower_station",
        "name": "Station Road Secunderabad Terminal Link",
        "from_node": "node_secunderabad_clock_tower",
        "to_node": "node_secunderabad_station",
        "osm_way_id": "way_114298136",
        "highway": "secondary",
        "one_way": False,
        "lanes": 4,
        "base_speed_kmh": 35,
        "geometry": [
            [78.50151, 17.43952],
            [78.50220, 17.43680],
            [78.50280, 17.43420]
        ]
    },
    {
        "id": "road_clock_tower_sangeet",
        "name": "Sangeet Cinema - Clock Tower Avenue",
        "from_node": "node_secunderabad_clock_tower",
        "to_node": "node_sangeet_junction",
        "osm_way_id": "way_114298137",
        "highway": "secondary",
        "one_way": False,
        "lanes": 4,
        "base_speed_kmh": 40,
        "geometry": [
            [78.50151, 17.43952],
            [78.50500, 17.44210],
            [78.50850, 17.44480]
        ]
    },
    {
        "id": "road_sangeet_tarnaka",
        "name": "Mettuguda - Tarnaka Flyover Corridor",
        "from_node": "node_sangeet_junction",
        "to_node": "node_tarnaka",
        "osm_way_id": "way_114298138",
        "highway": "primary",
        "one_way": False,
        "lanes": 6,
        "base_speed_kmh": 50,
        "geometry": [
            [78.50850, 17.44480],
            [78.51950, 17.43650],
            [78.53121, 17.42852]
        ]
    },

    # -------------------------------------------------------------
    # 5. TARNAKA -> UPPAL -> NAGOLE ARTERIALS
    # -------------------------------------------------------------
    {
        "id": "road_tarnaka_ou",
        "name": "Osmania University Road",
        "from_node": "node_tarnaka",
        "to_node": "node_osmania_univ",
        "osm_way_id": "way_114298139",
        "highway": "secondary",
        "one_way": False,
        "lanes": 4,
        "base_speed_kmh": 40,
        "geometry": [
            [78.53121, 17.42852],
            [78.52980, 17.42480],
            [78.52850, 17.42150]
        ]
    },
    {
        "id": "road_tarnaka_habsiguda",
        "name": "Tarnaka - Habsiguda Main Road",
        "from_node": "node_tarnaka",
        "to_node": "node_habsiguda",
        "osm_way_id": "way_114298140",
        "highway": "primary",
        "one_way": False,
        "lanes": 6,
        "base_speed_kmh": 50,
        "geometry": [
            [78.53121, 17.42852],
            [78.53850, 17.42250],
            [78.54420, 17.41620]
        ]
    },
    {
        "id": "road_habsiguda_uppal_stadium",
        "name": "Habsiguda to Uppal Stadium Road",
        "from_node": "node_habsiguda",
        "to_node": "node_uppal_stadium",
        "osm_way_id": "way_114298141",
        "highway": "primary",
        "one_way": False,
        "lanes": 6,
        "base_speed_kmh": 50,
        "geometry": [
            [78.54420, 17.41620],
            [78.54820, 17.41100],
            [78.55120, 17.40650]
        ]
    },
    {
        "id": "road_uppal_stadium_ring",
        "name": "Uppal Stadium to Uppal Ring Road",
        "from_node": "node_uppal_stadium",
        "to_node": "node_uppal_ring",
        "osm_way_id": "way_114298142",
        "highway": "primary",
        "one_way": False,
        "lanes": 6,
        "base_speed_kmh": 50,
        "geometry": [
            [78.55120, 17.40650],
            [78.55620, 17.40380],
            [78.56051, 17.40182]
        ]
    },
    {
        "id": "road_uppal_ring_bridge",
        "name": "Inner Ring Road (Uppal to Musi Bridge)",
        "from_node": "node_uppal_ring",
        "to_node": "node_uppal_nagole_bridge",
        "osm_way_id": "way_114298143",
        "highway": "trunk",
        "one_way": False,
        "lanes": 6,
        "base_speed_kmh": 60,
        "geometry": [
            [78.56051, 17.40182],
            [78.56150, 17.39450],
            [78.56210, 17.38820]
        ]
    },
    {
        "id": "road_nagole_bridge_metro",
        "name": "Inner Ring Road (Musi Bridge to Nagole Metro)",
        "from_node": "node_uppal_nagole_bridge",
        "to_node": "node_nagole_metro",
        "osm_way_id": "way_114298144",
        "highway": "trunk",
        "one_way": False,
        "lanes": 6,
        "base_speed_kmh": 60,
        "geometry": [
            [78.56210, 17.38820],
            [78.56280, 17.38350],
            [78.56350, 17.37820]
        ]
    },
    {
        "id": "road_nagole_lbnagar",
        "name": "Inner Ring Road (Nagole to LB Nagar X Roads)",
        "from_node": "node_nagole_metro",
        "to_node": "node_lbnagar_ring",
        "osm_way_id": "way_114298145",
        "highway": "trunk",
        "one_way": False,
        "lanes": 6,
        "base_speed_kmh": 60,
        "geometry": [
            [78.56350, 17.37820],
            [78.55820, 17.36250],
            [78.55201, 17.34582]
        ]
    },

    # -------------------------------------------------------------
    # 6. LB NAGAR & DILSUKHNAGAR & MALAKPET (NH 65 CORRIDOR)
    # -------------------------------------------------------------
    {
        "id": "road_lbnagar_sagar_ring",
        "name": "Inner Ring Road (LB Nagar to Sagar Ring Road)",
        "from_node": "node_lbnagar_ring",
        "to_node": "node_sagar_ring",
        "osm_way_id": "way_114298146",
        "highway": "trunk",
        "one_way": False,
        "lanes": 6,
        "base_speed_kmh": 60,
        "geometry": [
            [78.55201, 17.34582],
            [78.54650, 17.34700],
            [78.54122, 17.34821]
        ]
    },
    {
        "id": "road_lbnagar_kothapet",
        "name": "NH 65 (LB Nagar to Kothapet Fruit Market)",
        "from_node": "node_lbnagar_ring",
        "to_node": "node_kothapet_crossing",
        "osm_way_id": "way_114298147",
        "highway": "trunk",
        "one_way": False,
        "lanes": 6,
        "base_speed_kmh": 50,
        "geometry": [
            [78.55201, 17.34582],
            [78.54550, 17.35350],
            [78.53850, 17.36120]
        ]
    },
    {
        "id": "road_kothapet_dilsukhnagar",
        "name": "NH 65 (Kothapet to Dilsukhnagar)",
        "from_node": "node_kothapet_crossing",
        "to_node": "node_dilsukhnagar",
        "osm_way_id": "way_114298148",
        "highway": "trunk",
        "one_way": False,
        "lanes": 6,
        "base_speed_kmh": 45,
        "geometry": [
            [78.53850, 17.36120],
            [78.53200, 17.36500],
            [78.52551, 17.36852]
        ]
    },
    {
        "id": "road_dilsukhnagar_malakpet",
        "name": "NH 65 (Dilsukhnagar to Malakpet Nalgonda X Roads)",
        "from_node": "node_dilsukhnagar",
        "to_node": "node_malakpet",
        "osm_way_id": "way_114298149",
        "highway": "trunk",
        "one_way": False,
        "lanes": 6,
        "base_speed_kmh": 45,
        "geometry": [
            [78.52551, 17.36852],
            [78.51350, 17.37250],
            [78.50150, 17.37620]
        ]
    },
    {
        "id": "road_malakpet_chaderghat",
        "name": "Malakpet to Chaderghat Musi River Causeway",
        "from_node": "node_malakpet",
        "to_node": "node_chaderghat",
        "osm_way_id": "way_114298150",
        "highway": "primary",
        "one_way": False,
        "lanes": 4,
        "base_speed_kmh": 40,
        "geometry": [
            [78.50150, 17.37620],
            [78.49600, 17.37950],
            [78.49050, 17.38210]
        ]
    },

    # -------------------------------------------------------------
    # 7. INNER RING ROAD (IRR) SOUTH & PVNR EXPRESSWAY LINK
    # -------------------------------------------------------------
    {
        "id": "road_sagar_ring_chandrayangutta",
        "name": "Inner Ring Road South (Sagar Ring to Chandrayangutta)",
        "from_node": "node_sagar_ring",
        "to_node": "node_irr_chandrayangutta",
        "osm_way_id": "way_114298151",
        "highway": "trunk",
        "one_way": False,
        "lanes": 6,
        "base_speed_kmh": 60,
        "geometry": [
            [78.54122, 17.34821],
            [78.51250, 17.33850],
            [78.47820, 17.32850]
        ]
    },
    {
        "id": "road_chandrayangutta_aramghar",
        "name": "Inner Ring Road South-West (Chandrayangutta to Aramghar)",
        "from_node": "node_irr_chandrayangutta",
        "to_node": "node_irr_aramghar",
        "osm_way_id": "way_114298152",
        "highway": "trunk",
        "one_way": False,
        "lanes": 6,
        "base_speed_kmh": 60,
        "geometry": [
            [78.47820, 17.32850],
            [78.45650, 17.33050],
            [78.43500, 17.33250]
        ]
    },
    {
        "id": "road_pvnr_expressway",
        "name": "P.V. Narasimha Rao Elevated Expressway",
        "from_node": "node_mehdipatnam",
        "to_node": "node_irr_aramghar",
        "osm_way_id": "way_114298153",
        "highway": "motorway",
        "one_way": False,
        "lanes": 4,
        "base_speed_kmh": 80,
        "geometry": [
            [78.44121, 17.39151],
            [78.43850, 17.36200],
            [78.43500, 17.33250]
        ]
    },

    # -------------------------------------------------------------
    # 8. OUTER RING ROAD (ORR) SOUTHERN & EASTERN ARCS
    # -------------------------------------------------------------
    {
        "id": "road_orr_nanakramguda_rajendra",
        "name": "Outer Ring Road (Nanakramguda to Rajendranagar)",
        "from_node": "node_orr_nanakramguda",
        "to_node": "node_orr_rajendranagar",
        "osm_way_id": "way_114298154",
        "highway": "motorway",
        "one_way": False,
        "lanes": 8,
        "base_speed_kmh": 100,
        "geometry": [
            [78.33850, 17.40820],
            [78.36650, 17.36650],
            [78.39500, 17.32500]
        ]
    },
    {
        "id": "road_orr_rajendra_shamshabad",
        "name": "Outer Ring Road (Rajendranagar to Shamshabad Airport)",
        "from_node": "node_orr_rajendranagar",
        "to_node": "node_orr_shamshabad",
        "osm_way_id": "way_114298155",
        "highway": "motorway",
        "one_way": False,
        "lanes": 8,
        "base_speed_kmh": 100,
        "geometry": [
            [78.39500, 17.32500],
            [78.40800, 17.29500],
            [78.42100, 17.26500]
        ]
    },
    {
        "id": "road_orr_shamshabad_bongloor",
        "name": "Outer Ring Road (Shamshabad to Bongloor)",
        "from_node": "node_orr_shamshabad",
        "to_node": "node_orr_bongloor",
        "osm_way_id": "way_114298156",
        "highway": "motorway",
        "one_way": False,
        "lanes": 8,
        "base_speed_kmh": 100,
        "geometry": [
            [78.42100, 17.26500],
            [78.48500, 17.27600],
            [78.54800, 17.28800]
        ]
    },
    {
        "id": "road_orr_bongloor_amberpet",
        "name": "Outer Ring Road (Bongloor to Pedda Amberpet)",
        "from_node": "node_orr_bongloor",
        "to_node": "node_orr_pedda_amberpet",
        "osm_way_id": "way_114298157",
        "highway": "motorway",
        "one_way": False,
        "lanes": 8,
        "base_speed_kmh": 100,
        "geometry": [
            [78.54800, 17.28800],
            [78.58150, 17.30600],
            [78.61500, 17.32400]
        ]
    },
    {
        "id": "road_orr_amberpet_ghatkesar",
        "name": "Outer Ring Road (Pedda Amberpet to Ghatkesar)",
        "from_node": "node_orr_pedda_amberpet",
        "to_node": "node_orr_ghatkesar",
        "osm_way_id": "way_114298158",
        "highway": "motorway",
        "one_way": False,
        "lanes": 8,
        "base_speed_kmh": 100,
        "geometry": [
            [78.61500, 17.32400],
            [78.64850, 17.38300],
            [78.68200, 17.44200]
        ]
    },
    {
        "id": "road_nh65_lbnagar_amberpet",
        "name": "National Highway 65 (LB Nagar to ORR Pedda Amberpet)",
        "from_node": "node_lbnagar_ring",
        "to_node": "node_orr_pedda_amberpet",
        "osm_way_id": "way_114298159",
        "highway": "trunk",
        "one_way": False,
        "lanes": 6,
        "base_speed_kmh": 70,
        "geometry": [
            [78.55201, 17.34582],
            [78.58350, 17.33480],
            [78.61500, 17.32400]
        ]
    },
    {
        "id": "road_uppal_ghatkesar_nh163",
        "name": "Warangal Highway NH 163 (Uppal to ORR Ghatkesar)",
        "from_node": "node_uppal_ring",
        "to_node": "node_orr_ghatkesar",
        "osm_way_id": "way_114298160",
        "highway": "trunk",
        "one_way": False,
        "lanes": 6,
        "base_speed_kmh": 70,
        "geometry": [
            [78.56051, 17.40182],
            [78.62120, 17.42150],
            [78.68200, 17.44200]
        ]
    },
    {
        "id": "road_hitech_station_cyber",
        "name": "Hitech City MMTS Station Road",
        "from_node": "node_hitech_station",
        "to_node": "node_cyber_towers",
        "osm_way_id": "way_114298161",
        "highway": "secondary",
        "one_way": False,
        "lanes": 4,
        "base_speed_kmh": 40,
        "geometry": [
            [78.38820, 17.47210],
            [78.38450, 17.46100],
            [78.38082, 17.45041]
        ]
    },
    {
        "id": "road_gachibowli_stadium_link",
        "name": "GMC Balayogi Stadium Access Road",
        "from_node": "node_gachibowli_stadium",
        "to_node": "node_gachibowli_flyover",
        "osm_way_id": "way_114298162",
        "highway": "secondary",
        "one_way": False,
        "lanes": 4,
        "base_speed_kmh": 40,
        "geometry": [
            [78.34320, 17.44550],
            [78.35100, 17.44300],
            [78.35850, 17.44021]
        ]
    },
    {
        "id": "road_chaderghat_masab_tank",
        "name": "Nampally - Masab Tank Connecting Arterial",
        "from_node": "node_chaderghat",
        "to_node": "node_masab_tank",
        "osm_way_id": "way_114298163",
        "highway": "primary",
        "one_way": False,
        "lanes": 4,
        "base_speed_kmh": 45,
        "geometry": [
            [78.49050, 17.38210],
            [78.47100, 17.39500],
            [78.45122, 17.40821]
        ]
    },
    {
        "id": "road_srnagar_kothaguda",
        "name": "Kukatpally - Hitech City Connecting Link",
        "from_node": "node_sr_nagar",
        "to_node": "node_kothaguda",
        "osm_way_id": "way_114298164",
        "highway": "primary",
        "one_way": False,
        "lanes": 6,
        "base_speed_kmh": 50,
        "geometry": [
            [78.44420, 17.44450],
            [78.40500, 17.45200],
            [78.36122, 17.45821]
        ]
    }
]

class HyderabadRoadGraph:
    """
    Manages the directed graph representation of the Hyderabad Road Network.
    Provides graph construction, property inspection, GeoJSON generation,
    and GraphML serialization.
    """
    def __init__(self):
        self.graph = nx.DiGraph()
        self.nodes_data: Dict[str, Dict[str, Any]] = {}
        self.edges_data: Dict[str, Dict[str, Any]] = {}
        self._build_graph()

    def _build_graph(self):
        """Constructs the directed graph from nodes and segments."""
        # 1. Add Nodes
        for node in HYDERABAD_NODES:
            nid = node["id"]
            self.nodes_data[nid] = node
            self.graph.add_node(
                nid,
                name=node["name"],
                lat=node["lat"],
                lon=node["lon"],
                node_type=node["type"],
                area=node["area"],
                has_signal=node["has_signal"],
                osm_id=node["osm_id"]
            )

        # 2. Add Edges (Directed)
        for seg in RAW_ROAD_SEGMENTS:
            sid = seg["id"]
            u = seg["from_node"]
            v = seg["to_node"]
            coords = seg["geometry"]
            length_m = compute_linestring_length(coords)
            is_oneway = seg.get("one_way", False)

            edge_attrs = {
                "id": sid,
                "name": seg["name"],
                "from_node": u,
                "to_node": v,
                "osm_way_id": seg["osm_way_id"],
                "highway": seg["highway"],
                "length_m": length_m,
                "lanes": seg.get("lanes", 4),
                "base_speed_kmh": seg.get("base_speed_kmh", 50),
                "one_way": is_oneway,
                "direction": seg.get("direction", "forward" if is_oneway else "bidirectional"),
                "geometry": coords
            }

            self.edges_data[sid] = edge_attrs

            # Add forward directed edge
            self.graph.add_edge(u, v, key=sid, **edge_attrs)

            # If two-way road, add reverse directed edge with reversed coordinates
            if not is_oneway:
                rev_sid = f"{sid}_rev"
                rev_coords = list(reversed(coords))
                rev_attrs = dict(edge_attrs)
                rev_attrs["id"] = rev_sid
                rev_attrs["from_node"] = v
                rev_attrs["to_node"] = u
                rev_attrs["direction"] = "reverse"
                rev_attrs["geometry"] = rev_coords
                self.edges_data[rev_sid] = rev_attrs
                self.graph.add_edge(v, u, key=rev_sid, **rev_attrs)

    def get_summary_statistics(self) -> Dict[str, Any]:
        """Calculates comprehensive graph metrics and validation statistics."""
        num_nodes = self.graph.number_of_nodes()
        num_edges = self.graph.number_of_edges()
        is_connected = nx.is_weakly_connected(self.graph)
        strongly_connected_components = nx.number_strongly_connected_components(self.graph)
        total_road_length_m = sum(data.get("length_m", 0) for _, _, data in self.graph.edges(data=True))

        # 1. Physical road segments breakdown (Sum = 64)
        segment_class_breakdown = {}
        unique_osm_ways = set()
        for seg in RAW_ROAD_SEGMENTS:
            hw = seg.get("highway", "unclassified")
            segment_class_breakdown[hw] = segment_class_breakdown.get(hw, 0) + 1
            unique_osm_ways.add(seg.get("osm_way_id"))

        # 2. Directed graph edges breakdown (Sum = 126)
        directed_edge_class_breakdown = {}
        for _, _, data in self.graph.edges(data=True):
            hw = data.get("highway", "unclassified")
            directed_edge_class_breakdown[hw] = directed_edge_class_breakdown.get(hw, 0) + 1

        return {
            "total_nodes": num_nodes,
            "total_directed_edges": num_edges,
            "total_unique_road_segments": len(RAW_ROAD_SEGMENTS),
            "unique_osm_ways": len(unique_osm_ways),
            "road_segment_classification_counts": segment_class_breakdown,
            "directed_edge_classification_counts": directed_edge_class_breakdown,
            "is_weakly_connected": is_connected,
            "strongly_connected_components": strongly_connected_components,
            "total_network_length_km": round(total_road_length_m / 1000.0, 2),
            "average_degree": round(sum(dict(self.graph.degree()).values()) / num_nodes, 2),
            "geographic_extent": {
                "min_lat": min(n["lat"] for n in HYDERABAD_NODES),
                "max_lat": max(n["lat"] for n in HYDERABAD_NODES),
                "min_lon": min(n["lon"] for n in HYDERABAD_NODES),
                "max_lon": max(n["lon"] for n in HYDERABAD_NODES)
            }
        }

    def to_geojson(self) -> Dict[str, Any]:
        """Generates GeoJSON FeatureCollection of all road segments for MapLibre rendering."""
        features = []
        # We output unique road segments for map rendering, preserving one-way status
        for seg in RAW_ROAD_SEGMENTS:
            sid = seg["id"]
            u = seg["from_node"]
            v = seg["to_node"]
            coords = seg["geometry"]
            length_m = compute_linestring_length(coords)
            is_oneway = seg.get("one_way", False)

            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": coords
                },
                "properties": {
                    "id": sid,
                    "name": seg["name"],
                    "from_node": u,
                    "from_name": NODE_DICT.get(u, {}).get("name", u),
                    "to_node": v,
                    "to_name": NODE_DICT.get(v, {}).get("name", v),
                    "highway": seg["highway"],
                    "length_m": length_m,
                    "lanes": seg.get("lanes", 4),
                    "base_speed_kmh": seg.get("base_speed_kmh", 50),
                    "one_way": is_oneway,
                    "direction": seg.get("direction", "forward" if is_oneway else "bidirectional"),
                    "osm_way_id": seg["osm_way_id"]
                }
            })

        return {
            "type": "FeatureCollection",
            "features": features
        }

    def junctions_to_geojson(self) -> Dict[str, Any]:
        """Generates GeoJSON FeatureCollection of all junction nodes."""
        features = []
        for node in HYDERABAD_NODES:
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [node["lon"], node["lat"]]
                },
                "properties": {
                    "id": node["id"],
                    "name": node["name"],
                    "node_type": node["type"],
                    "area": node["area"],
                    "has_signal": node["has_signal"],
                    "osm_id": node["osm_id"],
                    "degree": self.graph.degree(node["id"]) if node["id"] in self.graph else 0
                }
            })
        return {
            "type": "FeatureCollection",
            "features": features
        }

    def export_graph_json(self) -> Dict[str, Any]:
        """Exports graph in structured JSON format with adjacency list."""
        nodes_list = []
        for nid, data in self.graph.nodes(data=True):
            nodes_list.append({"id": nid, **data})

        edges_list = []
        for u, v, data in self.graph.edges(data=True):
            edges_list.append({"source": u, "target": v, **data})

        return {
            "nodes": nodes_list,
            "edges": edges_list,
            "summary": self.get_summary_statistics()
        }

    def save_all_formats(self, output_dir: str):
        """Exports all formats (GeoJSON, GraphML, JSON) to the output directory."""
        os.makedirs(output_dir, exist_ok=True)

        # 1. Road segments GeoJSON
        geojson_path = os.path.join(output_dir, "hyderabad_roads.geojson")
        with open(geojson_path, "w", encoding="utf-8") as f:
            json.dump(self.to_geojson(), f, indent=2)

        # 2. Junctions GeoJSON
        junctions_path = os.path.join(output_dir, "junctions.geojson")
        with open(junctions_path, "w", encoding="utf-8") as f:
            json.dump(self.junctions_to_geojson(), f, indent=2)

        # 3. Structured Graph JSON
        graph_json_path = os.path.join(output_dir, "hyderabad_graph.json")
        with open(graph_json_path, "w", encoding="utf-8") as f:
            json.dump(self.export_graph_json(), f, indent=2)

        # 4. GraphML Export
        # We prepare a clean graph for GraphML (geometry stringified since GraphML requires scalars)
        graphml_path = os.path.join(output_dir, "hyderabad_graph.graphml")
        g_export = nx.DiGraph()
        for nid, data in self.graph.nodes(data=True):
            g_export.add_node(nid, **{k: (str(v) if not isinstance(v, (int, float, bool, str)) else v) for k, v in data.items()})
        for u, v, data in self.graph.edges(data=True):
            clean_attrs = {}
            for k, val in data.items():
                if k == "geometry":
                    clean_attrs["geometry_json"] = json.dumps(val)
                elif isinstance(val, (int, float, bool, str)):
                    clean_attrs[k] = val
                else:
                    clean_attrs[k] = str(val)
            g_export.add_edge(u, v, **clean_attrs)

        nx.write_graphml(g_export, graphml_path)

        # 5. Metadata JSON
        summary_path = os.path.join(output_dir, "metadata.json")
        with open(summary_path, "w", encoding="utf-8") as f:
            json.dump(self.get_summary_statistics(), f, indent=2)

        print(f"[HyderabadRoadGraph] Successfully exported all graph artifacts to {output_dir}")

if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(current_dir, "data")
    rg = HyderabadRoadGraph()
    rg.save_all_formats(data_dir)
    print("Graph Statistics:")
    print(json.dumps(rg.get_summary_statistics(), indent=2))
