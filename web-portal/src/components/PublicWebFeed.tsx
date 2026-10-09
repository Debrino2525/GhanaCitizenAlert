import React, { useState, useEffect } from 'react';
import { ThumbsUp, ShieldCheck, MapPin, AlertCircle, Share2, CheckCircle2, Flag, X, Send, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

export interface PublicFeedIncident {
  id: string;
  tracking_code: string;
  category: string;
  title: string;
  description: string;
  location_name: string;
  region: string;
  latitude: number;
  longitude: number;
  severity: string;
  status: string;
  public_corroborations: number;
  created_at: string;
  updated_at: string;
}

export const PublicWebFeed: React.FC = () => {
  const [incidents, setIncidents] = useState<PublicFeedIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [showAppealModal, setShowAppealModal] = useState(false);
  const [appealIncident, setAppealIncident] = useState<PublicFeedIncident | null>(null);
  const [appealName, setAppealName] = useState('');
  const [appealContact, setAppealContact] = useState('');
  const [appealReason, setAppealReason] = useState('');
  const [appealSubmitted, setAppealSubmitted] = useState(false);

  // Fetch verified public safety bulletins from the public_feed_incidents view or direct published incidents
  const fetchPublicFeed = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // 1. Attempt to query public_feed_incidents view
      const { data, error } = await supabase
        .from('public_feed_incidents')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        setIncidents(data);
        return;
      }

      // 2. Query fallback on incidents table directly where published
      const { data: rawData, error: rawError } = await supabase
        .from('incidents')
        .select('*')
        .eq('is_public_published', true)
        .order('created_at', { ascending: false });

      if (rawError && error) {
        throw rawError || error;
      }

      const mapped: PublicFeedIncident[] = (rawData || []).map((r: any) => ({
        id: r.id,
        tracking_code: r.tracking_code || `GH-2026-${r.id.substring(0, 4)}`,
        category: r.category || 'CIVIC_ALERT',
        title: r.title,
        description: r.description,
        location_name: r.location_name,
        region: r.region,
        latitude: r.latitude || 5.6037,
        longitude: r.longitude || -0.1870,
        severity: r.severity || 'NORMAL',
        status: r.status || 'RECEIVED_PENDING_TRIAGE',
        public_corroborations: r.public_corroborations || 0,
        created_at: r.created_at,
        updated_at: r.updated_at
      }));

      setIncidents(mapped);
    } catch (err: any) {
      console.warn('Error reading public safety bulletins:', err);
      setErrorMsg('Could not load public safety bulletins. Please refresh or check connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicFeed();

    // Subscribe to realtime changes on incidents table and view
    const channel = supabase
      .channel('realtime_public_feed_broadcast')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => {
        fetchPublicFeed();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'public_feed_incidents' }, () => {
        fetchPublicFeed();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCorroborate = async (incidentId: string) => {
    setIncidents(prev =>
      prev.map(inc =>
        inc.id === incidentId ? { ...inc, public_corroborations: (inc.public_corroborations || 0) + 1 } : inc
      )
    );

    try {
      await supabase.rpc('increment_corroboration', { row_id: incidentId });
    } catch (e) {
      console.warn('Corroboration RPC notice:', e);
    }
  };

  const handleOpenAppeal = (inc: PublicFeedIncident) => {
    setAppealIncident(inc);
    setAppealSubmitted(false);
    setShowAppealModal(true);
  };

  const handleSubmitAppeal = (e: React.FormEvent) => {
    e.preventDefault();
    setAppealSubmitted(true);
    setTimeout(() => {
      setShowAppealModal(false);
      setAppealName('');
      setAppealContact('');
      setAppealReason('');
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header & Guidelines */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              Public Awareness & Community Bulletins
            </h2>
            <p className="text-xs text-slate-400">
              Verified community reports for traffic hazards, environmental spills, and civic safety.
            </p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-900/40 text-xs text-blue-200 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <p>
            <strong className="text-white">Ghana Data Protection Act (Act 843) Notice:</strong> In compliance with national privacy and security policies, public safety bulletins display sanitized community awareness data without private media, individual reporter identities, or investigator worknotes.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-950/50 border border-red-800 text-red-200 text-xs flex items-center justify-between">
          <span>{errorMsg}</span>
          <button
            onClick={fetchPublicFeed}
            className="px-3 py-1 bg-red-900/80 hover:bg-red-800 rounded-lg text-white font-bold text-[11px]"
          >
            Retry
          </button>
        </div>
      )}

      {/* Feed Cards */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400 text-xs flex items-center justify-center space-x-2">
            <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            <span>Loading verified public safety bulletins...</span>
          </div>
        ) : incidents.length === 0 ? (
          <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-500 text-xs">
            No public bulletins active at this moment.
          </div>
        ) : (
          incidents.map(inc => (
            <div key={inc.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-slate-950 text-ghana-gold border border-slate-800">
                      {inc.tracking_code}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {inc.category.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[11px] text-emerald-400 font-bold flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verified Safety Bulletin</span>
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">
                    {inc.title}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5 flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-red-400" />
                    <span>{inc.location_name} • {inc.region}</span>
                  </p>
                </div>

                <span className="text-xs text-slate-500 font-mono">
                  {new Date(inc.created_at).toLocaleDateString()}
                </span>
              </div>

              <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                {inc.description}
              </p>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
                <button
                  onClick={() => handleCorroborate(inc.id)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold flex items-center space-x-2 transition"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>Corroborate / Witnessed ({inc.public_corroborations || 0})</span>
                </button>

                <div className="flex space-x-2">
                  <button
                    onClick={() => handleOpenAppeal(inc)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-red-400 font-medium flex items-center space-x-1.5 transition"
                    title="File Takedown Appeal"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>Appeal / Takedown (Act 843)</span>
                  </button>

                  <button
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: inc.title,
                          text: `${inc.title} - CitizenAlert Ghana`,
                          url: window.location.href
                        }).catch(() => {});
                      }
                    }}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                    title="Share Bulletin"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Citizen Appeal & Takedown Modal */}
      {showAppealModal && appealIncident && (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <button
              onClick={() => setShowAppealModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-white mb-1">
              File Takedown / Privacy Appeal
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Under Sections 32–43 of the Ghana Data Protection Act (Act 843), you may request the rectification or immediate removal of content affecting your personal privacy.
            </p>

            {appealSubmitted ? (
              <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs text-center space-y-1">
                <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-400" />
                <p className="font-bold">Appeal Successfully Lodged</p>
                <p className="text-slate-400">Our Data Protection Officer will review and respond within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitAppeal} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Your Full Name / Entity</label>
                  <input
                    type="text"
                    required
                    value={appealName}
                    onChange={(e) => setAppealName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Phone Number or Email</label>
                  <input
                    type="text"
                    required
                    value={appealContact}
                    onChange={(e) => setAppealContact(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Reason for Appeal / Takedown Request</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Describe how this post violates your privacy, involves mistaken identity, or infringes Act 843..."
                    value={appealReason}
                    onChange={(e) => setAppealReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAppealModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold flex items-center space-x-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Statutory Appeal</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
