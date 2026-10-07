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
  const [showNewAlertModal, setShowNewAlertModal] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);

  // New Sighting form state
  const [tipLocation, setTipLocation] = useState('');
  const [tipGhanaPost, setTipGhanaPost] = useState('GD-003-8812');
  const [tipComment, setTipComment] = useState('');
  const [tipPhone, setTipPhone] = useState('');

  // New Alert modal state
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'AMBER' | 'RED'>('AMBER');
  const [newName, setNewName] = useState('');
  const [newAge, setNewAge] = useState<number>(8);
  const [newGhanaPost, setNewGhanaPost] = useState('GM-014-9923');
  const [newLastSeen, setNewLastSeen] = useState('');
  const [newRadius, setNewRadius] = useState<number>(30);
  const [newDetails, setNewDetails] = useState('');

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
      locationName: tipLocation || 'Reported via Citizen App',
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

  const handleCreateNewAlert = (e: React.FormEvent) => {
    e.preventDefault();
    const geo = resolveGhanaPostGps(newGhanaPost);

    const alert: EmergencyAlert = {
      id: `alert-${Date.now()}`,
      alertType: newType,
      title: newTitle,
      subjectName: newName,
      subjectAge: newType === 'AMBER' ? Number(newAge) : undefined,
      subjectPhotoUrl: newType === 'AMBER' 
        ? 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=800&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80',
      lastSeenLocation: newLastSeen,
      ghanaPostCode: newGhanaPost.toUpperCase(),
      centerCoordinates: [geo.lat, geo.lng],
      radiusKm: Number(newRadius),
      details: newDetails,
      isActive: true,
      issuedByAgency: 'GPS_CID',
      issuingOfficerName: 'National Police Operations Center',
      badgeNumber: 'GPS-HQ-9901',
      activeUntil: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      sightingsCount: 0
    };

    onCreateAlert(alert);
    setSelectedAlert(alert);
    setShowNewAlertModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Alert Center Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
              <ShieldAlert className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">
                National Emergency Broadcast Engine
              </h2>
              <p className="text-xs text-slate-400">
                Geo-Fenced Amber Alerts (Missing Children) & Red Alerts (Active Threats)
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowNewAlertModal(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-xs flex items-center space-x-2 shadow-lg shadow-red-600/20 transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Issue Emergency Broadcast (Police Authorized)</span>
        </button>
      </div>

      {/* Main Grid: Alert Selector + Selected Alert Dossier */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Active Alerts Cards */}
        <div className="lg:col-span-5 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block px-1">
            Active Emergency Broadcasts ({alerts.length})
          </span>

          {alerts.map(alert => {
            const isSelected = selectedAlert?.id === alert.id;
            const isAmber = alert.alertType === 'AMBER';
            return (
              <div
                key={alert.id}
                onClick={() => setSelectedAlert(alert)}
                className={`cursor-pointer p-4 rounded-2xl border transition-all ${
                  isSelected
                    ? isAmber 
                      ? 'bg-amber-950/40 border-amber-500 ring-1 ring-amber-500 shadow-lg shadow-amber-500/10'
                      : 'bg-red-950/40 border-red-500 ring-1 ring-red-500 shadow-lg shadow-red-500/10'
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
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                        isAmber ? 'bg-amber-500 text-black' : 'bg-red-600 text-white'
                      }`}>
                        {alert.alertType} ALERT
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        Radius: {alert.radiusKm}km
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white truncate">
                      {alert.subjectName} {alert.subjectAge ? `(${alert.subjectAge} yrs)` : ''}
                    </h4>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      Last seen: {alert.lastSeenLocation}
                    </p>

                    <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-slate-800/80">
                      <span className="font-mono text-ghana-gold text-[11px] font-bold">
                        📍 {alert.ghanaPostCode}
                      </span>
                      <span className="text-emerald-400 font-semibold text-[11px] flex items-center space-x-1">
                        <Eye className="w-3 h-3" />
                        <span>{alertSightings.length + alert.sightingsCount} Sighting Tips</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Selected Alert Details & Sighting Tip Submissions */}
        <div className="lg:col-span-7 space-y-4">
          {selectedAlert && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              {/* Alert Header */}
              <div className={`p-4 rounded-xl border flex items-start justify-between ${
                selectedAlert.alertType === 'AMBER'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-red-500/10 border-red-500/30 text-red-300'
              }`}>
                <div className="flex items-center space-x-3">
                  <Radio className="w-6 h-6 animate-pulse" />
                  <div>
                    <span className="text-xs font-mono font-bold uppercase tracking-widest">
                      CIVIL EMERGENCY • {selectedAlert.alertType} ALERT GEOFENCE BROADCAST
                    </span>
                    <h3 className="text-base font-bold text-white mt-0.5">
                      {selectedAlert.title}
                    </h3>
                  </div>
                </div>

                <button
                  onClick={() => setShowTipModal(true)}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition shadow-lg shadow-amber-500/20"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Report Sighting Tip</span>
                </button>
              </div>

              {/* Photo and Subject Profile */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                  <img
                    src={selectedAlert.subjectPhotoUrl}
                    alt={selectedAlert.subjectName}
                    className="w-full h-48 object-cover"
                  />
                </div>

                <div className="md:col-span-2 space-y-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <p className="text-slate-400 font-medium">Subject Name: <span className="text-white font-bold">{selectedAlert.subjectName}</span></p>
                    {selectedAlert.subjectAge && (
                      <p className="text-slate-400 font-medium">Age: <span className="text-white font-bold">{selectedAlert.subjectAge} years old</span></p>
                    )}
                    <p className="text-slate-400 font-medium">Last Known Location: <span className="text-slate-200 font-bold">{selectedAlert.lastSeenLocation}</span></p>
                    <p className="text-slate-400 font-medium">GhanaPost GPS: <span className="text-ghana-gold font-mono font-bold">{selectedAlert.ghanaPostCode}</span></p>
                    <p className="text-slate-400 font-medium">Broadcast Geofence: <span className="text-blue-400 font-bold">{selectedAlert.radiusKm} km radius from center</span></p>
                  </div>

                  <p className="text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                    {selectedAlert.details}
                  </p>
                </div>
              </div>

              {/* Citizen Sighting Tips Timeline */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                    <Eye className="w-4 h-4 text-emerald-400" />
                    <span>Real-Time Citizen Sighting Tips ({alertSightings.length})</span>
                  </h4>
                  <span className="text-[11px] text-slate-500 font-mono">
                    All tips geo-tagged via GhanaPost GPS
                  </span>
                </div>

                {alertSightings.length === 0 ? (
                  <div className="p-6 rounded-xl bg-slate-950 border border-slate-800 text-center text-slate-500 text-xs">
                    No verified citizen sightings submitted yet.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {alertSightings.map(tip => (
                      <div key={tip.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-mono font-bold text-ghana-gold flex items-center space-x-1">
                            <MapPin className="w-3 h-3" />
                            <span>{tip.ghanaPostCode} ({tip.locationName})</span>
                          </span>
                          <span className="text-slate-500">
                            {new Date(tip.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-slate-300">{tip.comment}</p>
                        {tip.reporterPhone && (
                          <p className="text-[10px] text-slate-500 font-mono">
                            Reporter Callback: {tip.reporterPhone}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sighting Tip Modal */}
      {showTipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <h3 className="text-base font-bold text-white mb-1">
              Submit Sighting Tip for {selectedAlert.subjectName}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Your tip will immediately alert Police Command and investigators on duty.
            </p>

            <form onSubmit={handleSubmitTip} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Where did you spot them?</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Near Total Filling Station, Madina Zongo Junction"
                  value={tipLocation}
                  onChange={(e) => setTipLocation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">GhanaPost GPS Digital Address</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GM-014-9923"
                  value={tipGhanaPost}
                  onChange={(e) => setTipGhanaPost(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-ghana-gold font-mono uppercase focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Details & Observations</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe direction of travel, clothing, companions, vehicle license plates..."
                  value={tipComment}
                  onChange={(e) => setTipComment(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Phone Number (Optional for follow-up)</label>
                <input
                  type="text"
                  placeholder="+233 24 000 0000"
                  value={tipPhone}
                  onChange={(e) => setTipPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTipModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Urgent Sighting</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Emergency Broadcast Modal (Police Issued) */}
      {showNewAlertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white mb-1">
              Issue Official Emergency Broadcast
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Authorized Ghana Police Service & National Security dispatch terminal.
            </p>

            <form onSubmit={handleCreateNewAlert} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Alert Level</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500 font-bold"
                  >
                    <option value="AMBER">AMBER ALERT (Missing Child)</option>
                    <option value="RED">RED ALERT (High-Risk Threat / Fugitive)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Broadcast Radius (KM)</label>
                  <input
                    type="number"
                    min={5}
                    max={150}
                    value={newRadius}
                    onChange={(e) => setNewRadius(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Subject Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kwabena Mensah"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Alert Headline</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AMBER ALERT: Missing 7-year-old child in Madina"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Last Seen Landmark</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Madina Market Complex"
                    value={newLastSeen}
                    onChange={(e) => setNewLastSeen(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">GhanaPost GPS Address</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. GM-014-9923"
                    value={newGhanaPost}
                    onChange={(e) => setNewGhanaPost(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-ghana-gold font-mono uppercase focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Detailed Description & Urgent Instructions</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe clothing, height, distinguishing marks, suspected vehicles..."
                  value={newDetails}
                  onChange={(e) => setNewDetails(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewAlertModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold flex items-center space-x-1.5"
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>Transmit National Geofence Alert</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
