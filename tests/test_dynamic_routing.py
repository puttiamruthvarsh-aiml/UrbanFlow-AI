"""
UrbanFlow AI - Dynamic Routing Test Suite
Validates:
1. Normal route calculation (A* and Dijkstra).
2. Road network integrity and actual road ID sequence.
3. Dynamic rerouting when a road is BLOCKED by an incident.
4. Route restoration when the incident is RESOLVED.
5. Travel cost / time adjustment when a road is CONGESTED.
6. Emergency vehicle priority (reduced traffic signal latency).
7. Transparent reasoning generation.
8. FastAPI routing endpoints using TestClient.
"""

import sys
import os
import unittest

# Ensure project root is on sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.app.core.demo_state import (
    reset_state,
    create_incident,
    resolve_incident,
    get_state
)
from backend.app.routing.engine import DynamicRoutingEngine, haversine_distance
from backend.app.routing.schemas import RouteRequest


class TestDynamicRoutingEngine(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = DynamicRoutingEngine()

    def setUp(self):
        # Always reset shared state before each test
        reset_state()

    def tearDown(self):
        reset_state()

    def test_01_graph_loading_and_nodes(self):
        """Verify the graph loads all 56 Hyderabad nodes and 126 directed edges."""
        self.assertEqual(len(self.engine.nodes), 56)
        self.assertGreaterEqual(len(self.engine.edges_by_id), 126)
        self.assertIn("node_cyber_towers", self.engine.nodes)
        self.assertIn("node_gachibowli_flyover", self.engine.nodes)
        self.assertIn("node_secunderabad_clock_tower", self.engine.nodes)

    def test_02_normal_routing_a_star_and_dijkstra(self):
        """
        Test normal routing between Cyber Towers and Gachibowli Flyover.
        Shortest physical corridor: Cyber Towers -> Mindspace -> Biodiversity -> Gachibowli Flyover.
        """
        # Test A*
        req_astar = RouteRequest(
            source="node_cyber_towers",
            destination="node_gachibowli_flyover",
            algorithm="a_star",
            preference="time"
        )
        res_astar = self.engine.calculate_route(req_astar)
        self.assertEqual(res_astar.status, "success")
        self.assertEqual(res_astar.source_node, "node_cyber_towers")
        self.assertEqual(res_astar.destination_node, "node_gachibowli_flyover")
        self.assertGreater(res_astar.total_distance_m, 3500)
        self.assertLess(res_astar.total_distance_m, 4500)
        self.assertIn("road_cyber_mindspace", res_astar.road_sequence)

        # Test Dijkstra
        req_dijkstra = RouteRequest(
            source="node_cyber_towers",
            destination="node_gachibowli_flyover",
            algorithm="dijkstra",
            preference="time"
        )
        res_dijkstra = self.engine.calculate_route(req_dijkstra)
        self.assertEqual(res_dijkstra.status, "success")
        # Both algorithms should produce identical path on the directed graph
        self.assertEqual(res_astar.node_sequence, res_dijkstra.node_sequence)
        self.assertEqual(res_astar.road_sequence, res_dijkstra.road_sequence)
        self.assertAlmostEqual(res_astar.total_distance_m, res_dijkstra.total_distance_m, delta=1.0)

    def test_03_blocked_road_dynamic_rerouting(self):
        """
        Simulate an accident on 'road_cyber_mindspace'.
        The engine must avoid 'road_cyber_mindspace' and calculate a detour
        via Kothaguda (node_cyber_towers -> node_kothaguda -> node_gachibowli_flyover).
        """
        # 1. First verify normal path uses road_cyber_mindspace
        req = RouteRequest(
            source="node_cyber_towers",
            destination="node_gachibowli_flyover",
            algorithm="a_star"
        )
        initial_route = self.engine.calculate_route(req)
        self.assertIn("road_cyber_mindspace", initial_route.road_sequence)
        normal_distance = initial_route.total_distance_m

        # 2. Admin reports high severity accident on road_cyber_mindspace
        incident = create_incident(
            road_id="road_cyber_mindspace",
            incident_type="ACCIDENT",
            severity="HIGH",
            description="Major pileup near Mindspace Rotary"
        )
        self.assertEqual(get_state()["road_conditions"]["road_cyber_mindspace"]["status"], "BLOCKED")

        # 3. Dynamic route recalculated
        detour_route = self.engine.calculate_route(req)
        self.assertEqual(detour_route.status, "success")

        # Must NOT traverse the blocked road
        self.assertNotIn("road_cyber_mindspace", detour_route.road_sequence)
        # Detour route goes via Kothaguda
        self.assertIn("road_cyber_kothaguda", detour_route.road_sequence)
        self.assertIn("node_kothaguda", detour_route.node_sequence)

        # Blocked road must be listed in avoided_blocked_roads
        self.assertIn("road_cyber_mindspace", detour_route.avoided_blocked_roads)

        # Reasoning should mention dynamic detour and the avoided incident
        self.assertIn("DYNAMIC REROUTE ACTIVE", detour_route.reasoning)
        self.assertIn("road_cyber_mindspace", detour_route.reasoning)

    def test_04_incident_resolution_restores_primary_route(self):
        """
        When the incident is resolved, the routing engine should immediately
        return to using the original shortest route.
        """
        req = RouteRequest(
            source="node_cyber_towers",
            destination="node_gachibowli_flyover",
            algorithm="a_star"
        )

        # 1. Create incident
        incident = create_incident(
            road_id="road_cyber_mindspace",
            incident_type="ROAD_WORK",
            severity="HIGH",
            description="Emergency pipeline repair"
        )
        blocked_res = self.engine.calculate_route(req)
        self.assertNotIn("road_cyber_mindspace", blocked_res.road_sequence)

        # 2. Resolve incident
        resolved = resolve_incident(incident["incident_id"])
        self.assertIsNotNone(resolved)
        self.assertNotIn("road_cyber_mindspace", get_state()["road_conditions"])

        # 3. Recalculate route - original route must be restored
        restored_res = self.engine.calculate_route(req)
        self.assertEqual(restored_res.status, "success")
        self.assertIn("road_cyber_mindspace", restored_res.road_sequence)
        self.assertEqual(restored_res.avoided_blocked_roads, [])

    def test_05_congested_road_travel_time_increase(self):
        """
        When a road is marked CONGESTED (e.g. MEDIUM severity),
        travel time should noticeably increase due to effective speed drop.
        """
        req = RouteRequest(
            source="node_cyber_towers",
            destination="node_mindspace",
            algorithm="a_star",
            preference="time"
        )
        normal_res = self.engine.calculate_route(req)
        normal_time = normal_res.estimated_time_sec

        # Create congestion incident
        incident = create_incident(
            road_id="road_cyber_mindspace",
            incident_type="CONGESTION",
            severity="MEDIUM",
            description="Peak hour bumper-to-bumper traffic"
        )
        self.assertEqual(get_state()["road_conditions"]["road_cyber_mindspace"]["status"], "CONGESTED")

        congested_res = self.engine.calculate_route(req)
        congested_time = congested_res.estimated_time_sec

        # Travel time must be significantly higher due to congestion
        self.assertGreater(congested_time, normal_time * 1.5)
        self.assertIn("road_cyber_mindspace", congested_res.congested_roads_encountered)
        self.assertIn("congested road segment", congested_res.reasoning.lower())

    def test_06_emergency_vehicle_signal_priority(self):
        """
        Emergency vehicles (e.g. AMBULANCE) receive green-corridor priority,
        reducing junction signal wait times and overall journey duration.
        """
        req_standard = RouteRequest(
            source="node_cyber_towers",
            destination="node_secunderabad_clock_tower",
            vehicle_type="standard"
        )
        req_ambulance = RouteRequest(
            source="node_cyber_towers",
            destination="node_secunderabad_clock_tower",
            vehicle_type="ambulance"
        )

        res_std = self.engine.calculate_route(req_standard)
        res_amb = self.engine.calculate_route(req_ambulance)

        # Distances are identical (same optimal path)
        self.assertAlmostEqual(res_std.total_distance_m, res_amb.total_distance_m, delta=10.0)
        # Ambulance estimated time must be strictly faster due to traffic signal preemption
        self.assertLess(res_amb.estimated_time_sec, res_std.estimated_time_sec)
        self.assertIn("green corridor", res_amb.reasoning.lower())

    def test_07_natural_language_location_resolution(self):
        """User can specify search queries like 'Cyber Towers' or coordinates."""
        req = RouteRequest(
            source="Cyber Towers",
            destination="Gachibowli Flyover"
        )
        res = self.engine.calculate_route(req)
        self.assertEqual(res.status, "success")
        self.assertEqual(res.source_node, "node_cyber_towers")
        self.assertEqual(res.destination_node, "node_gachibowli_flyover")

    def test_08_alternative_route_generation(self):
        """Verify secondary alternative route is returned when requested."""
        req = RouteRequest(
            source="node_cyber_towers",
            destination="node_gachibowli_flyover",
            include_alternative=True
        )
        res = self.engine.calculate_route(req)
        self.assertIsNotNone(res.alternative_route)
        self.assertNotEqual(res.road_sequence, res.alternative_route.road_sequence)
        self.assertGreater(res.alternative_route.total_distance_m, 0)
        self.assertIn("Secondary alternative path", res.alternative_route.divergence_explanation)


class TestRoutingFastAPIEndpoints(unittest.TestCase):
    def setUp(self):
        reset_state()

    def tearDown(self):
        reset_state()

    def test_api_post_route(self):
        """Test POST route function."""
        from backend.app.api.routing_routes import compute_route
        req = RouteRequest(
            source="node_cyber_towers",
            destination="node_gachibowli_flyover",
            algorithm="a_star",
            preference="time",
            vehicle_type="standard",
            include_alternative=True
        )
        res = compute_route(req)
        self.assertEqual(res.status, "success")
        self.assertEqual(res.source_node, "node_cyber_towers")
        self.assertTrue(len(res.steps) > 0)
        self.assertIsNotNone(res.geojson)
        self.assertIn("reasoning", res.model_dump())

    def test_api_get_route(self):
        """Test GET route function."""
        from backend.app.api.routing_routes import compute_route_get
        res = compute_route_get(
            source="node_cyber_towers",
            destination="node_kothaguda",
            algorithm="dijkstra",
            preference="time",
            vehicle_type="standard",
            include_alternative=False
        )
        self.assertEqual(res.status, "success")
        self.assertEqual(res.algorithm_used, "dijkstra")
        self.assertEqual(res.road_sequence, ["road_cyber_kothaguda"])

    def test_api_get_nodes(self):
        """Test GET /api/routing/nodes function."""
        from backend.app.api.routing_routes import get_routable_nodes
        nodes = get_routable_nodes()
        self.assertEqual(len(nodes), 56)
        self.assertTrue(hasattr(nodes[0], "name"))
        self.assertTrue(hasattr(nodes[0], "lat"))

    def test_api_get_status(self):
        """Test GET /api/routing/status function."""
        from backend.app.api.routing_routes import get_routing_status
        status = get_routing_status()
        self.assertEqual(status.status, "operational")
        self.assertEqual(status.total_nodes, 56)
        self.assertIn("a_star", status.supported_algorithms)


if __name__ == "__main__":
    unittest.main(verbosity=2)
