"""
Integration test for emergency routing with shared demo_state.py.
Tests:
1. Creating an accident via demo_state.create_incident blocks a road.
2. Emergency route automatically avoids the blocked road.
3. Resolving the accident restores optimal corridor.
"""

import sys
import os
import unittest

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, "..", ".."))
sys.path.insert(0, PROJECT_ROOT)

from backend.app.core.emergency_router import get_emergency_router
from backend.app.core.demo_state import (
    get_state,
    create_incident,
    resolve_incident,
    reset_state
)


class TestEmergencyDemoStateIntegration(unittest.TestCase):

    def setUp(self):
        reset_state()
        self.router = get_emergency_router()

    def tearDown(self):
        reset_state()

    def test_shared_demo_state_blocks_and_resolves(self):
        source = "node_cyber_towers"
        dest = "node_jh_checkpost"

        # 1. Compute baseline route with clean demo_state
        state = get_state()
        self.assertEqual(len(state["road_conditions"]), 0)

        res1 = self.router.compute_emergency_corridor(
            source_node_id=source,
            target_node_id=dest,
            road_conditions=state["road_conditions"]
        )
        self.assertTrue(res1["route_found"])
        baseline_edges = [r["base_road_id"] for r in res1["corridor_roads"]]
        self.assertGreater(len(baseline_edges), 0)

        # 2. Block the first road segment using create_incident (severity='HIGH' causes 'BLOCKED')
        road_to_block = baseline_edges[0]
        incident = create_incident(
            road_id=road_to_block,
            incident_type="ACCIDENT",
            severity="HIGH",
            description="Major collision blocking lanes"
        )
        self.assertIsNotNone(incident)

        # Verify demo_state has this road as BLOCKED
        state_after_incident = get_state()
        self.assertIn(road_to_block, state_after_incident["road_conditions"])
        self.assertEqual(state_after_incident["road_conditions"][road_to_block]["status"], "BLOCKED")

        # 3. Compute emergency corridor with the updated demo_state
        res2 = self.router.compute_emergency_corridor(
            source_node_id=source,
            target_node_id=dest,
            road_conditions=state_after_incident["road_conditions"]
        )
        self.assertTrue(res2["route_found"])
        res2_edges = [r["base_road_id"] for r in res2["corridor_roads"]]

        # The blocked road must NOT be in the newly chosen corridor
        self.assertNotIn(road_to_block, res2_edges)
        self.assertIn(road_to_block, res2["explanation"]["blocked_roads_avoided"])

        # 4. Resolve the incident
        resolved = resolve_incident(incident["incident_id"])
        self.assertIsNotNone(resolved)
        self.assertEqual(resolved["status"], "RESOLVED")

        # Verify demo_state no longer has this road blocked
        state_after_resolve = get_state()
        self.assertNotIn(road_to_block, state_after_resolve["road_conditions"])

        # 5. Compute emergency corridor again -> original route restored
        res3 = self.router.compute_emergency_corridor(
            source_node_id=source,
            target_node_id=dest,
            road_conditions=state_after_resolve["road_conditions"]
        )
        self.assertTrue(res3["route_found"])
        res3_edges = [r["base_road_id"] for r in res3["corridor_roads"]]
        self.assertEqual(baseline_edges, res3_edges)


if __name__ == "__main__":
    unittest.main()
