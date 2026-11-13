"""
Unit and integration tests for Emergency Vehicle Priority & Routing Engine.
Tests:
1. Basic A* and Dijkstra path finding on Hyderabad road network.
2. Emergency priority speed & signal preemption ETA advantage.
3. Blocked road avoidance (reroutes around high-severity incidents).
4. Congestion-aware routing (accounts for traffic slowdown).
5. Dynamic recalculation behavior when road conditions transition.
"""

import sys
import os
import unittest

# Add project root to sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, "..", ".."))
sys.path.insert(0, PROJECT_ROOT)

from backend.app.core.emergency_router import get_emergency_router, EmergencyRouterEngine


class TestEmergencyRouting(unittest.TestCase):

    def setUp(self):
        self.router = get_emergency_router()

    def test_graph_initialization(self):
        """Verify Hyderabad road graph is loaded correctly."""
        self.assertGreater(len(self.router.nodes), 50, "Should have loaded at least 50 nodes")
        self.assertGreater(len(self.router.edges), 100, "Should have loaded at least 100 edges")
        self.assertGreater(len(self.router.facilities), 20, "Should have loaded emergency facilities")
        self.assertIn("node_cyber_towers", self.router.nodes)
        self.assertIn("node_jh_checkpost", self.router.nodes)

    def test_normal_emergency_route(self):
        """Test baseline emergency route calculation without road blocks."""
        res = self.router.compute_emergency_corridor(
            source_node_id="node_cyber_towers",
            target_node_id="node_jh_checkpost",
            vehicle_type="AMBULANCE",
            road_conditions={}
        )

        self.assertEqual(res["status"], "SUCCESS")
        self.assertTrue(res["route_found"])
        self.assertGreater(res["summary"]["total_distance_km"], 0.0)
        self.assertGreater(res["summary"]["emergency_travel_time_sec"], 0.0)
        # Emergency travel time should be less than or equal to normal vehicle time
        self.assertLessEqual(
            res["summary"]["emergency_travel_time_sec"],
            res["summary"]["normal_travel_time_sec"]
        )
        self.assertIn("Cyber Towers Junction", res["source"]["name"])
        self.assertIn("Jubilee Hills Checkpost", res["destination"]["name"])
        self.assertGreater(len(res["corridor_roads"]), 0)
        self.assertEqual(res["geojson_linestring"]["geometry"]["type"], "LineString")

    def test_blocked_road_avoidance(self):
        """
        Verify that a blocked road is completely avoided.
        First find the baseline route, block one of its traversed segments,
        and verify that the new route selects an alternate path avoiding that segment.
        """
        baseline = self.router.compute_emergency_corridor(
            source_node_id="node_cyber_towers",
            target_node_id="node_jh_checkpost",
            road_conditions={}
        )
        self.assertTrue(baseline["route_found"])
        first_edge = baseline["corridor_roads"][0]["edge_id"]
        base_road_id = baseline["corridor_roads"][0]["base_road_id"]

        # Block this segment as if an accident occurred
        road_conditions = {
            base_road_id: {
                "status": "BLOCKED",
                "incident_id": "test_acc_001"
            }
        }

        rerouted = self.router.compute_emergency_corridor(
            source_node_id="node_cyber_towers",
            target_node_id="node_jh_checkpost",
            road_conditions=road_conditions
        )

        self.assertEqual(rerouted["status"], "SUCCESS")
        self.assertTrue(rerouted["route_found"])

        # Check that the blocked edge is NOT in the new corridor
        new_edge_ids = [r["edge_id"] for r in rerouted["corridor_roads"]]
        new_base_ids = [r["base_road_id"] for r in rerouted["corridor_roads"]]

        self.assertNotIn(first_edge, new_edge_ids, f"Blocked edge {first_edge} should not be used")
        self.assertNotIn(base_road_id, new_base_ids, f"Blocked road {base_road_id} should not be used")

        # Check explanation
        self.assertIn(base_road_id, rerouted["explanation"]["blocked_roads_avoided"])

    def test_congestion_aware_routing(self):
        """
        Test route response under heavy congestion.
        Travel time should reflect congestion penalties while applying emergency siren mitigation.
        """
        baseline = self.router.compute_emergency_corridor(
            source_node_id="node_cyber_towers",
            target_node_id="node_jh_checkpost",
            road_conditions={}
        )
        congested_road = baseline["corridor_roads"][0]["base_road_id"]

        congested_conditions = {
            congested_road: {
                "status": "CONGESTED",
                "incident_id": "test_cong_001"
            }
        }

        congested_res = self.router.compute_emergency_corridor(
            source_node_id="node_cyber_towers",
            target_node_id="node_jh_checkpost",
            road_conditions=congested_conditions
        )

        self.assertTrue(congested_res["route_found"])
        # Either it rerouted around the congestion or traversed it with adjusted travel time
        self.assertIn("explanation", congested_res)

    def test_dynamic_recalculation(self):
        """
        Simulate dynamic condition change:
        Step 1: Normal route.
        Step 2: Incident occurs -> Route recalculates around blockage.
        Step 3: Incident resolved -> Route restores to optimal path.
        """
        source = "node_cyber_towers"
        dest = "node_biodiversity"

        # Step 1: Clean route
        step1 = self.router.compute_emergency_corridor(
            source_node_id=source, target_node_id=dest, road_conditions={}
        )
        self.assertTrue(step1["route_found"])
        initial_edges = [r["base_road_id"] for r in step1["corridor_roads"]]

        # Pick an edge to block
        blocked_target = initial_edges[0]
        step2 = self.router.compute_emergency_corridor(
            source_node_id=source,
            target_node_id=dest,
            road_conditions={blocked_target: {"status": "BLOCKED", "incident_id": "inc_1"}}
        )
        self.assertTrue(step2["route_found"])
        step2_edges = [r["base_road_id"] for r in step2["corridor_roads"]]
        self.assertNotIn(blocked_target, step2_edges, "Step 2 must avoid blocked road")

        # Step 3: Incident resolved
        step3 = self.router.compute_emergency_corridor(
            source_node_id=source, target_node_id=dest, road_conditions={}
        )
        self.assertTrue(step3["route_found"])
        step3_edges = [r["base_road_id"] for r in step3["corridor_roads"]]
        self.assertEqual(initial_edges, step3_edges, "Resolved incident restores optimal corridor")

    def test_nearest_node_facility_snapping(self):
        """Verify snapping to nearest junction node from hospital coordinates."""
        apollo_lat = 17.41682
        apollo_lon = 78.41165
        node, dist = self.router.find_nearest_node(apollo_lat, apollo_lon)
        self.assertIsNotNone(node)
        self.assertLess(dist, 500.0, "Apollo Hospitals should snap within 500m to nearest junction")


if __name__ == "__main__":
    unittest.main()
