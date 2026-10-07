import React, { useState, useEffect } from 'react';
import { IncidentReport, IncidentCategory, AgencyType, EvidenceMedia } from '../types';
import { Camera, Video, Play, Square, RefreshCw, Upload, Lock, Shield, MapPin, CheckCircle2, AlertTriangle, UserCheck, EyeOff, Radio } from 'lucide-react';
import { resolveGhanaPostGps, validateGhanaPostGps } from '../services/ghanaPostGps';
import { computeSha256Simulation } from '../services/evidenceVault';

interface CitizenMobileSimulatorProps {
  onSubmitIncident: (incident: IncidentReport) => void;
}

export const CitizenMobileSimulator: React.FC<CitizenMobileSimulatorProps> = ({
  onSubmitIncident
}) => {
  // Mobile app state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordedDuration, setRecordedDuration] = useState<number>(0);

  // Form fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<IncidentCategory>('CRIMINAL_OFFENSE');
  const [description, setDescription] = useState('');
  const [ghanaPostCode, setGhanaPostCode] = useState('GA-382-9104');
  const [locationName, setLocationName] = useState('East Legon Boundary Road, Accra');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [reporterName, setReporterName] = useState('Kwame Mensah');
  const [reporterPhone, setReporterPhone] = useState('+233 24 456 7890');
  const [ghanaCard, setGhanaCard] = useState('GHA-712893812-4');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null);

  // 60-Second In-Camera Countdown Timer
  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds(prev => {
          if (prev >= 59) {
            // Force stop at 60 seconds
            handleStopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleStartRecording = () => {
    setRecordedVideoUrl(null);
    setRecordingSeconds(0);
    setIsRecording(true);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setRecordedDuration(recordingSeconds || 15);
    // Use realistic evidence capture stock image
    setRecordedVideoUrl('https://images.unsplash.com/photo-1590856029826-c7a73142bbf1?w=800&auto=format&fit=crop&q=80');
  };

  const handleLookupGhanaPost = () => {
    if (validateGhanaPostGps(ghanaPostCode)) {
      const res = resolveGhanaPostGps(ghanaPostCode);
      setLocationName(`${res.areaName}, ${res.region}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setIsSubmitting(true);

    const geo = resolveGhanaPostGps(ghanaPostCode);
    const tracking = `GH-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowUtc = new Date().toISOString();

    // Map Category to Agency
    let assigned: AgencyType = 'GPS_CID';
    let severity: 'NORMAL' | 'HIGH' | 'RED' = 'NORMAL';
    if (category === 'DOMESTIC_ABUSE') assigned = 'DOVVSU';
    if (category === 'GALAMSEY_ENVIRONMENTAL') {
      assigned = 'EPA';
      severity = 'HIGH';
    }
    if (category === 'TRAFFIC_RECKLESS') assigned = 'MTTD';
    if (category === 'SANITATION_ZONING') assigned = 'AMA';
    if (category === 'CRIMINAL_OFFENSE') severity = 'RED';

    const mediaList: EvidenceMedia[] = [];
    if (recordedVideoUrl) {
      mediaList.push({
        id: `med-${Date.now()}`,
        type: 'VIDEO',
        durationSeconds: recordedDuration || 35,
        url: recordedVideoUrl,
        thumbnailUrl: recordedVideoUrl,
        sha256Hash: computeSha256Simulation(`${tracking}-${nowUtc}-${geo.lat}-${geo.lng}`),
        timestampUtc: nowUtc,
        gpsWatermark: {
          lat: geo.lat,
          lng: geo.lng,
          ghanaPostCode: ghanaPostCode.toUpperCase(),
          accuracyMeters: 3.5
        },
        isTamperProofVerified: true
      });
    }

    const report: IncidentReport = {
      id: `inc-${Date.now()}`,
      trackingCode: tracking,
      title: title,
      category: category,
      description: description,
      locationName: locationName || 'Accra Metropolitan Area',
      ghanaPostCode: ghanaPostCode.toUpperCase(),
      region: geo.region,
      coordinates: [geo.lat, geo.lng],
      media: mediaList,
      reporter: {
        isAnonymous: isAnonymous,
        name: isAnonymous ? undefined : reporterName,
        phone: isAnonymous ? undefined : reporterPhone,
        ghanaCardId: isAnonymous ? undefined : ghanaCard,
        trustScore: isAnonymous ? 80 : 95
      },
      assignedAgency: assigned,
      secondaryAgencies: ['GPS_CID'],
      status: 'PENDING_TRIAGE',
      severity: severity as any,
      isPublicSafe: category === 'TRAFFIC_RECKLESS' || category === 'SANITATION_ZONING',
      publicCorroborations: 1,
      createdAt: nowUtc,
      updatedAt: nowUtc
    };

    setTimeout(() => {
      onSubmitIncident(report);
      setIsSubmitting(false);
      setSubmissionSuccess(tracking);
      // Reset
      setTitle('');
      setDescription('');
      setRecordedVideoUrl(null);
      setRecordingSeconds(0);
    }, 1200);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-center max-w-xl mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-3">
          <Camera className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">
          Citizen 60-Second Evidence Camera
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Simulating the offline-first mobile capture app with real-time GhanaPost GPS watermarking and tamper-proof SHA-256 seal.
        </p>
      </div>

      {submissionSuccess && (
        <div className="max-w-xl mx-auto p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-sm text-white">Incident Dispatched to Police & Agency Hub!</p>
              <p className="font-mono">Tracking Code: <span className="font-bold text-ghana-gold">{submissionSuccess}</span></p>
            </div>
          </div>
          <button
            onClick={() => setSubmissionSuccess(null)}
            className="text-xs font-bold underline text-emerald-200"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Phone Simulator Frame */}
      <div className="max-w-md mx-auto bg-slate-950 border-4 border-slate-800 rounded-[38px] p-4 shadow-2xl relative shadow-black">
        {/* Phone Notch */}
        <div className="w-36 h-4 bg-slate-800 rounded-b-xl mx-auto mb-3 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-slate-950" />
        </div>

        {/* Viewfinder / Camera Screen */}
        <div className="relative h-64 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex flex-col justify-between p-3">
          {/* Top Camera Status & 60s Max Timer */}
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center space-x-2 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700">
              <span className={`w-2.5 h-2.5 rounded-full ${isRecording ? 'bg-red-500 animate-ping' : 'bg-slate-500'}`} />
              <span className="font-mono text-xs font-bold text-white">
                {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:{String(recordingSeconds % 60).padStart(2, '0')} / 01:00 MAX
              </span>
            </div>

            <div className="bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700 text-[10px] font-mono text-ghana-gold font-bold">
              🇬🇭 720p COMPRESSED
            </div>
          </div>

          {/* Background Video Simulation */}
          {recordedVideoUrl ? (
            <img
              src={recordedVideoUrl}
              alt="Recorded frame"
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 space-y-2">
              <Camera className="w-12 h-12 stroke-[1.5]" />
              <span className="text-xs font-medium text-slate-500">
                {isRecording ? 'Capturing 60s Encrypted Stream...' : 'Tap Record to Capture 60s Evidence'}
              </span>
            </div>
          )}

          {/* Cryptographic Watermark Stamp on Bottom Viewfinder */}
          <div className="z-10 bg-black/80 backdrop-blur-md p-2 rounded-xl border border-slate-700 text-[10px] font-mono text-slate-200 space-y-0.5">
            <div className="flex justify-between items-center text-ghana-gold font-bold">
              <span>WATERMARK LOCKED</span>
              <span>UTC {new Date().toISOString().substring(11, 19)}</span>
            </div>
            <p className="text-amber-300 font-bold">GPS: {ghanaPostCode} (±3.5m)</p>
          </div>
        </div>

        {/* Camera Control Buttons */}
        <div className="flex items-center justify-center space-x-4 my-4">
          {!isRecording ? (
            <button
              type="button"
              onClick={handleStartRecording}
              className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 border-4 border-slate-800 flex items-center justify-center text-white shadow-lg shadow-red-600/30 transition transform active:scale-95"
            >
              <Video className="w-6 h-6" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStopRecording}
              className="w-14 h-14 rounded-full bg-slate-100 hover:bg-white border-4 border-slate-800 flex items-center justify-center text-red-600 shadow-lg transition transform active:scale-95 animate-pulse"
            >
              <Square className="w-6 h-6 fill-current" />
            </button>
          )}

          {recordedVideoUrl && (
            <button
              type="button"
              onClick={() => {
                setRecordedVideoUrl(null);
                setRecordingSeconds(0);
              }}
              className="p-3 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Retake Video"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Report Form */}
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-400 font-bold mb-1">Incident Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-emerald-500"
            >
              <option value="CRIMINAL_OFFENSE">🚨 Crime / Robbery / Assault (Ghana Police / CID)</option>
              <option value="DOMESTIC_ABUSE">🛡️ Domestic & Child Abuse (DOVVSU)</option>
              <option value="GALAMSEY_ENVIRONMENTAL">🌲 Galamsey / Illegal Mining / River Spills (EPA)</option>
              <option value="TRAFFIC_RECKLESS">🚗 Reckless / Dangerous Driving (MTTD / DVLA)</option>
              <option value="SANITATION_ZONING">🗑️ Illegal Waste Dumping / Building (MMDAs)</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1">Incident Summary</label>
            <input
              type="text"
              required
              placeholder="e.g. Armed break-in attempt on East Legon Boundary Rd"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1">GhanaPost GPS Code</label>
            <div className="flex space-x-2">
              <input
                type="text"
                required
                placeholder="e.g. GA-382-9104"
                value={ghanaPostCode}
                onChange={(e) => setGhanaPostCode(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-ghana-gold font-mono uppercase focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleLookupGhanaPost}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px]"
              >
                Resolve
              </button>
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">{locationName}</span>
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1">Description & Offender Details</label>
            <textarea
              rows={2}
              required
              placeholder="Describe suspects, vehicle numbers, weapons, direction of escape..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Anonymous Whistleblower Toggle (Ghana Whistleblower Act 720) */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {isAnonymous ? <EyeOff className="w-4 h-4 text-amber-400" /> : <UserCheck className="w-4 h-4 text-emerald-400" />}
              <div>
                <span className="text-xs font-bold text-white block">
                  {isAnonymous ? 'Anonymous Whistleblower' : 'Verified Reporter (Ghana Card)'}
                </span>
                <span className="text-[10px] text-slate-500">
                  {isAnonymous ? 'Identity encrypted under Whistleblower Act (Act 720)' : 'Eligible for official police updates & citizen rewards'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsAnonymous(!isAnonymous)}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                isAnonymous ? 'bg-amber-600' : 'bg-emerald-600'
              }`}
            >
              <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                isAnonymous ? 'right-1' : 'left-1'
              }`} />
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20 transition disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Encrypting & Dispatching Evidence...</span>
              </>
            ) : (
              <>
                <Shield className="w-4 h-4" />
                <span>Transmit Official Incident Report</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
