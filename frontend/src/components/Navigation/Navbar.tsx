import React from 'react';
import { ActiveRole } from '../../types/network';
import { 
  Activity, 
  ShieldAlert, 
  Radio, 
  MapPin, 
  Layers, 
  Compass, 
  SlidersHorizontal,
  Flame,
  AlertTriangle,
  Sparkles
} from 'lucide-react';

interface NavbarProps {
  currentRole: ActiveRole;
  onSelectRole: (role: ActiveRole) => void;
  networkSummary?: {
    totalNodes: number;
    totalEdges: number;
    totalRoads: number;
    totalSignals: number;
    totalEmergency: number;
  };
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onSelectRole,
  networkSummary = { totalNodes: 56, totalEdges: 126, totalRoads: 64, totalSignals: 20, totalEmergency: 35 }
}) => {
  return (
    <header className="h-16 bg-[#0B0F19]/95 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-6 flex items-center justify-between sticky top-0 z-40 select-none">
      {/* Brand & System Status */}
      <div className="flex items-center gap-3">
        <div 
          onClick={() => onSelectRole('LANDING')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 p-0.5 shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all duration-300">
            <div className="w-full h-full bg-[#0B0F19] rounded-[10px] flex items-center justify-center">
              <Compass className="w-5 h-5 text-cyan-400 group-hover:rotate-45 transition-transform duration-500" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                UrbanFlow <span className="text-cyan-400 font-black">AI</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 font-semibold tracking-wider">
                STEP 1
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Hyderabad Real Road Network &amp; Emergency Graph
            </p>
          </div>
        </div>

        {/* Live Network Pill */}
        <div className="hidden xl:flex items-center gap-2 ml-4 pl-4 border-l border-slate-800 text-xs text-slate-400 font-mono">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-slate-300">HYD NET:</span>
          <span className="text-cyan-300 font-semibold">{networkSummary.totalRoads} Roads</span>
          <span className="text-slate-600">•</span>
          <span className="text-blue-300 font-semibold">{networkSummary.totalNodes} Nodes</span>
          <span className="text-slate-600">•</span>
          <span className="text-amber-300 font-semibold">{networkSummary.totalSignals} Signals</span>
          <span className="text-slate-600">•</span>
          <span className="text-emerald-300 font-semibold">{networkSummary.totalEmergency} Emergency Hubs</span>
        </div>
      </div>

      {/* Role Navigation Buttons */}
      <div className="flex items-center gap-1 sm:gap-2 bg-slate-900/90 p-1 rounded-xl border border-slate-800/80">
        <button
          onClick={() => onSelectRole('LANDING')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
            currentRole === 'LANDING'
              ? 'bg-gradient-to-r from-slate-800 to-slate-700 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Overview</span>
        </button>

        <button
          onClick={() => onSelectRole('USER')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
            currentRole === 'USER'
              ? 'bg-blue-600/90 text-white shadow-sm shadow-blue-500/20'
              : 'text-slate-400 hover:text-blue-400 hover:bg-slate-800/40'
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-blue-400" />
          <span>User Dashboard</span>
        </button>

        <button
          onClick={() => onSelectRole('EMERGENCY')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
            currentRole === 'EMERGENCY'
              ? 'bg-red-600/90 text-white shadow-sm shadow-red-500/20'
              : 'text-slate-400 hover:text-red-400 hover:bg-slate-800/40'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
          <span>Emergency</span>
        </button>

        <button
          onClick={() => onSelectRole('ADMIN')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
            currentRole === 'ADMIN'
              ? 'bg-purple-600/90 text-white shadow-sm shadow-purple-500/20'
              : 'text-slate-400 hover:text-purple-400 hover:bg-slate-800/40'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
          <span>Admin</span>
        </button>
      </div>
    </header>
  );
};
