import { DemoState, DemoIncident, CreateIncidentPayload } from '../types/incident';

const API_BASE_URL = 'http://127.0.0.1:8000';
const TOKEN_KEY = 'urbanflow_access_token';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    return {};
  }
  return {
    Authorization: `Bearer ${token}`
  };
}

/**
 * Fetch the shared demo simulation state.
 * Accessible to all dashboards (public GET).
 */
export async function fetchDemoState(): Promise<DemoState> {
  const response = await fetch(`${API_BASE_URL}/api/demo/state`, {
    headers: {
      Accept: 'application/json',
      ...getAuthHeader()
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to fetch demo state (${response.status})`);
  }

  return response.json();
}

/**
 * Create a new traffic incident in the shared demo state.
 * Requires ADMIN role.
 * When severity is 'HIGH', the road condition becomes 'BLOCKED'.
 * When severity is 'MEDIUM' or 'LOW', the road condition becomes 'CONGESTED'.
 */
export async function createIncident(payload: CreateIncidentPayload): Promise<DemoIncident> {
  const authHeaders = getAuthHeader();
  if (!authHeaders.Authorization) {
    throw new Error('Authentication required: Administrator session token not found.');
  }

  const response = await fetch(`${API_BASE_URL}/api/demo/incidents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...authHeaders
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to create incident (${response.status})`);
  }

  return response.json();
}

/**
 * Resolve an active incident.
 * Requires ADMIN role.
 * Once resolved, the road is unblocked if no other active incident affects it.
 */
export async function resolveIncident(incidentId: string): Promise<DemoIncident> {
  const authHeaders = getAuthHeader();
  if (!authHeaders.Authorization) {
    throw new Error('Authentication required: Administrator session token not found.');
  }

  const response = await fetch(`${API_BASE_URL}/api/demo/incidents/${incidentId}/resolve`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...authHeaders
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to resolve incident (${response.status})`);
  }

  return response.json();
}

/**
 * Reset the demo simulation state to initial clean state.
 * Requires ADMIN role.
 */
export async function resetSimulation(): Promise<{ message: string }> {
  const authHeaders = getAuthHeader();
  if (!authHeaders.Authorization) {
    throw new Error('Authentication required: Administrator session token not found.');
  }

  const response = await fetch(`${API_BASE_URL}/api/demo/reset`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...authHeaders
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to reset simulation (${response.status})`);
  }

  return response.json();
}
