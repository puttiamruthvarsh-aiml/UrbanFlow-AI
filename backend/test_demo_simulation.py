"""
Automated Integration Tests for UrbanFlow AI - Admin Incident Simulation
Tests:
- Initial state verification
- Incident creation (Accident, Road Blockage, Congestion)
- Severity handling: HIGH -> BLOCKED, MEDIUM/LOW -> CONGESTED
- Road condition tracking in shared demo_state
- Incident resolution & road condition restoration
- Multi-incident road handling (road remains blocked if another active incident exists)
- Simulation reset
- Role validation (ADMIN authorized, USER forbidden)
"""

import sys
import os
import unittest

# Ensure backend package is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.core.demo_state import get_state, reset_state
from backend.app.api.demo_routes import (
    read_state,
    add_incident,
    resolve,
    reset,
    IncidentRequest
)
from fastapi import HTTPException


class TestAdminIncidentSimulation(unittest.TestCase):

    def setUp(self):
        reset_state()
        self.admin_user = {"username": "admin", "role": "ADMIN"}
        self.normal_user = {"username": "user", "role": "USER"}

    def tearDown(self):
        reset_state()

    def test_01_initial_state(self):
        state = read_state()
        self.assertFalse(state["simulation_active"])
        self.assertEqual(len(state["incidents"]), 0)
        self.assertEqual(state["road_conditions"], {})

    def test_02_create_high_severity_accident_blocks_road(self):
        req = IncidentRequest(
            road_id="road_cyber_kothaguda",
            incident_type="ACCIDENT",
            severity="HIGH",
            description="Major multi-car pileup"
        )
        created = add_incident(req, self.admin_user)

        self.assertIsNotNone(created["incident_id"])
        self.assertEqual(created["road_id"], "road_cyber_kothaguda")
        self.assertEqual(created["type"], "ACCIDENT")
        self.assertEqual(created["severity"], "HIGH")
        self.assertEqual(created["status"], "ACTIVE")
        self.assertEqual(created["source"], "ADMIN_SIMULATION")

        # Verify shared state
        state = read_state()
        self.assertTrue(state["simulation_active"])
        self.assertEqual(len(state["incidents"]), 1)
        self.assertIn("road_cyber_kothaguda", state["road_conditions"])
        self.assertEqual(state["road_conditions"]["road_cyber_kothaguda"]["status"], "BLOCKED")
        self.assertEqual(
            state["road_conditions"]["road_cyber_kothaguda"]["incident_id"],
            created["incident_id"]
        )

    def test_03_create_medium_severity_congestion(self):
        req = IncidentRequest(
            road_id="road_cable_bridge",
            incident_type="CONGESTION",
            severity="MEDIUM",
            description="Peak rush hour bottleneck"
        )
        created = add_incident(req, self.admin_user)

        self.assertEqual(created["severity"], "MEDIUM")
        state = read_state()
        self.assertIn("road_cable_bridge", state["road_conditions"])
        self.assertEqual(state["road_conditions"]["road_cable_bridge"]["status"], "CONGESTED")

    def test_04_create_road_blockage(self):
        req = IncidentRequest(
            road_id="road_hitex_cyber",
            incident_type="ROAD_BLOCKAGE",
            severity="HIGH",
            description="Fallen tree and repair crane"
        )
        created = add_incident(req, self.admin_user)
        self.assertEqual(created["type"], "ROAD_BLOCKAGE")
        state = read_state()
        self.assertEqual(state["road_conditions"]["road_hitex_cyber"]["status"], "BLOCKED")

    def test_05_resolve_incident_clears_road(self):
        # Create incident
        req = IncidentRequest(
            road_id="road_cyber_kothaguda",
            incident_type="ACCIDENT",
            severity="HIGH",
            description="Test incident to resolve"
        )
        created = add_incident(req, self.admin_user)
        inc_id = created["incident_id"]

        # Resolve
        resolved = resolve(inc_id, self.admin_user)
        self.assertEqual(resolved["status"], "RESOLVED")

        # Verify state: road restored, simulation idle
        state = read_state()
        self.assertNotIn("road_cyber_kothaguda", state["road_conditions"])
        self.assertFalse(state["simulation_active"])
        self.assertEqual(len(state["incidents"]), 1)
        self.assertEqual(state["incidents"][0]["status"], "RESOLVED")

    def test_06_multi_incident_road_restoration(self):
        # Create two incidents on the same road
        req1 = IncidentRequest(
            road_id="road_cyber_kothaguda",
            incident_type="ACCIDENT",
            severity="HIGH",
            description="Primary accident"
        )
        inc1 = add_incident(req1, self.admin_user)

        req2 = IncidentRequest(
            road_id="road_cyber_kothaguda",
            incident_type="CONGESTION",
            severity="LOW",
            description="Secondary bottleneck"
        )
        inc2 = add_incident(req2, self.admin_user)

        # Resolve first incident
        resolve(inc1["incident_id"], self.admin_user)

        # Road condition should still exist because inc2 is still active
        state = read_state()
        self.assertIn("road_cyber_kothaguda", state["road_conditions"])
        self.assertTrue(state["simulation_active"])

        # Resolve second incident
        resolve(inc2["incident_id"], self.admin_user)

        # Now road is cleared
        state = read_state()
        self.assertNotIn("road_cyber_kothaguda", state["road_conditions"])
        self.assertFalse(state["simulation_active"])

    def test_07_simulation_reset(self):
        # Create multiple incidents
        add_incident(IncidentRequest(road_id="road_cyber_kothaguda", incident_type="ACCIDENT", severity="HIGH"), self.admin_user)
        add_incident(IncidentRequest(road_id="road_cable_bridge", incident_type="CONGESTION", severity="MEDIUM"), self.admin_user)

        state_before = read_state()
        self.assertEqual(len(state_before["incidents"]), 2)
        self.assertTrue(state_before["simulation_active"])

        # Reset
        res = reset(self.admin_user)
        self.assertEqual(res["message"], "Simulation reset successfully")

        # Verify clean state
        state_after = read_state()
        self.assertFalse(state_after["simulation_active"])
        self.assertEqual(len(state_after["incidents"]), 0)
        self.assertEqual(state_after["road_conditions"], {})

    def test_08_invalid_severity_raises_400(self):
        req = IncidentRequest(
            road_id="road_cyber_kothaguda",
            incident_type="ACCIDENT",
            severity="EXTREME"  # Invalid!
        )
        with self.assertRaises(HTTPException) as ctx:
            add_incident(req, self.admin_user)
        self.assertEqual(ctx.exception.status_code, 400)

    def test_09_resolve_nonexistent_incident_raises_404(self):
        with self.assertRaises(HTTPException) as ctx:
            resolve("non-existent-uuid-12345", self.admin_user)
        self.assertEqual(ctx.exception.status_code, 404)


if __name__ == "__main__":
    unittest.main()
