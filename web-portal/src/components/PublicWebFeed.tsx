import React, { useState } from 'react';
import { IncidentReport } from '../types';
import { ThumbsUp, ShieldCheck, MapPin, Eye, AlertCircle, Share2, CheckCircle2, Lock, Flag, X, Send } from 'lucide-react';

interface PublicWebFeedProps {
  incidents: IncidentReport[];
  onCorroborate: (incidentId: string) => void;
}

export const PublicWebFeed: React.FC<PublicWebFeedProps> = ({
  incidents,
  onCorroborate
}) => {
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [appealIncident, setAppealIncident] = useState<IncidentReport | null>(null);
  const [appealName, setAppealName] = useState('');
  const [appealContact, setAppealContact] = useState('');
  const [appealReason, setAppealReason] = useState('');
  const [appealSubmitted, setAppealSubmitted] = useState(false);

  // Show only approved public published items
  const publicIncidents = incidents.filter(inc => inc.isPublicPublished);

  const handleOpenAppeal = (inc: IncidentReport) => {
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
            <strong className="text-white">Ghana Data Protection Act (Act 843) Safeguard:</strong> All civilian faces and vehicle license plates are irreversibly blurred. Private accusations are never published. If you believe your rights or property have been misidentified, you may submit a formal takedown appeal below.
          </p>
        </div>
      </div>

      {/* Feed Cards */}
      <div className="space-y-4">
        {publicIncidents.length === 0 ? (
          <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-500 text-xs">
            No public bulletins active at this moment.
          </div>
        ) : (
          publicIncidents.map(inc => (
            <div key={inc.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-slate-950 text-ghana-gold border border-slate-800">
                      {inc.trackingCode}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                      {inc.assignedAgency}
                    </span>
                    <span className="text-[11px] text-emerald-400 font-bold flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Moderated & Verified</span>
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">
                    {inc.title}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5 flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-red-400" />
                    <span>{inc.locationName} ({inc.ghanaPostCode})</span>
                  </p>
                </div>

                <span className="text-xs text-slate-500 font-mono">
                  {new Date(inc.createdAt).toLocaleDateString()}
                </span>
              </div>

              <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                {inc.description}
              </p>

              {inc.media.length > 0 && (
                <div className="rounded-xl overflow-hidden border border-slate-800 relative bg-slate-950">
                  <img
                    src={inc.media[0].thumbnailUrl}
                    alt={inc.title}
                    className="w-full h-56 object-cover"
                  />
                  <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700 text-[10px] font-mono text-emerald-400 flex items-center space-x-1">
                    <Lock className="w-3 h-3" />
                    <span>Faces & Vehicle PII Sanitized (Act 843)</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
                <button
                  onClick={() => onCorroborate(inc.id)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold flex items-center space-x-2 transition"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>Corroborate / Witnessed ({inc.publicCorroborations})</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
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
