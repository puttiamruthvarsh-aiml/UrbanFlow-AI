
import React, { useEffect, useState } from 'react';

import { ActiveRole } from './types/network';
import { Navbar } from './components/Navigation/Navbar';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';

import { UserDashboard } from './pages/UserDashboard';
import { EmergencyDashboard } from './pages/EmergencyDashboard';
import { AdminDashboard } from './pages/AdminDashboard';

import metadata from './data/metadata.json';
import trafficSignalsData from './data/traffic_signals.json';
import emergencyData from './data/emergency_locations.json';

type LoginRole = Exclude<ActiveRole, 'LANDING'>;

interface AuthUser {
  username: string;
  name: string;
  role: LoginRole;
}

const API_BASE_URL = 'http://127.0.0.1:8000';
const TOKEN_KEY = 'urbanflow_access_token';

export const App: React.FC = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const [selectedLoginRole, setSelectedLoginRole] =
    useState<LoginRole | null>(null);

  const [authLoading, setAuthLoading] = useState(true);

  // Validate an existing session whenever the app loads.
  useEffect(() => {
    let active = true;

    const validateSession = async () => {
      const savedToken = localStorage.getItem(TOKEN_KEY);

      if (!savedToken) {
        if (active) setAuthLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${savedToken}`
          }
        });

        if (!response.ok) {
          throw new Error('Session expired');
        }

        const authenticatedUser: AuthUser = await response.json();

        if (active) {
          setToken(savedToken);
          setUser(authenticatedUser);
        }
      } catch {
        localStorage.removeItem(TOKEN_KEY);

        if (active) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (active) setAuthLoading(false);
      }
    };

    validateSession();

    return () => {
      active = false;
    };
  }, []);

  // Role card selection opens the corresponding login screen.
  const handleRoleSelect = (role: ActiveRole) => {
    if (role === 'LANDING') {
      setSelectedLoginRole(null);
      return;
    }

    setSelectedLoginRole(role);
  };

  // Called only after the backend successfully authenticates the user.
  const handleLoginSuccess = (
    accessToken: string,
    authenticatedUser: AuthUser
  ) => {
    localStorage.setItem(TOKEN_KEY, accessToken);

    setToken(accessToken);
    setUser(authenticatedUser);
    setSelectedLoginRole(null);
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);

    setToken(null);
    setUser(null);
    setSelectedLoginRole(null);
  };

  const currentRole: ActiveRole = user ? user.role : 'LANDING';

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center text-cyan-400">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-400">
            Verifying UrbanFlow session...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">

      <Navbar
        currentRole={currentRole}
        isAuthenticated={!!user}
        userName={user?.name}
        onHome={() => setSelectedLoginRole(null)}
        onLogout={handleLogout}
        networkSummary={{
          totalNodes: metadata.total_nodes,
          totalEdges: metadata.total_directed_edges,
          totalRoads: metadata.total_unique_road_segments,
          totalSignals: trafficSignalsData.length,
          totalEmergency: emergencyData.total_facilities
        }}
      />

      <div className="flex-1 w-full">

        {/* Public landing page */}
        {!user && !selectedLoginRole && (
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            <LandingPage onSelectRole={handleRoleSelect} />
          </div>
        )}

        {/* Role-specific login */}
        {!user && selectedLoginRole && (
          <LoginPage
            role={selectedLoginRole}
            onBack={() => setSelectedLoginRole(null)}
            onLoginSuccess={handleLoginSuccess}
          />
        )}

        {/* Authenticated User Dashboard */}
        {user?.role === 'USER' && token && (
          <UserDashboard />
        )}

        {/* Authenticated Emergency Dashboard */}
        {user?.role === 'EMERGENCY' && token && (
          <EmergencyDashboard />
        )}

        {/* Authenticated Admin Dashboard */}
        {user?.role === 'ADMIN' && token && (
          <AdminDashboard />
        )}

      </div>
    </div>
  );
};

export default App;
