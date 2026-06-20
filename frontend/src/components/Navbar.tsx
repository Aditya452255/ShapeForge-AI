import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, ShieldAlert, Cpu } from 'lucide-react';
import { API_BASE_URL } from '../api/client';

interface NavbarProps {
  title: string;
}

export const Navbar: React.FC<NavbarProps> = ({ title }) => {
  const [backendHealthy, setBackendHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const resp = await axios.get(`${API_BASE_URL}/`);
        if (resp.data && resp.data.status === 'healthy') {
          setBackendHealthy(true);
        } else {
          setBackendHealthy(false);
        }
      } catch (err) {
        setBackendHealthy(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
      <div>
        <h1 className="text-xl font-semibold text-gray-800 tracking-tight flex items-center gap-2">
          <Cpu className="w-5 h-5 text-indigo-600" />
          {title}
        </h1>
      </div>
      
      <div className="flex items-center space-x-4">
        {/* Backend Connectivity Status */}
        <div className="flex items-center space-x-2">
          {backendHealthy === true ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-250">
              <Activity className="w-3.5 h-3.5 mr-1 animate-pulse text-emerald-500" />
              API Connected
            </span>
          ) : backendHealthy === false ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-250">
              <ShieldAlert className="w-3.5 h-3.5 mr-1 text-rose-500" />
              API Offline
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-250">
              Checking status...
            </span>
          )}
        </div>
        
        {/* User Info / Context */}
        <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
          <div className="text-right">
            <p className="text-xs text-gray-400">System Mode</p>
            <p className="text-sm font-semibold text-gray-700">CAD/Vision Sandbox</p>
          </div>
        </div>
      </div>
    </header>
  );
};
