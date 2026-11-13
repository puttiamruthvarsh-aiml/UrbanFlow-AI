import React from 'react';
import { Video, ShieldAlert, Radio, Eye, Camera, Activity, AlertTriangle, Layers } from 'lucide-react';

export const CCTVVisionPanel: React.FC = () => {
  const sampleCCTVs = [
    { id: 'cctv_01', name: 'Cyber Towers 4-Way Junction', status: 'ONLINE', resolution: '1080p', node: 'node_cyber_towers', area: 'Hitech City' },
    { id: 'cctv_02', name: 'Bio-Diversity Flyover Junction', status: 'ONLINE', resolution: '1080p', node: 'node_biodiversity', area: 'Gachibowli' },
    { id: 'cctv_03', name: 'Jubilee Hills Checkpost', status: 'ONLINE', resolution: '1080p', node: 'node_jh_checkpost', area: 'Jubilee Hills' },
    { id: 'cctv_04', name: 'Panjagutta Nagarjuna Circle', status: 'ONLINE', resolution: '1080p', node: 'node_panjagutta', area: 'Panjagutta' },
    { id: 'cctv_05', name: 'Paradise X Roads Secunderabad', status: 'ONLINE', resolution: '1080p', node: 'node_paradise', area: 'Secunderabad' },
    { id: 'cctv_06', name: 'LB Nagar Ring Road Gateway', status: 'ONLINE', resolution: '1080p', node: 'node_lbnagar_ring', area: 'LB Nagar' }
  ];

  return (
    <div className="bg-[#111827]/90 border border-slate-800 rounded-2xl p-5 shadow-xl select-none">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-950/80 border border-indigo-800/80 text-indigo-400">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              CCTV Video &amp; Vision Infrastructure
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-semibold">
                STEP 2 READY
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Camera locations mapped to actual road network nodes. YOLO vision processing scheduled for Step 2.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-mono text-emerald-400 font-semibold">6 Feeds Calibrated</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {sampleCCTVs.map((cam) => (
          <div
            key={cam.id}
            className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-indigo-800/60 transition-all space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-slate-300 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-indigo-400" />
                {cam.name}
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-semibold">
                {cam.status}
              </span>
            </div>

            {/* Video Feed Placeholder */}
            <div className="relative aspect-video w-full rounded-lg bg-slate-950 border border-slate-800 flex flex-col items-center justify-center p-3 text-center overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent z-10"></div>
              <Camera className="w-6 h-6 text-slate-600 mb-1 z-20 group-hover:text-indigo-400 transition-colors" />
              <span className="text-[10px] text-slate-400 z-20 font-mono">
                Linked Node: <span className="text-cyan-400 font-bold">{cam.node}</span>
              </span>
              <span className="text-[9px] text-slate-400 z-20">
                Awaiting Step 2 YOLO model inference
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>Region: {cam.area}</span>
              <span>{cam.resolution} • 30 FPS</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
