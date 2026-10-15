import React, { useState, useEffect } from 'react';
import { Shield, UserPlus, KeyRound, Building2, CheckCircle2, AlertCircle, RefreshCw, UserX, Send, Mail, BadgeCheck, Lock } from 'lucide-react';
import { OfficerUser, AgencyType, OfficerRole } from '../types';
import { supabase } from '../services/supabaseClient';

interface OfficerManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentOfficer: OfficerUser | null;
}

export const OfficerManagementModal: React.FC<OfficerManagementModalProps> = ({
  isOpen,
  onClose,
  currentOfficer
}) => {
  const [officers, setOfficers] = useState<any[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [agency, setAgency] = useState<AgencyType>('GPS_CID');
  const [role, setRole] = useState<string>('POLICE_CID_OFFICER');
  const [rank, setRank] = useState('Detective Inspector');
  const [clearanceLevel, setClearanceLevel] = useState<'RESTRICTED' | 'CONFIDENTIAL' | 'SECRET' | 'TOP_SECRET'>('RESTRICTED');
  const [stationId, setStationId] = useState('sta-hq');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isAdmin = currentOfficer?.role === 'ADMIN';

  const fetchOfficers = async () => {
    if (!isAdmin) return;
    setIsLoadingList(true);
    try {
      const { data, error } = await supabase
        .from('officers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      setOfficers(data || []);
    } catch (err: any) {
      console.error('Fetch officers error:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to load officers directory.'
      });
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    if (isOpen && isAdmin) {
      fetchOfficers();
      setFeedback(null);
    }
  }, [isOpen, isAdmin]);

  if (!isOpen) return null;

  // Enforce ADMIN role only
  if (!isAdmin) {
    return (
      <div className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
        <div className="bg-slate-900 border border-red-800 rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-red-950/80 border border-red-700 mx-auto flex items-center justify-center text-red-400">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">ACCESS RESTRICTED</h2>
          <p className="text-xs text-slate-400">
            Only system administrators with the <span className="font-mono text-amber-400 font-bold">ADMIN</span> role have authorization to access the Officer Provisioning & Management console.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // 1. Create Officer via Edge Function: provision-officer
  const handleCreateOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!email.trim() || !fullName.trim() || !serviceId.trim() || !rank.trim()) {
      setFeedback({
        type: 'error',
        message: 'Please complete all required fields.'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('provision-officer', {
        body: {
          email: email.trim().toLowerCase(),
          full_name: fullName.trim(),
          service_id: serviceId.trim().toUpperCase(),
          agency,
          rank: rank.trim(),
          role,
          clearance_level: clearanceLevel,
          station_id: stationId.trim() || undefined
        }
      });

      if (error) {
        // Edge function error
        throw new Error(error.message || `Provisioning failed with status: ${error.status || 'unknown'}`);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setFeedback({
        type: 'success',
        message: `Officer ${fullName} provisioned. Invite email dispatched to ${email}.`
      });

      // Clear form
      setEmail('');
      setFullName('');
      setServiceId('');
      setRank('Detective Inspector');

      // Refresh officers list
      await fetchOfficers();
    } catch (err: any) {
      console.error('Provision error:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'Error occurred during officer provisioning.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Deactivate Officer via Edge Function: deactivate-officer
  const handleDeactivate = async (officerId: string, officerName: string) => {
    if (!confirm(`Are you sure you want to deactivate officer ${officerName}? They will immediately lose CAD workstation access.`)) {
      return;
    }

    setActionLoadingId(officerId);
    setFeedback(null);

    try {
      const { data, error } = await supabase.functions.invoke('deactivate-officer', {
        body: { officer_id: officerId }
      });

      if (error) {
        throw new Error(error.message || `Deactivation failed with status: ${error.status || 'unknown'}`);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setFeedback({
        type: 'success',
        message: `Officer ${officerName} has been deactivated.`
      });

      await fetchOfficers();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to deactivate officer.'
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // 3. Resend Invite via Edge Function: resend-invite
  const handleResendInvite = async (officerId: string, officerEmail: string) => {
    setActionLoadingId(officerId);
    setFeedback(null);

    try {
      const { data, error } = await supabase.functions.invoke('resend-invite', {
        body: { officer_id: officerId }
      });

      if (error) {
        throw new Error(error.message || `Resend invite failed with status: ${error.status || 'unknown'}`);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setFeedback({
        type: 'success',
        message: `Invite link resent successfully to ${officerEmail}.`
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to resend invite.'
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-5xl w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden max-h-[90vh] flex flex-col">
        {/* Ghana Flag Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-2 flex">
          <div className="flex-1 bg-[#CE1126]" />
          <div className="flex-1 bg-[#FCD116]" />
          <div className="flex-1 bg-[#006B3F]" />
        </div>

        {/* Modal Header */}
        <div className="flex items-start justify-between mb-4 pt-2 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 flex items-center justify-center shadow-lg border border-blue-400/30">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-black text-white">OFFICER DIRECTORY & PROVISIONING</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-900/80 text-amber-300 font-bold border border-amber-700">
                  ADMIN ONLY
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                National Security Gateway & Section 7 (Act 772) Officer Governance
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

        {feedback && (
          <div
            className={`mb-4 p-3 rounded-xl text-xs flex items-center space-x-2 shrink-0 ${
              feedback.type === 'success'
                ? 'bg-emerald-950/70 border border-emerald-800 text-emerald-200'
                : 'bg-red-950/70 border border-red-800 text-red-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto flex-1 pr-1">
          {/* Left Column: Create Officer Form */}
          <div className="lg:col-span-5 bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
              <UserPlus className="w-3.5 h-3.5 text-blue-400" />
              <span>Provision New Officer</span>
            </h3>

            <form onSubmit={handleCreateOfficer} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Official Email Address *</label>
                <input
                  type="email"
                  placeholder="e.g. k.boateng@police.gov.gh"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 font-mono focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Kwame Boateng"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Service / Badge ID *</label>
                  <input
                    type="text"
                    placeholder="GPS-CID-8812"
                    value={serviceId}
                    onChange={(e) => setServiceId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 font-mono uppercase focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Agency *</label>
                  <select
                    value={agency}
                    onChange={(e) => setAgency(e.target.value as AgencyType)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-2 text-white focus:outline-none focus:border-blue-500 font-semibold"
                  >
                    <option value="GPS_CID">GPS CID</option>
                    <option value="DOVVSU">DOVVSU</option>
                    <option value="EPA">EPA</option>
                    <option value="MTTD">MTTD</option>
                    <option value="NADMO">NADMO</option>
                    <option value="AMA">AMA</option>
                    <option value="KMA">KMA</option>
                    <option value="FORESTRY_COMM">Forestry Comm</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Official Rank *</label>
                  <input
                    type="text"
                    placeholder="Detective Inspector"
                    value={rank}
                    onChange={(e) => setRank(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Clearance Level *</label>
                  <select
                    value={clearanceLevel}
                    onChange={(e) => setClearanceLevel(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-2 text-white focus:outline-none focus:border-blue-500 font-semibold"
                  >
                    <option value="RESTRICTED">RESTRICTED</option>
                    <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                    <option value="SECRET">SECRET</option>
                    <option value="TOP_SECRET">TOP_SECRET</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Operational CAD Role (Excludes ADMIN) *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 font-semibold"
                >
                  <option value="NATIONAL_COMMAND_SUPERVISOR">🏛️ National Command Supervisor</option>
                  <option value="POLICE_CID_OFFICER">👮 Police CID Detective</option>
                  <option value="DOVVSU_INVESTIGATOR">🛡️ DOVVSU Investigator</option>
                  <option value="EPA_INSPECTOR">🌲 EPA Inspector</option>
                  <option value="MTTD_OFFICER">🚗 MTTD Officer</option>
                  <option value="PUBLIC_MODERATOR">🌐 Public Feed Moderator</option>
                  <option value="CAD_DISPATCHER">📡 CAD Emergency Dispatcher</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Station / Depot</label>
                <input
                  type="text"
                  placeholder="sta-hq / National Police Headquarters"
                  value={stationId}
                  onChange={(e) => setStationId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black flex items-center justify-center space-x-1.5 shadow-lg shadow-blue-600/30 transition disabled:opacity-50 mt-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isSubmitting ? 'Inviting via Supabase Auth...' : 'Create Officer & Dispatch Invite'}</span>
              </button>
            </form>
          </div>

          {/* Right Column: Live Officers Directory */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Registered CAD Personnel ({officers.length})</span>
              </h3>
              <button
                onClick={fetchOfficers}
                disabled={isLoadingList}
                className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingList ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {isLoadingList && officers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Loading verified officers from database...
              </div>
            ) : officers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                No active officers found. Provision the first officer using the form.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {officers.map((off) => {
                  const isActionLoading = actionLoadingId === off.id;
                  return (
                    <div
                      key={off.id}
                      className={`p-3.5 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        off.is_active === false
                          ? 'bg-red-950/20 border-red-900/40 opacity-75'
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 font-mono text-xs font-bold">
                          {(off.full_name || off.name || 'OF').substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-white truncate">
                              {off.full_name || off.name}
                            </span>
                            {off.is_active === false ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-950 text-red-400 border border-red-800 font-bold">
                                DEACTIVATED
                              </span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                                ACTIVE
                              </span>
                            )}
                            {off.must_change_password && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold">
                                PENDING SETUP
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-amber-400 font-semibold truncate">{off.rank} • {off.role}</p>
                          <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-mono mt-0.5">
                            <span className="text-blue-300 font-bold">{off.service_id || off.badge_number}</span>
                            <span>•</span>
                            <span className="text-emerald-400">{off.agency}</span>
                            <span>•</span>
                            <span>{off.email}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center space-x-2 shrink-0">
                        {off.is_active !== false && (
                          <>
                            <button
                              onClick={() => handleResendInvite(off.id, off.email)}
                              disabled={isActionLoading}
                              title="Resend invite email"
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1 transition disabled:opacity-50"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Invite</span>
                            </button>

                            <button
                              onClick={() => handleDeactivate(off.id, off.full_name || off.name)}
                              disabled={isActionLoading}
                              title="Deactivate officer"
                              className="px-2.5 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-200 text-xs font-semibold flex items-center space-x-1 transition disabled:opacity-50"
                            >
                              <UserX className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Deactivate</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
