export interface RouteStep {
  step_number: number;
  instruction: string;
  road_id: string;
  road_name: string;
  highway_type: string;
  distance_m: number;
  time_sec: number;
  effective_speed_kmh: number;
  condition: string;
}

export interface RouteAlternative {
  total_distance_km: number;
  estimated_time_min: number;
  road_sequence: string[];
  difference_time_min: number;
  difference_distance_km: number;
  description: string;
}

export interface DynamicRouteResult {
  status: 'success' | 'no_route_found' | 'error';
  source_node_id: string;
  destination_node_id: string;
  source_name?: string;
  destination_name?: string;
  algorithm_used: 'a_star' | 'dijkstra';
  total_distance_km: number;
  estimated_time_min: number;
  free_flow_time_min: number;
  incident_delay_min: number;
  road_sequence: string[];
  steps: RouteStep[];
  geojson: any;
  active_incidents_considered: number;
  avoided_blocked_roads: string[];
  congested_roads_encountered: string[];
  alternative_route?: RouteAlternative | null;
  reasoning: string;
}

export interface CalculateRouteRequest {
  source: string;
  destination: string;
  algorithm?: 'a_star' | 'dijkstra';
  preference?: 'time' | 'distance';
  vehicle_type?: 'standard' | 'ambulance' | 'fire' | 'police';
  include_alternative?: boolean;
}

const API_BASE_URL = 'http://127.0.0.1:8000';

export async function calculateDynamicRoute(request: CalculateRouteRequest): Promise<DynamicRouteResult> {
  const response = await fetch(`${API_BASE_URL}/api/routing/route`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({
      source: request.source,
      destination: request.destination,
      algorithm: request.algorithm || 'a_star',
      preference: request.preference || 'time',
      vehicle_type: request.vehicle_type || 'standard',
      include_alternative: request.include_alternative ?? true
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Route calculation failed (${response.status})`);
  }

  return response.json();
}

export async function fetchRoutableNodes(): Promise<Array<{ id: string; name: string; lat: number; lon: number; area: string }>> {
  const response = await fetch(`${API_BASE_URL}/api/routing/nodes`);
  if (!response.ok) {
    throw new Error('Failed to fetch routable junction nodes');
  }
  return response.json();
}
