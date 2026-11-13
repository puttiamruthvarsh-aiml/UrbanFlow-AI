import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '../components/Navigation/Sidebar';
import { CentralTrafficMap } from '../components/Map/CentralTrafficMap';
import { SelectedMapEntity } from '../types/network';
import { 
  Sliders, 
  Activity, 
  Radio, 
  Layers, 
  Compass, 
  ShieldAlert, 
  Video, 
  FileText, 
  CheckCircle2, 
  AlertTriangle,
  Flame,
  Cross,
  Navigation,
  Database,
  AlertOctagon,
  Car,
  RotateCcw,
  RefreshCw,
  Zap,
  Check
} from 'lucide-react';

import metadata from '../data/metadata.json';
import emergencyData from '../data/emergency_locations.json';
import trafficSignalsData from '../data/traffic_signals.json';
import roadsGeoJSON from '../data/hyderabad_roads.json';

import { DemoState, DemoIncident } from '../types/incident';
import { fetchDemoState, createIncident, resolveIncident } from '../services/demoApi';
import { IncidentSimulationPanel } from '../components/Admin/IncidentSimulationPanel';
import { IncidentList } from '../components/Admin/IncidentList';

type DrawerTab = 'simulation' | 'incidents' | 'kpis';

export const AdminDashboard: React.FC = () => {
  const [activeNav, setActiveNav] = useState<string>('live_map');
  const [selectedHub, setSelectedHub] = useState<string>('all');
  const [selectedEntity, setSelectedEntity] = useState<SelectedMapEntity>(null);
  const [selectedRoadId, setSelectedRoadId] = useState<string | null>(null);

  // Shared Demo Simulation State
  const [demoState, setDemoState] = useState<DemoState | null>(null);
  const [isLoadingState, setIsLoadingState] = useState<boolean>(false);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('simulation');
  const [quickActionLoading, setQuickActionLoading] = useState<boolean>(false);
  const [quickFeedback, setQuickFeedback] = useState<string | null>(null);

  // Synchronize drawer tab when sidebar navigation changes
  useEffect(() => {
    if (activeNav === 'incidents') {
      setDrawerTab('incidents');
    } else if (activeNav === 'road_control') {
      setDrawerTab('simulation');
    } else if (activeNav === 'overview' || activeNav === 'analytics') {
      setDrawerTab('kpis');
    }
  }, [activeNav]);

  // Load demo state from backend API
  const loadDemoState = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoadingState(true);
    try {
      const state = await fetchDemoState();
      setDemoState(state);
    } catch (err) {
      console.error('Error fetching demo simulation state:', err);
    } finally {
      if (showLoading) setIsLoadingState(false);
    }
  }, []);

  // Poll demo state periodically (every 4 seconds) to stay synchronized across dashboards
  useEffect(() => {
    loadDemoState(true);
    const interval = setInterval(() => {
      loadDemoState(false);
    }, 4000);

    return () => clearInterval(interval);
  }, [loadDemoState]);

  // When user clicks a road on the map, update selectedRoadId
  const handleSelectMapEntity = (entity: SelectedMapEntity) => {
    setSelectedEntity(entity);
    if (entity && entity.type === 'road') {
      setSelectedRoadId(entity.data.id);
    }
  };

  // When user chooses a road from dropdown or list, sync selection
  const handleSelectRoad = (roadId: string) => {
    setSelectedRoadId(roadId);

    // Also look up entity in roadsGeoJSON to populate segment inspector
    const features = (roadsGeoJSON as any)?.features || [];
    const match = features.find((f: any) => f.properties.id === roadId);
    if (match) {
      setSelectedEntity({
        type: 'road',
        data: match.properties
      });
    }
  };

  // Quick 1-click trigger from the Segment State card
  const handleQuickTrigger = async (type: 'ACCIDENT' | 'ROAD_BLOCKAGE' | 'CONGESTION', severity: 'HIGH' | 'MEDIUM') => {
    if (!selectedRoadId) return;

    setQuickActionLoading(true);
    setQuickFeedback(null);
    try {
      const desc = type === 'ACCIDENT' 
        ? 'High-impact collision reported on segment' 
        : type === 'ROAD_BLOCKAGE' 
        ? 'Emergency road blockage initiated by Network Admin'
        : 'Severe congestion bottleneck triggered';

      await createIncident({
        road_id: selectedRoadId,
        incident_type: type,
        severity,
        description: desc
      });

      setQuickFeedback(`Triggered ${type} (${severity}) on ${selectedRoadId}`);
      await loadDemoState();
      setTimeout(() => setQuickFeedback(null), 4000);
    } catch (err: any) {
      setQuickFeedback(err.message || 'Failed to trigger incident');
    } finally {
      setQuickActionLoading(false);
    }
  };

  // Quick 1-click resolve for currently selected road
  const handleQuickResolveCurrentRoad = async (incidentId: string) => {
    setQuickActionLoading(true);
    try {
      await resolveIncident(incidentId);
      setQuickFeedback('Incident resolved and road unblocked!');
      await loadDemoState();
      setTimeout(() => setQuickFeedback(null), 4000);
    } catch (err: any) {
      setQuickFeedback(err.message || 'Failed to resolve incident');
    } finally {
      setQuickActionLoading(false);
    }
  };

  const totalRoadSegments = (roadsGeoJSON as any)?.features?.length || metadata?.total_unique_road_segments || 64;
  const totalNodes = metadata?.total_nodes || 56;
  const totalEdges = metadata?.total_directed_edges || 126;
  const totalSignals = (trafficSignalsData as any)?.length || 20;
  const totalHospitals = (emergencyData as any)?.hospitals?.length || 14;
  const totalPolice = (emergencyData as any)?.police_stations?.length || 12;
  const totalFire = (emergencyData as any)?.fire_stations?.length || 9;

  const kpis = [
    { label: 'Physical Road Segments', value: `${totalRoadSegments}`, color: 'text-cyan-400', sub: '30 Pri, 13 Trk, 13 Sec, 8 Mot' },
    { label: 'Directed Graph Edges', value: `${totalEdges}`, color: 'text-emerald-400', sub: '60 Pri, 26 Trk, 24 Sec, 16 Mot' },
    { label: 'Intersection Nodes', value: `${totalNodes}`, color: 'text-blue-400', sub: 'WGS84 Coordinates' },
    { label: 'Mapped Traffic Signals', value: `${totalSignals}`, color: 'text-amber-400', sub: 'OSM Verified Locations' },
    { label: 'Emergency Hospitals', value: `${totalHospitals}`, color: 'text-emerald-400', sub: 'Level 1 & 2 Trauma' },
    { label: 'Police & Fire Stations', value: `${totalPolice + totalFire}`, color: 'text-indigo-400', sub: `${totalPolice} Police, ${totalFire} Fire` }
  ];

  const activeIncidentsCount = demoState?.incidents.filter(i => i.status === 'ACTIVE').length || 0;
  const activeIncidentOnSelectedRoad = selectedRoadId 
    ? demoState?.incidents.find(i => i.road_id === selectedRoadId && i.status === 'ACTIVE')
    : null;
  const selectedRoadCondition = selectedRoadId && demoState?.road_conditions 
    ? demoState.road_conditions[selectedRoadId] 
    : null;

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden select-none">
      {/* Role Sidebar */}
      <Sidebar
        currentRole="ADMIN"
        activeNav={activeNav}
        onSelectNav={setActiveNav}
        onFlyToHub={setSelectedHub}
      />

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col xl:flex-row overflow-hidden relative">
        {/* Left Side: Admin Supervisor Drawer */}
        <div className="w-full xl:w-[410px] bg-[#0E1526]/95 border-r border-slate-800/80 p-4 overflow-y-auto space-y-4 shrink-0">
          
          {/* Drawer View Switcher Tabs */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950/90 rounded-2xl border border-slate-800 text-[11px] font-mono">
            <button
              onClick={() => setDrawerTab('simulation')}
              className={`py-2 px-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                drawerTab === 'simulation'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-950/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-cyan-200" />
              <span>Simulate</span>
            </button>

            <button
              onClick={() => setDrawerTab('incidents')}
              className={`py-2 px-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 relative ${
                drawerTab === 'incidents'
                  ? 'bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md shadow-red-950/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <AlertOctagon className="w-3.5 h-3.5 text-red-200" />
              <span>Incidents</span>
              {activeIncidentsCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-red-400 text-slate-950 text-[9px] font-black flex items-center justify-center">
                  {activeIncidentsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setDrawerTab('kpis')}
              className={`py-2 px-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                drawerTab === 'kpis'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-950/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-purple-200" />
              <span>Network</span>
            </button>
          </div>

          {/* TAB 1: Incident Simulation Console */}
          {drawerTab === 'simulation' && (
            <div className="space-y-4">
              <IncidentSimulationPanel
                demoState={demoState}
                selectedRoadId={selectedRoadId}
                onSelectRoad={handleSelectRoad}
                onIncidentCreated={() => loadDemoState(false)}
                onSimulationReset={() => loadDemoState(false)}
                onRefresh={() => loadDemoState(true)}
                isLoading={isLoadingState}
              />
            </div>
          )}

          {/* TAB 2: Live Incident Feed & Resolution */}
          {drawerTab === 'incidents' && (
            <div className="space-y-4">
              <IncidentList
                demoState={demoState}
                onIncidentResolved={() => loadDemoState(false)}
                onSelectRoad={handleSelectRoad}
                isLoading={isLoadingState}
              />
            </div>
          )}

          {/* TAB 3: Network KPIs & Validation Status */}
          {drawerTab === 'kpis' && (
            <div className="space-y-4">
              {/* Admin KPI Summary */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-purple-900/40 space-y-3 shadow-lg shadow-purple-950/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5 font-mono uppercase tracking-wider">
                    <Sliders className="w-4 h-4 text-purple-400" />
                    Network Supervisors Console
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-semibold">
                    STEP 1 ACTIVE
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {kpis.map((kpi, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
                      <span className="text-[10px] text-slate-400 block font-mono">{kpi.label}</span>
                      <span className={`text-lg font-black font-mono ${kpi.color}`}>{kpi.value}</span>
                      <span className="text-[9px] text-slate-400 block">{kpi.sub}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Graph Validation & Data Artifacts */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-mono uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Graph Validation Status
                </span>
                <div className="space-y-1 text-slate-300 font-mono text-[11px]">
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">Weakly Connected:</span>
                    <span className="text-emerald-400 font-bold">TRUE (1 Component)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">Strongly Connected:</span>
                    <span className="text-emerald-400 font-bold">TRUE (1 Component)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/80">
                    <span className="text-slate-400">Average Node Degree:</span>
                    <span className="text-cyan-400 font-bold">4.50 Links/Node</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Network Length:</span>
                    <span className="text-white font-bold">377.92 km</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Road Segment Control & Graph Inspector (Always visible on drawer bottom) */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-mono uppercase tracking-wider">
                <Database className="w-4 h-4 text-cyan-400" />
                Selected Segment State
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {selectedEntity && selectedEntity.type === 'road' ? 'Active Target' : 'Click road on map'}
              </span>
            </div>

            {selectedEntity && selectedEntity.type === 'road' ? (
              <div className="space-y-2.5 p-3 rounded-xl bg-slate-950 border border-cyan-800/60 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-bold text-cyan-300 text-sm leading-tight">{selectedEntity.data.name}</div>
                  {selectedRoadCondition ? (
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                      selectedRoadCondition.status === 'BLOCKED'
                        ? 'bg-red-950 text-red-400 border border-red-800 animate-pulse'
                        : 'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}>
                      {selectedRoadCondition.status}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 bg-emerald-950 text-emerald-400 border border-emerald-800">
                      NOMINAL
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono text-slate-300">
                  <div>Classification: <span className="text-white uppercase">{selectedEntity.data.highway}</span></div>
                  <div>Length: <span className="text-white">{selectedEntity.data.length_m} m</span></div>
                  <div>Lanes: <span className="text-white">{selectedEntity.data.lanes}</span></div>
                  <div>Speed: <span className="text-amber-400">{selectedEntity.data.base_speed_kmh} km/h</span></div>
                  <div>One-Way: <span className="text-white">{selectedEntity.data.one_way ? 'Yes' : 'No'}</span></div>
                  <div>OSM Way: <span className="text-slate-400">{selectedEntity.data.osm_way_id}</span></div>
                </div>

                {/* Quick Feedback Toast */}
                {quickFeedback && (
                  <div className="p-2 rounded-lg bg-slate-900 border border-cyan-800 text-[10px] font-mono text-cyan-300 flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-cyan-400" />
                    <span>{quickFeedback}</span>
                  </div>
                )}

                {/* Dynamic Road Incident Control Actions */}
                <div className="pt-2 border-t border-slate-800 space-y-1.5">
                  <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>1-Click Segment Injection:</span>
                    {quickActionLoading && <RefreshCw className="w-2.5 h-2.5 animate-spin text-cyan-400" />}
                  </div>

                  {activeIncidentOnSelectedRoad ? (
                    <div className="space-y-1.5">
                      <div className="p-2 rounded-lg bg-red-950/50 border border-red-900/60 text-[11px] text-red-200">
                        <div className="font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                          Active Incident on this Road ({activeIncidentOnSelectedRoad.type})
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">{activeIncidentOnSelectedRoad.description}</div>
                      </div>
                      <button
                        onClick={() => handleQuickResolveCurrentRoad(activeIncidentOnSelectedRoad.incident_id)}
                        disabled={quickActionLoading}
                        className="w-full py-1.5 px-2 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-[11px] font-mono font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Resolve &amp; Unblock Road
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => handleQuickTrigger('ACCIDENT', 'HIGH')}
                        disabled={quickActionLoading}
                        className="py-1.5 px-2 rounded-lg bg-red-950/80 border border-red-800/80 text-red-300 text-[10px] font-mono font-bold hover:bg-red-900/80 transition-colors flex items-center justify-center gap-1"
                      >
                        <Car className="w-3 h-3 text-red-400" />
                        Crash (High)
                      </button>

                      <button 
                        onClick={() => handleQuickTrigger('ROAD_BLOCKAGE', 'HIGH')}
                        disabled={quickActionLoading}
                        className="py-1.5 px-2 rounded-lg bg-amber-950/80 border border-amber-800/80 text-amber-300 text-[10px] font-mono font-bold hover:bg-amber-900/80 transition-colors flex items-center justify-center gap-1"
                      >
                        <ShieldAlert className="w-3 h-3 text-amber-400" />
                        Block Road
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400 space-y-1">
                <Navigation className="w-6 h-6 text-slate-600 mx-auto mb-1" />
                <p className="font-medium text-slate-300">No Road Segment Selected</p>
                <p className="text-[11px] text-slate-400">Click any road line on the map to inspect its topology, or pick from the Simulate form.</p>
              </div>
            )}
          </div>

        </div>

        {/* Right Side: Central Hyderabad Map */}
        <div className="flex-1 h-full p-3 bg-[#0B0F19]">
          <CentralTrafficMap
            currentRole="ADMIN"
            selectedHubKey={selectedHub}
            onSelectEntity={handleSelectMapEntity}
          />
        </div>
      </main>
    </div>
  );
};
