import React, { useState } from 'react';
import { Sidebar } from '../components/Navigation/Sidebar';
import { CentralTrafficMap } from '../components/Map/CentralTrafficMap';
import { SelectedMapEntity } from '../types/network';
import emergencyData from '../data/emergency_locations.json';
import { 
  Siren, 
  Flame, 
  ShieldCheck, 
  Building2, 
  Radio, 
  MapPin, 
  Activity, 
  Cross, 
  AlertTriangle,
  Compass,
  CheckCircle2,
  Clock,
  Phone
} from 'lucide-react';

export const EmergencyDashboard: React.FC = () => {
  const [activeNav, setActiveNav] = useState<string>('live_map');
  const [selectedHub, setSelectedHub] = useState<string>('all');
  const [vehicleType, setVehicleType] = useState<'AMBULANCE' | 'FIRE' | 'POLICE'>('AMBULANCE');
  const [selectedHospital, setSelectedHospital] = useState<string>('Apollo Hospitals Jubilee Hills');
  const [selectedEntity, setSelectedEntity] = useState<SelectedMapEntity>(null);

  const hospitalCount = emergencyData.hospitals.length;
  const policeCount = emergencyData.police_stations.length;
  const fireCount = emergencyData.fire_stations.length;

  const emergencyHospitals = [
    { name: 'Apollo Hospitals Jubilee Hills', hub: 'jubilee', beds: 450, trauma: 'Level 1', phone: '+91 40 2360 7777' },
    { name: 'CARE Hospitals Banjara Hills', hub: 'banjara', beds: 350, trauma: 'Level 1', phone: '+91 40 6165 6565' },
    { name: 'Continental Hospitals Gachibowli', hub: 'gachibowli', beds: 750, trauma: 'Level 1', phone: '+91 40 6700 0000' },
    { name: 'AIG Hospitals Mindspace Gachibowli', hub: 'hitech', beds: 800, trauma: 'Level 1', phone: '+91 40 4244 4222' },
    { name: 'Yashoda Hospitals Secunderabad', hub: 'secunderabad', beds: 500, trauma: 'Level 1', phone: '+91 40 4567 4567' },
    { name: 'Gandhi Hospital Musheerabad', hub: 'secunderabad', beds: 1200, trauma: 'Level 1', phone: '+91 40 2750 5566' },
    { name: 'Spark Hospitals LB Nagar', hub: 'lbnagar', beds: 200, trauma: 'Level 2', phone: '+91 40 2404 4444' },
    { name: 'TX Hospitals Uppal', hub: 'uppal', beds: 250, trauma: 'Level 2', phone: '+91 40 6815 1515' }
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden select-none">
      {/* Role Sidebar */}
      <Sidebar
        currentRole="EMERGENCY"
        activeNav={activeNav}
        onSelectNav={setActiveNav}
        onFlyToHub={setSelectedHub}
      />

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col xl:flex-row overflow-hidden relative">
        {/* Left Side: Emergency Command Drawer */}
        <div className="w-full xl:w-96 bg-[#0E1526]/95 border-r border-slate-800/80 p-4 overflow-y-auto space-y-4 shrink-0">
          {/* Emergency Mission Box */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-red-900/50 space-y-3 shadow-lg shadow-red-950/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-red-400 flex items-center gap-1.5 font-mono uppercase tracking-wider">
                <Siren className="w-4 h-4 text-red-400 animate-pulse" />
                Emergency Mission Control
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800 font-semibold">
                ACTIVE GRAPH
              </span>
            </div>

            {/* Vehicle Type Selector */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => setVehicleType('AMBULANCE')}
                className={`p-2 rounded-xl text-center flex flex-col items-center gap-1 transition-all ${
                  vehicleType === 'AMBULANCE'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                <Cross className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] font-bold">Ambulance</span>
              </button>

              <button
                onClick={() => setVehicleType('FIRE')}
                className={`p-2 rounded-xl text-center flex flex-col items-center gap-1 transition-all ${
                  vehicleType === 'FIRE'
                    ? 'bg-orange-600 text-white shadow-md'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-[10px] font-bold">Fire Rescue</span>
              </button>

              <button
                onClick={() => setVehicleType('POLICE')}
                className={`p-2 rounded-xl text-center flex flex-col items-center gap-1 transition-all ${
                  vehicleType === 'POLICE'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span className="text-[10px] font-bold">Police Patrol</span>
              </button>
            </div>

            {/* Target Destination Hospital */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 block font-mono">
                Assigned Emergency Facility (Mapped from OSM)
              </label>
              <select
                value={selectedHospital}
                onChange={(e) => setSelectedHospital(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-red-500 font-medium"
              >
                {emergencyHospitals.map(h => (
                  <option key={h.name} value={h.name}>{h.name}</option>
                ))}
              </select>
            </div>

            <div className="p-3 rounded-xl bg-red-950/30 border border-red-900/60 text-[11px] text-slate-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-red-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-red-400" />
                Physical Facility Mapped
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                {hospitalCount} hospitals, {policeCount} police stations, and {fireCount} fire stations mapped with verified coordinates and emergency contact details.
              </p>
            </div>
          </div>

          {/* Quick Facility Teleport */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-mono uppercase tracking-wider">
              <Building2 className="w-4 h-4 text-emerald-400" />
              Major Emergency Hospitals
            </span>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {emergencyHospitals.map((hosp) => (
                <div
                  key={hosp.name}
                  onClick={() => setSelectedHub(hosp.hub)}
                  className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-emerald-600/60 cursor-pointer transition-all space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 text-xs truncate max-w-[200px]">
                      {hosp.name}
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
                      {hosp.trauma}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>{hosp.beds} Beds</span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Phone className="w-2.5 h-2.5" />
                      {hosp.phone}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Central Hyderabad Map */}
        <div className="flex-1 h-full p-3 bg-[#0B0F19]">
          <CentralTrafficMap
            currentRole="EMERGENCY"
            selectedHubKey={selectedHub}
            onSelectEntity={setSelectedEntity}
          />
        </div>
      </main>
    </div>
  );
};
