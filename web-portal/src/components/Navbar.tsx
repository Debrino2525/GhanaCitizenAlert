import React from 'react';
import { Shield, Bell, AlertTriangle, Radio, PhoneCall, CheckCircle2, ShieldCheck, BarChart3 } from 'lucide-react';
import { EmergencyAlert } from '../types';

interface NavbarProps {
  activeTab: 'COMMAND' | 'MODERATOR' | 'ALERTS' | 'FEED' | 'ANALYTICS';
  setActiveTab: (tab: 'COMMAND' | 'MODERATOR' | 'ALERTS' | 'FEED' | 'ANALYTICS') => void;
  activeAlerts: EmergencyAlert[];
  onOpenAlertModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  activeAlerts,
  onOpenAlertModal
}) => {
  const activeAmberOrRed = activeAlerts.find(a => a.isActive);

  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-xl">
      {/* Ghana Flag Header Accent Line */}
      <div className="h-1.5 w-full flex">
        <div className="flex-1 bg-[#CE1126]" />
        <div className="flex-1 bg-[#FCD116]" />
        <div className="flex-1 bg-[#006B3F]" />
      </div>

      {/* Emergency Alert Ticker (If Active) */}
      {activeAmberOrRed && (
        <div 
          onClick={onOpenAlertModal}
          className={`cursor-pointer px-4 py-2 text-xs md:text-sm font-semibold flex items-center justify-between transition-all ${
            activeAmberOrRed.alertType === 'RED' 
              ? 'bg-red-600/90 hover:bg-red-600 text-white animate-pulse' 
              : 'bg-amber-500/95 hover:bg-amber-500 text-black'
          }`}
        >
          <div className="flex items-center space-x-2 max-w-5xl mx-auto w-full">
            <Radio className="w-4 h-4 animate-spin shrink-0" />
            <span className="font-extrabold tracking-wider uppercase">
              [{activeAmberOrRed.alertType} ALERT GEOFENCE BROADCAST ACTIVE]:
            </span>
            <span className="truncate">{activeAmberOrRed.title}</span>
            <span className="hidden sm:inline-block ml-auto text-xs opacity-90 underline font-bold">
              View Citizen Sightings & Broadcast Map &rarr;
            </span>
          </div>
        </div>
      )}

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ghana-gold via-amber-600 to-ghana-red flex items-center justify-center shadow-lg shadow-amber-900/30">
              <Shield className="w-6 h-6 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-black tracking-tight text-white">CITIZEN<span className="text-ghana-gold">ALERT</span></span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 uppercase">
                  GHANA 🇬🇭
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">National Command Center & Portals</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => setActiveTab('COMMAND')}
              className={`px-3 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all flex items-center space-x-1.5 ${
                activeTab === 'COMMAND'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Agency Command</span>
            </button>

            <button
              onClick={() => setActiveTab('MODERATOR')}
              className={`px-3 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all flex items-center space-x-1.5 ${
                activeTab === 'MODERATOR'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Moderator Console</span>
            </button>

            <button
              onClick={() => setActiveTab('ALERTS')}
              className={`px-3 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all flex items-center space-x-1.5 relative ${
                activeTab === 'ALERTS'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Red / Amber Alerts</span>
            </button>

            <button
              onClick={() => setActiveTab('FEED')}
              className={`px-3 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all flex items-center space-x-1.5 ${
                activeTab === 'FEED'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Public Feed</span>
            </button>

            <button
              onClick={() => setActiveTab('ANALYTICS')}
              className={`px-3 py-2 rounded-lg text-xs md:text-sm font-semibold transition-all flex items-center space-x-1.5 ${
                activeTab === 'ANALYTICS'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Analytics</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
