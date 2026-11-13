import React, { useState } from 'react';
import { ActiveRole } from './types/network';
import { Navbar } from './components/Navigation/Navbar';
import { LandingPage } from './pages/LandingPage';
import { UserDashboard } from './pages/UserDashboard';
import { EmergencyDashboard } from './pages/EmergencyDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import metadata from './data/metadata.json';
import trafficSignalsData from './data/traffic_signals.json';
import emergencyData from './data/emergency_locations.json';

export const App: React.FC = () => {
  const [currentRole, setCurrentRole] = useState<ActiveRole>(() => {
    try {
      const hash = window.location.hash.replace('#', '').toUpperCase();
      if (['USER', 'EMERGENCY', 'ADMIN', 'LANDING'].includes(hash)) {
        return hash as ActiveRole;
      }
      const params = new URLSearchParams(window.location.search);
      const roleParam = params.get('role')?.toUpperCase();
      if (roleParam && ['USER', 'EMERGENCY', 'ADMIN', 'LANDING'].includes(roleParam)) {
        return roleParam as ActiveRole;
      }
    } catch {}
    return 'USER';
  });

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Navigation Bar with Role Switcher & Live Status */}
      <Navbar
        currentRole={currentRole}
        onSelectRole={setCurrentRole}
        networkSummary={{
          totalNodes: metadata.total_nodes,
          totalEdges: metadata.total_directed_edges,
          totalRoads: metadata.total_unique_road_segments,
          totalSignals: trafficSignalsData.length,
          totalEmergency: emergencyData.total_facilities
        }}
      />

      {/* Main View Area */}
      <div className="flex-1 w-full">
        {currentRole === 'LANDING' && (
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            <LandingPage onSelectRole={setCurrentRole} />
          </div>
        )}

        {currentRole === 'USER' && <UserDashboard />}

        {currentRole === 'EMERGENCY' && <EmergencyDashboard />}

        {currentRole === 'ADMIN' && <AdminDashboard />}
      </div>
    </div>
  );
};

export default App;
