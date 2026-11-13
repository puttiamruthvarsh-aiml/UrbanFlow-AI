import React from 'react';
import { CorridorRoadSegment } from '../../types/emergency';
import { Layers, ShieldCheck, AlertCircle, Radio, Gauge } from 'lucide-react';

interface EmergencyCorridorRoadsListProps {
  corridorRoads: CorridorRoadSegment[];
}

export const EmergencyCorridorRoadsList: React.FC<EmergencyCorridorRoadsListProps> = ({
  corridorRoads
}) => {
  if (!corridorRoads || corridorRoads.length === 0) {
    return null;
  }

  const getHighwayBadge = (type: string) => {
    switch (type) {
      case 'motorway':
        return 'bg-cyan-950 text-cyan-300 border-cyan-800';
      case 'trunk':
        return 'bg-blue-950 text-blue-300 border-blue-800';
      case 'primary':
        return 'bg-indigo-950 text-indigo-300 border-indigo-800';
      default:
        return 'bg-slate-900 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-mono uppercase tracking-wider">
          <Layers className="w-4 h-4 text-cyan-400" />
          Corridor Road Segments ({corridorRoads.length})
        </span>
        <span className="text-[10px] font-mono text-slate-400">Sequence</span>
      </div>

      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {corridorRoads.map((road, idx) => (
          <div
            key={`${road.edge_id}-${idx}`}
            className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition-all text-xs space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 text-xs truncate max-w-[210px]">
                {idx + 1}. {road.name}
              </span>
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase font-semibold ${getHighwayBadge(road.highway)}`}>
                {road.highway}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1 text-[10px] font-mono text-slate-400">
              <div>
                <span>Len: </span>
                <span className="text-white font-medium">{road.length_m} m</span>
              </div>
              <div>
                <span>Lanes: </span>
                <span className="text-white font-medium">{road.lanes}</span>
              </div>
              <div>
                <span>Priority: </span>
                <span className="text-emerald-400 font-medium">{road.priority_speed_kmh} km/h</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-800/60">
              <div className="flex items-center gap-1 text-slate-400">
                <Gauge className="w-3 h-3 text-cyan-400" />
                <span>Base: {road.base_speed_kmh} km/h</span>
              </div>

              {road.signal_preempted ? (
                <span className="text-amber-400 font-mono font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Preempted Signal
                </span>
              ) : (
                <span className="text-emerald-400 font-mono font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Free Flow
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
