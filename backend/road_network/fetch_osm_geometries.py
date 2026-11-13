import requests
import json

q = """[out:json][timeout:25];
(
  way["name"="P. V. Narasimha Rao Expressway"](17.30,78.40,17.41,78.46);
  way["name"~"Outer Ring Road"](17.25,78.30,17.45,78.70);
  way["name"~"Hitech City Main Road"](17.43,78.36,17.46,78.40);
  way["name"~"Road No 36"](17.42,78.39,17.44,78.43);
);
out body geom;
"""

try:
    r = requests.post(
        'https://overpass-api.de/api/interpreter',
        data={'data': q},
        headers={'User-Agent': 'UrbanFlowAI/1.0 (contact: info@urbanflow.ai)'},
        timeout=30
    )
    print("Status:", r.status_code)
    data = r.json()
    elements = data.get('elements', [])
    print(f"Retrieved {len(elements)} OSM ways with actual high-res geometries!")
    for el in elements[:5]:
        name = el.get('tags', {}).get('name', 'Unnamed')
        pts = len(el.get('geometry', []))
        print(f"Way {el.get('id')}: {name} ({pts} coordinate points)")
except Exception as e:
    print("Error:", e)
