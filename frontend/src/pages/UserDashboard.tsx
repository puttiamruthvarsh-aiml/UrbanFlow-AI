import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  CheckCircle2,
  Sliders,
  ShieldAlert,
  RefreshCw,
  Zap,
  ArrowRight,
  TrendingDown,
  Gauge,
  Milestone
} from 'lucide-react';

import { 
  calculateDynamicRoute, 
  DynamicRouteResult 
} from '../services/routingService';
import { fetchDemoState } from '../services/demoApi';

const POPULAR_LOCATIONS = [
  { label: 'Cyber Towers (Hitech City)', value: 'Cyber Towers Junction' },
  { label: 'Secunderabad Clock Tower', value: 'Secunderabad Clock Tower Junction' },
  { label: 'Gachibowli Flyover', value: 'Gachibowli Flyover Junction' },
  { label: 'Jubilee Hills Checkpost', value: 'Jubilee Hills Checkpost' },
  { label: 'Banjara Hills Road 1', value: 'Banjara Hills Road 1' },
  { label: 'Ameerpet Metro Junction', value: 'Ameerpet Metro Intersection' },
  { label: 'LB Nagar Ring Road', value: 'LB Nagar Ring Road' },
  { label: 'Uppal Ring Road', value: 'Uppal Ring Road' }
];

export const UserDashboard: React.FC = () => {
  const [activeNav, setActiveNav] = useState<string>('live_map');
  const [selectedHub, setSelectedHub] = useState<string>('all');
  const [startPoint, setStartPoint] = useState<string>('Cyber Towers Junction');
  const [endPoint, setEndPoint] = useState<string>('Secunderabad Clock Tower Junction');
  const [selectedEntity, setSelectedEntity] = useState<SelectedMapEntity>(null);

  // Map Click Selection Mode (Click 1 sets Start, Click 2 sets Destination)
  const [clickTargetMode, setClickTargetMode] = useState<'start' | 'end'>('start');

  // Dual Route Computation (Fastest via A* vs Shortest via Dijkstra)
  const [fastestRoute, setFastestRoute] = useState<DynamicRouteResult | null>(null);
  const [shortestRoute, setShortestRoute] = useState<DynamicRouteResult | null>(null);
  const [activeRouteTab, setActiveRouteTab] = useState<'fastest' | 'shortest'>('fastest');
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [routingError, setRoutingError] = useState<string | null>(null);

  // Shared Demo State & Dynamic Recalculation
  const [roadConditions, setRoadConditions] = useState<Record<string, { status: 'BLOCKED' | 'CONGESTED'; incident_id: string }>>({});
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [rerouteNotice, setRerouteNotice] = useState<string | null>(null);

  // Compute Both Fastest and Shortest Routes simultaneously
  const handleCalculateRoutes = useCallback(async (src?: string, dest?: string) => {
    const origin = (src || startPoint).trim();
    const destination = (dest || endPoint).trim();

    if (!origin || !destination) return;

    setIsCalculating(true);
    setRoutingError(null);
    setRerouteNotice(null);

    try {
      // 1. Calculate Fastest Route (Optimized for Time using A*)
      // 2. Calculate Shortest Route (Optimized for Distance using Dijkstra)
      const [fastestRes, shortestRes] = await Promise.all([
        calculateDynamicRoute({
          source: origin,
          destination: destination,
          algorithm: 'a_star',
          preference: 'time',
          include_alternative: true
        }),
        calculateDynamicRoute({
          source: origin,
          destination: destination,
          algorithm: 'dijkstra',
          preference: 'distance',
          include_alternative: false
        })
      ]);

      setFastestRoute(fastestRes);
      setShortestRoute(shortestRes);

      if (fastestRes.avoided_blocked_roads && fastestRes.avoided_blocked_roads.length > 0) {
        setRerouteNotice(`Rerouted: Avoided ${fastestRes.avoided_blocked_roads.length} active road blockage(s) along nominal path.`);
      }
    } catch (err: any) {
      setRoutingError(err.message || 'Failed to calculate routes.');
    } finally {
      setIsCalculating(false);
    }
  }, [startPoint, endPoint]);

  // Initial Calculation on Mount
  useEffect(() => {
    handleCalculateRoutes();
  }, []);

  // Map Click: Click 2 places to set start and destination directly!
  const handleMapEntityClick = (entity: SelectedMapEntity) => {
    setSelectedEntity(entity);
    if (!entity) return;

    let locationName = '';
    if (entity.type === 'junction') {
      locationName = entity.data.name;
    } else if (entity.type === 'road') {
      locationName = entity.data.from_name || entity.data.name;
    } else if (entity.type === 'signal') {
      locationName = entity.data.name || entity.data.junction_name;
    } else if (entity.type === 'emergency') {
      locationName = entity.data.name;
    }

    if (!locationName) return;

    if (clickTargetMode === 'start') {
      setStartPoint(locationName);
      setClickTargetMode('end');
      // If destination already exists, recalculate immediately
      if (endPoint && endPoint !== locationName) {
        handleCalculateRoutes(locationName, endPoint);
      }
    } else {
      setEndPoint(locationName);
      setClickTargetMode('start');
      if (startPoint && startPoint !== locationName) {
        handleCalculateRoutes(startPoint, locationName);
      }
    }
  };

  // Poll Shared Simulation State & Automatically Recalculate If Route is Affected
  const activeRoute = activeRouteTab === 'fastest' ? fastestRoute : shortestRoute;
  const activeRouteRef = useRef(activeRoute);
  activeRouteRef.current = activeRoute;

  useEffect(() => {
    let active = true;

    const syncState = async () => {
      try {
        const state = await fetchDemoState();
        if (!active) return;

        const currentConditions = state.road_conditions || {};
        const conditionsChanged = JSON.stringify(currentConditions) !== JSON.stringify(roadConditions);

        setRoadConditions(currentConditions as any);

        if (conditionsChanged && state.last_updated !== lastUpdated) {
          setLastUpdated(state.last_updated);

          if (activeRouteRef.current && activeRouteRef.current.status === 'success') {
            console.log('Incident state changed in shared backend. Recalculating routes...');
            handleCalculateRoutes();
          }
        }
      } catch (err) {
        // silently handled
      }
    };

    syncState();
    const interval = setInterval(syncState, 4000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [roadConditions, lastUpdated, handleCalculateRoutes]);

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
        <div className="w-full xl:w-[420px] bg-[#0E1526]/95 border-r border-slate-800/80 p-4 overflow-y-auto space-y-4 shrink-0">
          
          {/* Trip Planning Box */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-mono uppercase tracking-wider">
                <Navigation className="w-4 h-4 text-blue-400" />
                Click 2 Places Trip Planner
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-semibold flex items-center gap-1">
                <Zap className="w-2.5 h-2.5 text-cyan-400" />
                A* &amp; DIJKSTRA
              </span>
            </div>

            {/* Click-on-Map Selection Indicator */}
            <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono">
              <span className="text-[10px] text-slate-400">Map Click Mode:</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setClickTargetMode('start')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                    clickTargetMode === 'start'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  🟢 1st Click (Start)
                </button>
                <button
                  type="button"
                  onClick={() => setClickTargetMode('end')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                    clickTargetMode === 'end'
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  🔴 2nd Click (Dest)
                </button>
              </div>
            </div>

            {/* Origin & Destination Inputs */}
            <div className="space-y-2 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1 font-mono flex items-center justify-between">
                  <span className="flex items-center gap-1 text-emerald-300 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    1. Start Location (Origin)
                  </span>
                  <span className="text-[9px] text-slate-500 font-normal">Click map or type</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={startPoint}
                    onChange={(e) => setStartPoint(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                    placeholder="Click on map or search origin..."
                  />
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 absolute right-3 top-2.5" />
                </div>
              </div>

              <div className="flex justify-center -my-1">
                <button 
                  type="button"
                  onClick={() => {
                    const temp = startPoint;
                    setStartPoint(endPoint);
                    setEndPoint(temp);
                    handleCalculateRoutes(endPoint, temp);
                  }}
                  className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                  title="Swap endpoints"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 rotate-90" />
                </button>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1 font-mono flex items-center justify-between">
                  <span className="flex items-center gap-1 text-red-300 font-bold">
                    <span className="w-2 h-2 rounded-full bg-red-400"></span>
                    2. Destination Location
                  </span>
                  <span className="text-[9px] text-slate-500 font-normal">Click map or type</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={endPoint}
                    onChange={(e) => setEndPoint(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-red-500 font-medium"
                    placeholder="Click on map or search destination..."
                  />
                  <MapPin className="w-3.5 h-3.5 text-red-400 absolute right-3 top-2.5" />
                </div>
              </div>
            </div>

            {/* Quick Location Chips */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-slate-500 block">Popular Hyderabad Hubs:</span>
              <div className="flex flex-wrap gap-1">
                {POPULAR_LOCATIONS.slice(0, 4).map((loc, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setEndPoint(loc.value);
                      handleCalculateRoutes(startPoint, loc.value);
                    }}
                    className="text-[9px] px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-slate-400 hover:text-cyan-300 hover:border-cyan-800 transition-colors"
                  >
                    {loc.label.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {routingError && (
              <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{routingError}</span>
              </div>
            )}

            {/* Calculate Button */}
            <button
              type="button"
              onClick={() => handleCalculateRoutes()}
              disabled={isCalculating}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 font-bold font-mono text-xs text-white shadow-lg shadow-blue-950/40 flex items-center justify-center gap-2 transition-all"
            >
              {isCalculating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Calculating Shortest &amp; Fastest Routes...</span>
                </>
              ) : (
                <>
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Compute Shortest &amp; Fastest Ways</span>
                </>
              )}
            </button>
          </div>

          {/* Reroute Alert Notification Banner */}
          {rerouteNotice && (
            <div className="p-3 rounded-2xl bg-cyan-950/60 border border-cyan-800/80 text-cyan-200 text-xs flex items-start gap-2 shadow-lg animate-in fade-in">
              <ShieldAlert className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div className="leading-tight text-[11px] font-mono">{rerouteNotice}</div>
            </div>
          )}

          {/* DUAL ROUTE COMPARISON (FASTEST vs SHORTEST) */}
          {(fastestRoute || shortestRoute) && (
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-slate-200 font-mono uppercase text-[11px] flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-cyan-400" />
                  Route Comparison
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Select view on map
                </span>
              </div>

              {/* Toggle Between Fastest and Shortest Route on Map */}
              <div className="grid grid-cols-2 gap-2">
                {/* 1. Fastest Route Card */}
                {fastestRoute && fastestRoute.status === 'success' && (
                  <button
                    type="button"
                    onClick={() => setActiveRouteTab('fastest')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      activeRouteTab === 'fastest'
                        ? 'bg-gradient-to-b from-cyan-950/80 to-blue-950/80 border-cyan-500 shadow-lg shadow-cyan-950/30'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold font-mono text-cyan-300 flex items-center gap-1">
                        <Zap className="w-3 h-3 text-cyan-400" />
                        FASTEST
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-semibold">
                        A*
                      </span>
                    </div>
                    <div className="text-xl font-black font-mono text-white">
                      {fastestRoute.estimated_time_min} <span className="text-xs font-normal text-slate-400">min</span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      {fastestRoute.total_distance_km} km • Min Time
                    </div>
                  </button>
                )}

                {/* 2. Shortest Route Card */}
                {shortestRoute && shortestRoute.status === 'success' && (
                  <button
                    type="button"
                    onClick={() => setActiveRouteTab('shortest')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      activeRouteTab === 'shortest'
                        ? 'bg-gradient-to-b from-emerald-950/80 to-slate-950/80 border-emerald-500 shadow-lg shadow-emerald-950/30'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold font-mono text-emerald-300 flex items-center gap-1">
                        <Milestone className="w-3 h-3 text-emerald-400" />
                        SHORTEST
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
                        DIJKSTRA
                      </span>
                    </div>
                    <div className="text-xl font-black font-mono text-white">
                      {shortestRoute.total_distance_km} <span className="text-xs font-normal text-slate-400">km</span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      {shortestRoute.estimated_time_min} min • Min Dist
                    </div>
                  </button>
                )}
              </div>

              {/* Active Route Details */}
              {activeRoute && activeRoute.status === 'success' && (
                <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                  {/* Avoided Incidents */}
                  {activeRoute.avoided_blocked_roads && activeRoute.avoided_blocked_roads.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-900/60 text-red-200 text-[11px] space-y-1">
                      <div className="font-bold flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                        Avoided Blocked Incident Roads:
                      </div>
                      <div className="font-mono text-[10px] text-slate-300">
                        {activeRoute.avoided_blocked_roads.map((r, i) => (
                          <span key={i} className="inline-block bg-red-950 px-1.5 py-0.5 rounded mr-1 mb-1 border border-red-800 text-red-300">
                            ⛔ {r}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step-by-Step Directions */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                      {activeRouteTab === 'fastest' ? '⚡ Fastest Way Steps' : '📏 Shortest Way Steps'} ({activeRoute.steps?.length || 0} segments):
                    </span>
                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1 font-mono text-[10px]">
                      {activeRoute.steps?.map((step) => (
                        <div key={step.step_number} className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-slate-300">
                          <div className="truncate mr-2">
                            <span className="text-cyan-400 mr-1.5">{step.step_number}.</span>
                            <span>{step.road_name}</span>
                          </div>
                          <span className="text-slate-500 shrink-0">{step.distance_m}m</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

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
                  type="button"
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
        </div>

        {/* Right Side: Central Hyderabad Map */}
        <div className="flex-1 h-full p-3 bg-[#0B0F19]">
          <CentralTrafficMap
            currentRole="USER"
            selectedHubKey={selectedHub}
            onSelectEntity={handleMapEntityClick}
            roadConditions={roadConditions}
            routeGeoJSON={activeRoute?.geojson}
          />
        </div>
      </main>
    </div>
  );
};
