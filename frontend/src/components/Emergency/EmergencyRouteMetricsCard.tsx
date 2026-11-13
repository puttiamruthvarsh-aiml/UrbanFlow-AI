import React from 'react';
import { EmergencyRouteResult } from '../../types/emergency';
import { 
  Clock, 
  Milestone, 
  Zap, 
  ShieldAlert, 
  CheckCircle2, 
  Radio, 
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface EmergencyRouteMetricsCardProps {
  routeResult: EmergencyRouteResult | null;
  isLoading: boolean;
  onRecalculate?: () => void;
}

export const EmergencyRouteMetricsCard: React.FC<EmergencyRouteMetricsCardProps> = ({
  routeResult,
  isLoading,
  onRecalculate
}) => {
  const [showExplanation, setShowExplanation] = React.useState(true);

  if (isLoading) {
    return (
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-center space-y-2 animate-pulse">
        <div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin mx-auto" />
        <p className="text-xs font-mono text-slate-400">Computing optimal emergency priority corridor...</p>
      </div>
    );
  }

  if (!routeResult) {
    return (
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-1.5 text-xs text-slate-400">
        <Radio className="w-5 h-5 text-slate-600 mx-auto" />
        <p className="font-medium text-slate-300">No Emergency Route Active</p>
        <p className="text-[11px] text-slate-500">Select source and destination to calculate an emergency priority corridor.</p>
      </div>
    );
  }

  if (routeResult.status === 'UNREACHABLE') {
    return (
      <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800/80 space-y-2 text-xs">
        <div className="flex items-center gap-2 text-red-300 font-bold">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span>Destination Unreachable</span>
        </div>
        <p className="text-[11px] text-red-200/90 leading-relaxed">
          {routeResult.message || 'All candidate routes to this destination are blocked by active incidents.'}
        </p>
        {onRecalculate && (
          <button
            onClick={onRecalculate}
            className="w-full py-1.5 rounded-lg bg-red-900/60 hover:bg-red-800 border border-red-700 text-white font-mono text-xs font-bold transition-all"
          >
            Retry Route Calculation
          </button>
        )}
      </div>
    );
  }

  const { summary, explanation, vehicle_type } = routeResult;

  return (
    <div className="p-4 rounded-2xl bg-slate-900/95 border border-red-900/50 space-y-3 shadow-xl shadow-red-950/20">
      {/* Header Badge */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-red-400 flex items-center gap-1.5 font-mono uppercase tracking-wider">
          <Zap className="w-4 h-4 text-red-400 fill-red-400" />
          Priority Corridor Active
        </span>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
          {summary.speed_advantage_percent > 0 ? `+${summary.speed_advantage_percent}% FASTER` : 'OPTIMAL'}
        </span>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {/* Distance */}
        <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800">
          <span className="text-[10px] text-slate-400 block font-mono flex items-center justify-center gap-1">
            <Milestone className="w-3 h-3 text-cyan-400" />
            Distance
          </span>
          <span className="text-base font-black font-mono text-white">{summary.total_distance_km}</span>
          <span className="text-[9px] text-slate-400 block">km</span>
        </div>

        {/* Priority ETA */}
        <div className="p-2 rounded-xl bg-red-950/40 border border-red-800/80">
          <span className="text-[10px] text-red-300 block font-mono flex items-center justify-center gap-1">
            <Clock className="w-3 h-3 text-red-400" />
            Priority ETA
          </span>
          <span className="text-base font-black font-mono text-red-400">{summary.emergency_eta_formatted}</span>
          <span className="text-[9px] text-red-300/80 block font-mono">Std: {summary.normal_eta_formatted}</span>
        </div>

        {/* Time Saved */}
        <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-800/80">
          <span className="text-[10px] text-emerald-300 block font-mono flex items-center justify-center gap-1">
            <Zap className="w-3 h-3 text-emerald-400" />
            Time Saved
          </span>
          <span className="text-base font-black font-mono text-emerald-400">-{summary.time_saved_formatted}</span>
          <span className="text-[9px] text-emerald-300/80 block font-mono">{summary.preempted_signals_count} Signals</span>
        </div>
      </div>

      {/* Corridor Road Segments and Preempted Signals Badge */}
      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] font-mono text-slate-300">
        <span className="text-slate-400">Preempted Signals:</span>
        <span className="text-amber-400 font-bold">{summary.preempted_signals_count} Verified OSM Signals</span>
      </div>

      {/* Blocked Roads Avoided Notice */}
      {explanation.blocked_roads_avoided && explanation.blocked_roads_avoided.length > 0 && (
        <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-800/60 text-[11px] text-amber-200 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-amber-300">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            Active Hazards Avoided:
          </div>
          <p className="text-[10px] text-amber-300/80">
            Rerouted safely around {explanation.blocked_roads_avoided.length} blocked road segment(s) ({explanation.blocked_roads_avoided.join(', ')}).
          </p>
        </div>
      )}

      {/* Accordion: Why this route was selected */}
      <div className="border border-slate-800/80 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowExplanation(!showExplanation)}
          className="w-full px-3 py-2 bg-slate-950/70 flex items-center justify-between text-left text-xs font-mono font-bold text-slate-300 hover:text-white transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            Why this route was selected
          </span>
          {showExplanation ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showExplanation && (
          <div className="p-3 bg-slate-950/40 text-[11px] text-slate-300 space-y-1.5 border-t border-slate-800/60">
            <p className="font-medium text-slate-200">{explanation.summary}</p>
            <ul className="space-y-1 text-[10px] text-slate-400 pl-3 list-disc">
              {explanation.priority_factors.map((factor, i) => (
                <li key={i}>{factor}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Simulated Corridor Disclaimer */}
      <div className="text-[9px] font-mono text-slate-500 leading-snug p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
        <span className="text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Simulated Preemption Corridor</span>
        Emergency corridor speed and signal preemption simulated for UrbanFlow demonstration. Actual physical traffic-signal hardware controllers are not actuated.
      </div>
    </div>
  );
};
