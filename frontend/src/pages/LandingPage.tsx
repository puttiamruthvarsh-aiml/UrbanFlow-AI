import React, { useState } from 'react';
import { ActiveRole } from '../types/network';
import { CentralTrafficMap } from '../components/Map/CentralTrafficMap';
import { CCTVVisionPanel } from '../components/Vision/CCTVVisionPanel';
import { IntelligenceWorkflow } from '../components/Workflow/IntelligenceWorkflow';
import { 
  Car, 
  Siren, 
  Sliders, 
  ArrowRight, 
  Compass, 
  Network, 
  ShieldAlert, 
  Activity, 
  Layers, 
  MapPin, 
  CheckCircle2,
  Sparkles,
  Radio,
  Building2
} from 'lucide-react';

interface LandingPageProps {
  onSelectRole: (role: ActiveRole) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSelectRole }) => {
  const [selectedHub, setSelectedHub] = useState<string>('all');

  return (
    <div className="space-y-8 pb-12 select-none">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-[#0B0F19] to-slate-950 border border-slate-800 p-8 lg:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/80 text-cyan-400 text-xs font-mono font-semibold">
            <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-ping"></span>
            STEP 1 COMPLETE: REAL HYDERABAD ROAD NETWORK GRAPH
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            UrbanFlow <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">AI</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 font-medium leading-relaxed max-w-3xl">
            An Adaptive Multi-Agent Traffic Intelligence and Emergency Response Optimization System.
            Powered by a real-world, topologically connected directed road graph extracted from OpenStreetMap,
            spanning Hitech City, Madhapur, Gachibowli, Jubilee Hills, Banjara Hills, Ameerpet, Secunderabad, Uppal, and LB Nagar.
          </p>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-xs text-slate-400 font-mono block">Road Network Length</span>
              <span className="text-xl font-black text-cyan-400 font-mono">377.9 km</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-xs text-slate-400 font-mono block">Junction Nodes</span>
              <span className="text-xl font-black text-blue-400 font-mono">56 Nodes</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-xs text-slate-400 font-mono block">Directed Graph Edges</span>
              <span className="text-xl font-black text-emerald-400 font-mono">126 Edges</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-xs text-slate-400 font-mono block">Emergency &amp; Signals</span>
              <span className="text-xl font-black text-amber-400 font-mono">55 Mapped</span>
            </div>
          </div>
        </div>
      </section>

      {/* Role Selection Entry Cards */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-cyan-400" />
            Access Dedicated System Dashboards
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            Shared Network State Across All Roles
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* 1. Normal User Card */}
          <div
            onClick={() => onSelectRole('USER')}
            className="group cursor-pointer p-6 rounded-2xl bg-gradient-to-b from-[#111827] to-[#0E1526] border border-slate-800 hover:border-blue-500/80 shadow-xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                <Car className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-blue-300 transition-colors">
                Normal User Dashboard
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Explore the connected Hyderabad road network, inspect road segment classifications, lane capacities, speeds, and junction geometries across city hubs.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-blue-400 group-hover:text-blue-300">
              <span>Launch User Workspace</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 2. Emergency User Card */}
          <div
            onClick={() => onSelectRole('EMERGENCY')}
            className="group cursor-pointer p-6 rounded-2xl bg-gradient-to-b from-[#111827] to-[#0E1526] border border-slate-800 hover:border-red-500/80 shadow-xl hover:shadow-red-500/10 transition-all duration-300 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform">
                <Siren className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-red-300 transition-colors">
                Emergency Responder
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Monitor critical emergency infrastructure: 14 hospitals, 12 police stations, and 9 fire stations mapped with real contact and response capabilities.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-red-400 group-hover:text-red-300">
              <span>Launch Emergency Command</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* 3. Admin Card */}
          <div
            onClick={() => onSelectRole('ADMIN')}
            className="group cursor-pointer p-6 rounded-2xl bg-gradient-to-b from-[#111827] to-[#0E1526] border border-slate-800 hover:border-purple-500/80 shadow-xl hover:shadow-purple-500/10 transition-all duration-300 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                <Sliders className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors">
                Traffic Admin Console
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                City-wide supervisory control, graph topology metrics, 20 physical traffic signals with phase timings, and CCTV camera link registries.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-purple-400 group-hover:text-purple-300">
              <span>Launch Admin Console</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </section>

      {/* Central Interactive Hyderabad Map Section */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Compass className="w-5 h-5 text-cyan-400" />
              Central Hyderabad Interactive Map (Shared Across All Roles)
            </h2>
            <p className="text-xs text-slate-400">
              Built with MapLibre GL JS &amp; OpenStreetMap. Click any road segment, intersection, traffic signal, or hospital to inspect live attributes.
            </p>
          </div>

          {/* Quick Area Jump */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {[
              { key: 'all', label: 'All Hyderabad' },
              { key: 'hitech', label: 'Hitech City' },
              { key: 'jubilee', label: 'Jubilee Hills' },
              { key: 'secunderabad', label: 'Secunderabad' },
              { key: 'lbnagar', label: 'LB Nagar' }
            ].map((hub) => (
              <button
                key={hub.key}
                onClick={() => setSelectedHub(hub.key)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium font-mono transition-colors shrink-0 ${
                  selectedHub === hub.key
                    ? 'bg-cyan-900/80 text-cyan-300 border border-cyan-700'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                {hub.label}
              </button>
            ))}
          </div>
        </div>

        <div className="h-[620px] w-full">
          <CentralTrafficMap currentRole="LANDING" selectedHubKey={selectedHub} />
        </div>
      </section>

      {/* Dynamic Intelligence Workflow Pipeline */}
      <section>
        <IntelligenceWorkflow />
      </section>

      {/* CCTV Vision Infrastructure Panel (Step 2 Preview) */}
      <section>
        <CCTVVisionPanel />
      </section>
    </div>
  );
};
