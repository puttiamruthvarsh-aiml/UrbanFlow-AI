# UrbanFlow AI: Adaptive Multi-Agent Traffic Intelligence & Emergency Response Optimization

**Module:** Step 1 — Real Hyderabad Road Network & Emergency Infrastructure Graph  
**City Coverage:** Hyderabad Metropolitan Region, Telangana, India  
**Status:** STEP 1 VERIFIED & OPERATIONAL

---

## 1. Project Overview & Architecture

UrbanFlow AI combines real-world road networks, live and simulated traffic states, computer vision, short-term forecasting, graph optimization (Dijkstra/A*), and cooperating AI agents into a unified urban command system.

The platform maintains **one shared geographical road network state** across three specialized dashboards:
1. **User Dashboard** (everyday trip planning, road network inspection)
2. **Emergency Dashboard** (ambulance, fire, and police response with priority facility routing)
3. **Admin Dashboard** (city-wide network supervision, signal control, and infrastructure monitoring)

---

## 2. Technical Stack

- **Backend:** Python 3.14 + FastAPI + NetworkX + Shapely
- **Frontend:** React 19 + TypeScript + Vite 6 + Tailwind CSS + MapLibre GL JS
- **Geospatial Data:** OpenStreetMap (OSM) + GeoJSON + GraphML + Custom WGS84 Geometries
- **Styling:** Dark navy / charcoal (`#0B0F19`, `#111827`, `#1E293B`) with high-contrast cyan, blue, emerald, amber, and purple status highlights

---

## 3. Hyderabad Geographical Coverage

Dense, interconnected arterial coverage spanning:
- **Hitech City & Madhapur** (Cyber Towers, Mindspace, HITEX, Durgam Cheruvu Cable Bridge)
- **Gachibowli & Financial District** (Bio-Diversity Junction, Wipro Circle, Stadium, Nanakramguda)
- **Jubilee Hills & Banjara Hills** (Road No 36, Road No 45, Taj Krishna, Apollo Hospital Corridor, Panjagutta)
- **Ameerpet & Begumpet** (Metro Interchange, SR Nagar, Airport Corridor, Lifestyle Junction)
- **Secunderabad** (Paradise X Roads, Clock Tower, Railway Station Terminal, Sangeet Junction, Tarnaka)
- **Uppal & Nagole** (Uppal Ring Road, Rajiv Gandhi Stadium, Habsiguda, Musi River Bridge)
- **LB Nagar & Dilsukhnagar** (LB Nagar X Roads, Sagar Ring Road, NH 65 Malakpet Corridor)
- **High-Speed Expressways**:
  - Outer Ring Road (ORR) 8-Lane Expressway
  - P.V. Narasimha Rao (PVNR) Elevated Expressway
  - Inner Ring Road (IRR) Arterial Spine

---

## 4. Step 1 Extracted Network Metrics

| Metric | Extracted Count / Measurement |
| :--- | :--- |
| **Total Road Segments** | 64 unique segments (motorway, trunk, primary, secondary) |
| **Graph Nodes (Intersections)** | 56 verified intersection and junction nodes |
| **Directed Graph Edges** | 126 directed edges (preserving one-way restrictions) |
| **Total Network Road Length** | **377.92 km** |
| **Weakly Connected** | **True (1 single component)** |
| **Strongly Connected** | **True (1 single component)** |
| **Average Node Degree** | **4.50 links per node** |
| **Traffic Signals** | **20 physical traffic signals** (with cycle times & phase plans) |
| **Hospitals** | **14 emergency hospitals** (trauma levels, ambulances, contact) |
| **Police Stations** | **12 police stations & Commissionerate HQ** |
| **Fire Stations** | **9 regional municipal fire stations** |

---

## 5. How to Run the Platform

### Option A: One-Click Startup (Windows)
Double-click:
```bat
run_platform.bat
```

### Option B: Manual Startup

1. **Start the Backend API:**
   ```bash
   cd urbanflow-ai
   python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   API URL: `http://127.0.0.1:8000`  
   Interactive API Docs: `http://127.0.0.1:8000/docs`

2. **Start the Frontend Dashboard:**
   ```bash
   cd urbanflow-ai/frontend
   npm run dev -- --host 127.0.0.1 --port 5173
   ```
   Application URL: `http://127.0.0.1:5173`

---

## 6. Verification and Testing

1. **Graph Topological Integrity:**
   ```bash
   python -c "import sys; sys.path.insert(0, 'backend'); from road_network.graph_utils import validate_road_network_integrity; import json; print(validate_road_network_integrity(json.load(open('backend/road_network/data/hyderabad_graph.json'))))"
   ```
   *Result:* `{'is_valid': True, 'total_nodes_checked': 56, 'total_edges_checked': 126, 'errors': []}`

2. **Road Network Summary:**
   Query `http://127.0.0.1:8000/api/network/summary` to inspect graph statistics and geographical bounding boxes.

---

## 7. Next Roadmap Steps

- **Step 2:** YOLO-based CCTV vehicle detection & density estimation
- **Step 3:** Machine-learning 15–30 minute ahead congestion prediction
- **Step 4:** Multi-sensor incident anomaly detection
- **Step 5:** Dijkstra & A* dynamic route optimization around closures
- **Step 6:** Multi-agent emergency corridor coordination
- **Step 7:** Full cross-dashboard synchronization with real-time WebSocket events
