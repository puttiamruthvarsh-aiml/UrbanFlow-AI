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
  TrendingDown
} from 'lucide-react';

import { 
  calculateDynamicRoute, 
  DynamicRouteResult 
} from '../services/routingService';
import { fetchDemoState } from '../services/demoApi';

const POPULAR_LOCATIONS = [
  { label: 'Cyber Towers (Hitech City)', value: 'Cyber Towers Junction' },
  { label: 'Clock Tower (Secunderabad)', value: 'Clock Tower, Secunderabad' },
  { label: 'Gachibowli Junction', value: 'Gachibowli Flyover Junction' },
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
  const [endPoint, setEndPoint] = useState<string>('Clock Tower, Secunderabad');
  const [selectedEntity, setSelectedEntity] = useState<SelectedMapEntity>(null);

  // Routing State
  const [algorithm, setAlgorithm] = useState<'a_star' | 'dijkstra'>('a_star');
  const [preference, setPreference] = useState<'time' | 'distance'>('time');
  const [routeResult, setRouteResult] = useState<DynamicRouteResult | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [routingError, setRoutingError] = useState<string | null>(null);

  // Shared Demo State & Dynamic Recalculation
  const [roadConditions, setRoadConditions] = useState<Record<string, { status: 'BLOCKED' | 'CONGESTED'; incident_id: string }>>({});
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [rerouteNotice, setRerouteNotice] = useState<string | null>(null);

  const routeResultRef = useRef(routeResult);
  routeResultRef.current = routeResult;

  // Compute Route
  const handleCalculateRoute = useCallback(async () => {
    if (!startPoint || !endPoint) return;

    setIsCalculating(true);
    setRoutingError(null);
    setRerouteNotice(null);

    try {
      const result = await calculateDynamicRoute({
        source: startPoint,
        destination: endPoint,
        algorithm,
        preference,
        include_alternative: true
      });

      setRouteResult(result);

      if (result.avoided_blocked_roads && result.avoided_blocked_roads.length > 0) {
        setRerouteNotice(`Avoided ${result.avoided_blocked_roads.length} blocked road segment(s) along nominal path.`);
      }
    } catch (err: any) {
      setRoutingError(err.message || 'Failed to calculate dynamic route.');
    } finally {
      setIsCalculating(false);
    }
  }, [startPoint, endPoint, algorithm, preference]);

  // Initial Route Calculation on Mount
  useEffect(() => {
    handleCalculateRoute();
  }, []);

  // Poll Shared Simulation State & Automatically Recalculate If Route is Affected
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

          // If a route is already computed, auto-recalculate to react to real-time incident changes
          if (routeResultRef.current && routeResultRef.current.status === 'success') {
            console.log('Incident state changed in shared backend. Recalculating user trip route...');
            const updated = await calculateDynamicRoute({
              source: startPoint,
              destination: endPoint,
              algorithm,
              preference,
              include_alternative: true
            });

            if (active) {
              setRouteResult(updated);
              if (updated.avoided_blocked_roads && updated.avoided_blocked_roads.length > 0) {
                setRerouteNotice(`Route dynamically updated! Rerouted around active blockage: ${updated.avoided_blocked_roads[0]}`);
              } else {
                setRerouteNotice('Route refreshed with latest traffic flow conditions.');
              }
            }
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
  }, [roadConditions, lastUpdated, startPoint, endPoint, algorithm, preference]);

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
        <div className="w-full xl:w-[410px] bg-[#0E1526]/95 border-r border-slate-800/80 p-4 overflow-y-auto space-y-4 shrink-0">
          
          {/* Trip Planning Box */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-mono uppercase tracking-wider">
                <Navigation className="w-4 h-4 text-blue-400" />
                Dynamic Trip Planner
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-semibold flex items-center gap-1">
                <Zap className="w-2.5 h-2.5 text-cyan-400" />
                A* / DIJKSTRA
              </span>
            </div>

            {/* Inputs */}
            <div className="space-y-2 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1 font-mono flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    Start Location (Origin)
                  </span>
                  <span className="text-[9px] text-slate-500">Node or Area</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={startPoint}
                    onChange={(e) => setStartPoint(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-blue-500 font-medium"
                    placeholder="Enter origin junction..."
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
                  className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                  title="Swap endpoints"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 rotate-90" />
                </button>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1 font-mono flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-400"></span>
                    Destination Location
                  </span>
                  <span className="text-[9px] text-slate-500">Node or Area</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={endPoint}
                    onChange={(e) => setEndPoint(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-blue-500 font-medium"
                    placeholder="Enter destination junction..."
                  />
                  <MapPin className="w-3.5 h-3.5 text-red-400 absolute right-3 top-2.5" />
                </div>
              </div>
            </div>

            {/* Pathfinding Configuration Toggles */}
            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] font-mono">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Algorithm</label>
                <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-950 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setAlgorithm('a_star')}
                    className={`py-1 text-center rounded transition-colors text-[10px] font-bold ${
                      algorithm === 'a_star' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    A*
                  </button>
                  <button
                    onClick={() => setAlgorithm('dijkstra')}
                    className={`py-1 text-center rounded transition-colors text-[10px] font-bold ${
                      algorithm === 'dijkstra' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Dijkstra
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Goal</label>
                <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-950 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setPreference('time')}
                    className={`py-1 text-center rounded transition-colors text-[10px] font-bold ${
                      preference === 'time' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Fastest
                  </button>
                  <button
                    onClick={() => setPreference('distance')}
                    className={`py-1 text-center rounded transition-colors text-[10px] font-bold ${
                      preference === 'distance' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Shortest
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Destination Chips */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-slate-500 block">Popular Destinations:</span>
              <div className="flex flex-wrap gap-1">
                {POPULAR_LOCATIONS.slice(0, 4).map((loc, idx) => (
                  <button
                    key={idx}
                    onClick={() => setEndPoint(loc.value)}
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
              onClick={handleCalculateRoute}
              disabled={isCalculating}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 font-bold font-mono text-xs text-white shadow-lg shadow-blue-950/40 flex items-center justify-center gap-2 transition-all"
            >
              {isCalculating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Computing Optimal Dynamic Route...</span>
                </>
              ) : (
                <>
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Calculate Dynamic Route</span>
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

          {/* Route Performance Metrics Card */}
          {routeResult && routeResult.status === 'success' && (
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 text-xs shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-slate-200 font-mono uppercase text-[11px] flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  Trip Metrics
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-semibold uppercase">
                  {routeResult.algorithm_used}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] font-mono text-slate-400 block">Est. Time</span>
                  <span className="text-lg font-black font-mono text-cyan-400">
                    {routeResult.estimated_time_min} <span className="text-xs font-normal">min</span>
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] font-mono text-slate-400 block">Distance</span>
                  <span className="text-lg font-black font-mono text-white">
                    {routeResult.total_distance_km} <span className="text-xs font-normal">km</span>
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] font-mono text-slate-400 block">Delay</span>
                  <span className={`text-lg font-black font-mono ${routeResult.incident_delay_min > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    +{routeResult.incident_delay_min} <span className="text-xs font-normal">min</span>
                  </span>
                </div>
              </div>

              {/* Blocked Road Avoidance Tag */}
              {routeResult.avoided_blocked_roads && routeResult.avoided_blocked_roads.length > 0 && (
                <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-900/60 text-red-200 text-[11px] space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                    Avoided Active Incidents:
                  </div>
                  <div className="font-mono text-[10px] text-slate-300 pl-4.5">
                    {routeResult.avoided_blocked_roads.map((r, i) => (
                      <span key={i} className="inline-block bg-red-950 px-1.5 py-0.5 rounded mr-1 mb-1 border border-red-800 text-red-300">
                        ⛔ {r}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Alternative Route Detour Comparison */}
              {routeResult.alternative_route && (
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span className="text-slate-300 font-semibold">Alternative Detour Option:</span>
                    <span>+{routeResult.alternative_route.difference_time_min} min</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-snug">
                    {routeResult.alternative_route.description} ({routeResult.alternative_route.total_distance_km} km)
                  </p>
                </div>
              )}

              {/* Turn-by-Turn Directions Snippet */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                  Route Path ({routeResult.steps?.length || 0} segments):
                </span>
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1 font-mono text-[10px]">
                  {routeResult.steps?.map((step) => (
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
        </div>

        {/* Right Side: Central Hyderabad Map */}
        <div className="flex-1 h-full p-3 bg-[#0B0F19]">
          <CentralTrafficMap
            currentRole="USER"
            selectedHubKey={selectedHub}
            onSelectEntity={setSelectedEntity}
            roadConditions={roadConditions}
            routeGeoJSON={routeResult?.geojson}
          />
        </div>
      </main>
    </div>
  );
};
