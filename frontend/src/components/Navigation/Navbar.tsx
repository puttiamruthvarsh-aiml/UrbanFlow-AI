
import React from 'react';
import { ActiveRole } from '../../types/network';
import {
  Activity,
  Compass,
  LogOut,
  ShieldCheck,
  Siren,
  Car
} from 'lucide-react';

interface NavbarProps {
  currentRole: ActiveRole;
  isAuthenticated: boolean;
  userName?: string;
  onHome: () => void;
  onLogout: () => void;

  networkSummary?: {
    totalNodes: number;
    totalEdges: number;
    totalRoads: number;
    totalSignals: number;
    totalEmergency: number;
  };
}

const roleLabels = {
  USER: 'Normal User',
  EMERGENCY: 'Emergency Responder',
  ADMIN: 'System Administrator'
};

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  isAuthenticated,
  userName,
  onHome,
  onLogout,
  networkSummary = {
    totalNodes: 56,
    totalEdges: 126,
    totalRoads: 64,
    totalSignals: 20,
    totalEmergency: 35
  }
}) => {
  const RoleIcon =
    currentRole === 'ADMIN'
      ? ShieldCheck
      : currentRole === 'EMERGENCY'
        ? Siren
        : Car;

  return (
    <header className="min-h-16 bg-[#0B0F19]/95 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-6 py-2 flex items-center justify-between sticky top-0 z-40">

      {/* Brand */}
      <button
        onClick={!isAuthenticated ? onHome : undefined}
        className="flex items-center gap-2.5 text-left"
      >
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 p-0.5">
          <div className="w-full h-full bg-[#0B0F19] rounded-[10px] flex items-center justify-center">
            <Compass className="w-5 h-5 text-cyan-400" />
          </div>
        </div>

        <div>
          <span className="font-extrabold text-lg tracking-tight text-white">
            UrbanFlow <span className="text-cyan-400">AI</span>
          </span>

          <p className="text-[11px] text-slate-400 hidden sm:block">
            Intelligent Urban Traffic Management
          </p>
        </div>
      </button>

      {/* Network information */}
      <div className="hidden xl:flex items-center gap-2 text-xs text-slate-400 font-mono">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-slate-300">HYD NET:</span>
        <span className="text-cyan-300">{networkSummary.totalRoads} Roads</span>
        <span>•</span>
        <span className="text-blue-300">{networkSummary.totalNodes} Nodes</span>
        <span>•</span>
        <span className="text-amber-300">{networkSummary.totalSignals} Signals</span>
      </div>

      {/* Authenticated user controls */}
      {isAuthenticated ? (
        <div className="flex items-center gap-3">

          <div className="hidden sm:flex items-center gap-2 text-right">
            <RoleIcon className="w-4 h-4 text-cyan-400" />

            <div>
              <p className="text-xs font-semibold text-white">
                {userName}
              </p>

              <p className="text-[10px] text-cyan-400">
                {roleLabels[currentRole as keyof typeof roleLabels]}
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 text-xs font-semibold transition-colors"
          >
            <LogOut size={15} />
            <span>Logout</span>
          </button>

        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-emerald-400">
          <Activity size={15} />
          <span className="hidden sm:inline">System Online</span>
        </div>
      )}

    </header>
  );
};
