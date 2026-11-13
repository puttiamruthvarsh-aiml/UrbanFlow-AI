import React from 'react';
import { LayerVisibilityState } from '../../types/network';
import { Layers, Eye, EyeOff, Shield, Flame, Cross, Compass, Disc, Map as MapIcon, Type } from 'lucide-react';

interface LayerControlsProps {
  layers: LayerVisibilityState;
  onToggleLayer: (key: keyof LayerVisibilityState) => void;
  onSetBasemapMode: (mode: 'dark' | 'osm') => void;
  onResetView: () => void;
}

export const LayerControls: React.FC<LayerControlsProps> = ({
  layers,
  onToggleLayer,
  onSetBasemapMode,
  onResetView
}) => {
  return (
    <div className="absolute top-4 right-4 z-20 bg-[#0B0F19]/95 backdrop-blur-md border border-slate-800/90 rounded-2xl p-2.5 shadow-2xl text-xs space-y-2 select-none min-w-[220px]">
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80 px-1">
        <span className="font-semibold text-slate-200 flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          Map Controls
        </span>
        <button
          onClick={onResetView}
          className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/50 hover:bg-cyan-900/60 transition-colors"
          title="Reset map view to whole Hyderabad"
        >
          <Compass className="w-3 h-3" />
          Reset View
        </button>
      </div>

      {/* Basemap Style Switcher */}
      <div className="space-y-1 pb-1.5 border-b border-slate-800/80">
        <div className="text-[10px] font-mono text-slate-400 px-1 uppercase tracking-wider flex items-center gap-1">
          <MapIcon className="w-3 h-3 text-cyan-400" />
          Basemap Style
        </div>
        <div className="grid grid-cols-2 gap-1">
          <button
            onClick={() => onSetBasemapMode('dark')}
            className={`px-2 py-1.5 rounded-lg text-center font-medium text-[10px] transition-all ${
              layers.basemapMode === 'dark'
                ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-700 shadow-sm'
                : 'bg-slate-900/60 text-slate-400 border border-slate-800/60 hover:text-white'
            }`}
          >
            Dark Canvas
          </button>
          <button
            onClick={() => onSetBasemapMode('osm')}
            className={`px-2 py-1.5 rounded-lg text-center font-medium text-[10px] transition-all ${
              layers.basemapMode === 'osm'
                ? 'bg-blue-950/80 text-blue-300 border border-blue-700 shadow-sm'
                : 'bg-slate-900/60 text-slate-400 border border-slate-800/60 hover:text-white'
            }`}
          >
            OSM Streets
          </button>
        </div>
      </div>

      <div className="space-y-1">
        {/* Street & Area Labels */}
        <button
          onClick={() => onToggleLayer('labels')}
          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors ${
            layers.labels ? 'bg-cyan-950/40 text-cyan-300 border border-cyan-800/40' : 'text-slate-400 hover:bg-slate-800/40'
          }`}
        >
          <span className="flex items-center gap-2">
            <Type className="w-3.5 h-3.5 text-cyan-400" />
            <span>Geographic Labels</span>
          </span>
          {layers.labels ? <Eye className="w-3.5 h-3.5 text-cyan-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
        </button>

        {/* Road Hierarchy */}
        <button
          onClick={() => onToggleLayer('roads')}
          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors ${
            layers.roads ? 'bg-cyan-950/40 text-cyan-300 border border-cyan-800/40' : 'text-slate-400 hover:bg-slate-800/40'
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-1 rounded bg-cyan-400 inline-block"></span>
            <span>Road Segments (64)</span>
          </span>
          {layers.roads ? <Eye className="w-3.5 h-3.5 text-cyan-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
        </button>

        {/* Junctions */}
        <button
          onClick={() => onToggleLayer('junctions')}
          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors ${
            layers.junctions ? 'bg-blue-950/40 text-blue-300 border border-blue-800/40' : 'text-slate-400 hover:bg-slate-800/40'
          }`}
        >
          <span className="flex items-center gap-2">
            <Disc className="w-3 h-3 text-blue-400" />
            <span>Intersections (56)</span>
          </span>
          {layers.junctions ? <Eye className="w-3.5 h-3.5 text-blue-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
        </button>

        {/* Traffic Signals */}
        <button
          onClick={() => onToggleLayer('signals')}
          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors ${
            layers.signals ? 'bg-amber-950/40 text-amber-300 border border-amber-800/40' : 'text-slate-400 hover:bg-slate-800/40'
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>Traffic Signals (20)</span>
          </span>
          {layers.signals ? <Eye className="w-3.5 h-3.5 text-amber-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
        </button>

        {/* Hospitals */}
        <button
          onClick={() => onToggleLayer('hospitals')}
          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors ${
            layers.hospitals ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40' : 'text-slate-400 hover:bg-slate-800/40'
          }`}
        >
          <span className="flex items-center gap-2">
            <Cross className="w-3 h-3 text-emerald-400" />
            <span>Hospitals (14)</span>
          </span>
          {layers.hospitals ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
        </button>

        {/* Police */}
        <button
          onClick={() => onToggleLayer('police')}
          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors ${
            layers.police ? 'bg-indigo-950/40 text-indigo-300 border border-indigo-800/40' : 'text-slate-400 hover:bg-slate-800/40'
          }`}
        >
          <span className="flex items-center gap-2">
            <Shield className="w-3 h-3 text-indigo-400" />
            <span>Police Stations (12)</span>
          </span>
          {layers.police ? <Eye className="w-3.5 h-3.5 text-indigo-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
        </button>

        {/* Fire Stations */}
        <button
          onClick={() => onToggleLayer('fireStations')}
          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg transition-colors ${
            layers.fireStations ? 'bg-orange-950/40 text-orange-300 border border-orange-800/40' : 'text-slate-400 hover:bg-slate-800/40'
          }`}
        >
          <span className="flex items-center gap-2">
            <Flame className="w-3 h-3 text-orange-400" />
            <span>Fire Stations (9)</span>
          </span>
          {layers.fireStations ? <Eye className="w-3.5 h-3.5 text-orange-400" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
        </button>
      </div>

      <div className="pt-1.5 border-t border-slate-800/80 text-[10px] text-slate-400 font-mono text-center">
        Esri Dark Gray &amp; OSM • No API Key Needed
      </div>
    </div>
  );
};
