"""
UrbanFlow AI - Dynamic Routing Module
Provides intelligent path optimization using Dijkstra and A* algorithms,
taking real-time incidents, road closures, congestion penalties, and emergency
vehicle priority into account.
"""

from .engine import DynamicRoutingEngine, get_routing_engine
from .schemas import RouteRequest, RouteResponse, RouteStep

__all__ = ["DynamicRoutingEngine", "get_routing_engine", "RouteRequest", "RouteResponse", "RouteStep"]
