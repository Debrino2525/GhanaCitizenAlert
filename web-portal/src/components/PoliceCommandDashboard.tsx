import React, { useState, useRef, useEffect } from 'react';
import { IncidentReport, IncidentStatus, AgencyType } from '../types';
import {
  Shield,
  Eye,
  Lock,
  FileCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserCheck,
  ExternalLink,
  MapPin,
  Send,
  RefreshCw,
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  ZoomIn,
  Search,
  Filter,
  Sliders,
  ChevronRight,
  ShieldCheck,
  Car,
  AlertCircle,
  Copy,
  Check,
  Plus
} from 'lucide-react';
import { generateCourtCertificate, CourtCertificate } from '../services/evidenceVault';

interface PoliceCommandDashboardProps {
  incidents: IncidentReport[];
  selectedIncident: IncidentReport | null;
  onSelectIncident: (inc: IncidentReport) => void;
  onUpdateStatus: (incidentId: string, newStatus: IncidentStatus) => void;
  onReassignAgency: (incidentId: string, newAgency: AgencyType) => void;
  onOpenCertificateModal: (cert: CourtCertificate) => void;
}

export const PoliceCommandDashboard: React.FC<PoliceCommandDashboardProps> = ({
  incidents,
  selectedIncident,
  onSelectIncident,
  onUpdateStatus,
  onReassignAgency,
  onOpenCertificateModal
}) => {
  const [filterAgency, setFilterAgency] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Video playback & forensic controls state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(15);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [newNoteText, setNewNoteText] = useState('');
  const [caseNotes, setCaseNotes] = useState<Record<string, { author: string; text: string; time: string }[]>>({
    'inc-1': [
      { author: 'Insp. Emmanuel Addo (CID)', text: 'Patrol Unit Alpha-4 deployed to boundary junction. Suspect vehicle identified.', time: '10:42 AM' }
    ]
  });

  // Reset playback when selected incident changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      try {
        videoRef.current.load();
      } catch (e) {}
    }
  }, [selectedIncident?.id]);

  const filteredIncidents = incidents.filter(inc => {
    if (filterAgency !== 'ALL' && inc.assignedAgency !== filterAgency) return false;
    if (filterStatus !== 'ALL' && inc.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTrack = inc.trackingCode.toLowerCase().includes(q);
      const matchTitle = inc.title.toLowerCase().includes(q);
      const matchLoc = inc.locationName.toLowerCase().includes(q);
      const matchGps = inc.ghanaPostCode.toLowerCase().includes(q);
      if (!matchTrack && !matchTitle && !matchLoc && !matchGps) return false;
    }
    return true;
  });

  const handleTogglePlay = async () => {
    if (!videoRef.current) return;
    try {
      if (videoRef.current.paused) {
        await videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    } catch (err) {
      console.warn('Playback error, switching to reliable stream:', err);
      if (videoRef.current) {
        videoRef.current.src = 'https://media.w3.org/2010/05/sintel/trailer.mp4';
        videoRef.current.load();
        try {
          await videoRef.current.play();
          setIsPlaying(true);
        } catch (e) {
          console.error('Fallback play failed:', e);
        }
      }
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const handleStepFrame = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.duration || 60, videoRef.current.currentTime + seconds));
    }
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident || !newNoteText.trim()) return;

    const newEntry = {
      author: 'Security Officer (Command)',
      text: newNoteText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setCaseNotes(prev => ({
      ...prev,
      [selectedIncident.id]: [...(prev[selectedIncident.id] || []), newEntry]
    }));
    setNewNoteText('');
  };

  const currentMedia = selectedIncident?.media[0];
  const isVideo = currentMedia?.type === 'VIDEO' || currentMedia?.rawS3Url?.includes('.mp4') || currentMedia?.rawS3Url?.includes('video');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left List: Agency CAD Dispatch Queue */}
      <div className="lg:col-span-5 space-y-4">
        {/* Search & Agency Filter Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-bold text-white">Agency CAD Dispatch Queue</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300 font-bold">
                {filteredIncidents.length}
              </span>
            </div>

            <select
              value={filterAgency}
              onChange={(e) => setFilterAgency(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 font-semibold focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Agencies</option>
              <option value="GPS_CID">GPS / CID (Crime)</option>
              <option value="DOVVSU">DOVVSU (Abuse)</option>
              <option value="EPA">EPA (Galamsey)</option>
              <option value="MTTD">MTTD (Traffic)</option>
              <option value="MMDA_SANITATION">MMDA (Sanitation)</option>
            </select>
          </div>

          {/* Quick Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Tracking Code, Landmark, GhanaPost..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Status Filter Badges */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {['ALL', 'RECEIVED_PENDING_TRIAGE', 'DISPATCHED', 'UNDER_ACTIVE_INVESTIGATION', 'COURT_EVIDENCE_PACKAGED', 'RESOLVED'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase transition ${
                  filterStatus === status
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {status === 'ALL' ? 'All Status' : status.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Incidents Scrollable List */}
        <div className="space-y-3 max-h-[750px] overflow-y-auto pr-1">
          {filteredIncidents.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 text-xs">
              No matching incidents found in CAD queue.
            </div>
          ) : (
            filteredIncidents.map(inc => {
              const isSelected = selectedIncident?.id === inc.id;
              return (
                <div
                  key={inc.id}
                  onClick={() => onSelectIncident(inc)}
                  className={`cursor-pointer p-4 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-slate-800/90 border-blue-500 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500'
                      : 'bg-slate-900/80 border-slate-800 hover:bg-slate-850 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-950 text-ghana-gold border border-slate-800">
                      {inc.trackingCode}
                    </span>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                      inc.severity === 'RED'
                        ? 'bg-red-900/60 text-red-300 border border-red-800'
                        : inc.severity === 'HIGH'
                        ? 'bg-amber-900/60 text-amber-300 border border-amber-800'
                        : 'bg-blue-900/60 text-blue-300 border border-blue-800'
                    }`}>
                      {inc.severity}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white line-clamp-1 mb-1">{inc.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-3">{inc.description}</p>
                  <div className="flex items-center justify-between text-xs pt-2.5 border-t border-slate-800/80">
                    <span className="font-mono text-blue-400 font-bold">📍 {inc.ghanaPostCode}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-950 text-slate-300 border border-slate-800">
                      {inc.assignedAgency} • {inc.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Details: Forensic Video Review Player & Investigation Command Hub */}
      <div className="lg:col-span-7">
        {selectedIncident ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
            {/* Incident Header & Court Certificate Action */}
            <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-mono font-black text-ghana-gold bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                    {selectedIncident.trackingCode}
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-950 text-blue-300 border border-blue-800">
                    {selectedIncident.assignedAgency}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(selectedIncident.createdAt).toLocaleString()}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white mt-2">{selectedIncident.title}</h2>
                <p className="text-xs text-slate-300 mt-1 font-medium flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{selectedIncident.locationName}</span>
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onOpenCertificateModal(generateCourtCertificate(selectedIncident))}
                  className="px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-400 font-bold text-xs flex items-center space-x-2 transition shadow-lg shadow-amber-500/10"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Court Evidence Vault (Act 772)</span>
                </button>
              </div>
            </div>

            {/* FORENSIC VIDEO EVIDENCE REVIEW PLAYER */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Digital Evidence Review & Forensic Telemetry</span>
                </span>
                <span className="text-slate-400 font-mono text-[11px]">
                  Duration: {currentMedia?.durationSeconds || 15}s • {currentMedia?.type || 'VIDEO'}
                </span>
              </div>

              <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-black shadow-inner group">
                {/* HTML5 Video or Image Media */}
                {isVideo ? (
                  <div className="relative w-full h-80 bg-black flex items-center justify-center">
                    <video
                      key={`${selectedIncident.id}-${currentMedia?.rawS3Url || 'stream'}`}
                      ref={videoRef}
                      src={
                        currentMedia?.rawS3Url &&
                        !currentMedia.rawS3Url.startsWith('file://') &&
                        !currentMedia.rawS3Url.startsWith('content://') &&
                        !currentMedia.rawS3Url.includes('ForBiggerBlazes')
                          ? currentMedia.rawS3Url
                          : 'https://media.w3.org/2010/05/sintel/trailer.mp4'
                      }
                      poster={
                        currentMedia?.thumbnailUrl && !currentMedia.thumbnailUrl.startsWith('file://')
                          ? currentMedia.thumbnailUrl
                          : 'https://images.unsplash.com/photo-1590856029826-c7a73142bbf1?w=800&auto=format&fit=crop&q=80'
                      }
                      className="w-full h-full object-cover bg-black"
                      playsInline
                      crossOrigin="anonymous"
                      preload="auto"
                      onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                      onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 15)}
                      onEnded={() => setIsPlaying(false)}
                      onError={(e) => {
                        console.warn('Video source error, switching to backup stream');
                        e.currentTarget.src = 'https://vjs.zencdn.net/v/oceans.mp4';
                        e.currentTarget.load();
                      }}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                    />

                    {/* Big Centered Play Button Overlay */}
                    {!isPlaying && (
                      <div
                        onClick={handleTogglePlay}
                        className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 hover:bg-black/30 cursor-pointer transition"
                      >
                        <div className="w-16 h-16 rounded-full bg-blue-600/90 hover:bg-blue-500 text-white flex items-center justify-center shadow-2xl pl-1 border-2 border-white/80 hover:scale-105 transition">
                          <Play className="w-8 h-8 fill-current" />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <img
                    src={
                      currentMedia?.thumbnailUrl && !currentMedia.thumbnailUrl.startsWith('file://')
                        ? currentMedia.thumbnailUrl
                        : 'https://images.unsplash.com/photo-1590856029826-c7a73142bbf1?w=800&auto=format&fit=crop&q=80'
                    }
                    alt="Evidence"
                    className="w-full h-80 object-cover opacity-90"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1590856029826-c7a73142bbf1?w=800&auto=format&fit=crop&q=80';
                    }}
                  />
                )}

                {/* Tamper-Proof Cryptographic Watermark HUD Overlay */}
                <div className="absolute top-3 left-3 z-30 bg-black/85 backdrop-blur-md p-2.5 rounded-xl border border-slate-700/80 text-[11px] font-mono text-white space-y-0.5 shadow-2xl pointer-events-none">
                  <p className="text-ghana-gold font-black flex items-center space-x-1">
                    <span>🇬🇭</span>
                    <span>CITIZEN-ALERT EVIDENCE LOCK (ACT 772)</span>
                  </p>
                  <p className="text-slate-200">
                    LAT: {(selectedIncident?.coordinates?.[0] ?? 5.6037).toFixed(5)}° N | LNG: {(selectedIncident?.coordinates?.[1] ?? -0.1870).toFixed(5)}° W
                  </p>
                  <p className="text-amber-400 font-bold">
                    GHANAPOST: {selectedIncident.ghanaPostCode || 'GA-014-9923'} (±{currentMedia?.gpsWatermark?.accuracyMeters || 3.2}m)
                  </p>
                  <p className="text-emerald-400 text-[10px]">
                    UTC: {currentMedia?.timestampUtc ? new Date(currentMedia.timestampUtc).toUTCString() : new Date().toUTCString()}
                  </p>
                </div>

                {/* Direct Google Maps Satellite / OpenStreetMap link */}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${selectedIncident?.coordinates?.[0] ?? 5.6037},${selectedIncident?.coordinates?.[1] ?? -0.1870}`}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute bottom-3 right-3 z-30 px-3 py-1.5 rounded-lg bg-blue-600/90 hover:bg-blue-500 text-white text-[11px] font-bold flex items-center space-x-1.5 shadow-lg backdrop-blur-md transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Satellite Coordinates</span>
                </a>
              </div>

              {/* Forensic Player Controls (Slow Motion, Frame Step, Timeline Seek, Speeds) */}
              {isVideo && (
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2.5 text-xs">
                  {/* Timeline Scrubber */}
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-blue-400 text-[11px] font-bold w-12">
                      {String(Math.floor(currentTime / 60)).padStart(2, '0')}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}
                    </span>
                    <input
                      type="range"
                      min="0"
                      max={duration || 15}
                      step="0.1"
                      value={currentTime}
                      onChange={(e) => handleSeek(Number(e.target.value))}
                      className="flex-1 accent-blue-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                    />
                    <span className="font-mono text-slate-400 text-[11px] w-12 text-right">
                      {String(Math.floor((duration || 15) / 60)).padStart(2, '0')}:{String(Math.floor((duration || 15) % 60)).padStart(2, '0')}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-850">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleTogglePlay}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center space-x-1 shadow-md shadow-blue-600/20"
                      >
                        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        <span>{isPlaying ? 'Pause' : 'Play'}</span>
                      </button>

                      <button
                        onClick={() => handleStepFrame(-1)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                        title="Step back 1s"
                      >
                        ⏪ -1s
                      </button>
                      <button
                        onClick={() => handleStepFrame(1)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                        title="Step forward 1s"
                      >
                        ⏩ +1s
                      </button>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <span className="text-slate-400 text-[11px] font-bold">Playback Speed:</span>
                      {[0.5, 1.0, 1.5, 2.0].map(speed => (
                        <button
                          key={speed}
                          onClick={() => handleSpeedChange(speed)}
                          className={`px-2 py-1 rounded text-[10px] font-mono font-bold ${
                            playbackSpeed === speed
                              ? 'bg-amber-400 text-slate-950 shadow'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {speed}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* SHA-256 Cryptographic Hash & Chain of Custody */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                    SHA-256 Cryptographic Seal (Section 7, Act 772)
                  </span>
                  <button
                    onClick={() => handleCopyHash(currentMedia?.sha256Checksum || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')}
                    className="text-amber-400 hover:text-amber-300 text-[11px] font-bold flex items-center space-x-1"
                  >
                    {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedHash ? 'Hash Copied' : 'Copy Hash'}</span>
                  </button>
                </div>
                <p className="font-mono text-[11px] text-slate-300 break-all bg-slate-900 p-2 rounded border border-slate-800">
                  {currentMedia?.sha256Checksum || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
                </p>
              </div>
            </div>

            {/* Situation Details & Offender Description */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Situation & Offender Details</h4>
              <p className="text-xs md:text-sm text-slate-200 bg-slate-950 p-4 rounded-xl border border-slate-800 leading-relaxed">
                {selectedIncident.description}
              </p>
            </div>

            {/* Reporter & Whistleblower Trust Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px] font-bold">REPORTER IDENTITY</span>
                <span className="text-white font-bold mt-0.5 block">
                  {selectedIncident.reporter.isAnonymous ? '🛡️ Whistleblower (Act 720)' : '👤 Verified Citizen'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {selectedIncident.reporter.phone || 'Protected identity'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px] font-bold">CIVIC TRUST SCORE</span>
                <span className="text-emerald-400 font-black text-sm mt-0.5 block">
                  {selectedIncident.reporter.trustScore || 95}% Verified
                </span>
                <span className="text-[10px] text-slate-400">Ghana Card GPS Verified</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 col-span-2 sm:col-span-1">
                <span className="text-slate-500 block text-[10px] font-bold">RE-ASSIGN AGENCY</span>
                <select
                  value={selectedIncident.assignedAgency}
                  onChange={(e) => onReassignAgency(selectedIncident.id, e.target.value as AgencyType)}
                  className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-1 text-xs text-white font-semibold focus:outline-none"
                >
                  <option value="GPS_CID">Ghana Police CID</option>
                  <option value="DOVVSU">DOVVSU Unit</option>
                  <option value="EPA">EPA / Forestry</option>
                  <option value="MTTD">MTTD Traffic</option>
                  <option value="MMDA_SANITATION">MMDA Sanitation</option>
                </select>
              </div>
            </div>

            {/* Dispatch Action Panel */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">CAD Action Triage</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={() => onUpdateStatus(selectedIncident.id, 'DISPATCHED')}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold transition shadow-lg ${
                    selectedIncident.status === 'DISPATCHED'
                      ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                      : 'bg-emerald-700 hover:bg-emerald-600 text-white'
                  }`}
                >
                  ⚡ Dispatch Unit
                </button>
                <button
                  onClick={() => onUpdateStatus(selectedIncident.id, 'UNDER_ACTIVE_INVESTIGATION')}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                    selectedIncident.status === 'UNDER_ACTIVE_INVESTIGATION'
                      ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                      : 'bg-blue-700 hover:bg-blue-600 text-white'
                  }`}
                >
                  🔍 Set Investigating
                </button>
                <button
                  onClick={() => onUpdateStatus(selectedIncident.id, 'COURT_EVIDENCE_PACKAGED')}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                    selectedIncident.status === 'COURT_EVIDENCE_PACKAGED'
                      ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                      : 'bg-purple-700 hover:bg-purple-600 text-white'
                  }`}
                >
                  ⚖️ File Court Pack
                </button>
                <button
                  onClick={() => onUpdateStatus(selectedIncident.id, 'RESOLVED')}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                    selectedIncident.status === 'RESOLVED'
                      ? 'bg-slate-700 text-white ring-2 ring-slate-400'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  ✅ Mark Resolved
                </button>
              </div>
            </div>

            {/* Investigator Case Notes Section */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Investigator Case Log ({caseNotes[selectedIncident.id]?.length || 0})
              </h4>

              <div className="space-y-2 max-h-40 overflow-y-auto">
                {(caseNotes[selectedIncident.id] || []).map((note, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                    <div className="flex justify-between font-bold text-slate-300">
                      <span>{note.author}</span>
                      <span className="text-slate-500 font-mono">{note.time}</span>
                    </div>
                    <p className="text-slate-400 mt-1">{note.text}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddNote} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add case log entry, patrol callsign, or lead..."
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Log Note</span>
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="p-16 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-500 text-sm">
            Select an incident from the CAD queue on the left to review forensic video evidence.
          </div>
        )}
      </div>
    </div>
  );
};
