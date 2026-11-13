import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from '../components/Navigation/Sidebar';
import { CentralTrafficMap, MapLocationSelection } from '../components/Map/CentralTrafficMap';
import { SelectedMapEntity } from '../types/network';
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
  CheckCircle2,
  ShieldAlert,
  RefreshCw,
  Zap,
  TrendingDown,
  Crosshair,
  Route as RouteIcon
} from 'lucide-react';

import { 
  calculateDynamicRoute, 
  DynamicRouteResult 
} from '../services/routingService';
import { fetchDemoState } from '../services/demoApi';

const POPULAR_LOCATIONS = [
  { label: 'Cyber Towers', value: 'Cyber Towers Junction' },
  { label: 'Secunderabad Clock Tower', value: 'Clock Tower, Secunderabad' },
  { label: 'Gachibowli Flyover', value: 'Gachibowli Flyover Junction' },
  { label: 'Jubilee Hills Checkpost', value: 'Jubilee Hills Checkpost' },
  { label: 'Banjara Hills Rd 1', value: 'Road No 1 Banjara Hills (Taj Krishna)' },
  { label: 'Ameerpet Metro', value: 'Ameerpet Metro Intersection' },
  { label: 'LB Nagar Ring Road', value: 'LB Nagar Ring Road' },
  { label: 'Uppal Ring Road', value: 'Uppal Ring Road' }
];

export const UserDashboard: React.FC = () => {
  const [activeNav, setActiveNav] = useState<string>('live_map');
  const [selectedHub, setSelectedHub] = useState<string>('all');
  const [startPoint, setStartPoint] = useState<string>('Cyber Towers Junction');
  const [endPoint, setEndPoint] = useState<string>('Clock Tower, Secunderabad');
  const [startCoords, setStartCoords] = useState<[number, number] | null>(null);
  const [endCoords, setEndCoords] = useState<[number, number] | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<SelectedMapEntity>(null);

  // Map Click Target Mode ('auto', 'start', 'dest')
  const [mapClickTarget, setMapClickTarget] = useState<'auto' | 'start' | 'dest'>('auto');
  const [mapClickHint, setMapClickHint] = useState<string | null>(null);

  // Dual Routing Results: Fastest (A*) and Shortest (Dijkstra)
  const [fastestRoute, setFastestRoute] = useState<DynamicRouteResult | null>(null);
  const [shortestRoute, setShortestRoute] = useState<DynamicRouteResult | null>(null);
  const [activeRouteType, setActiveRouteType] = useState<'fastest' | 'shortest'>('fastest');
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [routingError, setRoutingError] = useState<string | null>(null);

  // Shared Demo State & Dynamic Recalculation
  const [roadConditions, setRoadConditions] = useState<Record<string, { status: 'BLOCKED' | 'CONGESTED'; incident_id: string }>>({});
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [rerouteNotice, setRerouteNotice] = useState<string | null>(null);

  const fastestRouteRef = useRef(fastestRoute);
  fastestRouteRef.current = fastestRoute;
  const shortestRouteRef = useRef(shortestRoute);
  shortestRouteRef.current = shortestRoute;

  // Active route based on selected tab
  const activeRoute = activeRouteType === 'fastest' ? fastestRoute : shortestRoute;
  const secondaryRoute = activeRouteType === 'fastest' ? shortestRoute : fastestRoute;

  // Extract start and destination coordinates from GeoJSON if available
  const extractCoordsFromRoute = (route: DynamicRouteResult) => {
    try {
      const geo = route.geojson;
      if (geo) {
        const features = geo.type === 'FeatureCollection' ? geo.features : [geo];
        const lineFeat = features.find((f: any) => f.geometry?.type === 'LineString');
        if (lineFeat && lineFeat.geometry.coordinates?.length >= 2) {
          const coords = lineFeat.geometry.coordinates;
          return {
            start: coords[0] as [number, number],
            dest: coords[coords.length - 1] as [number, number]
          };
        }
      }
    } catch (e) {
      // ignore
    }
    return null;
  };

  // Compute Dual Routes: Fastest (A*, Time) and Shortest (Dijkstra, Distance)
  const handleCalculateRoutes = useCallback(async (sourceOverride?: string, destOverride?: string) => {
    const src = sourceOverride || startPoint;
    const dst = destOverride || endPoint;
    if (!src || !dst) return;

    setIsCalculating(true);
    setRoutingError(null);
    setRerouteNotice(null);

    try {
      // Run both algorithms simultaneously in parallel
      const [fastRes, shortRes] = await Promise.all([
        calculateDynamicRoute({
          source: src,
          destination: dst,
          algorithm: 'a_star',
          preference: 'time',
          include_alternative: true
        }),
        calculateDynamicRoute({
          source: src,
          destination: dst,
          algorithm: 'dijkstra',
          preference: 'distance',
          include_alternative: false
        })
      ]);

      setFastestRoute(fastRes);
      setShortestRoute(shortRes);

      // Update beacon marker positions from calculated path
      const pts = extractCoordsFromRoute(fastRes);
      if (pts) {
        setStartCoords(pts.start);
        setEndCoords(pts.dest);
      }

      // Check for incident avoidance
      if (fastRes.avoided_blocked_roads && fastRes.avoided_blocked_roads.length > 0) {
        setRerouteNotice(`Avoided ${fastRes.avoided_blocked_roads.length} blocked road segment(s) along optimal path.`);
      }
    } catch (err: any) {
      setRoutingError(err.message || 'Failed to calculate dynamic routes between selected places.');
    } finally {
      setIsCalculating(false);
    }
  }, [startPoint, endPoint]);

  // Initial Route Calculation on Mount
  useEffect(() => {
    handleCalculateRoutes();
  }, []);

  // Map Click Handler: Click 2 places to set Start & Destination
  const handleMapLocationSelect = useCallback((location: MapLocationSelection) => {
    if (mapClickTarget === 'start') {
      setStartPoint(location.name);
      setStartCoords(location.coordinates);
      setMapClickTarget('dest');
      setMapClickHint(`🟢 Start set: ${location.name}. Now click on the map to set Destination!`);
    } else if (mapClickTarget === 'dest') {
      setEndPoint(location.name);
      setEndCoords(location.coordinates);
      setMapClickTarget('auto');
      setMapClickHint(`🏁 Destination set: ${location.name}. Calculating optimal routes...`);
      handleCalculateRoutes(startPoint, location.name);
    } else {
      // Auto mode: If we already have both or start is unset, set start first
      if (!startPoint || (startPoint && endPoint)) {
        setStartPoint(location.name);
        setStartCoords(location.coordinates);
        setEndPoint('');
        setEndCoords(null);
        setMapClickTarget('dest');
        setMapClickHint(`🟢 Start set: ${location.name}. Click next place on map for Destination!`);
      } else {
        setEndPoint(location.name);
        setEndCoords(location.coordinates);
        setMapClickTarget('auto');
        setMapClickHint(`🏁 Destination set: ${location.name}. Calculating optimal routes...`);
        handleCalculateRoutes(startPoint, location.name);
      }
    }
  }, [mapClickTarget, startPoint, endPoint, handleCalculateRoutes]);

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

          // If a route is computed, auto-recalculate to react to real-time incident changes
          if (fastestRouteRef.current && fastestRouteRef.current.status === 'success') {
            console.log('Incident state changed in shared backend. Recalculating user trip routes...');
            const [fastRes, shortRes] = await Promise.all([
              calculateDynamicRoute({
                source: startPoint,
                destination: endPoint,
                algorithm: 'a_star',
                preference: 'time',
                include_alternative: true
              }),
              calculateDynamicRoute({
                source: startPoint,
                destination: endPoint,
                algorithm: 'dijkstra',
                preference: 'distance',
                include_alternative: false
              })
            ]);

            if (active) {
              setFastestRoute(fastRes);
              setShortestRoute(shortRes);
              if (fastRes.avoided_blocked_roads && fastRes.avoided_blocked_roads.length > 0) {
                setRerouteNotice(`Route dynamically updated! Rerouted around active blockage: ${fastRes.avoided_blocked_roads[0]}`);
              } else {
                setRerouteNotice('Routes refreshed with latest traffic flow conditions.');
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
  }, [roadConditions, lastUpdated, startPoint, endPoint]);

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
                <Navigation className="w-4 h-4 text-cyan-400" />
                Dynamic Trip Planner
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-semibold flex items-center gap-1">
                <Zap className="w-2.5 h-2.5 text-cyan-400" />
                DUAL ROUTE ENGINE
              </span>
            </div>

            {/* Click 2 Places Instruction Banner */}
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-400 flex items-center gap-1">
                  <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                  Map Selection Target:
                </span>
                <span className="text-[10px] font-bold text-cyan-300 uppercase">
                  {mapClickTarget === 'start' ? '🟢 Setting Start' : mapClickTarget === 'dest' ? '🔴 Setting Destination' : '🎯 Auto (Click 2 Places)'}
                </span>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => {
                    setMapClickTarget('start');
                    setMapClickHint('Click any junction or point on the map to set Start.');
                  }}
                  className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-mono font-semibold transition-all border ${
                    mapClickTarget === 'start'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-500 shadow-sm shadow-emerald-950'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  🟢 Pick Start
                </button>
                <button
                  onClick={() => {
                    setMapClickTarget('dest');
                    setMapClickHint('Click any junction or point on the map to set Destination.');
                  }}
                  className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-mono font-semibold transition-all border ${
                    mapClickTarget === 'dest'
                      ? 'bg-red-950 text-red-300 border-red-500 shadow-sm shadow-red-950'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  🔴 Pick Destination
                </button>
              </div>
              {mapClickHint && (
                <div className="text-[10px] text-cyan-300/90 font-mono pt-0.5 leading-snug">
                  {mapClickHint}
                </div>
              )}
            </div>

            {/* Origin & Destination Inputs */}
            <div className="space-y-2 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1 font-mono flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Start Location (Origin)
                  </span>
                  <span className="text-[9px] text-slate-500">Junction, Area or Coords</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={startPoint}
                    onChange={(e) => setStartPoint(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCalculateRoutes()}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 font-medium pr-8"
                    placeholder="Enter origin (e.g. Cyber Towers)..."
                  />
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 absolute right-3 top-2.5" />
                </div>
              </div>

              <div className="flex justify-center -my-1">
                <button 
                  onClick={() => {
                    const tempPoint = startPoint;
                    const tempCoords = startCoords;
                    setStartPoint(endPoint);
                    setStartCoords(endCoords);
                    setEndPoint(tempPoint);
                    setEndCoords(tempCoords);
                    handleCalculateRoutes(endPoint, tempPoint);
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
                    <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></span>
                    Destination Location
                  </span>
                  <span className="text-[9px] text-slate-500">Junction, Area or Coords</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={endPoint}
                    onChange={(e) => setEndPoint(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCalculateRoutes()}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 font-medium pr-8"
                    placeholder="Enter destination (e.g. Clock Tower)..."
                  />
                  <MapPin className="w-3.5 h-3.5 text-red-400 absolute right-3 top-2.5" />
                </div>
              </div>
            </div>

            {/* Quick Destination Chips */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-slate-500 block">Popular Destinations:</span>
              <div className="flex flex-wrap gap-1">
                {POPULAR_LOCATIONS.map((loc, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setEndPoint(loc.value);
                      handleCalculateRoutes(startPoint, loc.value);
                    }}
                    className="text-[9px] px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-slate-400 hover:text-cyan-300 hover:border-cyan-800 transition-colors"
                  >
                    {loc.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {routingError && (
              <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="leading-tight">{routingError}</span>
              </div>
            )}

            {/* Calculate Button */}
            <button
              onClick={() => handleCalculateRoutes()}
              disabled={isCalculating}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 hover:from-blue-500 hover:to-teal-500 font-bold font-mono text-xs text-white shadow-lg shadow-cyan-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {isCalculating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Computing Dual Routes (A* & Dijkstra)...</span>
                </>
              ) : (
                <>
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Calculate Dual Routes</span>
                </>
              )}
            </button>
          </div>

          {/* Dual Route Comparison Cards (Fastest A* vs Shortest Dijkstra) */}
          {(fastestRoute || shortestRoute) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-300 font-semibold px-1">
                <span className="flex items-center gap-1.5">
                  <RouteIcon className="w-3.5 h-3.5 text-cyan-400" />
                  Route Options Comparison:
                </span>
                <span className="text-[10px] text-slate-400">Click card to view</span>
              </div>

              {/* Card 1: Fastest Way (A*) */}
              {fastestRoute && fastestRoute.status === 'success' && (
                <div
                  onClick={() => setActiveRouteType('fastest')}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative ${
                    activeRouteType === 'fastest'
                      ? 'bg-cyan-950/40 border-cyan-500 shadow-lg shadow-cyan-950/60 ring-1 ring-cyan-500/50'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 font-bold font-mono text-xs text-cyan-300">
                      <Zap className="w-4 h-4 text-cyan-400" />
                      <span>FASTEST WAY</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-900/60 text-cyan-200 border border-cyan-700">A* Algorithm</span>
                    </div>
                    {activeRouteType === 'fastest' && (
                      <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded-full border border-cyan-800">
                        <CheckCircle2 className="w-3 h-3" />
                        Active on Map
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-1.5 rounded-lg bg-slate-950/80 border border-slate-800">
                      <span className="text-[9px] font-mono text-slate-400 block">Travel Time</span>
                      <span className="text-base font-black font-mono text-cyan-300">
                        {fastestRoute.estimated_time_min} <span className="text-[10px] font-normal">min</span>
                      </span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-slate-950/80 border border-slate-800">
                      <span className="text-[9px] font-mono text-slate-400 block">Distance</span>
                      <span className="text-base font-black font-mono text-white">
                        {fastestRoute.total_distance_km} <span className="text-[10px] font-normal">km</span>
                      </span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-slate-950/80 border border-slate-800">
                      <span className="text-[9px] font-mono text-slate-400 block">Delay</span>
                      <span className={`text-base font-black font-mono ${fastestRoute.incident_delay_min > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        +{fastestRoute.incident_delay_min} <span className="text-[10px] font-normal">min</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Card 2: Shortest Way (Dijkstra) */}
              {shortestRoute && shortestRoute.status === 'success' && (
                <div
                  onClick={() => setActiveRouteType('shortest')}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative ${
                    activeRouteType === 'shortest'
                      ? 'bg-emerald-950/40 border-emerald-500 shadow-lg shadow-emerald-950/60 ring-1 ring-emerald-500/50'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 opacity-80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 font-bold font-mono text-xs text-emerald-300">
                      <TrendingDown className="w-4 h-4 text-emerald-400" />
                      <span>SHORTEST WAY</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-900/60 text-emerald-200 border border-emerald-700">Dijkstra Algorithm</span>
                    </div>
                    {activeRouteType === 'shortest' && (
                      <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800">
                        <CheckCircle2 className="w-3 h-3" />
                        Active on Map
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-1.5 rounded-lg bg-slate-950/80 border border-slate-800">
                      <span className="text-[9px] font-mono text-slate-400 block">Distance</span>
                      <span className="text-base font-black font-mono text-emerald-300">
                        {shortestRoute.total_distance_km} <span className="text-[10px] font-normal">km</span>
                      </span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-slate-950/80 border border-slate-800">
                      <span className="text-[9px] font-mono text-slate-400 block">Travel Time</span>
                      <span className="text-base font-black font-mono text-white">
                        {shortestRoute.estimated_time_min} <span className="text-[10px] font-normal">min</span>
                      </span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-slate-950/80 border border-slate-800">
                      <span className="text-[9px] font-mono text-slate-400 block">Delay</span>
                      <span className={`text-base font-black font-mono ${shortestRoute.incident_delay_min > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        +{shortestRoute.incident_delay_min} <span className="text-[10px] font-normal">min</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reroute Alert Notification Banner */}
          {rerouteNotice && (
            <div className="p-3 rounded-2xl bg-cyan-950/60 border border-cyan-800/80 text-cyan-200 text-xs flex items-start gap-2 shadow-lg animate-in fade-in">
              <ShieldAlert className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div className="leading-tight text-[11px] font-mono">{rerouteNotice}</div>
            </div>
          )}

          {/* Selected Route Turn-by-Turn Details */}
          {activeRoute && activeRoute.status === 'success' && (
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 text-xs shadow-xl">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-bold text-slate-200 font-mono uppercase text-[11px] flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  Trip Details ({activeRouteType === 'fastest' ? 'A* Fastest' : 'Dijkstra Shortest'})
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-semibold uppercase">
                  {activeRoute.steps?.length || 0} Segments
                </span>
              </div>

              {/* Blocked Road Avoidance Tag */}
              {activeRoute.avoided_blocked_roads && activeRoute.avoided_blocked_roads.length > 0 && (
                <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-900/60 text-red-200 text-[11px] space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                    Avoided Active Incidents:
                  </div>
                  <div className="font-mono text-[10px] text-slate-300 pl-4.5">
                    {activeRoute.avoided_blocked_roads.map((r, i) => (
                      <span key={i} className="inline-block bg-red-950 px-1.5 py-0.5 rounded mr-1 mb-1 border border-red-800 text-red-300">
                        ⛔ {r}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Turn-by-Turn Directions Snippet */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                  Step-by-step corridor segments:
                </span>
                <div className="max-h-48 overflow-y-auto space-y-1 pr-1 font-mono text-[10px]">
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

          {/* Quick Hub Focus Selector */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-mono uppercase tracking-wider">
              <Compass className="w-4 h-4 text-cyan-400" />
              Focus On Hyderabad Hub
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
            routeGeoJSON={activeRoute?.geojson}
            secondaryRouteGeoJSON={secondaryRoute?.geojson}
            onMapLocationSelect={handleMapLocationSelect}
            startPointCoords={startCoords}
            endPointCoords={endCoords}
          />
        </div>
      </main>
    </div>
  );
};
