import React, { useState } from 'react';
import { Shield, UserPlus, Trash2, KeyRound, Building2, CheckCircle2, AlertCircle, Award } from 'lucide-react';
import { OfficerUser, OfficerRole, AgencyType } from '../types';
import { PRESET_OFFICERS } from './AuthModal';

interface OfficerManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOfficersUpdated?: (officers: OfficerUser[]) => void;
}

export const OfficerManagementModal: React.FC<OfficerManagementModalProps> = ({
  isOpen,
  onClose,
  onOfficersUpdated
}) => {
  const [officers, setOfficers] = useState<OfficerUser[]>(() => {
    try {
      const saved = localStorage.getItem('citizen_alert_officers_vault');
      return saved ? JSON.parse(saved) : PRESET_OFFICERS;
    } catch (e) {
      return PRESET_OFFICERS;
    }
  });

  const [name, setName] = useState('');
  const [badgeNumber, setBadgeNumber] = useState('');
  const [agency, setAgency] = useState<AgencyType>('GPS_CID');
  const [role, setRole] = useState<OfficerRole>('POLICE_CID_OFFICER');
  const [rank, setRank] = useState('Detective Inspector');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [clearanceLevel, setClearanceLevel] = useState<'TOP_SECRET' | 'RESTRICTED' | 'OPERATIONAL' | 'PUBLIC_MOD'>('TOP_SECRET');
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleCreateOfficer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !badgeNumber.trim() || !pin.trim()) {
      setErrorMsg('Please fill in all required officer details.');
      return;
    }

    const newOfficer: OfficerUser = {
      id: `off-${Date.now()}`,
      name: name.trim(),
      badgeNumber: badgeNumber.trim().toUpperCase(),
      agency,
      role,
      rank: rank.trim(),
      email: email.trim() || `${badgeNumber.toLowerCase()}@police.gov.gh`,
      clearanceLevel,
      avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80`
    };

    const updated = [newOfficer, ...officers];
    setOfficers(updated);
    localStorage.setItem('citizen_alert_officers_vault', JSON.stringify(updated));
    if (onOfficersUpdated) onOfficersUpdated(updated);

    setIsSuccess(true);
    setErrorMsg('');
    setName('');
    setBadgeNumber('');
    setEmail('');
    setPin('');

    setTimeout(() => setIsSuccess(false), 3000);
  };

  const handleDeleteOfficer = (id: string) => {
    const updated = officers.filter(o => o.id !== id);
    setOfficers(updated);
    localStorage.setItem('citizen_alert_officers_vault', JSON.stringify(updated));
    if (onOfficersUpdated) onOfficersUpdated(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden max-h-[90vh] flex flex-col">
        {/* Ghana Flag Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-2 flex">
          <div className="flex-1 bg-[#CE1126]" />
          <div className="flex-1 bg-[#FCD116]" />
          <div className="flex-1 bg-[#006B3F]" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-4 pt-2">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 flex items-center justify-center shadow-lg border border-blue-400/30">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-black text-white">OFFICER ACCOUNT PROVISIONING</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-900/80 text-amber-300 font-bold border border-amber-700">
                  ADMIN ONLY
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Create & manage law enforcement agency accounts, security PINs, and CAD clearance levels.
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

        {isSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-600 text-emerald-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>✅ Officer account provisioned successfully! Officer can now log in immediately on any terminal.</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-700 text-red-200 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto pr-1">
          {/* Create Officer Form */}
          <form onSubmit={handleCreateOfficer} className="lg:col-span-6 bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
            <h3 className="font-bold text-white flex items-center space-x-1.5 border-b border-slate-800 pb-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Provision New Security Officer</span>
            </h3>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Full Officer Name & Title</label>
              <input
                type="text"
                placeholder="e.g. Supt. Kwabena Adusei"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Badge / Service Number</label>
                <input
                  type="text"
                  placeholder="e.g. GPS-CID-9912"
                  value={badgeNumber}
                  onChange={(e) => setBadgeNumber(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 font-mono uppercase focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Security PIN</label>
                <input
                  type="password"
                  placeholder="4 or 6 digits"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 font-mono tracking-widest focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Agency</label>
                <select
                  value={agency}
                  onChange={(e) => setAgency(e.target.value as AgencyType)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-white font-semibold focus:outline-none focus:border-blue-500"
                >
                  <option value="GPS_CID">GPS / CID (Crime)</option>
                  <option value="DOVVSU">DOVVSU (Abuse)</option>
                  <option value="EPA">EPA (Galamsey)</option>
                  <option value="MTTD">MTTD (Traffic)</option>
                  <option value="AMA">AMA (Sanitation)</option>
                  <option value="NADMO">NADMO (Disaster)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Clearance Level</label>
                <select
                  value={clearanceLevel}
                  onChange={(e) => setClearanceLevel(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-white font-semibold focus:outline-none focus:border-blue-500"
                >
                  <option value="TOP_SECRET">TOP SECRET (Court Vault)</option>
                  <option value="RESTRICTED">RESTRICTED (Agency CAD)</option>
                  <option value="OPERATIONAL">OPERATIONAL (Field Dispatch)</option>
                  <option value="PUBLIC_MOD">PUBLIC MODERATOR</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Rank / Position Title</label>
              <input
                type="text"
                placeholder="e.g. Senior Detective Inspector"
                value={rank}
                onChange={(e) => setRank(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Official Agency Email</label>
              <input
                type="email"
                placeholder="e.g. k.adusei@cid.police.gov.gh"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/20 transition mt-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Issue Official Officer Credentials</span>
            </button>
          </form>

          {/* Active Officers List */}
          <div className="lg:col-span-6 space-y-3">
            <h3 className="font-bold text-white text-xs flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="flex items-center space-x-1.5">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Authorized Officer Directory ({officers.length})</span>
              </span>
              <span className="text-[10px] text-slate-500">Live Credentials</span>
            </h3>

            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {officers.map((off) => (
                <div
                  key={off.id}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between group hover:border-slate-700 transition"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <img
                      src={off.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80'}
                      alt={off.name}
                      className="w-9 h-9 rounded-full object-cover border border-slate-700 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold text-white truncate">{off.name}</span>
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-800">
                          {off.agency}
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-400 font-medium truncate">{off.rank}</p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {off.badgeNumber} • {off.clearanceLevel}
                      </p>
                    </div>
                  </div>

                  {!PRESET_OFFICERS.some(p => p.id === off.id) && (
                    <button
                      onClick={() => handleDeleteOfficer(off.id)}
                      className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900 text-red-400 hover:text-white transition"
                      title="Revoke Officer Access"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <span>SECTION 7 ACT 772 LAW ENFORCEMENT CREDENTIALS VAULT</span>
          <span className="text-emerald-400 font-bold">ACTIVE CAD SYNC</span>
        </div>
      </div>
    </div>
  );
};
