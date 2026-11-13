export type IncidentType = 'ACCIDENT' | 'ROAD_BLOCKAGE' | 'CONGESTION';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export type IncidentStatus = 'ACTIVE' | 'RESOLVED';

export interface DemoIncident {
  incident_id: string;
  road_id: string;
  type: IncidentType | string;
  severity: IncidentSeverity;
  description: string;
  status: IncidentStatus;
  source: string;
  created_at: string;
}

export interface DemoRoadCondition {
  status: 'BLOCKED' | 'CONGESTED';
  incident_id: string;
}

export interface DemoState {
  simulation_active: boolean;
  incidents: DemoIncident[];
  road_conditions: Record<string, DemoRoadCondition>;
  emergency_vehicles: any[];
  predictions: any[];
  last_updated: string | null;
}

export interface CreateIncidentPayload {
  road_id: string;
  incident_type: IncidentType | string;
  severity: IncidentSeverity;
  description: string;
}
