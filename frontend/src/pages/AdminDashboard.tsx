import React, { useState } from 'react';
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
  Database
} from 'lucide-react';

import metadata from '../data/metadata.json';
import emergencyData from '../data/emergency_locations.json';
import trafficSignalsData from '../data/traffic_signals.json';
import roadsGeoJSON from '../data/hyderabad_roads.json';

export const AdminDashboard: React.FC = () => {
  const [activeNav, setActiveNav] = useState<string>('live_map');
  const [selectedHub, setSelectedHub] = useState<string>('all');
  const [selectedEntity, setSelectedEntity] = useState<SelectedMapEntity>(null);

  const totalRoadSegments = (roadsGeoJSON as any)?.features?.length || metadata?.total_unique_road_segments || 64;
  const totalNodes = metadata?.total_nodes || 56;
  const totalEdges = metadata?.total_directed_edges || 126;
  const totalSignals = (trafficSignalsData as any)?.length || 20;
  const totalHospitals = (emergencyData as any)?.hospitals?.length || 14;
  const totalPolice = (emergencyData as any)?.police_stations?.length || 12;
  const totalFire = (emergencyData as any)?.fire_stations?.length || 9;
  const networkLengthKm = metadata?.total_network_length_km || 377.92;

  const kpis = [
    { label: 'Physical Road Segments', value: `${totalRoadSegments}`, color: 'text-cyan-400', sub: '30 Pri, 13 Trk, 13 Sec, 8 Mot' },
    { label: 'Directed Graph Edges', value: `${totalEdges}`, color: 'text-emerald-400', sub: '60 Pri, 26 Trk, 24 Sec, 16 Mot' },
    { label: 'Intersection Nodes', value: `${totalNodes}`, color: 'text-blue-400', sub: 'WGS84 Coordinates' },
    { label: 'Mapped Traffic Signals', value: `${totalSignals}`, color: 'text-amber-400', sub: 'OSM Verified Locations' },
    { label: 'Emergency Hospitals', value: `${totalHospitals}`, color: 'text-emerald-400', sub: 'Level 1 & 2 Trauma' },
    { label: 'Police & Fire Stations', value: `${totalPolice + totalFire}`, color: 'text-indigo-400', sub: `${totalPolice} Police, ${totalFire} Fire` }
  ];

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
        <div className="w-full xl:w-96 bg-[#0E1526]/95 border-r border-slate-800/80 p-4 overflow-y-auto space-y-4 shrink-0">
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

          {/* Road Segment Control & Graph Inspector */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-mono uppercase tracking-wider">
                <Database className="w-4 h-4 text-cyan-400" />
                Selected Segment State
              </span>
              <span className="text-[10px] font-mono text-slate-400">Click road on map</span>
            </div>

            {selectedEntity && selectedEntity.type === 'road' ? (
              <div className="space-y-2 p-3 rounded-xl bg-slate-950 border border-cyan-800/60 text-xs">
                <div className="font-bold text-cyan-300 text-sm">{selectedEntity.data.name}</div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono text-slate-300">
                  <div>Classification: <span className="text-white uppercase">{selectedEntity.data.highway}</span></div>
                  <div>Length: <span className="text-white">{selectedEntity.data.length_m} m</span></div>
                  <div>Lanes: <span className="text-white">{selectedEntity.data.lanes}</span></div>
                  <div>Speed: <span className="text-amber-400">{selectedEntity.data.base_speed_kmh} km/h</span></div>
                  <div>One-Way: <span className="text-white">{selectedEntity.data.one_way ? 'Yes' : 'No'}</span></div>
                  <div>OSM Way: <span className="text-slate-400">{selectedEntity.data.osm_way_id}</span></div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex gap-2">
                  <button className="flex-1 py-1.5 px-2 rounded bg-red-950/80 border border-red-800/80 text-red-300 text-[10px] font-mono font-bold hover:bg-red-900/80 transition-colors">
                    Block Segment (Step 5)
                  </button>
                  <button className="flex-1 py-1.5 px-2 rounded bg-amber-950/80 border border-amber-800/80 text-amber-300 text-[10px] font-mono font-bold hover:bg-amber-900/80 transition-colors">
                    Out of Usage
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400 space-y-1">
                <Navigation className="w-6 h-6 text-slate-600 mx-auto mb-1" />
                <p className="font-medium text-slate-300">No Road Segment Selected</p>
                <p className="text-[11px] text-slate-400">Click any road line on the map to inspect its topology, lane count, and speed attributes.</p>
              </div>
            )}
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

        {/* Right Side: Central Hyderabad Map */}
        <div className="flex-1 h-full p-3 bg-[#0B0F19]">
          <CentralTrafficMap
            currentRole="ADMIN"
            selectedHubKey={selectedHub}
            onSelectEntity={setSelectedEntity}
          />
        </div>
      </main>
    </div>
  );
};
