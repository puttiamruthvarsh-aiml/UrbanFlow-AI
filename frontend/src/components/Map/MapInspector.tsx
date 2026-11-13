import React from 'react';
import { SelectedMapEntity } from '../../types/network';
import { 
  X, 
  MapPin, 
  Navigation2, 
  Layers, 
  Compass, 
  Clock, 
  Shield, 
  Cross, 
  Flame, 
  Radio, 
  Info,
  Phone,
  Gauge,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface MapInspectorProps {
  selectedEntity: SelectedMapEntity;
  onClose: () => void;
}

export const MapInspector: React.FC<MapInspectorProps> = ({
  selectedEntity,
  onClose
}) => {
  if (!selectedEntity) return null;

  const { type, data } = selectedEntity;

  return (
    <div className="absolute bottom-6 left-6 z-30 w-96 max-w-[calc(100vw-3rem)] bg-[#0B0F19]/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-4 shadow-2xl text-slate-100 select-none animate-in fade-in slide-in-from-bottom-4 duration-200">
      {/* Header */}
      <div className="flex items-start justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          {type === 'road' && (
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-800/80 text-cyan-400">
              <Navigation2 className="w-5 h-5" />
            </div>
          )}
          {type === 'junction' && (
            <div className="p-2 rounded-xl bg-blue-950/80 border border-blue-800/80 text-blue-400">
              <Compass className="w-5 h-5" />
            </div>
          )}
          {type === 'signal' && (
            <div className="p-2 rounded-xl bg-amber-950/80 border border-amber-800/80 text-amber-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
          )}
          {type === 'emergency' && data.category === 'hospital' && (
            <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-800/80 text-emerald-400">
              <Cross className="w-5 h-5" />
            </div>
          )}
          {type === 'emergency' && data.category === 'police' && (
            <div className="p-2 rounded-xl bg-indigo-950/80 border border-indigo-800/80 text-indigo-400">
              <Shield className="w-5 h-5" />
            </div>
          )}
          {type === 'emergency' && data.category === 'fire_station' && (
            <div className="p-2 rounded-xl bg-orange-950/80 border border-orange-800/80 text-orange-400">
              <Flame className="w-5 h-5" />
            </div>
          )}
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-semibold block">
              {type === 'road' && 'Road Segment Inspector'}
              {type === 'junction' && 'Intersection Node Inspector'}
              {type === 'signal' && 'Traffic Signal Inspector'}
              {type === 'emergency' && `Emergency Service • ${data.category.toUpperCase()}`}
            </span>
            <h3 className="font-bold text-sm text-white truncate max-w-[240px]">
              {data.name}
            </h3>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body Details */}
      <div className="py-3 space-y-2.5 text-xs">
        {/* ROAD SEGMENT */}
        {type === 'road' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-mono">Classification</span>
                <span className="font-semibold text-cyan-300 uppercase">{data.highway}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-mono">Length</span>
                <span className="font-semibold text-white">
                  {data.length_m >= 1000 ? `${(data.length_m / 1000).toFixed(2)} km` : `${data.length_m} m`}
                </span>
              </div>
            </div>

            <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Direction / One-Way:</span>
                <span className="font-mono font-medium text-slate-200">
                  {data.one_way ? 'One-Way Only' : 'Two-Way Bidirectional'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Lanes:</span>
                <span className="font-mono font-medium text-slate-200">{data.lanes} Lanes</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Speed Limit:</span>
                <span className="font-mono font-medium text-amber-300">{data.base_speed_kmh} km/h</span>
              </div>
            </div>

            <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1 text-[11px]">
              <div>
                <span className="text-slate-400 block">From Node:</span>
                <span className="text-slate-200 font-medium">{data.from_name} ({data.from_node})</span>
              </div>
              <div>
                <span className="text-slate-400 block">To Node:</span>
                <span className="text-slate-200 font-medium">{data.to_name} ({data.to_node})</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono px-1">
              <span>Segment ID: {data.id}</span>
              <span>OSM Way: {data.osm_way_id}</span>
            </div>
          </>
        )}

        {/* JUNCTION NODE */}
        {type === 'junction' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-mono">Region</span>
                <span className="font-semibold text-blue-300">{data.area}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-mono">Junction Type</span>
                <span className="font-semibold text-slate-200 capitalize">{data.node_type.replace('_', ' ')}</span>
              </div>
            </div>

            <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Traffic Signal:</span>
                <span className={`font-medium flex items-center gap-1 ${data.has_signal ? 'text-amber-400' : 'text-slate-500'}`}>
                  {data.has_signal ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Physical Signal Present
                    </>
                  ) : (
                    'No Physical Signal'
                  )}
                </span>
              </div>
              {data.degree && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Connected Legs:</span>
                  <span className="font-mono text-cyan-300 font-bold">{data.degree} Links</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono px-1">
              <span>Node ID: {data.id}</span>
              <span>OSM: {data.osm_id}</span>
            </div>
          </>
        )}

        {/* TRAFFIC SIGNAL */}
        {type === 'signal' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-mono">Cycle Time (Baseline)</span>
                <span className="font-semibold text-amber-300 text-sm">{data.cycle_time_sec}s (Estimated)</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] text-slate-400 block font-mono">Phases</span>
                <span className="font-semibold text-slate-200 text-sm">{data.phases} Phase Plan</span>
              </div>
            </div>

            <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1 text-[11px]">
              <div>
                <span className="text-slate-400 block">Junction:</span>
                <span className="text-slate-200 font-medium">{data.junction_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Area:</span>
                <span className="text-slate-200 font-medium">{data.area}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Physical Location Source:</span>
                <span className="text-emerald-400 font-medium">Verified OpenStreetMap (highway=traffic_signals)</span>
              </div>
              <div>
                <span className="text-slate-400 block">Timing Source:</span>
                <span className="text-amber-300/90 font-mono text-[10px]">Estimated Municipal Baseline Standard</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono px-1">
              <span>Signal ID: {data.id}</span>
              <span>OSM Node: {data.osm_node_id}</span>
            </div>
          </>
        )}

        {/* EMERGENCY FACILITY */}
        {type === 'emergency' && (
          <>
            <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
              <div className="text-[10px] text-slate-400 font-mono">Address / Location</div>
              <div className="text-slate-200 font-medium">{data.address}</div>
            </div>

            <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Category:</span>
                <span className="font-semibold text-cyan-300 uppercase">{data.facility_type}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Location Source:</span>
                <span className="text-emerald-400 text-[10px] font-mono">Verified OpenStreetMap</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Direct Contact:</span>
                <span className="font-mono text-emerald-400 flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {data.contact}
                </span>
              </div>
              {data.ambulances_available !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Ambulances Staged:</span>
                  <span className="font-mono text-emerald-300 font-bold">{data.ambulances_available} Units (Estimated)</span>
                </div>
              )}
              {data.patrol_units !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Patrol Units:</span>
                  <span className="font-mono text-indigo-300 font-bold">{data.patrol_units} Squads (Estimated)</span>
                </div>
              )}
              {data.fire_engines !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Fire Engines:</span>
                  <span className="font-mono text-orange-300 font-bold">{data.fire_engines} Engines (Estimated)</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono px-1">
              <span>Facility ID: {data.id}</span>
              <span>OSM: {data.osm_id}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
