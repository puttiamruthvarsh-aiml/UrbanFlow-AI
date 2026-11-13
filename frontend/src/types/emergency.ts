/**
 * Types for UrbanFlow AI Emergency Vehicle Prioritization & Routing
 */

export type EmergencyVehicleType = 'AMBULANCE' | 'FIRE' | 'POLICE';

export interface RouteEndpoint {
  id: string;
  name: string;
  lat: number;
  lon: number;
  area?: string;
  node_type?: string;
  has_signal?: boolean;
}

export interface CorridorRoadSegment {
  edge_id: string;
  base_road_id: string;
  name: string;
  from_node: string;
  to_node: string;
  highway: string;
  lanes: number;
  length_m: number;
  base_speed_kmh: number;
  priority_speed_kmh: number;
  travel_time_sec: number;
  status: 'FREE_FLOW' | 'CONGESTED' | 'BLOCKED';
  has_signal: boolean;
  signal_preempted: boolean;
}

export interface RouteSummary {
  total_distance_m: number;
  total_distance_km: number;
  normal_travel_time_sec: number;
  normal_eta_formatted: string;
  emergency_travel_time_sec: number;
  emergency_eta_formatted: string;
  time_saved_sec: number;
  time_saved_formatted: string;
  speed_advantage_percent: number;
  preempted_signals_count: number;
  corridor_road_segments_count: number;
}

export interface RouteExplanation {
  summary: string;
  blocked_roads_avoided: string[];
  congested_roads_bypassed: string[];
  corridor_congested_traversed: string[];
  priority_factors: string[];
}

export interface EmergencyRouteResult {
  status: 'SUCCESS' | 'UNREACHABLE' | 'ERROR';
  route_found: boolean;
  algorithm: string;
  vehicle_type: EmergencyVehicleType;
  source: RouteEndpoint;
  destination: RouteEndpoint;
  summary: RouteSummary;
  corridor_roads: CorridorRoadSegment[];
  path_node_ids: string[];
  geojson_linestring: {
    type: 'Feature';
    geometry: {
      type: 'LineString';
      coordinates: [number, number][];
    };
    properties: {
      corridor_type: string;
      vehicle_type: string;
      total_distance_km: number;
      emergency_eta_min: number;
      preempted_signals: number;
      is_simulated_corridor: boolean;
    };
  };
  explanation: RouteExplanation;
  message?: string;
}

export interface RouteCalculationRequest {
  source_node_id?: string;
  target_node_id?: string;
  vehicle_type?: EmergencyVehicleType;
  source_facility_id?: string;
  target_facility_id?: string;
  source_coords?: [number, number];
  target_coords?: [number, number];
}

export interface EmergencyFacility {
  id: string;
  name: string;
  category: 'hospital' | 'police' | 'fire_station';
  type: string;
  lat: number;
  lon: number;
  area: string;
  address: string;
  contact: string;
  nearest_node_id?: string;
  nearest_node_name?: string;
  distance_to_network_m?: number;
  trauma_care?: string;
  ambulances_available?: number;
}
