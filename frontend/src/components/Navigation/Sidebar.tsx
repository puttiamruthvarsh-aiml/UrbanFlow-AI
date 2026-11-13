import React from 'react';
import { ActiveRole } from '../../types/network';
import { 
  Navigation, 
  Map, 
  Video, 
  TrendingUp, 
  Clock, 
  Bell, 
  Settings, 
  Siren, 
  Flame, 
  ShieldCheck, 
  Sliders, 
  Radio, 
  Activity, 
  Layers, 
  AlertOctagon,
  Building2,
  Car,
  Compass
} from 'lucide-react';

interface SidebarProps {
  currentRole: ActiveRole;
  activeNav: string;
  onSelectNav: (item: string) => void;
  onFlyToHub: (hubKey: string) => void;
}

export const HYDERABAD_HUBS = [
  { key: 'all', name: 'Hyderabad Metropole', lat: 17.4200, lon: 78.4400, zoom: 11.2 },
  { key: 'hitech', name: 'Hitech City', lat: 17.4504, lon: 78.3808, zoom: 13.8 },
  { key: 'madhapur', name: 'Madhapur', lat: 17.4412, lon: 78.3882, zoom: 14.0 },
  { key: 'gachibowli', name: 'Gachibowli', lat: 17.4358, lon: 78.3610, zoom: 13.5 },
  { key: 'jubilee', name: 'Jubilee Hills', lat: 17.4319, lon: 78.4073, zoom: 13.8 },
  { key: 'banjara', name: 'Banjara Hills', lat: 17.4156, lon: 78.4357, zoom: 13.8 },
  { key: 'ameerpet', name: 'Ameerpet', lat: 17.4375, lon: 78.4483, zoom: 14.0 },
  { key: 'secunderabad', name: 'Secunderabad', lat: 17.4410, lon: 78.4983, zoom: 13.8 },
  { key: 'uppal', name: 'Uppal', lat: 17.4019, lon: 78.5602, zoom: 13.8 },
  { key: 'lbnagar', name: 'LB Nagar', lat: 17.3458, lon: 78.5522, zoom: 13.8 }
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentRole,
  activeNav,
  onSelectNav,
  onFlyToHub
}) => {
  // Navigation definitions based on MD Functional Specification
  const getUserNavItems = () => [
    { id: 'plan', label: 'Plan Trip', icon: Navigation, activeColor: 'text-blue-400' },
    { id: 'live_map', label: 'Live Hyderabad Map', icon: Map, activeColor: 'text-cyan-400' },
    { id: 'cctv_vision', label: 'CCTV Vision (Step 2)', icon: Video, activeColor: 'text-indigo-400' },
    { id: 'forecast', label: 'Traffic Forecast (Step 3)', icon: TrendingUp, activeColor: 'text-amber-400' },
    { id: 'my_trips', label: 'Trip History', icon: Clock, activeColor: 'text-slate-400' },
    { id: 'alerts', label: 'Network Alerts', icon: Bell, activeColor: 'text-yellow-400' },
  ];

  const getEmergencyNavItems = () => [
    { id: 'emergency_route', label: 'Emergency Mission', icon: Siren, activeColor: 'text-red-400' },
    { id: 'live_map', label: 'Live Hyderabad Map', icon: Map, activeColor: 'text-cyan-400' },
    { id: 'active_missions', label: 'Active Missions', icon: ShieldCheck, activeColor: 'text-emerald-400' },
    { id: 'corridors', label: 'Priority Corridors (Step 5)', icon: Radio, activeColor: 'text-purple-400' },
    { id: 'cctv_feeds', label: 'CCTV Feeds', icon: Video, activeColor: 'text-indigo-400' },
    { id: 'hospitals_filter', label: 'Hospitals & Trauma', icon: Building2, activeColor: 'text-emerald-400' },
  ];

  const getAdminNavItems = () => [
    { id: 'overview', label: 'System Overview', icon: Activity, activeColor: 'text-purple-400' },
    { id: 'live_map', label: 'City-Wide Map', icon: Map, activeColor: 'text-cyan-400' },
    { id: 'road_control', label: 'Road Segment Control', icon: Sliders, activeColor: 'text-amber-400' },
    { id: 'incidents', label: 'Incident Monitor', icon: AlertOctagon, activeColor: 'text-red-400' },
    { id: 'cctv_network', label: 'CCTV Camera Grid', icon: Video, activeColor: 'text-blue-400' },
    { id: 'analytics', label: 'Network Analytics', icon: TrendingUp, activeColor: 'text-emerald-400' },
  ];

  const navItems = 
    currentRole === 'USER' ? getUserNavItems() :
    currentRole === 'EMERGENCY' ? getEmergencyNavItems() :
    getAdminNavItems();

  return (
    <aside className="w-64 bg-[#0B0F19]/90 border-r border-slate-800/80 flex flex-col h-[calc(100vh-4rem)] p-3 select-none overflow-y-auto">
      {/* Role Banner */}
      <div className="mb-4 p-3 rounded-xl bg-slate-900/80 border border-slate-800/70">
        <div className="flex items-center gap-2 mb-1">
          {currentRole === 'USER' && <Car className="w-4 h-4 text-blue-400" />}
          {currentRole === 'EMERGENCY' && <Siren className="w-4 h-4 text-red-400" />}
          {currentRole === 'ADMIN' && <Sliders className="w-4 h-4 text-purple-400" />}
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            {currentRole === 'USER' && 'Normal User Workspace'}
            {currentRole === 'EMERGENCY' && 'Emergency Command'}
            {currentRole === 'ADMIN' && 'Traffic Admin Console'}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 leading-tight">
          Shared road network graph loaded with OSM geometry and real-time state.
        </p>
      </div>

      {/* Role Navigation Items */}
      <div className="mb-5 space-y-1">
        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold px-2 mb-1.5">
          Workspace Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectNav(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-slate-800 text-white border border-slate-700/80 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? item.activeColor : 'text-slate-400'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Quick Fly-To Hubs in Hyderabad */}
      <div className="mt-auto pt-3 border-t border-slate-800/80">
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-semibold flex items-center gap-1.5">
            <Compass className="w-3 h-3 text-cyan-400" />
            Hyderabad Hubs
          </span>
          <span className="text-[9px] text-slate-400">Click to Fly</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
          {HYDERABAD_HUBS.map((hub) => (
            <button
              key={hub.key}
              onClick={() => onFlyToHub(hub.key)}
              className="text-left px-2 py-1.5 rounded bg-slate-900/60 hover:bg-cyan-950/60 border border-slate-800/60 hover:border-cyan-800/60 text-[11px] text-slate-300 hover:text-cyan-300 font-medium transition-all truncate"
              title={`Center on ${hub.name}`}
            >
              {hub.name}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
};
