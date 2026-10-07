import React from 'react';
import { IncidentReport } from '../types';
import { ThumbsUp, ShieldCheck, MapPin, Eye, AlertCircle, Share2, CheckCircle2, Lock } from 'lucide-react';

interface PublicCorroborationFeedProps {
  incidents: IncidentReport[];
  onCorroborate: (incidentId: string) => void;
}

export const PublicCorroborationFeed: React.FC<PublicCorroborationFeedProps> = ({
  incidents,
  onCorroborate
}) => {
  // Only show public-safe incidents (Traffic, Sanitation, Environmental alerts cleared by AI/Police)
  const publicIncidents = incidents.filter(inc => inc.isPublicSafe);

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
              Public Awareness & Corroboration Feed
            </h2>
            <p className="text-xs text-slate-400">
              Verified community reports for traffic hazards, environmental spills, and infrastructure alerts.
            </p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-900/40 text-xs text-blue-200 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <p>
            <strong className="text-white">Privacy & Anti-Vigilantism Notice:</strong> In accordance with the <em>Ghana Data Protection Act (Act 843)</em>, all bystander faces and private identifiers are sanitized. Severe criminal offenses are handled exclusively through secure law enforcement dispatch.
          </p>
        </div>
      </div>

      {/* Public Incident Feed List */}
      <div className="space-y-4">
        {publicIncidents.map(inc => (
          <div key={inc.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
            {/* Header */}
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
                    <span>Verified by Agency</span>
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

            {/* Description */}
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              {inc.description}
            </p>

            {/* Media thumbnail if exists */}
            {inc.media.length > 0 && (
              <div className="rounded-xl overflow-hidden border border-slate-800 relative bg-slate-950">
                <img
                  src={inc.media[0].thumbnailUrl}
                  alt={inc.title}
                  className="w-full h-56 object-cover"
                />
                <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700 text-[10px] font-mono text-emerald-400 flex items-center space-x-1">
                  <Lock className="w-3 h-3" />
                  <span>Faces & Bystander PII Sanitized (Act 843)</span>
                </div>
              </div>
            )}

            {/* Corroboration & Upvote Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
              <button
                onClick={() => onCorroborate(inc.id)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold flex items-center space-x-2 transition"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>Corroborate / I Witnessed This ({inc.publicCorroborations})</span>
              </button>

              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: inc.title,
                      text: `${inc.title} at ${inc.locationName} (${inc.ghanaPostCode}) - CitizenAlert Ghana`,
                      url: window.location.href
                    }).catch(() => {});
                  }
                }}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                title="Share Public Alert"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
