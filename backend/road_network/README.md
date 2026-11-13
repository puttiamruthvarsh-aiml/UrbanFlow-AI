# UrbanFlow AI — Hyderabad Road Network & Graph Data Layer

## Overview
This module builds and maintains the foundational geographical road network and graph representation for **UrbanFlow AI: An Adaptive Multi-Agent Traffic Intelligence and Emergency Response Optimization System**.

It processes actual geographical data from **OpenStreetMap (OSM)** covering the metropolitan expanse of Hyderabad, with dense coverage of key hubs and arterial corridors:
- **Hitech City & Madhapur** (Cyber Towers, Mindspace, HITEX, Durgam Cheruvu Cable Bridge)
- **Gachibowli & Financial District** (Bio-Diversity, Wipro Circle, Stadium, Nanakramguda)
- **Jubilee Hills & Banjara Hills** (Road No 36, Road No 45, Road No 1, Road No 10, Road No 12, Panjagutta)
- **Ameerpet & Begumpet** (Metro Interchange, SR Nagar, Airport Corridor, Lifestyle Junction)
- **Secunderabad** (Paradise X Roads, Clock Tower, Railway Station Hub, Sangeet Junction, Tarnaka)
- **Uppal & Nagole** (Uppal Ring Road, Rajiv Gandhi Stadium, Habsiguda, Musi River Bridge)
- **LB Nagar & Dilsukhnagar** (LB Nagar X Roads, Sagar Ring Road, NH 65 Malakpet Corridor)
- **High-Speed Express Corridors**:
  - Outer Ring Road (ORR) 8-lane expressway connecting Gachibowli -> Financial District -> Shamshabad -> LB Nagar -> Ghatkesar
  - Inner Ring Road (IRR) connecting Mehdipatnam -> Masab Tank -> Panjagutta -> Begumpet -> Secunderabad -> Tarnaka -> Uppal -> LB Nagar -> Chandrayangutta -> Aramghar
  - PVNR Elevated Expressway

---

## File Structure

- `osm_loader.py`: Connects to OpenStreetMap Overpass mirrors, extracts highway geometries and features, with caching and offline fallback.
- `road_graph.py`: Builds a structured, directed graph (`networkx.DiGraph`), calculates accurate geodesic lengths, preserves one-way road restrictions, and exports GeoJSON and GraphML formats.
- `location_loader.py`: Catalogs and exports real verified traffic signals (`highway=traffic_signals`) and emergency services (hospitals, police stations, fire stations).
- `graph_utils.py`: Contains geospatial validation routines, coordinate bounds checking, topological validation, and snapping helpers.
- `data/`:
  - `hyderabad_roads.geojson`: All road segments as GeoJSON LineStrings with rich road classifications, lane counts, and speed limits.
  - `hyderabad_graph.graphml`: Industry-standard GraphML directed graph format.
  - `hyderabad_graph.json`: Adjacency and edge list for high-speed routing engines (Dijkstra/A*).
  - `junctions.geojson`: GeoJSON Points for all intersections and junctions.
  - `traffic_signals.geojson` / `.json`: Real mapped traffic signals with cycle times and phases.
  - `emergency_locations.geojson` / `.json`: Verified hospitals, police stations, and fire stations.
  - `metadata.json`: Graph summary metrics, node/edge counts, and connectivity statistics.

---

## Data Schema

### Nodes (Intersections & Hubs)
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | string | Unique node ID (e.g. `node_cyber_towers`) |
| `name` | string | Junction or intersection name |
| `lat` | float | Latitude in WGS84 decimal degrees |
| `lon` | float | Longitude in WGS84 decimal degrees |
| `type` | string | `major_junction`, `intersection`, `interchange`, `terminal_hub`, `bridge_entry` |
| `has_signal` | boolean | True if a physical traffic signal is present |
| `osm_id` | string | Original OpenStreetMap node identifier |

### Edges (Road Segments)
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | string | Unique road segment ID (e.g. `road_cyber_kothaguda`) |
| `name` | string | Real street/avenue name |
| `from_node` | string | Source intersection node ID |
| `to_node` | string | Target intersection node ID |
| `highway` | string | OSM classification (`motorway`, `trunk`, `primary`, `secondary`, `tertiary`) |
| `length_m` | float | Exact geodesic length calculated in metres |
| `lanes` | integer | Number of driving lanes |
| `base_speed_kmh` | integer | Base design speed limit in km/h |
| `one_way` | boolean | True if traffic travels only in the specified direction |
| `direction` | string | `forward`, `reverse`, or `bidirectional` |
| `geometry` | list | GeoJSON LineString coordinates `[[lon, lat], ...]` |
| `osm_way_id` | string | Original OpenStreetMap way identifier |

---

## Attribution
Data © OpenStreetMap contributors, Open Database License (ODbL) 1.0.
Extracted and processed for UrbanFlow AI.
