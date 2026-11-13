export type ActiveRole = 'LANDING' | 'USER' | 'EMERGENCY' | 'ADMIN';

export type RoadClassification = 'motorway' | 'trunk' | 'primary' | 'secondary' | 'tertiary';

export interface RoadSegmentProperties {
  id: string;
  name: string;
  from_node: string;
  from_name: string;
  to_node: string;
  to_name: string;
  highway: RoadClassification;
  length_m: number;
  lanes: number;
  base_speed_kmh: number;
  one_way: boolean;
  direction: 'forward' | 'reverse' | 'bidirectional';
  osm_way_id: string;
}

export interface JunctionProperties {
  id: string;
  name: string;
  node_type: string;
  area: string;
  has_signal: boolean;
  osm_id: string;
  degree?: number;
}

export interface TrafficSignalProperties {
  id: string;
  name: string;
  category: 'traffic_signal';
  associated_node: string;
  junction_name: string;
  area: string;
  signal_type: string;
  phases: number;
  cycle_time_sec: number;
  osm_node_id: string;
  source: string;
}

export interface EmergencyFacilityProperties {
  id: string;
  name: string;
  category: 'hospital' | 'police' | 'fire_station';
  facility_type: string;
  area: string;
  address: string;
  contact: string;
  emergency_dept?: boolean;
  trauma_care?: string;
  ambulances_available?: number;
  control_room?: boolean;
  patrol_units?: number;
  fire_engines?: number;
  hazmat_equipped?: boolean;
  osm_id: string;
}

export type SelectedMapEntity =
  | { type: 'road'; data: RoadSegmentProperties }
  | { type: 'junction'; data: JunctionProperties }
  | { type: 'signal'; data: TrafficSignalProperties }
  | { type: 'emergency'; data: EmergencyFacilityProperties }
  | null;

export interface LayerVisibilityState {
  roads: boolean;
  junctions: boolean;
  signals: boolean;
  hospitals: boolean;
  police: boolean;
  fireStations: boolean;
  basemapMode: 'dark' | 'osm';
  labels: boolean;
}
