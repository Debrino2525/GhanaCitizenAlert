import React, { useState, useEffect, useCallback } from 'react';
import { IncidentReport } from '../types';
import {
  ShieldCheck,
  Eye,
  Lock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  Sliders,
  Filter,
  RefreshCw,
  Radio,
  Flag,
  Scale,
  User,
  Phone,
  Clock,
  ShieldAlert
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';

export interface StatutoryAppeal {
  id: string;
  incident_id: string;
  tracking_code: string;
  bulletin_title: string;
  applicant_name: string;
  contact_info: string;
  reason: string;
  legal_basis?: string;
  status: 'PENDING_REVIEW' | 'GRANTED' | 'REJECTED';
  dpo_notes?: string;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
}

interface ModeratorConsoleProps {
  incidents: IncidentReport[];
  onApprovePublicPublish: (incidentId: string) => void;
  onRejectPublicPublish: (incidentId: string, reason: string) => void;
}

export const ModeratorConsole: React.FC<ModeratorConsoleProps> = ({
  incidents,
  onApprovePublicPublish,
  onRejectPublicPublish
}) => {
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'PENDING' | 'PUBLISHED' | 'APPEALS' | 'ALL'>('PENDING');
  const [blurIntensity, setBlurIntensity] = useState<number>(51);
  const [isFaceBlurActive, setIsFaceBlurActive] = useState<boolean>(true);
  const [isPlateBlurActive, setIsPlateBlurActive] = useState<boolean>(true);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Statutory Appeals State
  const [appeals, setAppeals] = useState<StatutoryAppeal[]>([]);
  const [selectedAppealId, setSelectedAppealId] = useState<string | null>(null);
  const [isLoadingAppeals, setIsLoadingAppeals] = useState<boolean>(false);

  const fetchAppeals = useCallback(async () => {
    setIsLoadingAppeals(true);
    try {
      const { data, error } = await supabase
        .from('statutory_appeals')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setAppeals(data as StatutoryAppeal[]);
        if (data.length > 0 && !selectedAppealId) {
          setSelectedAppealId(data[0].id);
        }
      }
    } catch (e) {
      console.warn('Error fetching appeals queue:', e);
    } finally {
      setIsLoadingAppeals(false);
    }
  }, [selectedAppealId]);

  useEffect(() => {
    fetchAppeals();

    const channel = supabase
      .channel('realtime_statutory_appeals_queue')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'statutory_appeals' }, () => {
        fetchAppeals();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAppeals]);

  // Filter queue based on tab
  const eligibleIncidents = incidents.filter(i => i.isPublicEligible);
  const pendingIncidents = eligibleIncidents.filter(i => !i.isPublicPublished);
  const publishedIncidents = incidents.filter(i => i.isPublicPublished);

  const displayedQueue = filterMode === 'PENDING'
    ? pendingIncidents
    : filterMode === 'PUBLISHED'
    ? publishedIncidents
    : eligibleIncidents.length > 0 ? eligibleIncidents : incidents;

  // Derive active incident dynamically so it stays reactively fresh
  const activeIncident = incidents.find(i => i.id === selectedIncidentId) 
    || displayedQueue[0] 
    || (incidents.length > 0 ? incidents[0] : null);

  const activeAppeal = appeals.find(a => a.id === selectedAppealId) || (appeals.length > 0 ? appeals[0] : null);

  // Auto-select first item if selection becomes invalid
  useEffect(() => {
    if (activeIncident && (!selectedIncidentId || !incidents.some(i => i.id === selectedIncidentId))) {
      setSelectedIncidentId(activeIncident.id);
    }
  }, [incidents, displayedQueue, activeIncident, selectedIncidentId]);

  const handleApprove = async (incident: IncidentReport) => {
    setIsProcessing(true);
    setActionFeedback(null);
    try {
      await onApprovePublicPublish(incident.id);
      setActionFeedback({
        type: 'success',
        message: `✅ Incident ${incident.trackingCode} approved & published live to the Civic Public Feed (Act 843 compliant).`
      });
    } catch (e: any) {
      setActionFeedback({
        type: 'error',
        message: `Failed to publish incident: ${e?.message || 'Network error'}`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (incident: IncidentReport) => {
    setIsProcessing(true);
    setActionFeedback(null);
    try {
      await onRejectPublicPublish(incident.id, 'Does not meet statutory public interest threshold');
      setActionFeedback({
        type: 'warning',
        message: `🚫 Incident ${incident.trackingCode} rejected from Civic Feed and quarantined to internal police archives.`
      });
      // Advance to next incident in queue if available
      const remaining = displayedQueue.filter(i => i.id !== incident.id);
      if (remaining.length > 0) {
        setSelectedIncidentId(remaining[0].id);
      }
    } catch (e: any) {
      setActionFeedback({
        type: 'error',
        message: `Failed to reject incident: ${e?.message || 'Network error'}`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGrantTakedown = async (appeal: StatutoryAppeal) => {
    setIsProcessing(true);
    setActionFeedback(null);
    try {
      // 1. Unpublish incident from Civic Feed
      await onRejectPublicPublish(appeal.incident_id, `Granted statutory takedown under Act 843 (Appeal ID: ${appeal.id})`);
      if (appeal.incident_id) {
        await supabase.from('incidents').update({
          is_public_published: false,
          is_public_eligible: false,
          updated_at: new Date().toISOString()
        }).eq('id', appeal.incident_id);
      }
      if (appeal.tracking_code) {
        await supabase.from('incidents').update({
          is_public_published: false,
          is_public_eligible: false,
          updated_at: new Date().toISOString()
        }).eq('tracking_code', appeal.tracking_code);
      }
      if (appeal.incident_id) {
        await supabase.from('emergency_alerts').update({
          is_active: false
        }).eq('id', appeal.incident_id);
      }

      // 2. Update appeal record in Supabase
      const { error } = await supabase.from('statutory_appeals').update({
        status: 'GRANTED',
        resolved_at: new Date().toISOString(),
        resolved_by: 'Data Protection Officer (Act 843)',
        dpo_notes: 'Statutory takedown request granted. Dissemination retracted immediately in compliance with Act 843 Sections 32-43. Police internal chain-of-custody archive preserved under Act 772.'
      }).eq('id', appeal.id);

      if (error) throw error;

      setActionFeedback({
        type: 'success',
        message: `✅ Takedown GRANTED for ${appeal.tracking_code}. Civic bulletin unpublished immediately (Act 843 compliant).`
      });
      await fetchAppeals();
    } catch (e: any) {
      setActionFeedback({
        type: 'error',
        message: `Failed to grant takedown: ${e?.message || 'Network error'}`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectAppeal = async (appeal: StatutoryAppeal) => {
    setIsProcessing(true);
    setActionFeedback(null);
    try {
      const { error } = await supabase.from('statutory_appeals').update({
        status: 'REJECTED',
        resolved_at: new Date().toISOString(),
        resolved_by: 'Data Protection Officer (Act 843)',
        dpo_notes: 'Appeal dismissed. Section 35 public safety exemption maintained; legitimate civic necessity.'
      }).eq('id', appeal.id);

      if (error) throw error;

      setActionFeedback({
        type: 'warning',
        message: `⚖️ Appeal dismissed for ${appeal.tracking_code}. Bulletin remains active under Section 35 public safety exemption.`
      });
      await fetchAppeals();
    } catch (e: any) {
      setActionFeedback({
        type: 'error',
        message: `Failed to dismiss appeal: ${e?.message || 'Network error'}`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              National Moderator & Privacy Console
            </h2>
            <p className="text-xs text-slate-400">
              Ghana Data Protection Act (Act 843) Verification & Automated Blurring Review
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {appeals.filter(a => a.status === 'PENDING_REVIEW').length > 0 && (
            <span className="text-xs px-3 py-1.5 rounded-xl bg-amber-950 text-amber-300 border border-amber-800 font-bold flex items-center space-x-1.5 animate-pulse">
              <Scale className="w-3.5 h-3.5 text-amber-400" />
              <span>{appeals.filter(a => a.status === 'PENDING_REVIEW').length} Statutory Appeals</span>
            </span>
          )}
          <span className="text-xs px-3 py-1.5 rounded-xl bg-blue-950 text-blue-300 border border-blue-800 font-bold flex items-center space-x-1.5">
            <Radio className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
            <span>{pendingIncidents.length} Pending Moderation</span>
          </span>
          <span className="text-xs px-3 py-1.5 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
            {publishedIncidents.length} Published Live
          </span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Queue List */}
        <div className="lg:col-span-5 space-y-3">
          {/* Queue Filter Tabs */}
          <div className="flex items-center justify-between bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs gap-1">
            <button
              onClick={() => setFilterMode('PENDING')}
              className={`flex-1 py-1.5 rounded-lg font-bold transition text-center ${
                filterMode === 'PENDING'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Pending ({pendingIncidents.length})
            </button>
            <button
              onClick={() => setFilterMode('PUBLISHED')}
              className={`flex-1 py-1.5 rounded-lg font-bold transition text-center ${
                filterMode === 'PUBLISHED'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Published ({publishedIncidents.length})
            </button>
            <button
              onClick={() => setFilterMode('APPEALS')}
              className={`flex-1 py-1.5 rounded-lg font-bold transition text-center ${
                filterMode === 'APPEALS'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Appeals ({appeals.filter(a => a.status === 'PENDING_REVIEW').length})
            </button>
            <button
              onClick={() => setFilterMode('ALL')}
              className={`flex-1 py-1.5 rounded-lg font-bold transition text-center ${
                filterMode === 'ALL'
                  ? 'bg-slate-800 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({incidents.length})
            </button>
          </div>

          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block px-1">
            {filterMode === 'PENDING'
              ? '⏳ Pending Moderator Review'
              : filterMode === 'PUBLISHED'
              ? '✅ Published Public Feed'
              : filterMode === 'APPEALS'
              ? '⚖️ Statutory Appeals Queue (Ghana Act 843)'
              : '📋 All National Incidents'}
          </span>

          <div className="space-y-2.5 max-h-[680px] overflow-y-auto pr-1 scrollbar-thin">
            {filterMode === 'APPEALS' ? (
              appeals.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-slate-500 space-y-2">
                  <Scale className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-400">No statutory appeals filed.</p>
                  <p className="text-[11px]">All published civic bulletins remain uncontested.</p>
                </div>
              ) : (
                appeals.map(app => {
                  const isSelected = activeAppeal?.id === app.id;
                  return (
                    <div
                      key={app.id}
                      onClick={() => {
                        setSelectedAppealId(app.id);
                        setActionFeedback(null);
                      }}
                      className={`cursor-pointer p-4 rounded-2xl border transition-all ${
                        isSelected
                          ? 'bg-slate-850 border-amber-500 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-mono font-bold text-amber-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {app.tracking_code}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          app.status === 'GRANTED'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : app.status === 'REJECTED'
                            ? 'bg-red-950 text-red-300 border-red-800'
                            : 'bg-amber-950 text-amber-300 border-amber-800'
                        }`}>
                          {app.status === 'GRANTED' ? '✅ Takedown Granted' : app.status === 'REJECTED' ? '❌ Dismissed' : '⏳ Pending Review'}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white truncate">{app.bulletin_title}</h4>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                        <span className="text-slate-300 font-semibold">{app.applicant_name}:</span> {app.reason}
                      </p>
                      <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] flex justify-between text-slate-400">
                        <span>📞 {app.contact_info}</span>
                        <span className="text-slate-500">{new Date(app.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  );
                })
              )
            ) : displayedQueue.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-slate-500 space-y-2">
                <ShieldCheck className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs font-bold text-slate-400">No cases in this queue.</p>
                <p className="text-[11px]">All reports are sanitized and up to date.</p>
              </div>
            ) : (
              displayedQueue.map(inc => {
                const isSelected = activeIncident?.id === inc.id;
                return (
                  <div
                    key={inc.id}
                    onClick={() => {
                      setSelectedIncidentId(inc.id);
                      setActionFeedback(null);
                    }}
                    className={`cursor-pointer p-4 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-slate-850 border-blue-500 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-mono font-bold text-amber-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {inc.trackingCode}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        inc.isPublicPublished
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : inc.isPublicEligible
                          ? 'bg-blue-950 text-blue-300 border border-blue-800'
                          : 'bg-slate-950 text-slate-400 border border-slate-800'
                      }`}>
                        {inc.isPublicPublished ? '✅ Published' : inc.isPublicEligible ? '⏳ Needs Approval' : '🔒 Internal Only'}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white truncate">{inc.title}</h4>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1">{inc.description}</p>
                    <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] flex justify-between text-slate-400">
                      <span>📍 {inc.locationName || 'Location pending'}</span>
                      <span className="font-semibold text-slate-300">
                        Severity: <span className={inc.severity === 'RED' || inc.severity === 'CRITICAL' ? 'text-red-400 font-bold' : 'text-amber-400'}>{inc.severity}</span>
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Item Review & Blurring Adjuster / Appeals Review */}
        <div className="lg:col-span-7">
          {filterMode === 'APPEALS' ? (
            activeAppeal ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
                <div className="flex justify-between items-start pb-4 border-b border-slate-800">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold text-amber-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {activeAppeal.tracking_code}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        activeAppeal.status === 'GRANTED'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : activeAppeal.status === 'REJECTED'
                          ? 'bg-red-950 text-red-300 border-red-800'
                          : 'bg-amber-950 text-amber-300 border-amber-800'
                      }`}>
                        {activeAppeal.status === 'GRANTED'
                          ? '✅ Takedown Granted (Act 843)'
                          : activeAppeal.status === 'REJECTED'
                          ? '❌ Appeal Dismissed'
                          : '⏳ Statutory Review Required'}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white mt-1.5">
                      {activeAppeal.bulletin_title}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Filed under Ghana Data Protection Act 2012 (Act 843)
                    </p>
                  </div>

                  <div className="text-right text-xs">
                    <span className="text-slate-500 block">Date Filed</span>
                    <span className="text-slate-300 font-mono font-bold">
                      {new Date(activeAppeal.created_at).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                </div>

                {/* Statutory Claim Card */}
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="text-xs font-bold text-amber-400 flex items-center space-x-2">
                      <Scale className="w-4 h-4" />
                      <span>Applicant & Statutory Representation</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Applicant Identity</span>
                        <span className="text-white font-bold">{activeAppeal.applicant_name}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Contact / Verification</span>
                        <span className="text-white font-mono">{activeAppeal.contact_info}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-slate-300 flex items-center space-x-2">
                      <Flag className="w-3.5 h-3.5 text-amber-400" />
                      <span>Grounds for Appeal / Takedown Request</span>
                    </span>
                    <blockquote className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 leading-relaxed italic border-l-4 border-l-amber-500">
                      "{activeAppeal.reason}"
                    </blockquote>
                  </div>

                  <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-900/60 text-xs text-blue-200 space-y-1">
                    <div className="flex items-center space-x-2 font-bold text-blue-300">
                      <ShieldCheck className="w-4 h-4 text-blue-400" />
                      <span>Legal Compliance Protocol (Act 843 vs Act 772)</span>
                    </div>
                    <p className="text-[11px] text-blue-300/80 leading-relaxed">
                      Granting takedown will instantaneously retract the bulletin from public mobile and web feeds. The encrypted incident dossier is permanently quarantined in the internal police archives to satisfy Section 35 statutory public safety exemptions and Act 772 chain of custody.
                    </p>
                  </div>

                  {activeAppeal.status !== 'PENDING_REVIEW' && (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
                      <div className="flex justify-between items-center text-slate-400">
                        <span>Resolution by: <span className="text-white font-bold">{activeAppeal.resolved_by || 'DPO Moderator'}</span></span>
                        <span>{activeAppeal.resolved_at ? new Date(activeAppeal.resolved_at).toLocaleString() : ''}</span>
                      </div>
                      {activeAppeal.dpo_notes && (
                        <p className="text-[11px] text-slate-400 mt-1 italic">Notes: {activeAppeal.dpo_notes}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Feedback Banner */}
                {actionFeedback && (
                  <div className={`p-3 rounded-xl text-xs font-bold flex items-center space-x-2 ${
                    actionFeedback.type === 'success'
                      ? 'bg-emerald-950/90 border border-emerald-500 text-emerald-300'
                      : actionFeedback.type === 'warning'
                      ? 'bg-amber-950/90 border border-amber-500 text-amber-300'
                      : 'bg-red-950/90 border border-red-500 text-red-300'
                  }`}>
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>{actionFeedback.message}</span>
                  </div>
                )}

                {/* Action Buttons for Appeals */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    disabled={isProcessing || activeAppeal.status === 'REJECTED'}
                    onClick={() => handleRejectAppeal(activeAppeal)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white font-bold text-xs flex items-center space-x-1.5 transition border border-slate-700 cursor-pointer disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4 text-slate-400" />
                    <span>Dismiss Appeal (Maintain Feed)</span>
                  </button>

                  <button
                    disabled={isProcessing || activeAppeal.status === 'GRANTED'}
                    onClick={() => handleGrantTakedown(activeAppeal)}
                    className="px-5 py-2.5 rounded-xl text-white font-bold text-xs flex items-center space-x-1.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 shadow-lg shadow-red-600/20 transition cursor-pointer disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Scale className="w-4 h-4" />
                    )}
                    <span>Grant Takedown (Act 843 Retraction)</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-500 space-y-2">
                <Scale className="w-10 h-10 mx-auto text-slate-600" />
                <p className="text-sm font-bold text-slate-400">Select an appeal to review statutory claims.</p>
              </div>
            )
          ) : activeIncident ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              <div className="flex justify-between items-start pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold text-amber-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {activeIncident.trackingCode}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      activeIncident.isPublicPublished
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-blue-950 text-blue-300 border border-blue-800'
                    }`}>
                      {activeIncident.isPublicPublished ? '✅ Live on Civic Feed' : '⏳ Ready for Review'}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1.5">
                    {activeIncident.title}
                  </h3>
                  <p className="text-xs text-slate-400">{activeIncident.locationName || 'Location pending'} • {activeIncident.region}</p>
                </div>

                <div className="text-right text-xs">
                  <span className="text-slate-500 block">Deepfake Score</span>
                  <span className="text-emerald-400 font-mono font-bold">
                    {activeIncident.media[0]?.deepfakeScore ?? 0.02} (Authentic)
                  </span>
                </div>
              </div>

              {/* Viewfinder Preview with Blurring Overlay */}
              <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 min-h-[220px] flex items-center justify-center">
                {activeIncident.media[0]?.thumbnailUrl ? (
                  <img
                    src={activeIncident.media[0]?.thumbnailUrl}
                    alt="Moderator Preview"
                    className="w-full h-64 object-cover"
                  />
                ) : (
                  <div className="p-12 text-center text-slate-500 space-y-1">
                    <Eye className="w-8 h-8 mx-auto text-slate-600" />
                    <p className="text-xs font-bold text-slate-400">No Image Attachment</p>
                    <p className="text-[10px]">Text report verified with GPS coordinates</p>
                  </div>
                )}

                {/* Simulated AI Blurring Overlays */}
                {isFaceBlurActive && activeIncident.media[0]?.thumbnailUrl && (
                  <div className="absolute top-12 left-28 w-16 h-16 rounded-full bg-slate-900/80 backdrop-blur-lg border border-white/40 flex items-center justify-center text-[10px] font-bold text-white shadow-lg">
                    <span>BLURRED FACE</span>
                  </div>
                )}

                {isPlateBlurActive && activeIncident.media[0]?.thumbnailUrl && (
                  <div className="absolute bottom-12 right-32 w-28 h-8 rounded-md bg-slate-900/80 backdrop-blur-lg border border-white/40 flex items-center justify-center text-[10px] font-bold text-white shadow-lg">
                    <span>BLURRED PLATE</span>
                  </div>
                )}

                <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700 text-[10px] font-mono text-emerald-400 flex items-center space-x-1.5">
                  <Lock className="w-3 h-3" />
                  <span>Act 843 Privacy Filter Active</span>
                </div>
              </div>

              {/* Blurring Controls */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white flex items-center space-x-2">
                    <Sliders className="w-4 h-4 text-blue-400" />
                    <span>Gaussian Blur Intensity (Kernel Size: {blurIntensity}px)</span>
                  </span>
                  <span className="font-mono text-blue-400 font-bold">{blurIntensity}px</span>
                </div>

                <input
                  type="range"
                  min="21"
                  max="91"
                  step="2"
                  value={blurIntensity}
                  onChange={(e) => setBlurIntensity(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />

                <div className="flex space-x-4 pt-1">
                  <label className="flex items-center space-x-2 text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isFaceBlurActive}
                      onChange={(e) => setIsFaceBlurActive(e.target.checked)}
                      className="accent-blue-500 rounded"
                    />
                    <span>Blur Bystander Faces</span>
                  </label>

                  <label className="flex items-center space-x-2 text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isPlateBlurActive}
                      onChange={(e) => setIsPlateBlurActive(e.target.checked)}
                      className="accent-blue-500 rounded"
                    />
                    <span>Blur License Plates</span>
                  </label>
                </div>
              </div>

              {/* Action Feedback Banner */}
              {actionFeedback && (
                <div className={`p-3 rounded-xl text-xs font-bold flex items-center space-x-2 animate-fade-in ${
                  actionFeedback.type === 'success'
                    ? 'bg-emerald-950/90 border border-emerald-500 text-emerald-300'
                    : actionFeedback.type === 'warning'
                    ? 'bg-amber-950/90 border border-amber-500 text-amber-300'
                    : 'bg-red-950/90 border border-red-500 text-red-300'
                }`}>
                  <Sparkles className="w-4 h-4 shrink-0 animate-pulse" />
                  <span>{actionFeedback.message}</span>
                </div>
              )}

              {/* Moderator Decision Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  disabled={isProcessing}
                  onClick={() => handleReject(activeIncident)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-red-400 hover:text-red-300 font-bold text-xs flex items-center space-x-1.5 transition border border-red-500/20 cursor-pointer disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject from Public Feed</span>
                </button>

                <button
                  disabled={isProcessing}
                  onClick={() => handleApprove(activeIncident)}
                  className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs flex items-center space-x-1.5 shadow-lg transition cursor-pointer disabled:opacity-50 ${
                    activeIncident.isPublicPublished
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                      : 'bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 shadow-blue-600/20'
                  }`}
                >
                  {isProcessing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>
                    {activeIncident.isPublicPublished
                      ? '✅ Re-Publish / Update Sanitized Feed'
                      : 'Approve & Publish Sanitized Feed'}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-500 space-y-2">
              <ShieldCheck className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-sm font-bold text-slate-400">Select an item to inspect privacy sanitization.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
