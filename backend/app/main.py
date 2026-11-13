
"""
UrbanFlow AI - FastAPI Application Server
Provides REST APIs for:
- Hyderabad Road Network Data Layer (Step 1)
- MapLibre GL JS GeoJSON tile/data service
- Emergency & Traffic Signal data
- Role-based Dashboard API integration
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.map_routes import router as network_router
from .api.auth_routes import router as auth_router
from .api.demo_routes import router as demo_router
from .api.emergency_routes import router as emergency_router
app = FastAPI(
    title="UrbanFlow AI Backend API",
    description="Adaptive Multi-Agent Traffic Intelligence and Emergency Response Optimization System",
    version="1.0.0"
)

# Enable CORS for frontend Vite development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register existing network and authentication APIs
app.include_router(network_router)
app.include_router(auth_router)
app.include_router(demo_router)
app.include_router(emergency_router)

@app.get("/")
def root():
    return {
        "system": "UrbanFlow AI",
        "description": "Adaptive Multi-Agent Traffic Intelligence and Emergency Response Optimization System",
        "version": "1.0.0",
        "status": "operational",
        "active_module": "STEP 1 - REAL HYDERABAD ROAD NETWORK",
        "endpoints": {
            "summary": "/api/network/summary",
            "roads_geojson": "/api/network/roads",
            "junctions_geojson": "/api/network/junctions",
            "signals_geojson": "/api/network/signals",
            "emergency_geojson": "/api/network/emergency",
            "graph_topology": "/api/network/graph"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )
