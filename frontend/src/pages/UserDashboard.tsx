import React, { useState } from 'react';
import { Sidebar } from '../components/Navigation/Sidebar';
import { CentralTrafficMap } from '../components/Map/CentralTrafficMap';
import { SelectedMapEntity } from '../types/network';
import metadata from '../data/metadata.json';
import trafficSignalsData from '../data/traffic_signals.json';
import { 
  Navigation, 
  MapPin, 
  Compass, 
  Car, 
  Activity, 
  Info, 
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRightLeft,
  Search,
  CheckCircle2
} from 'lucide-react';

export const UserDashboard: React.FC = () => {
  const [activeNav, setActiveNav] = useState<string>('live_map');
  const [selectedHub, setSelectedHub] = useState<string>('all');
  const [startPoint, setStartPoint] = useState<string>('Cyber Towers, Hitech City');
  const [endPoint, setEndPoint] = useState<string>('Clock Tower, Secunderabad');
  const [selectedEntity, setSelectedEntity] = useState<SelectedMapEntity>(null);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden select-none">
      {/* Role Sidebar */}
      <Sidebar
        currentRole="USER"
        activeNav={activeNav}
        onSelectNav={setActiveNav}
        onFlyToHub={setSelectedHub}
      />

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col xl:flex-row overflow-hidden relative">
        {/* Left Side: Planning / Info Card Drawer (Desktop) */}
        <div className="w-full xl:w-96 bg-[#0E1526]/95 border-r border-slate-800/80 p-4 overflow-y-auto space-y-4 shrink-0">
          {/* Trip Planning Box */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-mono uppercase tracking-wider">
                <Navigation className="w-4 h-4 text-blue-400" />
                Plan City Trip
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-semibold">
                STEP 1 NET
              </span>
            </div>

            {/* Inputs */}
            <div className="space-y-2 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1 font-mono flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  Start Location (Snaps to Node)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={startPoint}
                    onChange={(e) => setStartPoint(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-blue-500 font-medium"
                    placeholder="Click on map or search..."
                  />
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 absolute right-3 top-2.5" />
                </div>
              </div>

              <div className="flex justify-center -my-1">
                <button 
                  onClick={() => {
                    const temp = startPoint;
                    setStartPoint(endPoint);
                    setEndPoint(temp);
                  }}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                  title="Swap endpoints"
                >
                  <ArrowRightLeft className="w-3 h-3 rotate-90" />
                </button>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1 font-mono flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-400"></span>
                  Destination Location (Snaps to Node)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={endPoint}
                    onChange={(e) => setEndPoint(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-blue-500 font-medium"
                    placeholder="Click on map or search..."
                  />
                  <MapPin className="w-3.5 h-3.5 text-red-400 absolute right-3 top-2.5" />
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-900/60 text-[11px] text-slate-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-blue-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                Road Graph Foundation Loaded
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Road connectivity, one-way restrictions, speed limits, and traffic signals are ready.
                Dijkstra &amp; A* path routing will be activated in Step 5.
              </p>
            </div>
          </div>

          {/* Quick Hub Focus Selector */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-mono uppercase tracking-wider">
              <Compass className="w-4 h-4 text-cyan-400" />
              Focus On Hub
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {[
                { key: 'hitech', label: 'Hitech City' },
                { key: 'madhapur', label: 'Madhapur' },
                { key: 'gachibowli', label: 'Gachibowli' },
                { key: 'jubilee', label: 'Jubilee Hills' },
                { key: 'banjara', label: 'Banjara Hills' },
                { key: 'ameerpet', label: 'Ameerpet' },
                { key: 'secunderabad', label: 'Secunderabad' },
                { key: 'uppal', label: 'Uppal' },
                { key: 'lbnagar', label: 'LB Nagar' },
                { key: 'all', label: 'Whole City' }
              ].map((hub) => (
                <button
                  key={hub.key}
                  onClick={() => setSelectedHub(hub.key)}
                  className={`px-2.5 py-1.5 rounded-lg text-left font-medium transition-all text-xs truncate ${
                    selectedHub === hub.key
                      ? 'bg-blue-600/90 text-white shadow-sm'
                      : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800/80'
                  }`}
                >
                  {hub.label}
                </button>
              ))}
            </div>
          </div>

          {/* Network Details Card */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-mono uppercase tracking-wider">
              <Activity className="w-4 h-4 text-emerald-400" />
              Real Road Network Stats
            </span>
            <div className="space-y-1 text-slate-300 font-mono text-[11px]">
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Total Roads:</span>
                <span className="text-cyan-400 font-bold">{metadata.total_unique_road_segments} Segments</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Total Nodes:</span>
                <span className="text-blue-400 font-bold">{metadata.total_nodes} Intersections</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Directed Edges:</span>
                <span className="text-emerald-400 font-bold">{metadata.total_directed_edges} Edges</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Traffic Signals:</span>
                <span className="text-amber-400 font-bold">{trafficSignalsData.length} Signals Mapped</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Central Hyderabad Map */}
        <div className="flex-1 h-full p-3 bg-[#0B0F19]">
          <CentralTrafficMap
            currentRole="USER"
            selectedHubKey={selectedHub}
            onSelectEntity={setSelectedEntity}
          />
        </div>
      </main>
    </div>
  );
};
