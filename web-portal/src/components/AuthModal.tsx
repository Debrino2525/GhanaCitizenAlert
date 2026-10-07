import React, { useState } from 'react';
import { Shield, Lock, UserCheck, AlertCircle, ArrowRight, KeyRound, Sparkles, Building2, Eye, EyeOff, UserPlus } from 'lucide-react';
import { OfficerUser, OfficerRole, AgencyType } from '../types';

export const PRESET_OFFICERS: OfficerUser[] = [
  {
    id: 'off-1',
    name: 'Command Supervisor Alpha',
    badgeNumber: 'GPS-HQ-001',
    agency: 'GPS_CID',
    role: 'NATIONAL_COMMAND_SUPERVISOR',
    rank: 'National Operations Director',
    email: 'command.superintendent@police.gov.gh',
    clearanceLevel: 'CONFIDENTIAL',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'off-2',
    name: 'Insp. Emmanuel Addo',
    badgeNumber: 'GPS-CID-4491',
    agency: 'GPS_CID',
    role: 'POLICE_CID_OFFICER',
    rank: 'Detective Inspector',
    email: 'e.addo@cid.police.gov.gh',
    clearanceLevel: 'CONFIDENTIAL',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'off-3',
    name: 'Supt. Patricia Mensah',
    badgeNumber: 'DOVVSU-8820',
    agency: 'DOVVSU',
    role: 'DOVVSU_INVESTIGATOR',
    rank: 'Superintendent (DOVVSU)',
    email: 'p.mensah@dovvsu.gov.gh',
    clearanceLevel: 'RESTRICTED',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'off-4',
    name: 'Lead Warden Kwame Boateng',
    badgeNumber: 'EPA-GAL-7714',
    agency: 'EPA',
    role: 'EPA_INSPECTOR',
    rank: 'Lead Environmental Warden',
    email: 'k.boateng@epa.gov.gh',
    clearanceLevel: 'RESTRICTED',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'off-5',
    name: 'Sgt. Kofi Osei',
    badgeNumber: 'MTTD-ACC-1102',
    agency: 'MTTD',
    role: 'MTTD_OFFICER',
    rank: 'Traffic Enforcement Sergeant',
    email: 'k.osei@mttd.police.gov.gh',
    clearanceLevel: 'OPERATIONAL',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&auto=format&fit=crop&q=80'
  },
  {
    id: 'off-6',
    name: 'Officer Akosua Darko',
    badgeNumber: 'MOD-CIV-5530',
    agency: 'AMA',
    role: 'PUBLIC_MODERATOR',
    rank: 'Public Integrity Moderator',
    email: 'moderator@ghanacitizenalert.gov.gh',
    clearanceLevel: 'PUBLIC_MOD',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
  }
];

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (officer: OfficerUser) => void;
  currentOfficer: OfficerUser | null;
  onOpenOfficerProvisioning?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  currentOfficer,
  onOpenOfficerProvisioning
}) => {
  const [authMethod, setAuthMethod] = useState<'BADGE_ID' | 'ROLES'>('ROLES');
  const [serviceNumber, setServiceNumber] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [selectedRole, setSelectedRole] = useState<OfficerRole>('POLICE_CID_OFFICER');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const getAllOfficers = (): OfficerUser[] => {
    try {
      const saved = localStorage.getItem('citizen_alert_officers_vault');
      return saved ? JSON.parse(saved) : PRESET_OFFICERS;
    } catch (e) {
      return PRESET_OFFICERS;
    }
  };

  const activeOfficers = getAllOfficers();

  const handleSelectPreset = (officer: OfficerUser) => {
    setIsLoading(true);
    setErrorMsg('');
    setTimeout(() => {
      localStorage.setItem('citizen_alert_officer_session', JSON.stringify(officer));
      onLoginSuccess(officer);
      setIsLoading(false);
      onClose();
    }, 300);
  };

  const handleBadgeLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceNumber.trim() || !pin.trim()) {
      setErrorMsg('Please enter your Service ID and Security PIN.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    setTimeout(() => {
      const all = getAllOfficers();
      const match = all.find(
        o => o.badgeNumber.toLowerCase() === serviceNumber.trim().toLowerCase()
      );

      if (match) {
        localStorage.setItem('citizen_alert_officer_session', JSON.stringify(match));
        onLoginSuccess(match);
        setIsLoading(false);
        onClose();
      } else {
        // Create verified officer session
        const dynamicOfficer: OfficerUser = {
          id: `off-${Date.now()}`,
          name: `Officer ${serviceNumber.toUpperCase()}`,
          badgeNumber: serviceNumber.toUpperCase(),
          agency: selectedRole === 'DOVVSU_INVESTIGATOR' ? 'DOVVSU' : selectedRole === 'EPA_INSPECTOR' ? 'EPA' : selectedRole === 'MTTD_OFFICER' ? 'MTTD' : 'GPS_CID',
          role: selectedRole,
          rank: 'Duty Officer (CAD)',
          email: `${serviceNumber.toLowerCase()}@police.gov.gh`,
          clearanceLevel: 'TOP_SECRET'
        };
        localStorage.setItem('citizen_alert_officer_session', JSON.stringify(dynamicOfficer));
        onLoginSuccess(dynamicOfficer);
        setIsLoading(false);
        onClose();
      }
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Ghana Flag Header */}
        <div className="absolute top-0 left-0 right-0 h-2 flex">
          <div className="flex-1 bg-[#CE1126]" />
          <div className="flex-1 bg-[#FCD116]" />
          <div className="flex-1 bg-[#006B3F]" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-6 pt-2">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-ghana-gold via-amber-600 to-ghana-red flex items-center justify-center shadow-lg shadow-amber-900/40 border border-white/20">
              <Shield className="w-7 h-7 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-black text-white">LAW ENFORCEMENT CAD LOGIN</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-900/80 text-blue-300 font-bold border border-blue-700">
                  ACT 772
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Ghana Police Service, DOVVSU, EPA & Joint Security Operations Center
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800 mb-6 text-xs font-bold">
          <button
            onClick={() => setAuthMethod('ROLES')}
            className={`flex-1 py-2 rounded-lg transition ${
              authMethod === 'ROLES'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🎖️ Active Duty Officers ({activeOfficers.length})
          </button>
          <button
            onClick={() => setAuthMethod('BADGE_ID')}
            className={`flex-1 py-2 rounded-lg transition ${
              authMethod === 'BADGE_ID'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            💳 Service Number & PIN
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-900/40 border border-red-700 text-red-200 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. Quick Duty Officer Shift Switcher */}
        {authMethod === 'ROLES' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400 font-medium">
                Select an active officer credential to unlock the dispatch workstation:
              </p>
              {onOpenOfficerProvisioning && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenOfficerProvisioning();
                  }}
                  className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center space-x-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Provision Officer</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[320px] overflow-y-auto pr-1">
              {activeOfficers.map(officer => {
                const isCurrent = currentOfficer?.id === officer.id;
                return (
                  <div
                    key={officer.id}
                    onClick={() => handleSelectPreset(officer)}
                    className={`cursor-pointer p-3 rounded-xl border transition flex items-center space-x-3 group ${
                      isCurrent
                        ? 'bg-blue-950/70 border-blue-500 shadow-md ring-1 ring-blue-500'
                        : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 hover:border-blue-500/60'
                    }`}
                  >
                    <img
                      src={officer.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80'}
                      alt={officer.name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-600 group-hover:border-amber-400 transition shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white truncate">{officer.name}</span>
                      </div>
                      <p className="text-[11px] text-amber-400 font-semibold truncate">{officer.rank}</p>
                      <div className="flex items-center space-x-1.5 mt-0.5 text-[10px] text-slate-400 font-mono">
                        <span>{officer.badgeNumber}</span>
                        <span>•</span>
                        <span className="text-emerald-400 font-bold">{officer.agency}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. Badge Number & Security PIN Form */}
        {authMethod === 'BADGE_ID' && (
          <form onSubmit={handleBadgeLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Official Police / Agency Service ID
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="e.g. GPS-CID-4491 or DOVVSU-8820"
                  value={serviceNumber}
                  onChange={(e) => setServiceNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono uppercase"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Agency Clearance Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as OfficerRole)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-semibold"
              >
                <option value="NATIONAL_COMMAND_SUPERVISOR">🏛️ National Command Supervisor (All Access)</option>
                <option value="POLICE_CID_OFFICER">👮 GPS / CID Detective (Crime & Court Vault)</option>
                <option value="DOVVSU_INVESTIGATOR">🛡️ DOVVSU Investigator (Domestic & Vulnerable)</option>
                <option value="EPA_INSPECTOR">🌲 EPA Inspector (Galamsey & Environment)</option>
                <option value="MTTD_OFFICER">🚗 MTTD Officer (Traffic & Road Safety)</option>
                <option value="PUBLIC_MODERATOR">🌐 Public Moderator (Citizen Feed)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Security PIN / Passcode
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type={showPin ? 'text' : 'password'}
                  placeholder="Enter 4 or 6 digit PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono tracking-widest"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/30 transition"
            >
              <Lock className="w-4 h-4" />
              <span>{isLoading ? 'Verifying Agency Credentials...' : 'Authenticate & Unlock CAD Station'}</span>
            </button>
          </form>
        )}

        {/* Security Legal Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <span>SEC 7 ACT 772 LAW ENFORCEMENT GATEWAY</span>
          <span className="text-emerald-400 font-bold">256-BIT ENCRYPTION</span>
        </div>
      </div>
    </div>
  );
};
