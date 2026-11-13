import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from '../components/Navigation/Sidebar';
import { EmergencyTrafficMap } from '../components/Emergency/EmergencyTrafficMap';
import { EmergencyMissionControl } from '../components/Emergency/EmergencyMissionControl';
import { EmergencyRouteMetricsCard } from '../components/Emergency/EmergencyRouteMetricsCard';
import { EmergencyCorridorRoadsList } from '../components/Emergency/EmergencyCorridorRoadsList';
import { SelectedMapEntity } from '../types/network';
import { 
  EmergencyVehicleType, 
  EmergencyRouteResult, 
  RouteEndpoint, 
  EmergencyFacility 
} from '../types/emergency';
import { 
  calculateEmergencyRoute, 
  fetchLiveDemoState 
} from '../services/emergencyRoutingService';

import emergencyData from '../data/emergency_locations.json';
import graphData from '../data/hyderabad_graph.json';
import { 
  Building2, 
  Phone, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

export const EmergencyDashboard: React.FC = () => {
  const [activeNav, setActiveNav] = useState<string>('live_map');
  const [selectedHub, setSelectedHub] = useState<string>('all');
  const [vehicleType, setVehicleType] = useState<EmergencyVehicleType>('AMBULANCE');
  const [selectedEntity, setSelectedEntity] = useState<SelectedMapEntity>(null);

  // Routing Endpoints
  const [selectedSourceId, setSelectedSourceId] = useState<string>('node_apollo_crossing');
  const [selectedTargetId, setSelectedTargetId] = useState<string>('node_cyber_towers');
  const [routeResult, setRouteResult] = useState<EmergencyRouteResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [mapSelectionMode, setMapSelectionMode] = useState<'none' | 'source' | 'target'>('none');

  // Shared Demo State & Dynamic Recalculation
  const [roadConditions, setRoadConditions] = useState<Record<string, { status: string; incident_id: string }>>({});
  const [activeIncidentsCount, setActiveIncidentsCount] = useState<number>(0);
  const [blockedRoadsCount, setBlockedRoadsCount] = useState<number>(0);
  const [lastStateTimestamp, setLastStateTimestamp] = useState<string | null>(null);
  const [lastRecalculatedAt, setLastRecalculatedAt] = useState<string | null>(null);
  const [recalculationNotice, setRecalculationNotice] = useState<string | null>(null);

  // Prepared candidate nodes & emergency facilities
  const candidateNodes: RouteEndpoint[] = (graphData as any).nodes.map((n: any) => ({
    id: n.id,
    name: n.name,
    lat: n.lat,
    lon: n.lon,
    area: n.area,
    has_signal: n.has_signal
  }));

  const candidateFacilities: EmergencyFacility[] = [
    ...(emergencyData as any).hospitals.map((h: any) => ({
      ...h,
      category: 'hospital' as const,
      nearest_node_id: 'node_apollo_crossing'
    })),
    ...(emergencyData as any).police_stations.map((p: any) => ({
      ...p,
      category: 'police' as const,
      nearest_node_id: 'node_cyber_towers'
    })),
    ...(emergencyData as any).fire_stations.map((f: any) => ({
      ...f,
      category: 'fire_station' as const,
      nearest_node_id: 'node_mindspace'
    }))
  ];

  const emergencyHospitals = [
    { name: 'Apollo Hospitals Jubilee Hills', hub: 'jubilee', beds: 450, trauma: 'Level 1', phone: '+91 40 2360 7777', nodeId: 'node_apollo_crossing' },
    { name: 'CARE Hospitals Banjara Hills', hub: 'banjara', beds: 350, trauma: 'Level 1', phone: '+91 40 6165 6565', nodeId: 'node_bh_road1' },
    { name: 'Continental Hospitals Gachibowli', hub: 'gachibowli', beds: 750, trauma: 'Level 1', phone: '+91 40 6700 0000', nodeId: 'node_financial_district' },
    { name: 'AIG Hospitals Mindspace Gachibowli', hub: 'hitech', beds: 800, trauma: 'Level 1', phone: '+91 40 4244 4222', nodeId: 'node_mindspace' },
    { name: 'Yashoda Hospitals Secunderabad', hub: 'secunderabad', beds: 500, trauma: 'Level 1', phone: '+91 40 4567 4567', nodeId: 'node_secunderabad_station' },
    { name: 'Gandhi Hospital Musheerabad', hub: 'secunderabad', beds: 1200, trauma: 'Level 1', phone: '+91 40 2750 5566', nodeId: 'node_sangeet_junction' },
    { name: 'Spark Hospitals LB Nagar', hub: 'lbnagar', beds: 200, trauma: 'Level 2', phone: '+91 40 2404 4444', nodeId: 'node_lbnagar_ring' },
    { name: 'TX Hospitals Uppal', hub: 'uppal', beds: 250, trauma: 'Level 2', phone: '+91 40 6815 1515', nodeId: 'node_uppal_ring' }
  ];

  // Core route calculation trigger
  const handleCalculateRoute = useCallback(async () => {
    setIsLoading(true);
    setRecalculationNotice(null);
    try {
      const result = await calculateEmergencyRoute({
        source_node_id: selectedSourceId,
        target_node_id: selectedTargetId,
        vehicle_type: vehicleType
      });
      setRouteResult(result);
      setLastRecalculatedAt(new Date().toISOString());
    } catch (err) {
      console.error('Failed to calculate emergency route:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSourceId, selectedTargetId, vehicleType]);

  // Initial calculation on component mount
  useEffect(() => {
    handleCalculateRoute();
  }, []);

  // Poll shared simulation state for dynamic incident detection & automatic recalculation
  const routeResultRef = useRef(routeResult);
  routeResultRef.current = routeResult;

  useEffect(() => {
    let isMounted = true;

    const checkSharedState = async () => {
      try {
        const state = await fetchLiveDemoState();
        if (!isMounted) return;

        const currentConditions = state.road_conditions || {};
        const conditionsChanged = JSON.stringify(currentConditions) !== JSON.stringify(roadConditions);
        const timestampChanged = state.last_updated && state.last_updated !== lastStateTimestamp;

        setRoadConditions(currentConditions);
        setActiveIncidentsCount(state.incidents?.filter((i: any) => i.status === 'ACTIVE').length || 0);
        setBlockedRoadsCount(Object.values(currentConditions).filter((c: any) => c.status === 'BLOCKED').length);

        if (timestampChanged || conditionsChanged) {
          setLastStateTimestamp(state.last_updated);

          // If a route is active, auto-recalculate to adapt to new road conditions
          if (routeResultRef.current && routeResultRef.current.route_found) {
            console.log('Shared road conditions changed. Dynamically recalculating emergency route...');
            const newResult = await calculateEmergencyRoute({
              source_node_id: selectedSourceId,
              target_node_id: selectedTargetId,
              vehicle_type: vehicleType
            });

            if (isMounted) {
              setRouteResult(newResult);
              setLastRecalculatedAt(new Date().toISOString());

              // Check if any blocked roads were avoided
              const avoided = newResult.explanation?.blocked_roads_avoided || [];
              if (avoided.length > 0) {
                setRecalculationNotice(`Corridor dynamically rerouted around active blockage: ${avoided[0]}`);
              } else {
                setRecalculationNotice('Emergency corridor updated with live road conditions.');
              }
            }
          }
        }
      } catch (err) {
        // demo_state fetch silent error handling
      }
    };

    // Check immediately and then every 2.5 seconds
    checkSharedState();
    const interval = setInterval(checkSharedState, 2500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedSourceId, selectedTargetId, vehicleType, roadConditions, lastStateTimestamp]);

  // Map click handler for endpoint selection
  const handleSelectEndpointFromMap = (nodeId: string, nodeName: string) => {
    if (mapSelectionMode === 'source') {
      setSelectedSourceId(nodeId);
      setMapSelectionMode('none');
      setRecalculationNotice(`Origin set to: ${nodeName}`);
    } else if (mapSelectionMode === 'target') {
      setSelectedTargetId(nodeId);
      setMapSelectionMode('none');
      setRecalculationNotice(`Destination set to: ${nodeName}`);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden select-none">
      {/* Role Sidebar */}
      <Sidebar
        currentRole="EMERGENCY"
        activeNav={activeNav}
        onSelectNav={setActiveNav}
        onFlyToHub={setSelectedHub}
      />

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col xl:flex-row overflow-hidden relative">
        {/* Left Side: Emergency Command Drawer */}
        <div className="w-full xl:w-96 bg-[#0E1526]/95 border-r border-slate-800/80 p-4 overflow-y-auto space-y-4 shrink-0">
          
          {/* Dynamic Recalculation Notification Banner */}
          {recalculationNotice && (
            <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-800/80 text-cyan-200 text-xs font-mono flex items-center justify-between gap-2 shadow-lg animate-fade-in">
              <span className="flex items-center gap-1.5 truncate">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="truncate">{recalculationNotice}</span>
              </span>
              <button 
                onClick={() => setRecalculationNotice(null)}
                className="text-[10px] text-cyan-400 hover:text-white px-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* Mission Control: Source / Destination / Vehicle Selection */}
          <EmergencyMissionControl
            vehicleType={vehicleType}
            onChangeVehicleType={setVehicleType}
            nodes={candidateNodes}
            facilities={candidateFacilities}
            selectedSourceId={selectedSourceId}
            onSelectSourceId={setSelectedSourceId}
            selectedTargetId={selectedTargetId}
            onSelectTargetId={setSelectedTargetId}
            onCalculateRoute={handleCalculateRoute}
            isLoading={isLoading}
            mapSelectionMode={mapSelectionMode}
            onSetMapSelectionMode={setMapSelectionMode}
            activeIncidentsCount={activeIncidentsCount}
            blockedRoadsCount={blockedRoadsCount}
            lastRecalculatedAt={lastRecalculatedAt}
          />

          {/* Route Metrics, Distance, Priority ETA & Explanation */}
          <EmergencyRouteMetricsCard
            routeResult={routeResult}
            isLoading={isLoading}
            onRecalculate={handleCalculateRoute}
          />

          {/* Corridor Road Segments Detailed Breakdown */}
          {routeResult && routeResult.route_found && (
            <EmergencyCorridorRoadsList
              corridorRoads={routeResult.corridor_roads}
            />
          )}

          {/* Major Emergency Hospitals Quick Teleport */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-mono uppercase tracking-wider">
              <Building2 className="w-4 h-4 text-emerald-400" />
              Major Emergency Facilities
            </span>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {emergencyHospitals.map((hosp) => (
                <div
                  key={hosp.name}
                  onClick={() => {
                    setSelectedHub(hosp.hub);
                    if (hosp.nodeId) {
                      setSelectedSourceId(hosp.nodeId);
                    }
                  }}
                  className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-emerald-600/60 cursor-pointer transition-all space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 text-xs truncate max-w-[200px]">
                      {hosp.name}
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
                      {hosp.trauma}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>{hosp.beds} Beds</span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Phone className="w-2.5 h-2.5" />
                      {hosp.phone}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Emergency Traffic Map */}
        <div className="flex-1 h-full p-3 bg-[#0B0F19]">
          <EmergencyTrafficMap
            selectedHubKey={selectedHub}
            routeResult={routeResult}
            onSelectEntity={setSelectedEntity}
            mapSelectionMode={mapSelectionMode}
            onSelectEndpointFromMap={handleSelectEndpointFromMap}
            roadConditions={roadConditions}
          />
        </div>
      </main>
    </div>
  );
};
