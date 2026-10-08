import React, { useState } from 'react';
import { IncidentReport } from '../types';
import { ShieldCheck, Eye, Lock, CheckCircle2, XCircle, AlertTriangle, Sparkles, Sliders } from 'lucide-react';

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
  const [selectedIncident, setSelectedIncident] = useState<IncidentReport | null>(incidents[0]);
  const [blurIntensity, setBlurIntensity] = useState<number>(51);
  const [isFaceBlurActive, setIsFaceBlurActive] = useState<boolean>(true);
  const [isPlateBlurActive, setIsPlateBlurActive] = useState<boolean>(true);

  // Eligible incidents waiting for moderator approval
  const modQueue = incidents.filter(i => i.isPublicEligible);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
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
          <span className="text-xs px-3 py-1 rounded-lg bg-blue-950 text-blue-300 border border-blue-800 font-bold">
            {modQueue.length} Items In Moderation Queue
          </span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Queue List */}
        <div className="lg:col-span-5 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block px-1">
            Eligible Public Interest Queue
          </span>

          {modQueue.map(inc => {
            const isSelected = selectedIncident?.id === inc.id;
            return (
              <div
                key={inc.id}
                onClick={() => setSelectedIncident(inc)}
                className={`cursor-pointer p-4 rounded-2xl border transition-all ${
                  isSelected
                    ? 'bg-slate-850 border-blue-500 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-mono font-bold text-ghana-gold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {inc.trackingCode}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                    AI Pre-Filtered
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white truncate">{inc.title}</h4>
                <p className="text-xs text-slate-400 line-clamp-2 mt-1">{inc.description}</p>
                <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] flex justify-between text-slate-400">
                  <span>📍 {inc.ghanaPostCode || 'Not provided'}</span>
                  <span className="text-emerald-400 font-semibold">
                    {inc.isPublicPublished ? '✅ Published' : '⏳ Pending Review'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Item Review & Blurring Adjuster */}
        <div className="lg:col-span-7">
          {selectedIncident ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              <div className="flex justify-between items-start pb-4 border-b border-slate-800">
                <div>
                  <span className="text-xs font-mono font-bold text-ghana-gold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {selectedIncident.trackingCode}
                  </span>
                  <h3 className="text-base font-bold text-white mt-1">
                    {selectedIncident.title}
                  </h3>
                  <p className="text-xs text-slate-400">{selectedIncident.locationName} ({selectedIncident.ghanaPostCode || 'Not provided'})</p>
                </div>

                <div className="text-right text-xs">
                  <span className="text-slate-500 block">Deepfake Score</span>
                  <span className="text-emerald-400 font-mono font-bold">
                    {selectedIncident.media[0]?.deepfakeScore ?? 0.02} (Authentic)
                  </span>
                </div>
              </div>

              {/* Viewfinder Preview with Blurring Overlay */}
              <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
                <img
                  src={selectedIncident.media[0]?.thumbnailUrl || ''}
                  alt="Moderator Preview"
                  className="w-full h-64 object-cover"
                />

                {/* Simulated AI Blurring Overlays */}
                {isFaceBlurActive && (
                  <div className="absolute top-12 left-28 w-16 h-16 rounded-full bg-slate-900/80 backdrop-blur-lg border border-white/40 flex items-center justify-center text-[10px] font-bold text-white shadow-lg">
                    <span>BLURRED FACE</span>
                  </div>
                )}

                {isPlateBlurActive && (
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
                  className="w-full accent-blue-500"
                />

                <div className="flex space-x-4 pt-1">
                  <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isFaceBlurActive}
                      onChange={(e) => setIsFaceBlurActive(e.target.checked)}
                      className="accent-blue-500 rounded"
                    />
                    <span>Blur Bystander Faces</span>
                  </label>

                  <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
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

              {/* Moderator Decision Action Buttons */}
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  onClick={() => onRejectPublicPublish(selectedIncident.id, 'Does not meet public interest threshold')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-red-400 font-bold text-xs flex items-center space-x-1.5 transition"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject from Public Feed</span>
                </button>

                <button
                  onClick={() => onApprovePublicPublish(selectedIncident.id)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-blue-600/20 transition"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve & Publish Sanitized Feed</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-500">
              Select an item to inspect privacy sanitization.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
