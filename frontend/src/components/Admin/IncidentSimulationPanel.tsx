import React, { useState, useEffect, useMemo } from 'react';
import { 
  AlertTriangle, 
  Flame, 
  Car, 
  ShieldAlert, 
  Activity, 
  RefreshCw, 
  RotateCcw, 
  CheckCircle2, 
  Layers, 
  Navigation, 
  Sliders,
  ChevronDown,
  Search,
  Sparkles,
  Zap
} from 'lucide-react';
import { IncidentType, IncidentSeverity, DemoState, DemoIncident } from '../../types/incident';
import { createIncident, resetSimulation } from '../../services/demoApi';
import roadsGeoJSON from '../../data/hyderabad_roads.json';

interface RoadOption {
  id: string;
  name: string;
  highway: string;
  lanes: number;
  base_speed_kmh: number;
}

interface IncidentSimulationPanelProps {
  demoState: DemoState | null;
  selectedRoadId?: string | null;
  onSelectRoad: (roadId: string) => void;
  onIncidentCreated: (incident: DemoIncident) => void;
  onSimulationReset: () => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

const PRESET_DESCRIPTIONS: Record<IncidentType, string[]> = {
  ACCIDENT: [
    'Multi-vehicle collision blocking express lanes',
    'Overturned lorry at intersection approach',
    'Two-wheeler skid collision causing bottleneck'
  ],
  ROAD_BLOCKAGE: [
    'Construction barrier and crane malfunction',
    'Fallen tree branch and emergency utility repair',
    'Severe water-logging after flash rainfall'
  ],
  CONGESTION: [
    'High-density peak hour bottleneck surge',
    'Slow-moving heavy transport causing rolling queue',
    'Signal desynchronization backlog'
  ]
};

export const IncidentSimulationPanel: React.FC<IncidentSimulationPanelProps> = ({
  demoState,
  selectedRoadId,
  onSelectRoad,
  onIncidentCreated,
  onSimulationReset,
  onRefresh,
  isLoading = false
}) => {
  // Extract all valid roads from dataset
  const roadOptions: RoadOption[] = useMemo(() => {
    const features = (roadsGeoJSON as any)?.features || [];
    return features.map((f: any) => ({
      id: f.properties.id,
      name: f.properties.name || f.properties.id,
      highway: f.properties.highway || 'road',
      lanes: f.properties.lanes || 2,
      base_speed_kmh: f.properties.base_speed_kmh || 40
    }));
  }, []);

  const [roadSearch, setRoadSearch] = useState<string>('');
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [incidentType, setIncidentType] = useState<IncidentType>('ACCIDENT');
  const [severity, setSeverity] = useState<IncidentSeverity>('HIGH');
  const [description, setDescription] = useState<string>('Multi-vehicle collision blocking express lanes');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // When selectedRoadId changes from map click or parent, update search text
  const currentRoad = useMemo(() => {
    return roadOptions.find(r => r.id === selectedRoadId) || null;
  }, [roadOptions, selectedRoadId]);

  // Filtered roads for search dropdown
  const filteredRoads = useMemo(() => {
    if (!roadSearch.trim()) return roadOptions;
    const query = roadSearch.toLowerCase();
    return roadOptions.filter(
      r => r.name.toLowerCase().includes(query) || r.id.toLowerCase().includes(query) || r.highway.toLowerCase().includes(query)
    );
  }, [roadOptions, roadSearch]);

  const handleSelectRoadOption = (road: RoadOption) => {
    onSelectRoad(road.id);
    setRoadSearch(road.name);
    setDropdownOpen(false);
  };

  const handleTypeChange = (type: IncidentType) => {
    setIncidentType(type);
    const presets = PRESET_DESCRIPTIONS[type];
    if (presets && presets.length > 0) {
      setDescription(presets[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const roadToUse = selectedRoadId || (currentRoad ? currentRoad.id : null);
    if (!roadToUse) {
      setFeedback({ type: 'error', message: 'Please select a valid road segment on the map or from the list.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const newIncident = await createIncident({
        road_id: roadToUse,
        incident_type: incidentType,
        severity,
        description: description.trim() || `${severity} severity ${incidentType.toLowerCase()} reported`
      });

      setFeedback({
        type: 'success',
        message: `Activated ${incidentType} (${severity}) on ${currentRoad?.name || roadToUse}. Road marked ${severity === 'HIGH' ? 'BLOCKED' : 'CONGESTED'}!`
      });

      onIncidentCreated(newIncident);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to create incident on server.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset all demo incidents and restore normal road conditions?')) {
      return;
    }

    setIsResetting(true);
    setFeedback(null);
    try {
      await resetSimulation();
      setFeedback({ type: 'success', message: 'Demo simulation state reset to default. All roads cleared!' });
      onSimulationReset();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to reset simulation.' });
    } finally {
      setIsResetting(false);
    }
  };

  const activeIncidentsCount = demoState?.incidents.filter(i => i.status === 'ACTIVE').length || 0;
  const blockedRoadsCount = Object.values(demoState?.road_conditions || {}).filter(rc => rc.status === 'BLOCKED').length;
  const congestedRoadsCount = Object.values(demoState?.road_conditions || {}).filter(rc => rc.status === 'CONGESTED').length;

  return (
    <div className="space-y-4">
      {/* Simulation Master Status & Reset Card */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900/95 via-purple-950/20 to-slate-900/95 border border-purple-900/40 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping"></div>
            <span className="text-xs font-bold font-mono tracking-wider text-purple-300 uppercase flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-purple-400" />
              Shared Simulation Engine
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              title="Refresh demo state"
              className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin text-purple-400' : ''}`} />
            </button>
            <button
              onClick={handleReset}
              disabled={isResetting}
              title="Reset simulation to initial state"
              className="px-2 py-1 rounded-lg bg-red-950/70 border border-red-800/80 text-red-300 hover:bg-red-900/80 text-[10px] font-mono font-bold flex items-center gap-1 transition-colors"
            >
              <RotateCcw className={`w-2.5 h-2.5 ${isResetting ? 'animate-spin' : ''}`} />
              Reset Demo
            </button>
          </div>
        </div>

        {/* Dynamic State Counters */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-mono">Active Incidents</span>
            <span className={`text-base font-black font-mono ${activeIncidentsCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
              {activeIncidentsCount}
            </span>
          </div>
          <div className="p-2 rounded-xl bg-slate-950/80 border border-red-950/60">
            <span className="text-[10px] text-slate-400 block font-mono">Blocked Roads</span>
            <span className={`text-base font-black font-mono ${blockedRoadsCount > 0 ? 'text-red-400' : 'text-slate-400'}`}>
              {blockedRoadsCount}
            </span>
          </div>
          <div className="p-2 rounded-xl bg-slate-950/80 border border-amber-950/60">
            <span className="text-[10px] text-slate-400 block font-mono">Congested</span>
            <span className={`text-base font-black font-mono ${congestedRoadsCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
              {congestedRoadsCount}
            </span>
          </div>
        </div>
      </div>

      {/* Incident Creator Form */}
      <form onSubmit={handleSubmit} className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3.5 shadow-xl text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <span className="font-bold text-slate-200 flex items-center gap-1.5 font-mono uppercase tracking-wider text-[11px]">
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
            Inject Incident Simulation
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-semibold">
            LIVE BROADCAST
          </span>
        </div>

        {/* 1. Target Road Segment Selection */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Navigation className="w-3 h-3 text-cyan-400" />
              1. Target Road Segment
            </span>
            <span className="text-[9px] text-slate-500 font-normal">Map click or search</span>
          </label>

          {/* Searchable Road Dropdown */}
          <div className="relative">
            <div 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`w-full p-2.5 rounded-xl bg-slate-950 border cursor-pointer flex items-center justify-between transition-colors ${
                selectedRoadId ? 'border-cyan-500/60 text-slate-100' : 'border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="truncate pr-2">
                {currentRoad ? (
                  <div>
                    <div className="font-bold text-cyan-300 text-xs truncate">{currentRoad.name}</div>
                    <div className="text-[10px] font-mono text-slate-400 truncate">ID: {currentRoad.id} • {currentRoad.highway.toUpperCase()}</div>
                  </div>
                ) : (
                  <span className="text-slate-500 text-xs">Click road on map or search here...</span>
                )}
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </div>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 z-30 max-h-56 overflow-y-auto rounded-xl bg-[#0E1526] border border-slate-700 shadow-2xl p-2 space-y-1">
                <div className="relative mb-2">
                  <input
                    type="text"
                    value={roadSearch}
                    onChange={(e) => setRoadSearch(e.target.value)}
                    placeholder="Search 64 Hyderabad roads..."
                    autoFocus
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
                </div>

                <div className="space-y-0.5">
                  {filteredRoads.map((road) => (
                    <button
                      key={road.id}
                      type="button"
                      onClick={() => handleSelectRoadOption(road)}
                      className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex items-center justify-between ${
                        selectedRoadId === road.id 
                          ? 'bg-cyan-950 text-cyan-200 border border-cyan-800 font-bold' 
                          : 'hover:bg-slate-900 text-slate-300'
                      }`}
                    >
                      <div className="truncate mr-2">
                        <div className="truncate font-medium">{road.name}</div>
                        <div className="text-[10px] font-mono text-slate-500 truncate">{road.id}</div>
                      </div>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0 uppercase">
                        {road.highway}
                      </span>
                    </button>
                  ))}
                  {filteredRoads.length === 0 && (
                    <div className="p-3 text-center text-xs text-slate-500 font-mono">No matching roads found</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. Incident Type Selector */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
            2. Incident Type
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => handleTypeChange('ACCIDENT')}
              className={`p-2 rounded-xl text-center flex flex-col items-center gap-1 transition-all ${
                incidentType === 'ACCIDENT'
                  ? 'bg-red-600 text-white font-bold shadow-md shadow-red-900/40 border border-red-400'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white hover:border-slate-700'
              }`}
            >
              <Car className="w-4 h-4 text-red-200" />
              <span className="text-[10px]">Accident</span>
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange('ROAD_BLOCKAGE')}
              className={`p-2 rounded-xl text-center flex flex-col items-center gap-1 transition-all ${
                incidentType === 'ROAD_BLOCKAGE'
                  ? 'bg-amber-600 text-white font-bold shadow-md shadow-amber-900/40 border border-amber-400'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white hover:border-slate-700'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-amber-200" />
              <span className="text-[10px]">Blockage</span>
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange('CONGESTION')}
              className={`p-2 rounded-xl text-center flex flex-col items-center gap-1 transition-all ${
                incidentType === 'CONGESTION'
                  ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-900/40 border border-blue-400'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white hover:border-slate-700'
              }`}
            >
              <Activity className="w-4 h-4 text-blue-200" />
              <span className="text-[10px]">Congestion</span>
            </button>
          </div>
        </div>

        {/* 3. Severity Selector & Backend Road Status Impact */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
              3. Severity &amp; Network Impact
            </label>
            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
              severity === 'HIGH' ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
            }`}>
              Road Status: {severity === 'HIGH' ? 'BLOCKED' : 'CONGESTED'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => setSeverity('HIGH')}
              className={`p-2 rounded-xl text-center transition-all ${
                severity === 'HIGH'
                  ? 'bg-red-950 border-2 border-red-500 text-red-200 font-bold'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="text-[11px] font-bold text-red-400">HIGH</div>
              <div className="text-[8px] text-slate-400 font-mono">Forces Blocked</div>
            </button>

            <button
              type="button"
              onClick={() => setSeverity('MEDIUM')}
              className={`p-2 rounded-xl text-center transition-all ${
                severity === 'MEDIUM'
                  ? 'bg-amber-950 border-2 border-amber-500 text-amber-200 font-bold'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="text-[11px] font-bold text-amber-400">MEDIUM</div>
              <div className="text-[8px] text-slate-400 font-mono">Heavy Delay</div>
            </button>

            <button
              type="button"
              onClick={() => setSeverity('LOW')}
              className={`p-2 rounded-xl text-center transition-all ${
                severity === 'LOW'
                  ? 'bg-blue-950 border-2 border-blue-500 text-blue-200 font-bold'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="text-[11px] font-bold text-blue-400">LOW</div>
              <div className="text-[8px] text-slate-400 font-mono">Slowdown</div>
            </button>
          </div>
        </div>

        {/* 4. Description and Presets */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
            4. Description / Log Details
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the incident situation..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 font-medium"
          />

          {/* Quick preset chips */}
          <div className="flex flex-wrap gap-1 pt-1">
            {PRESET_DESCRIPTIONS[incidentType].map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setDescription(preset)}
                className="text-[9px] px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-slate-400 hover:text-cyan-300 hover:border-cyan-800 transition-colors truncate max-w-full"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Feedback message */}
        {feedback && (
          <div className={`p-2.5 rounded-xl border text-[11px] flex items-start gap-2 ${
            feedback.type === 'success' 
              ? 'bg-emerald-950/80 border-emerald-800/80 text-emerald-300' 
              : 'bg-red-950/80 border-red-800/80 text-red-300'
          }`}>
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            )}
            <div className="leading-tight">{feedback.message}</div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !selectedRoadId}
          className={`w-full py-2.5 px-4 rounded-xl font-bold font-mono text-xs flex items-center justify-center gap-2 transition-all shadow-lg ${
            !selectedRoadId
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : severity === 'HIGH'
              ? 'bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white shadow-red-950/40'
              : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-amber-950/40'
          }`}
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Broadcasting Simulation to Network...</span>
            </>
          ) : (
            <>
              <Flame className="w-3.5 h-3.5 text-white" />
              <span>
                {!selectedRoadId 
                  ? 'Select Road Segment on Map First' 
                  : `Activate ${severity} ${incidentType} Event`}
              </span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
