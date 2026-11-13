import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { IncidentReport, IncidentStatus, AgencyType, SosPing, LocationSource } from '../types';
import {
  Shield,
  FileCheck,
  MapPin,
  Play,
  Pause,
  Search,
  ShieldCheck,
  Car,
  AlertTriangle,
  Copy,
  Check,
  Plus,
  Navigation,
  Compass,
  Radio,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Maximize,
  Minimize,
  ZoomIn,
  Download,
  X,
  Activity,
  UploadCloud,
  RotateCcw,
  Clock,
  PhoneCall
} from 'lucide-react';
import { generateCourtCertificate, CourtCertificate } from '../services/evidenceVault';
import { supabase } from '../services/supabaseClient';
import { computeTacticalDispatchRoute } from '../services/googleMapsService';
import {
  generatePoliceCaseBrief,
  performAiTriageAnalysis,
  PoliceCaseBrief,
  AiTriageResult
} from '../services/geminiAiService';
import { AiCaseBriefModal } from './AiCaseBriefModal';
import { getSosState, sosDisplayTitle, formatAgo, SOS_STATE_LABEL } from '../utils/sosState';

export { renderLocationSourceBadge, evidencePathFromUrl, isCaseClosed, formatPingAge } from './dashboard/caseHelpers';
import { renderLocationSourceBadge, evidencePathFromUrl, isCaseClosed, formatPingAge } from './dashboard/caseHelpers';
import { CaseQueue } from './dashboard/CaseQueue';

interface PoliceCommandDashboardProps {
  incidents: IncidentReport[];
  selectedIncident: IncidentReport | null;
  onSelectIncident: (inc: IncidentReport) => void;
  onUpdateStatus: (incidentId: string, newStatus: IncidentStatus) => void;
  onReassignAgency: (incidentId: string, newAgency: AgencyType) => void;
  onOpenCertificateModal: (cert: CourtCertificate) => void;
  onApprovePublicPublish?: (incidentId: string) => void;
  onRejectPublicPublish?: (incidentId: string) => void;
}

export const PoliceCommandDashboard: React.FC<PoliceCommandDashboardProps> = ({
  incidents,
  selectedIncident,
  onSelectIncident,
  onUpdateStatus,
  onReassignAgency,
  onOpenCertificateModal,
  onApprovePublicPublish,
  onRejectPublicPublish
}) => {
  const [filterAgency, setFilterAgency] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [latestPings, setLatestPings] = useState<Record<string, SosPing>>({});
  const [, setTick] = useState(0);

  // Periodic tick every 3 seconds to keep ping ages live
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 3000);
    return () => clearInterval(timer);
  }, []);

  // Fetch initial sos_pings & subscribe to realtime stream
  useEffect(() => {
    const fetchPings = async () => {
      try {
        const { data, error } = await supabase
          .from('sos_pings')
          .select('*')
          .order('created_at', { ascending: false });

        if (data && data.length > 0) {
          const map: Record<string, SosPing> = {};
          data.forEach((p: any) => {
            if (!map[p.incident_id]) {
              map[p.incident_id] = p;
            }
          });
          setLatestPings(map);
        } else {
          setLatestPings({});
        }
      } catch (err) {
        console.warn('Error fetching sos_pings:', err);
      }
    };

    fetchPings();

    const channel = supabase
      .channel('realtime_sos_pings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sos_pings' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const p: SosPing = payload.new as SosPing;
          setLatestPings(prev => ({
            ...prev,
            [p.incident_id]: p
          }));
        } else if (payload.eventType === 'DELETE') {
          fetchPings();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Video playback & forensic controls state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(15);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [videoLoadError, setVideoLoadError] = useState<boolean>(false);
  const [resolvedVideoUrl, setResolvedVideoUrl] = useState<string>('');
  const [isResolvingUrl, setIsResolvingUrl] = useState<boolean>(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [newNoteText, setNewNoteText] = useState('');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [activeMediaIndex, setActiveMediaIndex] = useState<number>(0);

  const handleToggleFullscreen = () => {
    if (!videoRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen().catch(() => {});
      } else if ((videoRef.current as any).webkitRequestFullscreen) {
        (videoRef.current as any).webkitRequestFullscreen();
      }
    }
  };

  // Gemini AI Case Dossier & Multimodal Triage State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiBrief, setAiBrief] = useState<PoliceCaseBrief | null>(null);
  const [aiTriage, setAiTriage] = useState<AiTriageResult | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [actionToast, setActionToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);

  const [caseNotes, setCaseNotes] = useState<Record<string, { author: string; text: string; time: string }[]>>({});

  // Calculate incident counts per status for filter badges
  const statusCounts = useMemo(() => {
    return incidents.reduce((acc, inc) => {
      acc[inc.status] = (acc[inc.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [incidents]);

  const handleOpenAiDossier = async () => {
    if (!selectedIncident) return;
    setIsAiModalOpen(true);
    setIsLoadingAi(true);
    try {
      const [briefRes, triageRes] = await Promise.all([
        generatePoliceCaseBrief(selectedIncident),
        performAiTriageAnalysis(selectedIncident)
      ]);
      setAiBrief(briefRes);
      setAiTriage(triageRes);
    } catch (err) {
      console.error('Error generating AI dossier:', err);
    } finally {
      setIsLoadingAi(false);
    }
  };

  const handleDispatchUnit = () => {
    if (!selectedIncident) return;
    onUpdateStatus(selectedIncident.id, 'DISPATCHED');
    const note = {
      author: 'CAD Tactical Dispatch',
      text: `⚡ Rapid Response Patrol Unit dispatched to scene at ${selectedIncident.locationName}. Sirens active.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setCaseNotes(prev => ({
      ...prev,
      [selectedIncident.id]: [...(prev[selectedIncident.id] || []), note]
    }));
    setActionToast({ message: '⚡ Tactical Patrol Unit Dispatched to Scene!', type: 'success' });
    setTimeout(() => setActionToast(null), 3500);
  };

  const handleSetInvestigating = () => {
    if (!selectedIncident) return;
    onUpdateStatus(selectedIncident.id, 'UNDER_ACTIVE_INVESTIGATION');
    const note = {
      author: 'CID Duty Officer',
      text: `🔍 Case marked Under Active Field Investigation. Forensic officer assigned to scene coordinate analysis.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setCaseNotes(prev => ({
      ...prev,
      [selectedIncident.id]: [...(prev[selectedIncident.id] || []), note]
    }));
    setActionToast({ message: '🔍 Case Set Under Active Field Investigation!', type: 'info' });
    setTimeout(() => setActionToast(null), 3500);
  };

  const handleFileCourtPack = () => {
    if (!selectedIncident) return;
    onUpdateStatus(selectedIncident.id, 'COURT_EVIDENCE_PACKAGED');
    const note = {
      author: 'Evidence Custodian (Act 772)',
      text: `⚖️ Case marked as court-packaged. Evidence summary generated (not a certified or signed document).`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setCaseNotes(prev => ({
      ...prev,
      [selectedIncident.id]: [...(prev[selectedIncident.id] || []), note]
    }));
    setActionToast({ message: '⚖️ Evidence summary generated', type: 'success' });
    // Automatically open the Court Certificate Modal
    onOpenCertificateModal(generateCourtCertificate(selectedIncident));
    setTimeout(() => setActionToast(null), 3500);
  };

  const handleMarkResolved = () => {
    if (!selectedIncident) return;
    onUpdateStatus(selectedIncident.id, 'RESOLVED');
    const note = {
      author: 'Station Commander',
      text: `✅ Incident resolved and cleared. Case closed in CAD Terminal.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setCaseNotes(prev => ({
      ...prev,
      [selectedIncident.id]: [...(prev[selectedIncident.id] || []), note]
    }));
    setActionToast({ message: '✅ Incident Successfully Marked Resolved!', type: 'success' });
    setTimeout(() => setActionToast(null), 3500);
  };

  // Reset playback & resolve signed video URL when selected incident or its media changes
  const activeMedia = useMemo(() => {
    return (selectedIncident?.media || []).find((m: any) => m.type === 'VIDEO') || selectedIncident?.media?.[0];
  }, [selectedIncident?.media]);

  const activeMediaStr = JSON.stringify(activeMedia || {});
  const mediaSerialized = JSON.stringify(selectedIncident?.media ?? []);

  const resolveMediaUrl = useCallback(async () => {
    setIsPlaying(false);
    setCurrentTime(0);

    if (!activeMedia) {
      console.log('[CAD_MEDIA] No active media for incident:', selectedIncident?.trackingCode);
      setResolvedVideoUrl('');
      setVideoLoadError(false);
      setIsResolvingUrl(false);
      return;
    }

    const rawUrl = (activeMedia as any).rawS3Url || (activeMedia as any).url || (activeMedia as any).thumbnailUrl || '';
    // The evidence bucket is private: playback needs a signed URL. Stored media often
    // carries an old public URL, so recover the object path from it when no path is stored.
    const storagePath = (activeMedia as any).video_storage_path || (activeMedia as any).storage_path
      || evidencePathFromUrl(rawUrl);
    const uploadStatus = (activeMedia as any).uploadStatus;

    setIsResolvingUrl(true);
    const playFrom = (url: string) => {
      setResolvedVideoUrl(url);
      setVideoLoadError(false);
      setIsPlaying(false);
      setIsResolvingUrl(false);
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        try {
          videoRef.current.load();
        } catch { /* element may be detaching; nothing to do */ }
      }
    };
    try {
      // 1. Inline data, or a link that is not into the private evidence bucket.
      if (rawUrl && (rawUrl.startsWith('data:') || (/^https?:\/\//.test(rawUrl) && !evidencePathFromUrl(rawUrl)))) {
        playFrom(rawUrl);
        return;
      }

      // 2. Private evidence: signed URL (officer-only by storage policy).
      if (storagePath) {
        try {
          const { data: signedData, error: signedErr } = await supabase.storage
            .from('evidence')
            .createSignedUrl(storagePath, 3600);
          if (!signedErr && signedData?.signedUrl) {
            playFrom(signedData.signedUrl);
            return;
          }
          console.warn('[CAD_MEDIA] Could not sign evidence URL:', signedErr?.message, { uploadStatus });
        } catch (signedErr) {
          console.warn('[CAD_MEDIA] Signed URL resolution exception:', signedErr);
        }
      }

      if (rawUrl && !rawUrl.startsWith('file://') && !evidencePathFromUrl(rawUrl)) {
        console.log('[CAD_MEDIA] Falling back to rawUrl:', rawUrl);
        setResolvedVideoUrl(rawUrl);
        setVideoLoadError(false);
        setIsPlaying(false);
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
          try {
            videoRef.current.load();
          } catch { /* element may be detaching; nothing to do */ }
        }
      } else {
        console.log('[CAD_MEDIA] No valid remote URL found (in-flight or local URI)');
        setResolvedVideoUrl('');
      }
    } catch (e) {
      console.warn('[CAD_MEDIA] Media URL resolution error:', e);
      const fallback = (activeMedia as any).rawS3Url || '';
      const cleanFallback = fallback.startsWith('file://') ? '' : fallback;
      setResolvedVideoUrl(cleanFallback);
      if (cleanFallback) {
        setVideoLoadError(false);
        if (videoRef.current) {
          videoRef.current.currentTime = 0;
          try {
            videoRef.current.load();
          } catch { /* element may be detaching; nothing to do */ }
        }
      }
    } finally {
      setIsResolvingUrl(false);
    }
  }, [activeMediaStr]);

  useEffect(() => {
    resolveMediaUrl();

    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      try {
        videoRef.current.load();
      } catch { /* element may be detaching; nothing to do */ }
    }
  }, [resolveMediaUrl, selectedIncident?.id, selectedIncident?.trackingCode, mediaSerialized]);

  const handleForceRefreshMedia = useCallback(() => {
    setVideoLoadError(false);
    resolveMediaUrl();
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      try {
        videoRef.current.load();
      } catch { /* element may be detaching; nothing to do */ }
    }
  }, [resolveMediaUrl]);

  const filteredIncidents = incidents.filter(inc => {
    if (filterAgency !== 'ALL' && inc.assignedAgency !== filterAgency) return false;
    if (filterStatus !== 'ALL' && inc.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTrack = inc.trackingCode.toLowerCase().includes(q);
      const matchTitle = inc.title.toLowerCase().includes(q);
      const matchLoc = (inc.locationName || '').toLowerCase().includes(q);
      if (!matchTrack && !matchTitle && !matchLoc) return false;
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
      console.warn('Playback error:', err);
      setVideoLoadError(true);
      setIsPlaying(false);
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

  const currentMedia = (selectedIncident?.media || []).find((m: any) => m.type === 'VIDEO') || selectedIncident?.media?.[0];
  // SHA-256 digest computed on the reporter's device at capture time. Never substitute a placeholder:
  // a missing digest must read as missing, not as a seal.
  const evidenceHash = (() => {
    const raw = String(currentMedia?.sha256Checksum || currentMedia?.sha256Hash || '');
    return /^[a-f0-9]{64}$/i.test(raw) ? raw.toLowerCase() : null;
  })();
  const isVideo = currentMedia?.type === 'VIDEO' || resolvedVideoUrl?.includes('.mp4') || (currentMedia as any)?.rawS3Url?.includes('.mp4');

  const statusFilterList = [
    { id: 'ALL', label: 'All Cases' },
    { id: 'RECEIVED_PENDING_TRIAGE', label: 'Pending Triage' },
    { id: 'DISPATCHED', label: 'Dispatched' },
    { id: 'UNDER_ACTIVE_INVESTIGATION', label: 'Investigating' },
    { id: 'COURT_EVIDENCE_PACKAGED', label: 'Court Packaged' },
    { id: 'RESOLVED', label: 'Resolved' }
  ];

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Phase 2: Keyboard shortcuts (/ to search, j/k to navigate, Esc to close/blur)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        const currentIndex = filteredIncidents.findIndex(i => i.id === selectedIncident?.id);
        if (currentIndex < filteredIncidents.length - 1) {
          onSelectIncident(filteredIncidents[currentIndex + 1]);
        }
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIndex = filteredIncidents.findIndex(i => i.id === selectedIncident?.id);
        if (currentIndex > 0) {
          onSelectIncident(filteredIncidents[currentIndex - 1]);
        }
      } else if (e.key === 'Escape') {
        if (isAiModalOpen) setIsAiModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredIncidents, selectedIncident?.id, isAiModalOpen, onSelectIncident]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* LEFT COLUMN: case queue */}
      <CaseQueue
        incidents={incidents}
        filteredIncidents={filteredIncidents}
        selectedIncident={selectedIncident}
        onSelectIncident={onSelectIncident}
        latestPings={latestPings}
        filterAgency={filterAgency}
        setFilterAgency={setFilterAgency}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchInputRef={searchInputRef}
        statusFilterList={statusFilterList}
        statusCounts={statusCounts}
      />

      {/* RIGHT COLUMN: Forensic Review Player & Investigation Command Hub */}
      <div className="lg:col-span-7">
        {selectedIncident ? (
          <div className="space-y-5">
            {/* Sticky Incident Action Header Card */}
            <div className="sticky top-[calc(var(--header-h)+0.5rem)] z-10 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-3 transition-all">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs sm:text-sm font-mono font-black text-ghana-gold bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                      {selectedIncident.trackingCode}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-950 text-blue-300 border border-blue-800">
                      {selectedIncident.assignedAgency}
                    </span>
                    <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {new Date(selectedIncident.createdAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-white mt-1.5 leading-snug">{sosDisplayTitle(selectedIncident.title, getSosState(selectedIncident, latestPings[selectedIncident.id]?.created_at))}</h2>
                  <p className="text-xs text-slate-300 mt-0.5 font-medium flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">{selectedIncident.locationName}</span>
                  </p>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={handleOpenAiDossier}
                    className="px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-amber-500/20 via-blue-500/20 to-purple-500/20 hover:from-amber-500/30 hover:to-blue-500/30 border border-amber-400/40 text-amber-300 font-bold text-xs flex items-center space-x-1.5 transition shadow-lg shadow-amber-500/10"
                  >
                    <FileCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>Case summary (draft)</span>
                  </button>

                  <button
                    onClick={() => onOpenCertificateModal(generateCourtCertificate(selectedIncident))}
                    className="px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-400 font-bold text-xs flex items-center space-x-1.5 transition shadow-lg shadow-amber-500/10"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>Evidence summary</span>
                  </button>
                </div>
              </div>
            </div>

            {/* CARD 0: LIVE SOS BEACON TRACKING BANNER (If Active Pings Exist) */}
            {latestPings[selectedIncident.id] && (() => {
              const sosState = getSosState(selectedIncident, latestPings[selectedIncident.id].created_at);
              const isPingActive = sosState === 'LIVE';
              const isSignalLost = sosState === 'SIGNAL_LOST';

              return (
                <div className={`border-2 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-wrap items-center justify-between gap-4 ${
                  isPingActive
                    ? 'bg-red-950/60 border-red-500'
                    : isSignalLost
                    ? 'bg-amber-950/40 border-amber-500'
                    : 'bg-slate-900 border-slate-700'
                }`}>
                  <div className="flex items-center space-x-3.5 min-w-0">
                    {/* Small Round Citizen Face Identification Avatar */}
                    {selectedIncident.reporter?.avatarUrl && !selectedIncident.reporter?.isAnonymous ? (
                      <div className="relative shrink-0">
                        <img
                          src={selectedIncident.reporter.avatarUrl}
                          alt="Citizen Face"
                          className={`w-12 h-12 rounded-full border-2 object-cover shadow-lg ${
                            isPingActive ? 'border-red-500' : 'border-slate-600 grayscale'
                          }`}
                        />
                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border border-slate-900 flex items-center justify-center text-xs ${
                          isPingActive ? 'bg-red-600' : 'bg-slate-700'
                        }`}>
                          {isPingActive ? '🚨' : '🛑'}
                        </div>
                      </div>
                    ) : (
                      <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 shadow-lg ${
                        isPingActive
                          ? 'bg-red-600/20 border-red-500/50 text-red-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}>
                        <Radio className={`w-6 h-6 ${isPingActive ? 'animate-ping' : ''}`} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-xs font-black uppercase px-2.5 py-0.5 rounded shadow-md ${
                          isPingActive
                            ? 'bg-red-600 text-white'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}>
                          {isPingActive ? '🚨 LIVE SOS' : isSignalLost ? '⚠️ SOS: NO SIGNAL, NOT CANCELLED' : `SOS: ${SOS_STATE_LABEL[sosState].toUpperCase()}`}
                        </span>
                        {selectedIncident.reporter?.name && !selectedIncident.reporter?.isAnonymous && (
                          <span className="text-xs font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                            👤 {selectedIncident.reporter.name}
                          </span>
                        )}
                        <span className={`text-xs font-mono font-bold flex items-center space-x-1 ${
                          isPingActive ? 'text-red-300' : 'text-slate-400'
                        }`}>
                          <Activity className={`w-3 h-3 ${isPingActive ? 'text-red-400' : 'text-slate-500'}`} />
                          <span>Last Ping: {formatPingAge(latestPings[selectedIncident.id].created_at)}</span>
                        </span>
                      </div>
                      <p className="text-sm font-mono text-white font-extrabold mt-1">
                        GPS Fix: {latestPings[selectedIncident.id].lat.toFixed(5)}° N, {latestPings[selectedIncident.id].lng.toFixed(5)}° W (±{latestPings[selectedIncident.id].accuracy}m accuracy)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <a
                      href={`https://www.google.com/maps?q=${latestPings[selectedIncident.id].lat},${latestPings[selectedIncident.id].lng}&ll=${latestPings[selectedIncident.id].lat},${latestPings[selectedIncident.id].lng}&z=20&t=k`}
                      target="_blank"
                      rel="noreferrer"
                      className={`px-3.5 py-2 rounded-xl text-white font-black text-xs flex items-center space-x-1.5 transition shadow-lg ${
                        isPingActive
                          ? 'bg-red-600 hover:bg-red-500 shadow-red-600/30'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      }`}
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>{isPingActive ? 'Track Live GPS in Maps' : 'View Last Coordinates in Maps'}</span>
                    </a>
                  </div>
                </div>
              );
            })()}

            {/* CARD 1: GOOGLE MAPS TACTICAL DISPATCH BANNER */}
            {(() => {
              if (!selectedIncident.coordinates) {
                return (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center space-x-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                        <Navigation className="w-5 h-5 text-slate-500" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-slate-300">Tactical Route Unavailable</span>
                          {renderLocationSourceBadge(selectedIncident.locationSource, selectedIncident.gpsFixAgeSeconds, selectedIncident.updatedAt, selectedIncident.title, selectedIncident.status)}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Incident was reported without GPS telemetry. Sector: <span className="text-slate-300 font-semibold">{selectedIncident.locationName}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }
              const route = computeTacticalDispatchRoute(
                selectedIncident.coordinates,
                selectedIncident.locationName,
                selectedIncident.assignedAgency
              );
              return (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 shadow-inner">
                      <Navigation className="w-5 h-5 animate-pulse" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-extrabold uppercase px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-800">
                          🚔 {route.originStation.name}
                        </span>
                        <span className="text-xs font-mono font-bold text-amber-400 flex items-center space-x-1">
                          <Radio className="w-3 h-3 text-red-400 animate-ping" />
                          <span>Estimate: ~{route.emergencySirensEtaMinutes} min with sirens, ~{route.distanceKm} km</span>
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Nearest station by straight-line distance. Not a road route; times assume average speeds.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <a
                      href={route.googleMapsDirectionsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-1.5 transition shadow-lg shadow-blue-600/20"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>Google Maps GPS</span>
                    </a>
                    <a
                      href={route.googleStreetViewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center space-x-1 transition"
                      title="Open Scene in Google Earth / Satellite HD"
                    >
                      <Compass className="w-3 h-3 text-amber-400" />
                      <span>Satellite HD</span>
                    </a>
                  </div>
                </div>
              );
            })()}

            {/* CARD 2: FORENSIC VIDEO EVIDENCE REVIEW PLAYER */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                  <span>Evidence</span>
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleForceRefreshMedia}
                    title="Force refresh signed media streams from National Vault"
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center space-x-1 transition border border-slate-700/60"
                  >
                    <RotateCcw className="w-3 h-3 text-blue-400" />
                    <span>Refresh Media</span>
                  </button>
                  <span className="text-slate-400 font-mono text-xs">
                    {currentMedia
                      ? `${currentMedia.durationSeconds ? `${currentMedia.durationSeconds}s • ` : ''}${currentMedia.type}`
                      : 'No evidence attached'}
                  </span>
                </div>
              </div>

              <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-black shadow-inner group">
                {/* HTML5 Video or Image Media */}
                {isVideo ? (
                  <div className="relative w-full aspect-video sm:h-80 bg-black flex items-center justify-center">
                    {isResolvingUrl ? (
                      <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-3">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-white font-bold text-xs">Generating Secure Evidence Stream (Act 772)...</p>
                      </div>
                    ) : !resolvedVideoUrl || resolvedVideoUrl.startsWith('file://') ? (
                      <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-blue-950/80 border border-blue-500/50 flex items-center justify-center text-blue-400 animate-pulse shadow-lg shadow-blue-900/30">
                          <UploadCloud className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-white font-bold text-sm">
                            {(currentMedia as any)?.uploadStatus === 'UPLOADED'
                              ? 'Connecting to Forensic Media Stream...'
                              : 'Forensic Evidence In-Flight'}
                          </p>
                          <p className="text-slate-400 text-xs mt-1 max-w-sm">
                            {(currentMedia as any)?.uploadStatus === 'UPLOAD_FAILED'
                              ? "Upload failed. The file is still on the reporter's phone; the app retries when it has a connection."
                              : (currentMedia as any)?.uploadStatus === 'UPLOADED'
                              ? 'Upload finished. Loading the video...'
                              : "The video is still uploading from the reporter's phone. Playback starts when the upload finishes."}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2 pt-1">
                          <button
                            onClick={handleForceRefreshMedia}
                            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow transition"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Force Refresh Media</span>
                          </button>
                          <button
                            onClick={() => resolveMediaUrl()}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 transition"
                          >
                            <Activity className="w-3.5 h-3.5 text-blue-400" />
                            <span>Check Ingestion Status</span>
                          </button>
                        </div>
                      </div>
                    ) : videoLoadError ? (
                      <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-2.5">
                        <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-amber-400">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-white font-bold text-sm">Media Playback Notice</p>
                          <p className="text-slate-400 text-xs mt-0.5 max-w-sm">
                            Browser media engine encountered a playback notice. You can retry or open the verified stream directly.
                          </p>
                        </div>
                        {resolvedVideoUrl && !resolvedVideoUrl.startsWith('file://') && (
                          <div className="flex items-center space-x-2 pt-1">
                            <button
                              onClick={handleForceRefreshMedia}
                              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow flex items-center space-x-1.5"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Force Refresh Media</span>
                            </button>
                            <button
                              onClick={() => {
                                setVideoLoadError(false);
                                if (videoRef.current) {
                                  videoRef.current.load();
                                }
                              }}
                              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                            >
                              Retry Playback
                            </button>
                            <a
                              href={resolvedVideoUrl}
                              target="_blank"
                              rel="noreferrer"
                              download
                              className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center space-x-1.5 shadow"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Open Direct Stream</span>
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <video
                          key={`${selectedIncident.id}-${resolvedVideoUrl}`}
                          ref={videoRef}
                          src={resolvedVideoUrl}
                          poster={(() => {
                            // A private evidence link (often the video itself) cannot be a poster.
                            const t = (currentMedia as any)?.thumbnailUrl as string | undefined;
                            return t && !t.startsWith('file://') && !evidencePathFromUrl(t) ? t : undefined;
                          })()}
                          className="w-full h-full object-cover bg-black"
                          playsInline
                          preload="auto"
                          crossOrigin="anonymous"
                          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                          onLoadedMetadata={(e) => {
                            setDuration(e.currentTarget.duration || 15);
                            setVideoLoadError(false);
                          }}
                          onCanPlay={() => {
                            console.log('[CAD_MEDIA] Video ready to play:', resolvedVideoUrl);
                            setVideoLoadError(false);
                          }}
                          onEnded={() => setIsPlaying(false)}
                          onError={(e) => {
                            const videoEl = e.currentTarget;
                            const mediaError = videoEl.error;
                            console.warn('[CAD_MEDIA_ERROR]', {
                              code: mediaError?.code, // 1: ABORTED, 2: NETWORK, 3: DECODE, 4: SRC_NOT_SUPPORTED
                              message: mediaError?.message,
                              currentSrc: videoEl.currentSrc || resolvedVideoUrl
                            });
                            if (resolvedVideoUrl && !resolvedVideoUrl.startsWith('file://')) {
                              setVideoLoadError(true);
                            }
                            setIsPlaying(false);
                          }}
                          onPlay={() => setIsPlaying(true)}
                          onPause={() => setIsPlaying(false)}
                        >
                          {resolvedVideoUrl.toLowerCase().includes('.mov') ? (
                            <source src={resolvedVideoUrl} type="video/quicktime" />
                          ) : (
                            <source src={resolvedVideoUrl} type="video/mp4" />
                          )}
                        </video>

                        {/* Centered Play Overlay */}
                        {!isPlaying && (
                          <div
                            onClick={handleTogglePlay}
                            className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 hover:bg-black/30 cursor-pointer transition"
                          >
                            <div className="w-14 h-14 rounded-full bg-blue-600/90 hover:bg-blue-500 text-white flex items-center justify-center shadow-2xl pl-1 border-2 border-white/80 hover:scale-105 transition">
                              <Play className="w-7 h-7 fill-current" />
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  resolvedVideoUrl ? (
                    <div
                      onClick={() => setLightboxImage(resolvedVideoUrl)}
                      className="relative w-full h-80 bg-black cursor-pointer group flex items-center justify-center overflow-hidden"
                      title="Click to Open Wide (Full Resolution)"
                    >
                      <img
                        src={resolvedVideoUrl}
                        alt="Evidence"
                        className="w-full h-full object-contain opacity-95 group-hover:scale-105 transition duration-300"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center space-x-2">
                        <div className="px-4 py-2 rounded-xl bg-blue-600/90 text-white text-xs font-bold flex items-center space-x-2 shadow-2xl backdrop-blur-md">
                          <ZoomIn className="w-4 h-4" />
                          <span>Click to Open Wide (Full Resolution)</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-80 bg-slate-950 flex flex-col items-center justify-center text-slate-400 text-xs">
                      <ShieldCheck className="w-8 h-8 text-slate-600 mb-2" />
                      <span>{currentMedia ? 'Evidence file cannot be previewed here' : 'No photo or video was attached to this report'}</span>
                    </div>
                  )
                )}

                {/* Tamper-Proof Cryptographic Watermark HUD Overlay */}
                <div className="absolute top-3 left-3 z-30 bg-black/85 backdrop-blur-md p-2 rounded-xl border border-slate-700/80 text-xs font-mono text-white space-y-0.5 shadow-2xl pointer-events-none">
                  <p className="text-ghana-gold font-black flex items-center space-x-1">
                    <span>🇬🇭</span>
                    <span>REPORTED LOCATION (FROM DEVICE)</span>
                  </p>
                  {selectedIncident.coordinates ? (
                    <>
                      <p className="text-slate-200">
                        LAT: {selectedIncident.coordinates[0].toFixed(5)}° N | LNG: {selectedIncident.coordinates[1].toFixed(5)}° W
                      </p>
                      <p className="text-emerald-400 font-bold">
                        {(() => {
                          const cancelledByReporter = selectedIncident.title.includes('STAND DOWN') || selectedIncident.title.includes('CANCELLED');
                          const closedByOfficer = selectedIncident.status === 'RESOLVED' || selectedIncident.status === 'DISMISSED';
                          const elapsedSec = selectedIncident.updatedAt
                            ? Math.max(0, Math.floor((Date.now() - new Date(selectedIncident.updatedAt).getTime()) / 1000))
                            : (selectedIncident.gpsFixAgeSeconds ?? 9999);
                          if (cancelledByReporter) return 'CANCELLED BY REPORTER';
                          if (closedByOfficer) return 'CASE CLOSED';
                          if (selectedIncident.locationSource === 'LIVE' && elapsedSec <= 90) return 'GPS LIVE FIX';
                          if (selectedIncident.locationSource === 'LIVE' || selectedIncident.locationSource === 'LAST_KNOWN') {
                            return `LAST KNOWN FIX (${formatAgo(elapsedSec)})`;
                          }
                          return 'MANUAL LOCATION';
                        })()}
                        {(selectedIncident.locationSource === 'LIVE' || selectedIncident.locationSource === 'LAST_KNOWN') && (selectedIncident.gpsAccuracyM || currentMedia?.gpsWatermark?.accuracyMeters) ? ` (±${selectedIncident.gpsAccuracyM || currentMedia?.gpsWatermark?.accuracyMeters}m)` : ''}
                      </p>
                    </>
                  ) : (
                    <p className="text-red-400 font-bold">
                      LOCATION UNAVAILABLE
                    </p>
                  )}
                </div>

                {/* Direct Google Maps Satellite / OpenStreetMap link */}
                {selectedIncident.coordinates && (
                  <a
                    href={`https://www.google.com/maps?q=${selectedIncident.coordinates[0]},${selectedIncident.coordinates[1]}&ll=${selectedIncident.coordinates[0]},${selectedIncident.coordinates[1]}&z=20&t=k`}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute bottom-3 right-3 z-30 px-2.5 py-1 rounded-lg bg-blue-600/90 hover:bg-blue-500 text-white text-xs font-bold flex items-center space-x-1 shadow-lg backdrop-blur-md transition"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Satellite</span>
                  </a>
                )}
              </div>

              {/* Forensic Player Controls */}
              {isVideo && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
                  {/* Timeline Scrubber */}
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-blue-400 text-xs font-bold w-10">
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
                    <span className="font-mono text-slate-400 text-xs w-10 text-right">
                      {String(Math.floor((duration || 15) / 60)).padStart(2, '0')}:{String(Math.floor((duration || 15) % 60)).padStart(2, '0')}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-850">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleTogglePlay}
                        className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center space-x-1 shadow-md shadow-blue-600/20"
                      >
                        {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                        <span>{isPlaying ? 'Pause' : 'Play'}</span>
                      </button>

                      <button
                        onClick={() => handleStepFrame(-1)}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                        title="Step back 1s"
                      >
                        ⏪ -1s
                      </button>
                      <button
                        onClick={() => handleStepFrame(1)}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                        title="Step forward 1s"
                      >
                        ⏩ +1s
                      </button>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-slate-400 text-xs font-bold">Speed:</span>
                        {[0.5, 1.0, 1.5, 2.0].map(speed => (
                          <button
                            key={speed}
                            onClick={() => handleSpeedChange(speed)}
                            className={`px-1.5 py-0.5 rounded text-xs font-mono font-bold ${
                              playbackSpeed === speed
                                ? 'bg-amber-400 text-slate-950 shadow'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {speed}x
                          </button>
                        ))}
                      </div>

                      <button
                        onClick={handleToggleFullscreen}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold flex items-center space-x-1 transition shadow"
                        title="Open Video Fullscreen"
                      >
                        <Maximize className="w-3.5 h-3.5 text-blue-400" />
                        <span>Fullscreen</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* SHA-256 Cryptographic Seal */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-semibold text-xs">
                    SHA-256 of evidence file (computed on reporter's device)
                  </span>
                  {evidenceHash && (
                  <button
                    onClick={() => handleCopyHash(evidenceHash)}
                    className="text-amber-400 hover:text-amber-300 text-xs font-bold flex items-center space-x-1"
                  >
                    {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedHash ? 'Hash Copied' : 'Copy Hash'}</span>
                  </button>
                  )}
                </div>
                {evidenceHash ? (
                  <p className="font-mono text-xs text-slate-300 break-all bg-slate-900 p-2 rounded border border-slate-800">
                    {evidenceHash}
                  </p>
                ) : (
                  <p className="text-xs text-amber-300 bg-slate-900 p-2 rounded border border-slate-800">
                    {currentMedia ? 'No hash was recorded for this file, so its integrity cannot be checked.' : 'No evidence file, so there is nothing to hash.'}
                  </p>
                )}
                <p className="text-xs text-slate-500">A device-side hash shows whether the file changed after capture. It is not a court certificate or a legal seal.</p>
              </div>
            </div>

            {/* CARD 3: SITUATION DETAILS & OFFENDER INFO */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-2">
              <h4 className="text-sm font-semibold text-slate-300">What was reported</h4>
              <p className="text-xs sm:text-sm text-slate-200 bg-slate-950 p-3.5 rounded-xl border border-slate-800 leading-relaxed">
                {selectedIncident.description}
              </p>
            </div>

            {/* CARD 4: REPORTER TRUST & AGENCY RE-ASSIGN */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center space-x-2 mb-1">
                    {selectedIncident.reporter?.avatarUrl && !selectedIncident.reporter?.isAnonymous ? (
                      <img
                        src={selectedIncident.reporter.avatarUrl}
                        alt="Citizen"
                        className="w-7 h-7 rounded-full object-cover border border-slate-700 shrink-0"
                      />
                    ) : null}
                    <div>
                      <span className="text-slate-400 block text-xs font-semibold">Reporter</span>
                      <span className="text-white font-bold text-xs">
                        {selectedIncident.reporter.isAnonymous
                          ? '🛡️ Whistleblower (Act 720)'
                          : selectedIncident.reporter.name || '👤 Verified Citizen'}
                      </span>
                    </div>
                  </div>
                  {selectedIncident.reporter?.phone ? (
                    <div className="mt-1 flex items-center justify-between">
                      <a
                        href={`tel:${selectedIncident.reporter.phone}`}
                        className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-bold hover:underline"
                        title="Click to dial reporter directly via CAD"
                      >
                        <PhoneCall className="w-3 h-3 text-emerald-400" />
                        {selectedIncident.reporter.phone}
                      </a>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 block">
                      {selectedIncident.reporter.isAnonymous ? 'Protected identity (Act 720)' : 'No phone linked'}
                    </span>
                  )}
                  {selectedIncident.reporter?.carrierTriangulationAuthorized && (
                    <div className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-amber-300 bg-amber-950/60 border border-amber-800/60 rounded px-1.5 py-0.5">
                      <span>📡 Carrier Triangulation Authorized (Act 843 Sec 20)</span>
                    </div>
                  )}
                  {selectedIncident.reporter?.ghanaCardId && !selectedIncident.reporter?.isAnonymous && (
                    <span className="text-xs text-amber-400 font-mono block mt-0.5">
                      🇬🇭 {selectedIncident.reporter.ghanaCardId}
                    </span>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-500 block text-xs font-bold">CIVIC TRUST SCORE</span>
                  <span className="text-emerald-400 font-black text-sm mt-0.5 block">
                    {typeof selectedIncident.reporter.trustScore === 'number' ? selectedIncident.reporter.trustScore : 0}% Civic Trust
                  </span>
                  <span className="text-xs text-slate-400">
                    {(selectedIncident.reporter as any)?.isGoogleVerified ? 'Google Identity Verified' : 'Registered Citizen'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 col-span-2 sm:col-span-1">
                  <span className="text-slate-400 block text-xs font-semibold">Assigned agency</span>
                  <select
                    value={selectedIncident.assignedAgency}
                    onChange={(e) => onReassignAgency(selectedIncident.id, e.target.value as AgencyType)}
                    className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-1 text-xs text-white font-semibold focus:outline-none"
                  >
                    <option value="GPS_CID">Ghana Police CID</option>
                    <option value="DOVVSU">DOVVSU (Abuse / Family)</option>
                    <option value="EPA">EPA (Galamsey / Spills)</option>
                    <option value="MTTD">MTTD (Motor Traffic)</option>
                    <option value="NADMO">NADMO (Disaster)</option>
                    <option value="AMA">AMA (Accra Sanitation)</option>
                    <option value="KMA">KMA (Kumasi Sanitation)</option>
                    <option value="FORESTRY_COMM">Forestry Commission</option>
                  </select>
                </div>
              </div>

              {/* Action Toast Feedback Banner */}
              {actionToast && (
                <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 animate-fade-in ${
                  actionToast.type === 'success' ? 'bg-emerald-950/80 border border-emerald-500 text-emerald-300' :
                  actionToast.type === 'warning' ? 'bg-amber-950/80 border border-amber-500 text-amber-300' :
                  'bg-blue-950/80 border border-blue-500 text-blue-300'
                }`}>
                  <Sparkles className="w-4 h-4 shrink-0 animate-pulse" />
                  <span>{actionToast.message}</span>
                </div>
              )}

              {/* Dispatch Action Panel */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-300">Case status</h4>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-950 text-amber-400 border border-slate-800">
                    STATUS: {selectedIncident.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={handleDispatchUnit}
                    className={`px-3 py-2.5 rounded-xl text-xs font-bold transition shadow-md flex items-center justify-center space-x-1.5 cursor-pointer ${
                      selectedIncident.status === 'DISPATCHED'
                        ? 'bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-emerald-500/20'
                        : 'bg-emerald-700 hover:bg-emerald-600 text-white'
                    }`}
                  >
                    <span>⚡</span>
                    <span>Dispatch Unit</span>
                  </button>
                  <button
                    onClick={handleSetInvestigating}
                    className={`px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                      selectedIncident.status === 'UNDER_ACTIVE_INVESTIGATION'
                        ? 'bg-blue-600 text-white ring-2 ring-blue-400 shadow-blue-500/20'
                        : 'bg-blue-700 hover:bg-blue-600 text-white'
                    }`}
                  >
                    <span>🔍</span>
                    <span>Set Investigating</span>
                  </button>
                  <button
                    onClick={handleFileCourtPack}
                    className={`px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                      selectedIncident.status === 'COURT_EVIDENCE_PACKAGED'
                        ? 'bg-purple-600 text-white ring-2 ring-purple-400 shadow-purple-500/20'
                        : 'bg-purple-700 hover:bg-purple-600 text-white'
                    }`}
                  >
                    <span>⚖️</span>
                    <span>File Court Pack</span>
                  </button>
                  <button
                    onClick={handleMarkResolved}
                    className={`px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                      selectedIncident.status === 'RESOLVED'
                        ? 'bg-slate-700 text-white ring-2 ring-slate-400 shadow-slate-500/20'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    }`}
                  >
                    <span>✅</span>
                    <span>Mark Resolved</span>
                  </button>
                </div>

                {/* Public Civic Feed Quick Toggle */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-slate-400">Public feed:</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      selectedIncident.isPublicPublished
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : selectedIncident.isPublicEligible
                        ? 'bg-blue-950 text-blue-300 border border-blue-800'
                        : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}>
                      {selectedIncident.isPublicPublished ? '✅ Live on Civic Feed' : selectedIncident.isPublicEligible ? '⏳ Pending Moderator' : '🔒 Internal Police Only'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {selectedIncident.isPublicPublished ? (
                      <button
                        type="button"
                        onClick={() => {
                          onRejectPublicPublish?.(selectedIncident.id);
                          setActionToast({ type: 'warning', message: `🚫 Incident ${selectedIncident.trackingCode} revoked from Civic Feed.` });
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-red-400 hover:text-red-300 font-bold text-xs transition border border-red-500/20 flex items-center space-x-1 cursor-pointer"
                      >
                        <span>🚫</span>
                        <span>Revoke Public Feed</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          onApprovePublicPublish?.(selectedIncident.id);
                          setActionToast({ type: 'success', message: `✅ Incident ${selectedIncident.trackingCode} published live to Civic Feed.` });
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-sm flex items-center space-x-1 cursor-pointer"
                      >
                        <span>📢</span>
                        <span>Publish to Public Feed</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 5: INVESTIGATOR CASE LOG */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
              <h4 className="text-sm font-semibold text-slate-300">
                Case notes ({caseNotes[selectedIncident.id]?.length || 0})
              </h4>

              <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin pr-1">
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
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-1 shrink-0"
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

      {/* Gemini AI Investigation Case Brief & Multimodal Triage Modal */}
      {isAiModalOpen && (
        <AiCaseBriefModal
          brief={aiBrief}
          triage={aiTriage}
          isLoading={isLoadingAi}
          onClose={() => setIsAiModalOpen(false)}
          onApplyTriageAgency={(agency) => {
            if (selectedIncident) {
              onReassignAgency(selectedIncident.id, agency);
              setIsAiModalOpen(false);
            }
          }}
        />
      )}

      {/* FORENSIC IMAGE FULL-RESOLUTION WIDE LIGHTBOX MODAL */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-8 animate-fadeIn"
          onClick={() => setLightboxImage(null)}
        >
          {/* Top Header Bar */}
          <div
            className="absolute top-4 left-4 right-4 flex items-center justify-between z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-900/90 border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-mono text-white flex items-center space-x-2.5 shadow-2xl backdrop-blur-md">
              <span className="text-ghana-gold font-bold flex items-center space-x-1">
                <span>🇬🇭</span>
                <span>ACT 772 FORENSIC EVIDENCE VIEWER</span>
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-emerald-400 font-bold">{selectedIncident?.trackingCode}</span>
            </div>

            <div className="flex items-center space-x-2">
              <a
                href={lightboxImage}
                download={`EVIDENCE_${selectedIncident?.trackingCode || 'EXPORT'}.jpg`}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center space-x-1.5 transition shadow-lg shadow-blue-600/30"
                title="Download Original High-Res Evidence"
              >
                <Download className="w-4 h-4" />
                <span>Download Original</span>
              </a>
              <button
                onClick={() => setLightboxImage(null)}
                className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white transition shadow-lg"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Large Image Container */}
          <div
            className="relative max-w-5xl max-h-[85vh] w-full flex items-center justify-center rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-black/60"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImage}
              alt="Forensic Evidence Wide View"
              className="max-w-full max-h-[85vh] object-contain rounded-xl select-none"
            />
            {/* Watermark in bottom left */}
            <div className="absolute bottom-3 left-3 bg-black/85 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-700/80 text-xs font-mono text-white shadow-2xl pointer-events-none">
              <p className="text-ghana-gold font-bold">🇬🇭 CITIZEN-ALERT FORENSIC TELEMETRY</p>
              <p className="text-slate-300">
                {selectedIncident?.coordinates ? `LAT: ${selectedIncident.coordinates[0].toFixed(5)}° N | LNG: ${selectedIncident.coordinates[1].toFixed(5)}° W` : 'LOCATION UNAVAILABLE'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
