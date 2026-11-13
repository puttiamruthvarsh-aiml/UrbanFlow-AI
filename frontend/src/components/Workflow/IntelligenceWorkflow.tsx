import React from 'react';
import { 
  Network, 
  Eye, 
  BrainCircuit, 
  AlertOctagon, 
  Cpu, 
  ShieldAlert, 
  LayoutDashboard,
  CheckCircle2,
  Clock
} from 'lucide-react';

export const IntelligenceWorkflow: React.FC = () => {
  const steps = [
    {
      step: 1,
      title: 'Road Network Graph',
      desc: 'Real OpenStreetMap Hyderabad graph (56 nodes, 126 edges, 20 signals, 35 emergency hubs).',
      icon: Network,
      active: true,
      color: 'border-cyan-500 bg-cyan-950/40 text-cyan-400',
      status: 'COMPLETED & ACTIVE'
    },
    {
      step: 2,
      title: 'YOLO Computer Vision',
      desc: 'Vehicle counting, density estimation & stopped-vehicle detection from junction CCTV streams.',
      icon: Eye,
      active: false,
      color: 'border-slate-800 bg-slate-900/60 text-slate-500',
      status: 'STEP 2 UPCOMING'
    },
    {
      step: 3,
      title: 'ML Congestion Forecast',
      desc: 'Predicting traffic bottlenecks and recurring delays 15–30 minutes ahead across road segments.',
      icon: BrainCircuit,
      active: false,
      color: 'border-slate-800 bg-slate-900/60 text-slate-500',
      status: 'STEP 3'
    },
    {
      step: 4,
      title: 'Incident Analysis',
      desc: 'Combining manual incidents, sensor anomalies, and CCTV alerts into verified network events.',
      icon: AlertOctagon,
      active: false,
      color: 'border-slate-800 bg-slate-900/60 text-slate-500',
      status: 'STEP 4'
    },
    {
      step: 5,
      title: 'Adaptive Route Optimization',
      desc: 'Dijkstra & A* algorithms routing around closures and congestion with clear explanations.',
      icon: Cpu,
      active: false,
      color: 'border-slate-800 bg-slate-900/60 text-slate-500',
      status: 'STEP 5'
    },
    {
      step: 6,
      title: 'Emergency Multi-Agent',
      desc: 'Priority corridor creation with automatic normal-user traffic diversions and agent consensus.',
      icon: ShieldAlert,
      active: false,
      color: 'border-slate-800 bg-slate-900/60 text-slate-500',
      status: 'STEP 6'
    },
    {
      step: 7,
      title: 'Cross-Role Dashboards',
      desc: 'Synchronized live state across User, Emergency, and Admin dashboards through WebSocket bus.',
      icon: LayoutDashboard,
      active: false,
      color: 'border-slate-800 bg-slate-900/60 text-slate-500',
      status: 'STEP 7'
    }
  ];

  return (
    <div className="bg-[#111827]/90 border border-slate-800 rounded-2xl p-5 shadow-xl select-none">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
        <div>
          <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
            Dynamic Intelligence Workflow
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-semibold">
              STEP 1 FOUNDATION
            </span>
          </h3>
          <p className="text-xs text-slate-400">
            End-to-end multi-agent traffic intelligence architecture according to the functional specification.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {steps.map((st) => {
          const Icon = st.icon;
          return (
            <div
              key={st.step}
              className={`p-3.5 rounded-xl border transition-all ${st.color} flex flex-col justify-between space-y-2`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase">
                  Stage 0{st.step}
                </span>
                {st.active ? (
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4 shrink-0" />
                  <h4 className="font-bold text-xs text-slate-100 leading-snug">
                    {st.title}
                  </h4>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  {st.desc}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800/80">
                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  st.active ? 'bg-cyan-900/80 text-cyan-200 border border-cyan-700' : 'bg-slate-800/80 text-slate-400'
                }`}>
                  {st.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
