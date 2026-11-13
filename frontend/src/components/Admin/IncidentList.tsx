import React, { useState, useMemo } from 'react';
import { 
  AlertOctagon, 
  CheckCircle2, 
  Clock, 
  Car, 
  ShieldAlert, 
  Activity, 
  AlertTriangle, 
  RefreshCw,
  XCircle,
  ExternalLink,
  Flame,
  Check
} from 'lucide-react';
import { DemoIncident, DemoState } from '../../types/incident';
import { resolveIncident } from '../../services/demoApi';
import roadsGeoJSON from '../../data/hyderabad_roads.json';

interface IncidentListProps {
  demoState: DemoState | null;
  onIncidentResolved: (incident: DemoIncident) => void;
  onSelectRoad?: (roadId: string) => void;
  isLoading?: boolean;
}

export const IncidentList: React.FC<IncidentListProps> = ({
  demoState,
  onIncidentResolved,
  onSelectRoad,
  isLoading = false
}) => {
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ACTIVE');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Map of road_id to road name for friendly display
  const roadNames = useMemo(() => {
    const map: Record<string, string> = {};
    const features = (roadsGeoJSON as any)?.features || [];
    features.forEach((f: any) => {
      map[f.properties.id] = f.properties.name || f.properties.id;
    });
    return map;
  }, []);

  const incidents = demoState?.incidents || [];
  const roadConditions = demoState?.road_conditions || {};

  const activeIncidents = useMemo(() => incidents.filter(i => i.status === 'ACTIVE'), [incidents]);
  const resolvedIncidents = useMemo(() => incidents.filter(i => i.status === 'RESOLVED'), [incidents]);

  const filteredIncidents = useMemo(() => {
    if (filter === 'ACTIVE') return activeIncidents;
    if (filter === 'RESOLVED') return resolvedIncidents;
    return incidents;
  }, [filter, incidents, activeIncidents, resolvedIncidents]);

  const handleResolve = async (incidentId: string) => {
    setResolvingId(incidentId);
    setErrorMsg(null);
    try {
      const resolved = await resolveIncident(incidentId);
      onIncidentResolved(resolved);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to resolve incident.');
    } finally {
      setResolvingId(null);
    }
  };

  const formatTimestamp = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-3">
      {/* Header with Filters */}
      <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-mono uppercase tracking-wider">
            <AlertOctagon className="w-4 h-4 text-red-400" />
            Live Incident Feed
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            {incidents.length} Logged • {activeIncidents.length} Active
          </span>
        </div>

        {/* Filter Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800/80 text-[10px] font-mono">
          <button
            onClick={() => setFilter('ACTIVE')}
            className={`py-1 px-2 rounded-lg font-bold transition-colors flex items-center justify-center gap-1 ${
              filter === 'ACTIVE' 
                ? 'bg-red-950 text-red-300 border border-red-800' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
            Active ({activeIncidents.length})
          </button>

          <button
            onClick={() => setFilter('RESOLVED')}
            className={`py-1 px-2 rounded-lg font-bold transition-colors flex items-center justify-center gap-1 ${
              filter === 'RESOLVED' 
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Resolved ({resolvedIncidents.length})
          </button>

          <button
            onClick={() => setFilter('ALL')}
            className={`py-1 px-2 rounded-lg font-bold transition-colors flex items-center justify-center gap-1 ${
              filter === 'ALL' 
                ? 'bg-slate-800 text-slate-200 border border-slate-700' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({incidents.length})
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-800 text-red-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Incidents List Container */}
      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-0.5">
        {filteredIncidents.length === 0 ? (
          <div className="p-6 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400 space-y-1.5">
            <CheckCircle2 className="w-7 h-7 text-emerald-500/80 mx-auto mb-1" />
            <p className="font-semibold text-slate-300">
              {filter === 'ACTIVE' ? 'No Active Incidents' : 'No Incidents Recorded'}
            </p>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              {filter === 'ACTIVE' 
                ? 'All Hyderabad road segments operating under nominal traffic conditions. Inject an incident using the simulation controls.' 
                : 'Use the Incident Simulation form to inject test accidents or road blocks.'}
            </p>
          </div>
        ) : (
          filteredIncidents.slice().reverse().map((incident) => {
            const roadName = roadNames[incident.road_id] || incident.road_id;
            const currentCondition = roadConditions[incident.road_id];
            const isActive = incident.status === 'ACTIVE';
            const isResolving = resolvingId === incident.incident_id;

            return (
              <div
                key={incident.incident_id}
                className={`p-3 rounded-xl border text-xs space-y-2 transition-all ${
                  isActive
                    ? incident.severity === 'HIGH'
                      ? 'bg-red-950/30 border-red-900/60 shadow-lg shadow-red-950/10'
                      : 'bg-amber-950/30 border-amber-900/60 shadow-lg shadow-amber-950/10'
                    : 'bg-slate-900/60 border-slate-800/80 opacity-75'
                }`}
              >
                {/* Top Row: Type, Severity, Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {/* Type Badge */}
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                      incident.type === 'ACCIDENT' 
                        ? 'bg-red-950 text-red-300 border border-red-800'
                        : incident.type === 'ROAD_BLOCKAGE'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-blue-950 text-blue-300 border border-blue-800'
                    }`}>
                      {incident.type === 'ACCIDENT' && <Car className="w-3 h-3" />}
                      {incident.type === 'ROAD_BLOCKAGE' && <ShieldAlert className="w-3 h-3" />}
                      {incident.type === 'CONGESTION' && <Activity className="w-3 h-3" />}
                      {incident.type}
                    </span>

                    {/* Severity Badge */}
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      incident.severity === 'HIGH'
                        ? 'bg-red-900 text-white'
                        : incident.severity === 'MEDIUM'
                        ? 'bg-amber-800 text-white'
                        : 'bg-blue-900 text-white'
                    }`}>
                      {incident.severity}
                    </span>
                  </div>

                  {/* Status Indicator */}
                  <div className="flex items-center gap-1">
                    {isActive ? (
                      <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-red-400 bg-red-950/80 px-2 py-0.5 rounded-full border border-red-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></span>
                        ACTIVE
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800">
                        <Check className="w-2.5 h-2.5" />
                        RESOLVED
                      </span>
                    )}
                  </div>
                </div>

                {/* Road Information */}
                <div>
                  <button
                    type="button"
                    onClick={() => onSelectRoad && onSelectRoad(incident.road_id)}
                    className="font-bold text-slate-100 hover:text-cyan-300 text-left transition-colors truncate block max-w-full"
                    title={`Click to focus on ${roadName}`}
                  >
                    {roadName}
                  </button>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-0.5">
                    <span>ID: {incident.road_id}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5 text-slate-500" />
                      {formatTimestamp(incident.created_at)}
                    </span>
                  </div>
                </div>

                {/* Description */}
                {incident.description && (
                  <p className="text-[11px] text-slate-300 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80 leading-relaxed">
                    {incident.description}
                  </p>
                )}

                {/* Road Condition Impact & Action Button */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                  <div className="text-[10px] font-mono">
                    {isActive && currentCondition ? (
                      <span className={`px-1.5 py-0.5 rounded font-bold ${
                        currentCondition.status === 'BLOCKED' 
                          ? 'bg-red-950 text-red-400 border border-red-800' 
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}>
                        Impact: {currentCondition.status}
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[10px]">
                        Road: Available
                      </span>
                    )}
                  </div>

                  {isActive && (
                    <button
                      type="button"
                      onClick={() => handleResolve(incident.incident_id)}
                      disabled={isResolving}
                      className="py-1 px-2.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 hover:text-emerald-100 text-[10px] font-mono font-bold flex items-center gap-1 transition-colors"
                    >
                      {isResolving ? (
                        <>
                          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                          <span>Resolving...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Resolve Incident</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
