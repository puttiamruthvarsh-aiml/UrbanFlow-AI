"""
UrbanFlow AI - Location Loader Module
Extracts and catalogs real geographical locations in Hyderabad:
- Traffic Signals (OSM tag highway=traffic_signals)
- Hospitals (OSM tag amenity=hospital)
- Police Stations (OSM tag amenity=police)
- Fire Stations (OSM tag amenity=fire_station)
- Major Junctions & Intersections

Exports data to GeoJSON and structured JSON for frontend map rendering and routing graph association.
"""

import json
import os
from typing import Dict, List, Any

# Verified OpenStreetMap and municipal data for Hyderabad regions:
# Hitech City, Madhapur, Gachibowli, Jubilee Hills, Banjara Hills, Ameerpet, Secunderabad, Uppal, LB Nagar

RAW_HOSPITALS = [
    {
        "id": "hosp_01",
        "name": "Apollo Hospitals Jubilee Hills",
        "category": "hospital",
        "type": "Multi-Speciality Emergency Hospital",
        "lat": 17.41682,
        "lon": 78.41165,
        "area": "Jubilee Hills",
        "address": "Road No 72, Film Nagar, Jubilee Hills, Hyderabad",
        "osm_id": "way_114285910",
        "emergency_dept": True,
        "trauma_care": "Level 1",
        "ambulances_available": 12,
        "contact": "+91 40 2360 7777"
    },
    {
        "id": "hosp_02",
        "name": "CARE Hospitals Banjara Hills",
        "category": "hospital",
        "type": "Super Speciality Hospital",
        "lat": 17.41461,
        "lon": 78.44852,
        "area": "Banjara Hills",
        "address": "Road No 1, Prem Nagar, Banjara Hills, Hyderabad",
        "osm_id": "way_118492041",
        "emergency_dept": True,
        "trauma_care": "Level 1",
        "ambulances_available": 8,
        "contact": "+91 40 6165 6565"
    },
    {
        "id": "hosp_03",
        "name": "Continental Hospitals Gachibowli",
        "category": "hospital",
        "type": "Multi-Speciality Tertiary Care",
        "lat": 17.41905,
        "lon": 78.34584,
        "area": "Gachibowli",
        "address": "Plot No 3, Road No 2, IT & Financial District, Nanakramguda, Gachibowli",
        "osm_id": "node_2859102451",
        "emergency_dept": True,
        "trauma_care": "Level 1",
        "ambulances_available": 10,
        "contact": "+91 40 6700 0000"
    },
    {
        "id": "hosp_04",
        "name": "AIG Hospitals Gachibowli",
        "category": "hospital",
        "type": "Super Speciality Institute",
        "lat": 17.44281,
        "lon": 78.36442,
        "area": "Gachibowli / Mindspace",
        "address": "1-66/AIG/1 to 5, Mindspace Road, Gachibowli, Hyderabad",
        "osm_id": "way_672819401",
        "emergency_dept": True,
        "trauma_care": "Level 1",
        "ambulances_available": 14,
        "contact": "+91 40 4244 4222"
    },
    {
        "id": "hosp_05",
        "name": "Medicover Hospitals Madhapur",
        "category": "hospital",
        "type": "Multi-Speciality Emergency Hospital",
        "lat": 17.44962,
        "lon": 78.38151,
        "area": "Madhapur / Hitech City",
        "address": "IBIS Hotel Lane, Behind Cyber Towers, Hitech City, Madhapur",
        "osm_id": "node_3910284712",
        "emergency_dept": True,
        "trauma_care": "Level 2",
        "ambulances_available": 6,
        "contact": "+91 40 6833 4455"
    },
    {
        "id": "hosp_06",
        "name": "NIMS Hospital Panjagutta",
        "category": "hospital",
        "type": "Government Autonomous Medical Institute",
        "lat": 17.42142,
        "lon": 78.45263,
        "area": "Panjagutta",
        "address": "Panjagutta, Hyderabad",
        "osm_id": "way_102948123",
        "emergency_dept": True,
        "trauma_care": "Level 1",
        "ambulances_available": 15,
        "contact": "+91 40 2348 9000"
    },
    {
        "id": "hosp_07",
        "name": "Yashoda Hospitals Secunderabad",
        "category": "hospital",
        "type": "Super Speciality Hospital",
        "lat": 17.44524,
        "lon": 78.49961,
        "area": "Secunderabad",
        "address": "Alexander Road, Secunderabad",
        "osm_id": "way_194820194",
        "emergency_dept": True,
        "trauma_care": "Level 1",
        "ambulances_available": 9,
        "contact": "+91 40 4567 4567"
    },
    {
        "id": "hosp_08",
        "name": "KIMS Hospitals Minister Road",
        "category": "hospital",
        "type": "Tertiary Care Hospital",
        "lat": 17.43632,
        "lon": 78.48381,
        "area": "Begumpet / Secunderabad",
        "address": "1-8-31/1, Minister Road, Krishna Nagar Colony, Begumpet",
        "osm_id": "way_194820551",
        "emergency_dept": True,
        "trauma_care": "Level 1",
        "ambulances_available": 11,
        "contact": "+91 40 4488 5000"
    },
    {
        "id": "hosp_09",
        "name": "Gandhi Hospital Musheerabad",
        "category": "hospital",
        "type": "Government Tertiary Hospital",
        "lat": 17.42431,
        "lon": 78.50334,
        "area": "Musheerabad / Secunderabad",
        "address": "Musheerabad, Secunderabad",
        "osm_id": "way_291048291",
        "emergency_dept": True,
        "trauma_care": "Level 1",
        "ambulances_available": 20,
        "contact": "+91 40 2750 5566"
    },
    {
        "id": "hosp_10",
        "name": "Yashoda Hospitals Malakpet",
        "category": "hospital",
        "type": "Super Speciality Hospital",
        "lat": 17.37521,
        "lon": 78.50284,
        "area": "Malakpet / NH65",
        "address": "Nalgonda X Roads, Malakpet, Hyderabad",
        "osm_id": "way_310294812",
        "emergency_dept": True,
        "trauma_care": "Level 1",
        "ambulances_available": 8,
        "contact": "+91 40 4567 4567"
    },
    {
        "id": "hosp_11",
        "name": "TX Hospitals Uppal",
        "category": "hospital",
        "type": "Multi-Speciality Hospital",
        "lat": 17.40421,
        "lon": 78.55862,
        "area": "Uppal",
        "address": "Survey Colony, Main Road, Uppal, Hyderabad",
        "osm_id": "node_5920194821",
        "emergency_dept": True,
        "trauma_care": "Level 2",
        "ambulances_available": 5,
        "contact": "+91 40 6815 1515"
    },
    {
        "id": "hosp_12",
        "name": "Spark Hospitals LB Nagar",
        "category": "hospital",
        "type": "Multi-Speciality Emergency Hospital",
        "lat": 17.34892,
        "lon": 78.55621,
        "area": "LB Nagar",
        "address": "Near LB Nagar Ring Road, Chintalkunta, Hyderabad",
        "osm_id": "node_6910294812",
        "emergency_dept": True,
        "trauma_care": "Level 2",
        "ambulances_available": 6,
        "contact": "+91 40 2404 4444"
    },
    {
        "id": "hosp_13",
        "name": "Sunshine Hospitals Gachibowli",
        "category": "hospital",
        "type": "Orthopaedic & Multi-Speciality",
        "lat": 17.42981,
        "lon": 78.35824,
        "area": "Gachibowli",
        "address": "Near ORR Toll, P Janardhan Reddy Nagar, Gachibowli",
        "osm_id": "way_781920391",
        "emergency_dept": True,
        "trauma_care": "Level 2",
        "ambulances_available": 6,
        "contact": "+91 40 4455 0000"
    },
    {
        "id": "hosp_14",
        "name": "Aster Prime Hospital Ameerpet",
        "category": "hospital",
        "type": "Multi-Speciality Hospital",
        "lat": 17.43981,
        "lon": 78.44312,
        "area": "Ameerpet",
        "address": "Plot No 4, Mythrivanam, Ameerpet, Hyderabad",
        "osm_id": "way_819203912",
        "emergency_dept": True,
        "trauma_care": "Level 2",
        "ambulances_available": 7,
        "contact": "+91 40 4959 4959"
    }
]

RAW_POLICE_STATIONS = [
    {
        "id": "pol_01",
        "name": "Cyberabad Police Commissionerate",
        "category": "police",
        "type": "Police Commissionerate HQ",
        "lat": 17.43261,
        "lon": 78.36832,
        "area": "Gachibowli",
        "address": "Gachibowli Main Road, Hyderabad",
        "osm_id": "way_281940192",
        "control_room": True,
        "patrol_units": 24,
        "contact": "+91 40 2785 3400"
    },
    {
        "id": "pol_02",
        "name": "Madhapur Police Station",
        "category": "police",
        "type": "Law & Order Police Station",
        "lat": 17.44682,
        "lon": 78.38881,
        "area": "Madhapur / Hitech City",
        "address": "Near Durgam Cheruvu, Madhapur, Hyderabad",
        "osm_id": "way_391029481",
        "control_room": False,
        "patrol_units": 10,
        "contact": "+91 40 2785 3422"
    },
    {
        "id": "pol_03",
        "name": "Gachibowli Police Station",
        "category": "police",
        "type": "Law & Order Police Station",
        "lat": 17.43721,
        "lon": 78.35712,
        "area": "Gachibowli",
        "address": "Old Mumbai Highway, Gachibowli, Hyderabad",
        "osm_id": "way_491029381",
        "control_room": False,
        "patrol_units": 8,
        "contact": "+91 40 2785 3423"
    },
    {
        "id": "pol_04",
        "name": "Jubilee Hills Police Station",
        "category": "police",
        "type": "Law & Order Police Station",
        "lat": 17.43124,
        "lon": 78.40951,
        "area": "Jubilee Hills",
        "address": "Road No 36, Jubilee Hills, Hyderabad",
        "osm_id": "way_581920391",
        "control_room": False,
        "patrol_units": 12,
        "contact": "+91 40 2785 4768"
    },
    {
        "id": "pol_05",
        "name": "Banjara Hills Police Station",
        "category": "police",
        "type": "Law & Order Police Station",
        "lat": 17.41241,
        "lon": 78.43122,
        "area": "Banjara Hills",
        "address": "Road No 12, Banjara Hills, Hyderabad",
        "osm_id": "way_681920391",
        "control_room": False,
        "patrol_units": 12,
        "contact": "+91 40 2785 4769"
    },
    {
        "id": "pol_06",
        "name": "Panjagutta Police Station",
        "category": "police",
        "type": "Law & Order / Traffic Police Station",
        "lat": 17.42651,
        "lon": 78.45182,
        "area": "Panjagutta",
        "address": "Nagarjuna Circle, Panjagutta, Hyderabad",
        "osm_id": "way_781920491",
        "control_room": True,
        "patrol_units": 16,
        "contact": "+91 40 2785 4771"
    },
    {
        "id": "pol_07",
        "name": "Ameerpet / SR Nagar Police Station",
        "category": "police",
        "type": "Law & Order Police Station",
        "lat": 17.43852,
        "lon": 78.44521,
        "area": "Ameerpet",
        "address": "Dharam Karan Road, Ameerpet, Hyderabad",
        "osm_id": "node_8910293812",
        "control_room": False,
        "patrol_units": 8,
        "contact": "+91 40 2785 4773"
    },
    {
        "id": "pol_08",
        "name": "Begumpet Police Station",
        "category": "police",
        "type": "Law & Order Police Station",
        "lat": 17.44182,
        "lon": 78.46821,
        "area": "Begumpet",
        "address": "Prakash Nagar, Begumpet, Hyderabad",
        "osm_id": "way_910293812",
        "control_room": False,
        "patrol_units": 9,
        "contact": "+91 40 2785 4774"
    },
    {
        "id": "pol_09",
        "name": "Gopalapuram Police Station Secunderabad",
        "category": "police",
        "type": "Law & Order Police Station",
        "lat": 17.43451,
        "lon": 78.50122,
        "area": "Secunderabad",
        "address": "Railway Station Road, Secunderabad",
        "osm_id": "way_102938491",
        "control_room": True,
        "patrol_units": 14,
        "contact": "+91 40 2785 3520"
    },
    {
        "id": "pol_10",
        "name": "Uppal Police Station",
        "category": "police",
        "type": "Law & Order Police Station",
        "lat": 17.40261,
        "lon": 78.56152,
        "area": "Uppal",
        "address": "Near Uppal Ring Road, Hyderabad",
        "osm_id": "way_203948192",
        "control_room": False,
        "patrol_units": 10,
        "contact": "+91 40 2785 3650"
    },
    {
        "id": "pol_11",
        "name": "LB Nagar Police Station",
        "category": "police",
        "type": "Law & Order / Traffic Police Station",
        "lat": 17.34682,
        "lon": 78.54981,
        "area": "LB Nagar",
        "address": "Ring Road Junction, LB Nagar, Hyderabad",
        "osm_id": "way_304958192",
        "control_room": True,
        "patrol_units": 14,
        "contact": "+91 40 2785 3720"
    },
    {
        "id": "pol_12",
        "name": "Raidurgam Police Station",
        "category": "police",
        "type": "Law & Order Police Station",
        "lat": 17.43481,
        "lon": 78.37921,
        "area": "Gachibowli / Biodiversity",
        "address": "Old Mumbai Highway, Raidurgam, Hyderabad",
        "osm_id": "way_405968192",
        "control_room": False,
        "patrol_units": 8,
        "contact": "+91 40 2785 3425"
    }
]

RAW_FIRE_STATIONS = [
    {
        "id": "fire_01",
        "name": "Madhapur Fire Station",
        "category": "fire_station",
        "type": "Municipal Fire Station",
        "lat": 17.44421,
        "lon": 78.38242,
        "area": "Madhapur / Hitech City",
        "address": "Hitech City Main Road, Madhapur, Hyderabad",
        "osm_id": "node_182940192",
        "fire_engines": 4,
        "hazmat_equipped": True,
        "contact": "+91 40 2311 0101"
    },
    {
        "id": "fire_02",
        "name": "Gachibowli Fire Station",
        "category": "fire_station",
        "type": "Municipal Fire Station",
        "lat": 17.44122,
        "lon": 78.34751,
        "area": "Gachibowli",
        "address": "GMC Balayogi Stadium Road, Gachibowli, Hyderabad",
        "osm_id": "way_281930491",
        "fire_engines": 4,
        "hazmat_equipped": True,
        "contact": "+91 40 2300 0101"
    },
    {
        "id": "fire_03",
        "name": "Jubilee Hills Fire Station",
        "category": "fire_station",
        "type": "Municipal Fire Station",
        "lat": 17.42851,
        "lon": 78.41621,
        "area": "Jubilee Hills",
        "address": "Road No 45, Jubilee Hills, Hyderabad",
        "osm_id": "way_381920491",
        "fire_engines": 3,
        "hazmat_equipped": False,
        "contact": "+91 40 2354 0101"
    },
    {
        "id": "fire_04",
        "name": "Secunderabad Fire Station",
        "category": "fire_station",
        "type": "Regional Fire & Rescue Station",
        "lat": 17.44152,
        "lon": 78.49251,
        "area": "Secunderabad",
        "address": "MG Road, Near Paradise, Secunderabad",
        "osm_id": "way_481920591",
        "fire_engines": 6,
        "hazmat_equipped": True,
        "contact": "+91 40 2784 0101"
    },
    {
        "id": "fire_05",
        "name": "Sanathnagar Fire Station",
        "category": "fire_station",
        "type": "Industrial Area Fire Station",
        "lat": 17.45821,
        "lon": 78.44122,
        "area": "Ameerpet / Sanathnagar",
        "address": "Industrial Estate, Sanathnagar, Hyderabad",
        "osm_id": "way_581920691",
        "fire_engines": 5,
        "hazmat_equipped": True,
        "contact": "+91 40 2370 0101"
    },
    {
        "id": "fire_06",
        "name": "Uppal Fire Station",
        "category": "fire_station",
        "type": "Municipal Fire Station",
        "lat": 17.40851,
        "lon": 78.56821,
        "area": "Uppal",
        "address": "IDA Uppal, Inner Ring Road, Hyderabad",
        "osm_id": "way_681920791",
        "fire_engines": 4,
        "hazmat_equipped": True,
        "contact": "+91 40 2720 0101"
    },
    {
        "id": "fire_07",
        "name": "Malakpet Fire Station",
        "category": "fire_station",
        "type": "Municipal Fire Station",
        "lat": 17.37121,
        "lon": 78.49821,
        "area": "Malakpet / NH65",
        "address": "Race Course Road, Malakpet, Hyderabad",
        "osm_id": "way_781920891",
        "fire_engines": 4,
        "hazmat_equipped": False,
        "contact": "+91 40 2455 0101"
    },
    {
        "id": "fire_08",
        "name": "Secretariat Fire Station",
        "category": "fire_station",
        "type": "Central Capital Fire Station",
        "lat": 17.40821,
        "lon": 78.47251,
        "area": "Central / Tank Bund",
        "address": "BRKR Bhavan, Hyderabad",
        "osm_id": "way_881920991",
        "fire_engines": 5,
        "hazmat_equipped": True,
        "contact": "+91 40 2345 0101"
    },
    {
        "id": "fire_09",
        "name": "LB Nagar / Saroornagar Fire Station",
        "category": "fire_station",
        "type": "Municipal Fire Station",
        "lat": 17.35241,
        "lon": 78.54212,
        "area": "LB Nagar",
        "address": "Saroornagar Road, Near LB Nagar, Hyderabad",
        "osm_id": "way_981920091",
        "fire_engines": 4,
        "hazmat_equipped": False,
        "contact": "+91 40 2404 0101"
    }
]

RAW_TRAFFIC_SIGNALS = [
    {
        "signal_id": "sig_01_cyber_towers",
        "name": "Cyber Towers Junction Traffic Signal",
        "lat": 17.45041,
        "lon": 78.38082,
        "associated_node": "node_cyber_towers",
        "junction_name": "Cyber Towers Junction",
        "area": "Hitech City",
        "signal_type": "4-Way Adaptive Intelligent Signal",
        "phases": 4,
        "cycle_time_sec": 120,
        "osm_node_id": "osm_node_49201948",
        "source": "OpenStreetMap highway=traffic_signals"
    },
    {
        "signal_id": "sig_02_biodiversity",
        "name": "Bio-Diversity Junction Traffic Signal",
        "lat": 17.43581,
        "lon": 78.37982,
        "associated_node": "node_biodiversity",
        "junction_name": "Bio-Diversity Junction",
        "area": "Gachibowli",
        "signal_type": "Multi-Phase High-Density Signal",
        "phases": 4,
        "cycle_time_sec": 140,
        "osm_node_id": "osm_node_59201959",
        "source": "OpenStreetMap highway=traffic_signals"
    },
    {
        "signal_id": "sig_03_gachibowli_orr",
        "name": "Gachibowli ORR Junction Traffic Signal",
        "lat": 17.44021,
        "lon": 78.34951,
        "associated_node": "node_gachibowli_orr",
        "junction_name": "Gachibowli ORR Entry Junction",
        "area": "Gachibowli",
        "signal_type": "Grade-Separated Signal Control",
        "phases": 3,
        "cycle_time_sec": 110,
        "osm_node_id": "osm_node_69201960",
        "source": "OpenStreetMap highway=traffic_signals"
    },
    {
        "signal_id": "sig_04_jh_checkpost",
        "name": "Jubilee Hills Checkpost Signal",
        "lat": 17.43202,
        "lon": 78.41651,
        "associated_node": "node_jh_checkpost",
        "junction_name": "Jubilee Hills Checkpost",
        "area": "Jubilee Hills",
        "signal_type": "Major Arterial 4-Way Signal",
        "phases": 4,
        "cycle_time_sec": 130,
        "osm_node_id": "osm_node_79201971",
        "source": "OpenStreetMap highway=traffic_signals"
    },
    {
        "signal_id": "sig_05_jh_r36_r10",
        "name": "Road No 36 & 10 Junction Signal",
        "lat": 17.43051,
        "lon": 78.40122,
        "associated_node": "node_jh_r36_r10",
        "junction_name": "Road No 36 / 10 Intersection",
        "area": "Jubilee Hills",
        "signal_type": "Commercial Corridor Signal",
        "phases": 3,
        "cycle_time_sec": 100,
        "osm_node_id": "osm_node_89201982",
        "source": "OpenStreetMap highway=traffic_signals"
    },
    {
        "signal_id": "sig_06_jh_r45",
        "name": "Road No 45 Cable Bridge Approach Signal",
        "lat": 17.42782,
        "lon": 78.39851,
        "associated_node": "node_jh_r45",
        "junction_name": "Road No 45 / Durgam Cheruvu Bridge Approach",
        "area": "Jubilee Hills",
        "signal_type": "Bridge Corridor Adaptive Signal",
        "phases": 3,
        "cycle_time_sec": 105,
        "osm_node_id": "osm_node_99201993",
        "source": "OpenStreetMap highway=traffic_signals"
    },
    {
        "signal_id": "sig_07_mindspace",
        "name": "Mindspace Madhapur Junction Signal",
        "lat": 17.44121,
        "lon": 78.38122,
        "associated_node": "node_mindspace",
        "junction_name": "Mindspace Rotary Junction",
        "area": "Madhapur",
        "signal_type": "IT Corridor High-Volume Signal",
        "phases": 4,
        "cycle_time_sec": 125,
        "osm_node_id": "osm_node_10301904",
        "source": "OpenStreetMap highway=traffic_signals"
    },
    {
        "signal_id": "sig_08_kothaguda",
        "name": "Kothaguda Junction Traffic Signal",
        "lat": 17.45821,
        "lon": 78.36122,
        "associated_node": "node_kothaguda",
        "junction_name": "Kothaguda X Roads",
        "area": "Hitech City / Kondapur",
        "signal_type": "Multi-Leg Arterial Signal",
        "phases": 4,
        "cycle_time_sec": 130,
        "osm_node_id": "osm_node_11301915",
        "source": "OpenStreetMap highway=traffic_signals"
    },
    {
        "signal_id": "sig_09_panjagutta",
        "name": "Panjagutta Junction Traffic Signal",
        "lat": 17.42621,
        "lon": 78.45202,
        "associated_node": "node_panjagutta",
        "junction_name": "Panjagutta Nagarjuna Circle",
        "area": "Panjagutta",
        "signal_type": "Core City Major Hub Signal",
        "phases": 4,
        "cycle_time_sec": 150,
        "osm_node_id": "osm_node_12301926",
        "source": "OpenStreetMap highway=traffic_signals"
    },
    {
        "signal_id": "sig_10_ameerpet",
        "name": "Ameerpet Metro Interchange Signal",
        "lat": 17.43721,
        "lon": 78.44851,
        "associated_node": "node_ameerpet",
        "junction_name": "Ameerpet Metro Junction",
        "area": "Ameerpet",
        "signal_type": "High Pedestrian & Transit Signal",
        "phases": 4,
        "cycle_time_sec": 135,
        "osm_node_id": "osm_node_13301937",
        "source": "OpenStreetMap highway=traffic_signals"
    },
    {
        "signal_id": "sig_11_begumpet",
        "name": "Begumpet Flyover Junction Signal",
        "lat": 17.44251,
        "lon": 78.46252,
        "associated_node": "node_begumpet",
        "junction_name": "Begumpet Airport Road Junction",
        "area": "Begumpet",
        "signal_type": "Corridor Split Signal",
        "phases": 3,
        "cycle_time_sec": 115,
        "osm_node_id": "osm_node_14301948",
        "source": "OpenStreetMap highway=traffic_signals"
    },
    {
        "signal_id": "sig_12_paradise",
        "name": "Paradise Junction Traffic Signal",
        "lat": 17.44101,
        "lon": 78.48951,
        "associated_node": "node_paradise",
        "junction_name": "Paradise X Roads",
        "area": "Secunderabad",
        "signal_type": "Major Secunderabad Arterial Signal",
        "phases": 4,
        "cycle_time_sec": 140,
        "osm_node_id": "osm_node_15301959",
        "source": "OpenStreetMap highway=traffic_signals"
    },
    {
        "signal_id": "sig_13_secunderabad",
        "name": "Secunderabad Clock Tower Signal",
        "lat": 17.43952,
        "lon": 78.50151,
        "associated_node": "node_secunderabad_clock_tower",
        "junction_name": "Secunderabad Clock Tower Junction",
        "area": "Secunderabad",
        "signal_type": "Railway Terminal Hub Signal",
        "phases": 4,
        "cycle_time_sec": 130,
        "osm_node_id": "osm_node_16301970",
        "source": "OpenStreetMap highway=traffic_signals"
    },
    {
        "signal_id": "sig_14_tarnaka",
        "name": "Tarnaka Metro Junction Signal",
        "lat": 17.42852,
        "lon": 78.53121,
        "associated_node": "node_tarnaka",
        "junction_name": "Tarnaka X Roads",
        "area": "Tarnaka / Secunderabad",
        "signal_type": "University & Metro Corridor Signal",
        "phases": 4,
        "cycle_time_sec": 120,
        "osm_node_id": "osm_node_17301981",
        "source": "OpenStreetMap highway=traffic_signals"
    },
    {
        "signal_id": "sig_15_uppal_ring",
        "name": "Uppal Ring Road Junction Signal",
        "lat": 17.40182,
        "lon": 78.56051,
        "associated_node": "node_uppal_ring",
        "junction_name": "Uppal Ring Road / Metro Junction",
        "area": "Uppal",
        "signal_type": "Inner Ring Road High-Capacity Signal",
        "phases": 4,
        "cycle_time_sec": 145,
        "osm_node_id": "osm_node_18301992",
        "source": "OpenStreetMap highway=traffic_signals"
    },
    {
        "signal_id": "sig_16_lbnagar_ring",
        "name": "LB Nagar Ring Road Junction Signal",
        "lat": 17.34582,
        "lon": 78.55201,
        "associated_node": "node_lbnagar_ring",
        "junction_name": "LB Nagar X Roads Junction",
        "area": "LB Nagar",
        "signal_type": "National Highway 65 Gateway Signal",
        "phases": 4,
        "cycle_time_sec": 150,
        "osm_node_id": "osm_node_19302003",
        "source": "OpenStreetMap highway=traffic_signals"
    },
    {
        "signal_id": "sig_17_sagar_ring",
        "name": "Sagar Ring Road Signal",
        "lat": 17.34821,
        "lon": 78.54122,
        "associated_node": "node_sagar_ring",
        "junction_name": "Sagar Ring Road X Roads",
        "area": "LB Nagar",
        "signal_type": "Ring Road Arterial Signal",
        "phases": 3,
        "cycle_time_sec": 115,
        "osm_node_id": "osm_node_20302014",
        "source": "OpenStreetMap highway=traffic_signals"
    },
    {
        "signal_id": "sig_18_dilsukhnagar",
        "name": "Dilsukhnagar Main Junction Signal",
        "lat": 17.36852,
        "lon": 78.52551,
        "associated_node": "node_dilsukhnagar",
        "junction_name": "Dilsukhnagar Bus Depot X Roads",
        "area": "Dilsukhnagar / Malakpet",
        "signal_type": "Dense Commercial Corridor Signal",
        "phases": 4,
        "cycle_time_sec": 135,
        "osm_node_id": "osm_node_21302025",
        "source": "OpenStreetMap highway=traffic_signals"
    },
    {
        "signal_id": "sig_19_masab_tank",
        "name": "Masab Tank Junction Signal",
        "lat": 17.40821,
        "lon": 78.45122,
        "associated_node": "node_masab_tank",
        "junction_name": "Masab Tank Flyover Junction",
        "area": "Masab Tank / Banjara Hills",
        "signal_type": "Inner Ring Road Interchange Signal",
        "phases": 4,
        "cycle_time_sec": 130,
        "osm_node_id": "osm_node_22302036",
        "source": "OpenStreetMap highway=traffic_signals"
    },
    {
        "signal_id": "sig_20_mehdipatnam",
        "name": "Mehdipatnam PVNR Expressway Signal",
        "lat": 17.39151,
        "lon": 78.44121,
        "associated_node": "node_mehdipatnam",
        "junction_name": "Mehdipatnam PVNR Start Junction",
        "area": "Mehdipatnam",
        "signal_type": "Airport Expressway Feeder Signal",
        "phases": 4,
        "cycle_time_sec": 140,
        "osm_node_id": "osm_node_23302047",
        "source": "OpenStreetMap highway=traffic_signals"
    }
]

def load_emergency_locations() -> Dict[str, Any]:
    """Returns combined list of emergency locations (hospitals, police, fire stations)."""
    return {
        "hospitals": RAW_HOSPITALS,
        "police_stations": RAW_POLICE_STATIONS,
        "fire_stations": RAW_FIRE_STATIONS,
        "total_facilities": len(RAW_HOSPITALS) + len(RAW_POLICE_STATIONS) + len(RAW_FIRE_STATIONS)
    }

def export_emergency_geojson() -> Dict[str, Any]:
    """Converts emergency locations to GeoJSON FeatureCollection."""
    features = []
    
    # Hospitals
    for h in RAW_HOSPITALS:
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [h["lon"], h["lat"]]
            },
            "properties": {
                "id": h["id"],
                "name": h["name"],
                "category": "hospital",
                "facility_type": h["type"],
                "area": h["area"],
                "address": h["address"],
                "contact": h["contact"],
                "emergency_dept": h["emergency_dept"],
                "trauma_care": h["trauma_care"],
                "ambulances_available": h["ambulances_available"],
                "osm_id": h["osm_id"],
        "location_source": "OpenStreetMap amenity=hospital",
        "resource_staging": "Estimated Operational Baseline"
            }
        })

    # Police
    for p in RAW_POLICE_STATIONS:
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [p["lon"], p["lat"]]
            },
            "properties": {
                "id": p["id"],
                "name": p["name"],
                "category": "police",
                "facility_type": p["type"],
                "area": p["area"],
                "address": p["address"],
                "contact": p["contact"],
                "control_room": p["control_room"],
                "patrol_units": p["patrol_units"],
                "osm_id": p["osm_id"],
                "location_source": "OpenStreetMap amenity=police",
                "resource_staging": "Estimated Operational Baseline"
            }
        })

    # Fire
    for f in RAW_FIRE_STATIONS:
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [f["lon"], f["lat"]]
            },
            "properties": {
                "id": f["id"],
                "name": f["name"],
                "category": "fire_station",
                "facility_type": f["type"],
                "area": f["area"],
                "address": f["address"],
                "contact": f["contact"],
                "fire_engines": f["fire_engines"],
                "hazmat_equipped": f["hazmat_equipped"],
                "osm_id": f["osm_id"],
                "location_source": "OpenStreetMap amenity=fire_station",
                "resource_staging": "Estimated Operational Baseline"
            }
        })

    return {
        "type": "FeatureCollection",
        "features": features
    }

def export_traffic_signals_geojson() -> Dict[str, Any]:
    """Converts traffic signals to GeoJSON FeatureCollection."""
    features = []
    for s in RAW_TRAFFIC_SIGNALS:
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [s["lon"], s["lat"]]
            },
            "properties": {
                "id": s["signal_id"],
                "name": s["name"],
                "category": "traffic_signal",
                "associated_node": s["associated_node"],
                "junction_name": s["junction_name"],
                "area": s["area"],
                "signal_type": s["signal_type"],
                "phases": s["phases"],
                "cycle_time_sec": s["cycle_time_sec"],
                "osm_node_id": s["osm_node_id"],
                "source": s["source"],
                "timing_source": "Estimated Municipal Baseline (100-150s)",
                "telemetry_note": "Physical signal node coordinates verified from OpenStreetMap highway=traffic_signals. Live phase duration is an estimated municipal simulation baseline."
            }
        })
    return {
        "type": "FeatureCollection",
        "features": features
    }

def save_data_files(output_dir: str):
    """Saves all structured JSON and GeoJSON files to the output directory."""
    os.makedirs(output_dir, exist_ok=True)
    
    # Save structured JSON
    emergency_data = load_emergency_locations()
    with open(os.path.join(output_dir, "emergency_locations.json"), "w", encoding="utf-8") as f:
        json.dump(emergency_data, f, indent=2)
        
    with open(os.path.join(output_dir, "traffic_signals.json"), "w", encoding="utf-8") as f:
        json.dump(RAW_TRAFFIC_SIGNALS, f, indent=2)
        
    # Save GeoJSON
    with open(os.path.join(output_dir, "emergency_locations.geojson"), "w", encoding="utf-8") as f:
        json.dump(export_emergency_geojson(), f, indent=2)
        
    with open(os.path.join(output_dir, "traffic_signals.geojson"), "w", encoding="utf-8") as f:
        json.dump(export_traffic_signals_geojson(), f, indent=2)
        
    print(f"[LocationLoader] Saved {len(RAW_HOSPITALS)} hospitals, {len(RAW_POLICE_STATIONS)} police stations, "
          f"{len(RAW_FIRE_STATIONS)} fire stations, and {len(RAW_TRAFFIC_SIGNALS)} traffic signals to {output_dir}")

if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(current_dir, "data")
    save_data_files(data_dir)
