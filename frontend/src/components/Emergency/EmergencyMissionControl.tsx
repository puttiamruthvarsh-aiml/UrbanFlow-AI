import React, { useState } from 'react';
import { 
  EmergencyVehicleType, 
  RouteEndpoint, 
  EmergencyFacility 
} from '../../types/emergency';
import { 
  Siren, 
  Flame, 
  ShieldCheck, 
  Cross, 
  MapPin, 
  Navigation, 
  ArrowRightLeft, 
  Sparkles, 
  Radio, 
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  MousePointer
} from 'lucide-react';

interface EmergencyMissionControlProps {
  vehicleType: EmergencyVehicleType;
  onChangeVehicleType: (type: EmergencyVehicleType) => void;
  nodes: RouteEndpoint[];
  facilities: EmergencyFacility[];
  selectedSourceId: string;
  onSelectSourceId: (id: string) => void;
  selectedTargetId: string;
  onSelectTargetId: (id: string) => void;
  onCalculateRoute: () => void;
  isLoading: boolean;
  mapSelectionMode: 'none' | 'source' | 'target';
  onSetMapSelectionMode: (mode: 'none' | 'source' | 'target') => void;
  activeIncidentsCount: number;
  blockedRoadsCount: number;
  lastRecalculatedAt: string | null;
}

export const EmergencyMissionControl: React.FC<EmergencyMissionControlProps> = ({
  vehicleType,
  onChangeVehicleType,
  nodes,
  facilities,
  selectedSourceId,
  onSelectSourceId,
  selectedTargetId,
  onSelectTargetId,
  onCalculateRoute,
  isLoading,
  mapSelectionMode,
  onSetMapSelectionMode,
  activeIncidentsCount,
  blockedRoadsCount,
  lastRecalculatedAt
}) => {
  // Presets for quick demonstration
  const presets = [
    {
      label: 'Apollo Jubilee ➔ Cyber Towers',
      sourceId: 'node_apollo_crossing',
      targetId: 'node_cyber_towers',
      vehicle: 'AMBULANCE' as EmergencyVehicleType
    },
    {
      label: 'CARE Banjara ➔ Secunderabad',
      sourceId: 'node_bh_road1',
      targetId: 'node_secunderabad_station',
      vehicle: 'AMBULANCE' as EmergencyVehicleType
    },
    {
      label: 'Continental ➔ Mindspace',
      sourceId: 'node_financial_district',
      targetId: 'node_mindspace',
      vehicle: 'FIRE' as EmergencyVehicleType
    }
  ];

  const handleApplyPreset = (preset: typeof presets[0]) => {
    onChangeVehicleType(preset.vehicle);
    onSelectSourceId(preset.sourceId);
    onSelectTargetId(preset.targetId);
  };

  const handleSwap = () => {
    const temp = selectedSourceId;
    onSelectSourceId(selectedTargetId);
    onSelectTargetId(temp);
  };

  return (
    <div className="p-4 rounded-2xl bg-slate-900/90 border border-red-900/50 space-y-3.5 shadow-lg shadow-red-950/20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-red-400 flex items-center gap-1.5 font-mono uppercase tracking-wider">
          <Siren className="w-4 h-4 text-red-400 animate-pulse" />
          Emergency Mission Control
        </span>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800 font-semibold flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
          LIVE DISPATCH
        </span>
      </div>

      {/* Vehicle Type Selector */}
      <div className="grid grid-cols-3 gap-1.5">
        <button
          type="button"
          onClick={() => onChangeVehicleType('AMBULANCE')}
          className={`p-2 rounded-xl text-center flex flex-col items-center gap-1 transition-all ${
            vehicleType === 'AMBULANCE'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
              : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
          }`}
        >
          <Cross className="w-4 h-4 text-emerald-400" />
          <span className="text-[10px] font-bold">Ambulance</span>
        </button>

        <button
          type="button"
          onClick={() => onChangeVehicleType('FIRE')}
          className={`p-2 rounded-xl text-center flex flex-col items-center gap-1 transition-all ${
            vehicleType === 'FIRE'
              ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
              : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
          }`}
        >
          <Flame className="w-4 h-4 text-orange-400" />
          <span className="text-[10px] font-bold">Fire Rescue</span>
        </button>

        <button
          type="button"
          onClick={() => onChangeVehicleType('POLICE')}
          className={`p-2 rounded-xl text-center flex flex-col items-center gap-1 transition-all ${
            vehicleType === 'POLICE'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span className="text-[10px] font-bold">Police Patrol</span>
        </button>
      </div>

      {/* Origin / Source Selector */}
      <div className="space-y-1 text-xs">
        <div className="flex items-center justify-between">
          <label className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            1. Origin / Staging Node
          </label>
          <button
            type="button"
            onClick={() => onSetMapSelectionMode(mapSelectionMode === 'source' ? 'none' : 'source')}
            className={`text-[9px] font-mono px-1.5 py-0.5 rounded border transition-colors flex items-center gap-1 ${
              mapSelectionMode === 'source'
                ? 'bg-emerald-950 text-emerald-300 border-emerald-600 font-bold'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <MousePointer className="w-2.5 h-2.5" />
            {mapSelectionMode === 'source' ? 'Click Map Now' : 'Click on Map'}
          </button>
        </div>

        <select
          value={selectedSourceId}
          onChange={(e) => onSelectSourceId(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-red-500 font-medium"
        >
          <optgroup label="Major Emergency Facilities">
            {facilities.map((fac) => (
              <option key={`fac-src-${fac.id}`} value={fac.nearest_node_id || fac.id}>
                {fac.name} ({fac.area})
              </option>
            ))}
          </optgroup>
          <optgroup label="Road Network Junction Nodes">
            {nodes.map((node) => (
              <option key={`node-src-${node.id}`} value={node.id}>
                {node.name} ({node.area || 'Junction'})
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* Swap Button */}
      <div className="flex justify-center -my-1">
        <button
          type="button"
          onClick={handleSwap}
          className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700"
          title="Swap Origin and Destination"
        >
          <ArrowRightLeft className="w-3 h-3 rotate-90" />
        </button>
      </div>

      {/* Destination Selector */}
      <div className="space-y-1 text-xs">
        <div className="flex items-center justify-between">
          <label className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            2. Emergency Destination
          </label>
          <button
            type="button"
            onClick={() => onSetMapSelectionMode(mapSelectionMode === 'target' ? 'none' : 'target')}
            className={`text-[9px] font-mono px-1.5 py-0.5 rounded border transition-colors flex items-center gap-1 ${
              mapSelectionMode === 'target'
                ? 'bg-red-950 text-red-300 border-red-600 font-bold'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <MousePointer className="w-2.5 h-2.5" />
            {mapSelectionMode === 'target' ? 'Click Map Now' : 'Click on Map'}
          </button>
        </div>

        <select
          value={selectedTargetId}
          onChange={(e) => onSelectTargetId(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-red-500 font-medium"
        >
          <optgroup label="Road Network Junction Nodes">
            {nodes.map((node) => (
              <option key={`node-tgt-${node.id}`} value={node.id}>
                {node.name} ({node.area || 'Junction'})
              </option>
            ))}
          </optgroup>
          <optgroup label="Emergency Facilities">
            {facilities.map((fac) => (
              <option key={`fac-tgt-${fac.id}`} value={fac.nearest_node_id || fac.id}>
                {fac.name} ({fac.area})
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* Primary Action Button */}
      <button
        type="button"
        onClick={onCalculateRoute}
        disabled={isLoading}
        className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        <Navigation className="w-4 h-4" />
        {isLoading ? 'Calculating Corridor...' : 'Calculate Priority Corridor'}
      </button>

      {/* Quick Mission Presets */}
      <div className="space-y-1.5 pt-1">
        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
          Quick Dispatch Scenarios:
        </span>
        <div className="grid grid-cols-1 gap-1">
          {presets.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleApplyPreset(p)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-900 border border-slate-800/80 text-[11px] text-slate-300 hover:text-white text-left font-medium flex items-center justify-between transition-colors"
            >
              <span>{p.label}</span>
              <span className="text-[9px] font-mono text-slate-500 uppercase">{p.vehicle}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Shared Network State Monitor Banner */}
      <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] space-y-1">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-300 font-mono text-[10px] flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
            Shared Demo State Monitor
          </span>
          <span className="text-[9px] font-mono text-emerald-400 font-bold">LIVE SYNC</span>
        </div>

        <div className="grid grid-cols-2 gap-1 text-[10px] font-mono text-slate-400">
          <div>
            <span>Active Incidents: </span>
            <span className={activeIncidentsCount > 0 ? 'text-amber-400 font-bold' : 'text-slate-200'}>
              {activeIncidentsCount}
            </span>
          </div>
          <div>
            <span>Blocked Roads: </span>
            <span className={blockedRoadsCount > 0 ? 'text-red-400 font-bold' : 'text-slate-200'}>
              {blockedRoadsCount}
            </span>
          </div>
        </div>

        {lastRecalculatedAt && (
          <div className="text-[9px] text-slate-500 font-mono pt-1 border-t border-slate-800/60">
            Last recalculation: {new Date(lastRecalculatedAt).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
};
