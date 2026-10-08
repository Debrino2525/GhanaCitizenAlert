import React, { useState } from 'react';
import { EmergencyAlert, SightingTip } from '../types';
import { AlertTriangle, Radio, Send, MapPin, Eye, Phone, PlusCircle, CheckCircle2, User, Clock, ShieldAlert } from 'lucide-react';
import { resolveGhanaPostGps, validateGhanaPostGps } from '../services/ghanaPostGps';

interface EmergencyAlertHubProps {
  alerts: EmergencyAlert[];
  sightings: SightingTip[];
  onAddSighting: (sighting: SightingTip) => void;
  onCreateAlert: (alert: EmergencyAlert) => void;
}

export const EmergencyAlertHub: React.FC<EmergencyAlertHubProps> = ({
  alerts,
  sightings,
  onAddSighting,
  onCreateAlert
}) => {
  const [selectedAlert, setSelectedAlert] = useState<EmergencyAlert>(alerts[0]);
  const [showTipModal, setShowTipModal] = useState(false);
  const [tipLocation, setTipLocation] = useState('');
  const [tipGhanaPost, setTipGhanaPost] = useState('GD-003-8812');
  const [tipComment, setTipComment] = useState('');
  const [tipPhone, setTipPhone] = useState('');

  const alertSightings = sightings.filter(s => s.alertId === selectedAlert?.id);

  const handleSubmitTip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlert || !tipComment.trim()) return;

    const coords = validateGhanaPostGps(tipGhanaPost)
      ? resolveGhanaPostGps(tipGhanaPost)
      : { lat: 5.6037, lng: -0.1870 };

    const newTip: SightingTip = {
      id: `sight-${Date.now()}`,
      alertId: selectedAlert.id,
      timestamp: new Date().toISOString(),
      locationName: tipLocation || 'Reported via Web Portal',
      ghanaPostCode: tipGhanaPost.toUpperCase(),
      coordinates: [coords.lat, coords.lng],
      comment: tipComment,
      reporterPhone: tipPhone || undefined,
      isVerified: false
    };

    onAddSighting(newTip);
    setTipComment('');
    setTipLocation('');
    setShowTipModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">
              National Emergency Broadcast Engine
            </h2>
            <p className="text-xs text-slate-400">
              Two-Man Authorized Amber Alerts (Missing Children) & Red Alerts (Active Threats)
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block px-1">
            Active Emergency Broadcasts ({alerts.length})
          </span>

          {alerts.map(alert => (
            <div
              key={alert.id}
              onClick={() => setSelectedAlert(alert)}
              className={`cursor-pointer p-4 rounded-2xl border transition-all ${
                selectedAlert?.id === alert.id
                  ? 'bg-amber-950/40 border-amber-500 ring-1 ring-amber-500 shadow-lg shadow-amber-500/10'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start space-x-3">
                <img
                  src={alert.subjectPhotoUrl}
                  alt={alert.subjectName}
                  className="w-16 h-16 rounded-xl object-cover border border-slate-700 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-500 text-black">
                      {alert.alertType} ALERT
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">Radius: {alert.radiusKm}km</span>
                  </div>
                  <h4 className="text-sm font-bold text-white truncate">{alert.subjectName}</h4>
                  <p className="text-xs text-slate-400 truncate">Last seen: {alert.lastSeenLocation}</p>
                  <p className="text-[10px] text-emerald-400 mt-1">Authorized by: {alert.approvingCommanderName}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-7 space-y-4">
          {selectedAlert && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              <div className="p-4 rounded-xl border bg-amber-500/10 border-amber-500/30 text-amber-300 flex justify-between items-center">
                <div>
                  <span className="text-xs font-mono font-bold uppercase tracking-widest">
                    {selectedAlert.alertType} ALERT • GEOFENCE ACTIVE
                  </span>
                  <h3 className="text-base font-bold text-white mt-0.5">{selectedAlert.title}</h3>
                </div>

                <button
                  onClick={() => setShowTipModal(true)}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Sighting Tip</span>
                </button>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Citizen Sightings ({alertSightings.length})</h4>
                {alertSightings.map(s => (
                  <div key={s.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                    <div className="flex justify-between text-ghana-gold font-bold">
                      <span>📍 {s.ghanaPostCode} ({s.locationName})</span>
                      <span className="text-slate-500">{new Date(s.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-300 mt-1">{s.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showTipModal && (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <h3 className="text-base font-bold text-white mb-2">Submit Urgent Sighting Tip</h3>
            <form onSubmit={handleSubmitTip} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Landmark / Location</label>
                <input
                  type="text"
                  required
                  value={tipLocation}
                  onChange={(e) => setTipLocation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">GhanaPost GPS Code</label>
                <input
                  type="text"
                  required
                  value={tipGhanaPost}
                  onChange={(e) => setTipGhanaPost(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-ghana-gold font-mono uppercase"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-bold mb-1">Details</label>
                <textarea
                  rows={3}
                  required
                  value={tipComment}
                  onChange={(e) => setTipComment(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTipModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold"
                >
                  Send Tip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
