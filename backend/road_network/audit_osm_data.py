import requests
import json
import time

headers = {'User-Agent': 'UrbanFlowAI-Auditor/1.0 (info@urbanflow.ai)'}

queries = [
    ("node_cyber_towers", "Cyber Towers, Hitech City, Hyderabad"),
    ("node_biodiversity", "Biodiversity Junction, Gachibowli, Hyderabad"),
    ("node_jh_checkpost", "Jubilee Hills Check Post, Hyderabad"),
    ("node_panjagutta", "Panjagutta, Hyderabad"),
    ("node_paradise", "Paradise Circle, Secunderabad"),
    ("node_secunderabad_clock_tower", "Secunderabad Clock Tower, Hyderabad"),
    ("node_uppal_ring", "Uppal X Roads, Hyderabad"),
    ("node_lbnagar_ring", "LB Nagar X Roads, Hyderabad"),
    ("node_masab_tank", "Masab Tank, Hyderabad"),
    ("node_mehdipatnam", "Mehdipatnam, Hyderabad"),
    ("node_ameerpet", "Ameerpet Metro Station, Hyderabad"),
    ("node_gachibowli_flyover", "Gachibowli Flyover, Hyderabad")
]

results = {}
for nid, q in queries:
    url = f"https://nominatim.openstreetmap.org/search?q={requests.utils.quote(q)}&format=json&limit=1"
    try:
        r = requests.get(url, headers=headers, timeout=10)
        if r.status_code == 200 and r.json():
            item = r.json()[0]
            results[nid] = {
                "name": q,
                "lat": float(item["lat"]),
                "lon": float(item["lon"]),
                "osm_type": item.get("osm_type"),
                "osm_id": item.get("osm_id"),
                "display_name": item.get("display_name")
            }
            print(f"VERIFIED {nid}: lat={results[nid]['lat']:.5f}, lon={results[nid]['lon']:.5f} ({item.get('display_name')[:60]}...)")
        else:
            print(f"NOT FOUND {nid}: {q}")
    except Exception as e:
        print(f"ERR {nid}: {e}")
    time.sleep(1.0)

with open("backend/road_network/data/osm_verified_junctions.json", "w") as f:
    json.dump(results, f, indent=2)
print("Saved verified junctions!")
