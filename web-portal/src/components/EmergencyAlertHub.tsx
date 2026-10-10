import React, { useState, useEffect, useRef } from 'react';
import { EmergencyAlert, SightingTip, AgencyType, OfficerUser } from '../types';
import {
  AlertTriangle,
  Radio,
  Send,
  MapPin,
  Eye,
  Phone,
  PlusCircle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Image as ImageIcon,
  Upload,
  RefreshCw,
  PowerOff,
  UserX,
  X,
  Loader2
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface EmergencyAlertHubProps {
  currentOfficer: OfficerUser | null;
}

const ALLOWED_PHOTO_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB

export const EmergencyAlertHub: React.FC<EmergencyAlertHubProps> = ({
  currentOfficer
}) => {
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<EmergencyAlert | null>(null);
  const [sightings, setSightings] = useState<SightingTip[]>([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(true);
  const [isLoadingSightings, setIsLoadingSightings] = useState(false);
  const [alertsError, setAlertsError] = useState<string | null>(null);

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmittingAlert, setIsSubmittingAlert] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Form Fields
  const [alertType, setAlertType] = useState<'AMBER' | 'RED' | 'CIVIL_DISASTER'>('AMBER');
  const [title, setTitle] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [subjectAge, setSubjectAge] = useState<string>('');
  const [lastSeenLocation, setLastSeenLocation] = useState('');
  const [latitude, setLatitude] = useState('5.6037');
  const [longitude, setLongitude] = useState('-0.1870');
  const [radiusKm, setRadiusKm] = useState('35');
  const [details, setDetails] = useState('');
  const [suspectDetails, setSuspectDetails] = useState('');
  const [vehicleDetails, setVehicleDetails] = useState('');
  const [approvingCommander, setApprovingCommander] = useState('');
  const [activeHours, setActiveHours] = useState('24');

  // Photo Upload State
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Replace Photo State
  const replacePhotoInputRef = useRef<HTMLInputElement>(null);
  const [isReplacingPhoto, setIsReplacingPhoto] = useState(false);

  // 1. Fetch All Alerts for Officers
  const fetchAlerts = async () => {
    setIsLoadingAlerts(true);
    setAlertsError(null);
    try {
      const { data, error } = await supabase
        .from('emergency_alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const formatted: EmergencyAlert[] = (data || []).map((r: any) => {
        const hasValidCoords = typeof r.latitude === 'number' && !isNaN(r.latitude) && typeof r.longitude === 'number' && !isNaN(r.longitude);
        return {
          id: r.id,
          alertType: r.alert_type,
          title: r.title,
          subjectName: r.subject_name || undefined,
          subjectAge: r.subject_age || undefined,
          subjectPhotoUrl: r.subject_photo_url || '',
          lastSeenLocation: r.last_seen_location,
          ghanaPostCode: r.ghanapost_code || '',
          centerCoordinates: hasValidCoords ? [r.latitude, r.longitude] : null,
          radiusKm: Number(r.radius_km) || 35,
          details: r.details,
          suspectDetails: r.suspect_details || undefined,
          vehicleDetails: r.vehicle_details || undefined,
          isActive: Boolean(r.is_active),
          issuedByAgency: r.issued_by_agency || 'GPS_CID',
          issuingOfficerName: r.issuing_officer_name || 'CAD Duty Officer',
          approvingCommanderName: r.approving_commander_name || undefined,
          badgeNumber: r.badge_number || 'GPS-CAD',
          activeUntil: r.active_until,
          createdAt: r.created_at,
          sightingsCount: r.sightings_count || 0
        };
      });

      setAlerts(formatted);
      if (formatted.length > 0 && !selectedAlert) {
        setSelectedAlert(formatted[0]);
      } else if (selectedAlert) {
        const updated = formatted.find(a => a.id === selectedAlert.id);
        if (updated) setSelectedAlert(updated);
      }
    } catch (err: any) {
      console.warn('Error fetching emergency alerts:', err);
      setAlertsError('Could not load emergency alerts. Please check connectivity or credentials.');
    } finally {
      setIsLoadingAlerts(false);
    }
  };

  // 2. Fetch Sightings for Selected Alert
  const fetchSightings = async (alertId: string) => {
    setIsLoadingSightings(true);
    try {
      const { data, error } = await supabase
        .from('alert_sightings')
        .select('*')
        .eq('alert_id', alertId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const formatted: SightingTip[] = (data || []).map((s: any) => {
        const hasValidCoords = typeof s.latitude === 'number' && !isNaN(s.latitude) && typeof s.longitude === 'number' && !isNaN(s.longitude);
        return {
          id: s.id,
          alertId: s.alert_id,
          timestamp: s.created_at || s.timestamp,
          locationName: s.location_name,
          ghanaPostCode: s.ghanapost_code || '',
          coordinates: hasValidCoords ? [s.latitude, s.longitude] : null,
          comment: s.comment,
          photoUrl: s.photo_url || undefined,
          reporterPhone: s.reporter_phone || undefined,
          isVerified: Boolean(s.is_verified)
        };
      });

      setSightings(formatted);
    } catch (err) {
      console.warn('Error fetching alert sightings:', err);
      setSightings([]);
    } finally {
      setIsLoadingSightings(false);
    }
  };

  useEffect(() => {
    fetchAlerts();

    // Realtime alerts subscription
    const channel = supabase
      .channel('realtime_emergency_alerts_hub')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_alerts' }, () => {
        fetchAlerts();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alert_sightings' }, () => {
        if (selectedAlert) {
          fetchSightings(selectedAlert.id);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (selectedAlert) {
      fetchSightings(selectedAlert.id);
    } else {
      setSightings([]);
    }
  }, [selectedAlert?.id]);

  // Photo file validation
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_PHOTO_MIMES.includes(file.type)) {
      setCreateError('Invalid file format. Only JPEG, PNG, and WebP images are allowed.');
      return;
    }

    if (file.size > MAX_PHOTO_BYTES) {
      setCreateError('Photo exceeds 5 MB limit. Please select an image under 5 MB.');
      return;
    }

    setCreateError(null);
    setSelectedPhotoFile(file);
    setPhotoPreviewUrl(URL.createObjectURL(file));
  };

  // Create Alert Submit Handler
  const handleCreateAlertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    // Validation for AMBER
    if (alertType === 'AMBER') {
      if (!subjectName.trim()) {
        setCreateError('Subject Name is required for AMBER alerts.');
        return;
      }
      if (!subjectAge.trim() || isNaN(Number(subjectAge))) {
        setCreateError('Valid Subject Age is required for AMBER alerts.');
        return;
      }
      if (!lastSeenLocation.trim()) {
        setCreateError('Last Seen Location is required.');
        return;
      }
      if (!details.trim()) {
        setCreateError('Circumstance Details are required.');
        return;
      }
      if (!approvingCommander.trim()) {
        setCreateError('Approving Commander Name is required under Two-Man Rule.');
        return;
      }
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng)) {
      setCreateError('Please provide valid decimal latitude and longitude coordinates.');
      return;
    }

    setIsSubmittingAlert(true);

    try {
      const alertUuid = crypto.randomUUID();
      let photoPublicUrl = '';

      // Upload photo to alert-photos bucket if attached
      if (selectedPhotoFile) {
        const fileExt = selectedPhotoFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const randomSuffix = Math.random().toString(36).substring(2, 9);
        const storagePath = `${alertUuid}/${randomSuffix}.${fileExt}`;

        const { error: uploadErr } = await supabase.storage
          .from('alert-photos')
          .upload(storagePath, selectedPhotoFile, {
            contentType: selectedPhotoFile.type,
            upsert: false
          });

        if (uploadErr) {
          throw new Error(`Photo upload failed: ${uploadErr.message}`);
        }

        const { data: urlData } = supabase.storage
          .from('alert-photos')
          .getPublicUrl(storagePath);

        photoPublicUrl = urlData.publicUrl;
      }

      const activeUntilDate = new Date(Date.now() + parseInt(activeHours, 10) * 3600 * 1000).toISOString();

      const alertPayload = {
        id: alertUuid,
        alert_type: alertType,
        title: title.trim() || `${alertType} ALERT: ${subjectName || lastSeenLocation}`,
        subject_name: subjectName.trim() || null,
        subject_age: subjectAge ? parseInt(subjectAge, 10) : null,
        subject_photo_url: photoPublicUrl || null,
        last_seen_location: lastSeenLocation.trim(),
        ghanapost_code: null, // Empty until real GhanaPost API exists
        latitude: lat,
        longitude: lng,
        radius_km: parseFloat(radiusKm) || 35.0,
        details: details.trim(),
        suspect_details: suspectDetails.trim() || null,
        vehicle_details: vehicleDetails.trim() || null,
        is_active: true,
        issued_by_agency: currentOfficer?.agency || 'GPS_CID',
        issuing_officer_name: currentOfficer?.name || 'CAD Duty Officer',
        approving_commander_name: approvingCommander.trim() || null,
        badge_number: currentOfficer?.badgeNumber || 'GPS-CAD',
        active_until: activeUntilDate
      };

      const { error: insertErr } = await supabase
        .from('emergency_alerts')
        .insert(alertPayload);

      if (insertErr) {
        throw insertErr;
      }

      // Reset and close
      setIsCreateModalOpen(false);
      setTitle('');
      setSubjectName('');
      setSubjectAge('');
      setLastSeenLocation('');
      setDetails('');
      setSuspectDetails('');
      setVehicleDetails('');
      setApprovingCommander('');
      setSelectedPhotoFile(null);
      setPhotoPreviewUrl(null);

      await fetchAlerts();
    } catch (err: any) {
      console.error('Error creating emergency alert:', err);
      setCreateError(err.message || 'Failed to dispatch broadcast.');
    } finally {
      setIsSubmittingAlert(false);
    }
  };

  // Replace Photo Handler for Existing Alert
  const handleReplacePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedAlert) return;

    if (!ALLOWED_PHOTO_MIMES.includes(file.type)) {
      alert('Invalid format. Only JPEG, PNG, and WebP images are allowed.');
      return;
    }

    if (file.size > MAX_PHOTO_BYTES) {
      alert('Photo exceeds 5 MB limit.');
      return;
    }

    setIsReplacingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const randomSuffix = Math.random().toString(36).substring(2, 9);
      const storagePath = `${selectedAlert.id}/${randomSuffix}.${fileExt}`;

      const { error: uploadErr } = await supabase.storage
        .from('alert-photos')
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false
        });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from('alert-photos')
        .getPublicUrl(storagePath);

      const newPhotoUrl = urlData.publicUrl;

      const { error: updateErr } = await supabase
        .from('emergency_alerts')
        .update({ subject_photo_url: newPhotoUrl })
        .eq('id', selectedAlert.id);

      if (updateErr) throw updateErr;

      await fetchAlerts();
    } catch (err: any) {
      alert(err.message || 'Failed to replace alert photo.');
    } finally {
      setIsReplacingPhoto(false);
    }
  };

  // Deactivate Alert Handler
  const handleDeactivateAlert = async (alertId: string) => {
    if (!confirm('Are you sure you want to deactivate this emergency broadcast? Citizens will no longer receive live push geofences.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('emergency_alerts')
        .update({ is_active: false })
        .eq('id', alertId);

      if (error) throw error;
      await fetchAlerts();
    } catch (err: any) {
      alert(err.message || 'Failed to deactivate alert.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">
              National Emergency Broadcast Engine
            </h2>
            <p className="text-xs text-slate-400">
              Two-Man Authorized Amber Alerts (Missing Children) & Red Threat Geofences
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchAlerts}
            disabled={isLoadingAlerts}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center space-x-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAlerts ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => {
              setCreateError(null);
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-red-600/30 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Authorize Broadcast</span>
          </button>
        </div>
      </div>

      {alertsError && (
        <div className="p-4 rounded-2xl bg-red-950/50 border border-red-800 text-red-200 text-xs flex items-center justify-between">
          <span>{alertsError}</span>
          <button
            onClick={fetchAlerts}
            className="px-3 py-1 bg-red-900/80 hover:bg-red-800 rounded-lg text-white font-bold text-[11px]"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Broadcast Feed */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Emergency Broadcasts ({alerts.length})
            </span>
          </div>

          {isLoadingAlerts && alerts.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              <span>Loading broadcast ledger from database...</span>
            </div>
          ) : alerts.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 bg-slate-900 border border-dashed border-slate-800 rounded-2xl">
              No active emergency broadcasts. Authorize a new broadcast to alert citizens.
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {alerts.map((alert) => {
                const isSelected = selectedAlert?.id === alert.id;
                return (
                  <div
                    key={alert.id}
                    onClick={() => setSelectedAlert(alert)}
                    className={`cursor-pointer p-4 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-amber-950/40 border-amber-500 ring-1 ring-amber-500 shadow-lg shadow-amber-500/10'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    } ${!alert.isActive ? 'opacity-60 bg-slate-950/60' : ''}`}
                  >
                    <div className="flex items-start space-x-3">
                      {alert.subjectPhotoUrl ? (
                        <img
                          src={alert.subjectPhotoUrl}
                          alt={alert.subjectName || alert.title}
                          className="w-16 h-16 rounded-xl object-cover border border-slate-700 shrink-0 bg-slate-950"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center text-slate-600 shrink-0 text-[10px]">
                          <ImageIcon className="w-5 h-5 mb-0.5" />
                          <span>No Photo</span>
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span
                            className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                              alert.alertType === 'AMBER'
                                ? 'bg-amber-500 text-black'
                                : 'bg-red-600 text-white'
                            }`}
                          >
                            {alert.alertType} ALERT
                          </span>
                          {!alert.isActive && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-bold">
                              DEACTIVATED
                            </span>
                          )}
                          <span className="text-[11px] font-mono text-slate-400">Radius: {alert.radiusKm}km</span>
                        </div>

                        <h4 className="text-xs font-bold text-white truncate">{alert.title}</h4>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{alert.lastSeenLocation}</p>

                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 font-mono">
                          <span>{alert.issuedByAgency} • {alert.badgeNumber}</span>
                          <span className="text-emerald-400 font-bold">{alert.sightingsCount} Tips</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Selected Alert Dossier & Live Sightings */}
        <div className="lg:col-span-7 space-y-4">
          {selectedAlert ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
              {/* Dossier Top Bar */}
              <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-4">
                  {selectedAlert.subjectPhotoUrl ? (
                    <img
                      src={selectedAlert.subjectPhotoUrl}
                      alt={selectedAlert.subjectName || selectedAlert.title}
                      className="w-24 h-24 rounded-2xl object-cover border-2 border-amber-500/50 shadow-lg bg-slate-950"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center text-slate-500 text-xs">
                      <ImageIcon className="w-8 h-8 mb-1" />
                      <span>No Photo</span>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-extrabold px-2.5 py-0.5 rounded bg-amber-500 text-black uppercase">
                        {selectedAlert.alertType} BROADCAST
                      </span>
                      {selectedAlert.isActive ? (
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                          Active Geofence
                        </span>
                      ) : (
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                          Inactive / Expired
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-black text-white mt-1">{selectedAlert.title}</h3>
                    {selectedAlert.subjectName && (
                      <p className="text-xs text-amber-300 font-semibold mt-0.5">
                        Subject: {selectedAlert.subjectName} {selectedAlert.subjectAge ? `(${selectedAlert.subjectAge} yrs)` : ''}
                      </p>
                    )}
                  </div>
                </div>

                {/* Photo & Deactivate Actions */}
                <div className="flex items-center space-x-2">
                  <input
                    type="file"
                    ref={replacePhotoInputRef}
                    onChange={handleReplacePhoto}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                  />
                  <button
                    onClick={() => replacePhotoInputRef.current?.click()}
                    disabled={isReplacingPhoto}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isReplacingPhoto ? 'Uploading...' : 'Replace Photo'}</span>
                  </button>

                  {selectedAlert.isActive && (
                    <button
                      onClick={() => handleDeactivateAlert(selectedAlert.id)}
                      className="px-3 py-1.5 rounded-xl bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-200 text-xs font-semibold flex items-center space-x-1.5 transition"
                    >
                      <PowerOff className="w-3.5 h-3.5" />
                      <span>Deactivate</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Alert Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Last Seen Scene</span>
                  <span className="text-white font-semibold">{selectedAlert.lastSeenLocation}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Coordinates</span>
                  <span className="text-amber-400 font-mono">
                    {selectedAlert.centerCoordinates[0].toFixed(4)}, {selectedAlert.centerCoordinates[1].toFixed(4)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Authorizing Commander</span>
                  <span className="text-white font-semibold">{selectedAlert.approvingCommanderName || 'Division Command'}</span>
                </div>
              </div>

              {/* Circumstances & Details */}
              <div className="space-y-2 text-xs">
                <span className="text-slate-400 font-bold uppercase tracking-wider block">Incident Intelligence</span>
                <p className="text-slate-200 bg-slate-950 p-3 rounded-xl border border-slate-800 leading-relaxed">
                  {selectedAlert.details}
                </p>

                {(selectedAlert.suspectDetails || selectedAlert.vehicleDetails) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {selectedAlert.suspectDetails && (
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300">
                        <span className="text-red-400 font-bold block mb-1">Suspect Description:</span>
                        {selectedAlert.suspectDetails}
                      </div>
                    )}
                    {selectedAlert.vehicleDetails && (
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300">
                        <span className="text-blue-400 font-bold block mb-1">Vehicle Description:</span>
                        {selectedAlert.vehicleDetails}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Live Citizen Sighting Tips */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                    <Eye className="w-4 h-4 text-emerald-400" />
                    <span>Citizen Sighting Tips ({sightings.length})</span>
                  </h4>
                </div>

                {isLoadingSightings ? (
                  <div className="p-6 text-center text-xs text-slate-500 flex items-center justify-center space-x-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    <span>Loading verified tips from citizens...</span>
                  </div>
                ) : sightings.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                    No citizen sighting tips recorded yet for this alert.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                    {sightings.map((tip) => (
                      <div key={tip.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-emerald-400 flex items-center space-x-1">
                            <MapPin className="w-3.5 h-3.5 text-red-400" />
                            <span>{tip.locationName}</span>
                          </span>
                          <span className="text-slate-500 font-mono">{new Date(tip.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-slate-200">{tip.comment}</p>
                        {tip.reporterPhone && (
                          <p className="text-[10px] text-slate-400 font-mono">Contact: {tip.reporterPhone}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
              Select an alert from the broadcast list to view full dossier intelligence and citizen tips.
            </div>
          )}
        </div>
      </div>

      {/* Create Alert Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden max-h-[90vh] flex flex-col">
            <div className="absolute top-0 left-0 right-0 h-2 flex">
              <div className="flex-1 bg-[#CE1126]" />
              <div className="flex-1 bg-[#FCD116]" />
              <div className="flex-1 bg-[#006B3F]" />
            </div>

            <div className="flex items-start justify-between mb-4 pt-2 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-red-600/15 border border-red-500/30 flex items-center justify-center text-red-400 shadow-inner">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">AUTHORIZE EMERGENCY BROADCAST</h2>
                  <p className="text-xs text-slate-400">Two-Man Rule Geofence Dispatch under Act 772</p>
                </div>
              </div>

              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition text-sm"
              >
                ✕
              </button>
            </div>

            {createError && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/70 border border-red-800 text-red-200 text-xs flex items-center space-x-2 shrink-0">
                <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateAlertSubmit} className="space-y-3 text-xs overflow-y-auto pr-1 flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Broadcast Type *</label>
                  <select
                    value={alertType}
                    onChange={(e) => setAlertType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-red-500"
                  >
                    <option value="AMBER">AMBER ALERT (Missing Child / Youth)</option>
                    <option value="RED">RED ALERT (Active Threat / Armed Robbery)</option>
                    <option value="CIVIL_DISASTER">CIVIL DISASTER (Explosion / Flood)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Broadcast Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. AMBER ALERT: Missing Child in Madina"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                    required
                  />
                </div>
              </div>

              {/* AMBER specific fields */}
              {alertType === 'AMBER' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-amber-950/20 border border-amber-900/30 rounded-xl">
                  <div>
                    <label className="block text-amber-300 font-semibold mb-1">Subject Full Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Kwame Mensah"
                      value={subjectName}
                      onChange={(e) => setSubjectName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-amber-300 font-semibold mb-1">Subject Age (Years) *</label>
                    <input
                      type="number"
                      placeholder="e.g. 8"
                      value={subjectAge}
                      onChange={(e) => setSubjectAge(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Photo Upload with Format & Size Validation */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <label className="block text-slate-300 font-semibold">Subject / Broadcast Photo (JPEG, PNG, WebP • Max 5 MB)</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoSelect}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center space-x-1.5 transition"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                    <span>{selectedPhotoFile ? 'Change Photo' : 'Select Photo from Device'}</span>
                  </button>

                  {selectedPhotoFile && (
                    <span className="text-xs text-emerald-400 font-mono">
                      {selectedPhotoFile.name} ({(selectedPhotoFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                  )}
                </div>

                {photoPreviewUrl && (
                  <div className="mt-2 relative w-24 h-24 rounded-xl overflow-hidden border border-slate-700">
                    <img src={photoPreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPhotoFile(null);
                        setPhotoPreviewUrl(null);
                      }}
                      className="absolute top-1 right-1 bg-black/80 rounded-full p-0.5 text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Last Seen Location / Landmark *</label>
                <input
                  type="text"
                  placeholder="e.g. Madina Zongo Junction near Shell Station, Accra"
                  value={lastSeenLocation}
                  onChange={(e) => setLastSeenLocation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Latitude (GPS) *</label>
                  <input
                    type="text"
                    placeholder="5.6811"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-red-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Longitude (GPS) *</label>
                  <input
                    type="text"
                    placeholder="-0.1652"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-red-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Geofence Radius (km) *</label>
                  <input
                    type="number"
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-red-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Circumstance Details & Clothing *</label>
                <textarea
                  rows={3}
                  placeholder="Subject description, clothing, direction of travel..."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Suspect Description (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Male, approx 35 yrs, dark jacket"
                    value={suspectDetails}
                    onChange={(e) => setSuspectDetails(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Vehicle Details (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Yellow/Green Commercial Taxi (GW-441-21)"
                    value={vehicleDetails}
                    onChange={(e) => setVehicleDetails(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Approving Commander *</label>
                  <input
                    type="text"
                    placeholder="e.g. Chief Supt. Emmanuel Arthur"
                    value={approvingCommander}
                    onChange={(e) => setApprovingCommander(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Active Duration (Hours)</label>
                  <select
                    value={activeHours}
                    onChange={(e) => setActiveHours(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-red-500"
                  >
                    <option value="12">12 Hours</option>
                    <option value="24">24 Hours</option>
                    <option value="48">48 Hours</option>
                    <option value="72">72 Hours</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingAlert}
                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black flex items-center justify-center space-x-2 shadow-lg shadow-red-600/30 transition disabled:opacity-50 mt-2"
              >
                <Radio className="w-4 h-4" />
                <span>{isSubmittingAlert ? 'Broadcasting to National Alert Geofence...' : 'Authorize & Broadcast Alert'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
