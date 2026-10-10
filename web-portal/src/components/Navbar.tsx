import React, { useRef, useEffect } from 'react';
import { Shield, AlertTriangle, Radio, CheckCircle2, ShieldCheck, BarChart3 } from 'lucide-react';
import { EmergencyAlert, OfficerUser } from '../types';
import { OfficerBadgeProfile } from './OfficerBadgeProfile';

interface NavbarProps {
  activeTab: 'COMMAND' | 'MODERATOR' | 'ALERTS' | 'FEED' | 'ANALYTICS';
  setActiveTab: (tab: 'COMMAND' | 'MODERATOR' | 'ALERTS' | 'FEED' | 'ANALYTICS') => void;
  activeAlerts: EmergencyAlert[];
  onOpenAlertModal: () => void;
  currentOfficer: OfficerUser | null;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  onOpenOfficerProvisioning?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  activeAlerts,
  onOpenAlertModal,
  currentOfficer,
  onOpenAuthModal,
  onLogout,
  onOpenOfficerProvisioning
}) => {
  const headerRef = useRef<HTMLElement>(null);
  const activeAmberOrRed = activeAlerts.find(a => a.isActive);

  // Measure real header height and sync --header-h CSS custom property
  useEffect(() => {
    if (!headerRef.current) return;
    const updateHeaderHeight = () => {
      if (headerRef.current) {
        const height = headerRef.current.getBoundingClientRect().height;
        document.documentElement.style.setProperty('--header-h', `${height}px`);
      }
    };

    updateHeaderHeight();
    const observer = new ResizeObserver(() => updateHeaderHeight());
    observer.observe(headerRef.current);

    return () => observer.disconnect();
  }, [activeAmberOrRed]);

  const navItems = [
    { id: 'COMMAND' as const, label: 'Command', icon: Shield, activeColor: 'bg-blue-600 text-white shadow-md shadow-blue-600/30' },
    { id: 'MODERATOR' as const, label: 'Moderator', icon: ShieldCheck, activeColor: 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' },
    { id: 'ALERTS' as const, label: 'Broadcasts', icon: AlertTriangle, activeColor: 'bg-red-600 text-white shadow-md shadow-red-600/30' },
    { id: 'FEED' as const, label: 'Public Feed', icon: CheckCircle2, activeColor: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' },
    { id: 'ANALYTICS' as const, label: 'Analytics', icon: BarChart3, activeColor: 'bg-amber-600 text-white shadow-md shadow-amber-600/30' },
  ];

  return (
    <header ref={headerRef} className="sticky top-0 z-header bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-xl transition-all">
      {/* Ghana Flag Header Accent Line */}
      <div className="h-1 w-full flex">
        <div className="flex-1 bg-[#CE1126]" />
        <div className="flex-1 bg-[#FCD116]" />
        <div className="flex-1 bg-[#006B3F]" />
      </div>

      {/* Emergency Alert Ticker (If Active) */}
      {activeAmberOrRed && (
        <div 
          role="alert"
          onClick={onOpenAlertModal}
          className={`cursor-pointer px-4 py-1.5 text-xs md:text-sm font-semibold transition-all ${
            activeAmberOrRed.alertType === 'RED' 
              ? 'bg-red-600/90 hover:bg-red-600 text-white animate-pulse' 
              : 'bg-amber-500/95 hover:bg-amber-500 text-black'
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <Radio className="w-3.5 h-3.5 animate-spin shrink-0" />
              <span className="font-extrabold tracking-wider uppercase shrink-0 text-[11px] sm:text-xs">
                [{activeAmberOrRed.alertType} ALERT GEOFENCE BROADCAST]:
              </span>
              <span className="truncate" title={activeAmberOrRed.title}>{activeAmberOrRed.title}</span>
            </div>
            <span className="hidden sm:inline-block ml-auto text-xs opacity-90 underline font-bold whitespace-nowrap shrink-0">
              View Citizen Sightings & Broadcast Map &rarr;
            </span>
          </div>
        </div>
      )}

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Brand */}
          <div className="flex items-center space-x-3 shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-ghana-gold via-amber-600 to-ghana-red flex items-center justify-center shadow-lg shadow-amber-900/30 shrink-0">
              <Shield className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="text-base sm:text-lg font-black tracking-tight text-white whitespace-nowrap">
                  CITIZEN<span className="text-ghana-gold">ALERT</span>
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 uppercase whitespace-nowrap hidden sm:inline-block">
                  GHANA 🇬🇭
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate hidden sm:block">National Command Center & Portals</p>
            </div>
          </div>

          {/* Navigation Tabs & Officer Profile */}
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            <nav className="flex items-center space-x-1 overflow-x-auto scrollbar-thin py-1">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    title={item.label}
                    aria-label={item.label}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 whitespace-nowrap shrink-0 ${
                      isActive
                        ? item.activeColor
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span className={isActive ? 'inline' : 'hidden xl:inline'}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </nav>

            <div className="pl-2 border-l border-slate-800 shrink-0">
              <OfficerBadgeProfile
                officer={currentOfficer}
                onOpenAuthModal={onOpenAuthModal}
                onLogout={onLogout}
                onOpenOfficerProvisioning={onOpenOfficerProvisioning}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
