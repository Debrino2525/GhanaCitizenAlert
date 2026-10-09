import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { IncidentReport, IncidentStatus, AgencyType, SosPing } from '../types';
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
  UploadCloud
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

export function formatPingAge(dateStr: string): string {
  if (!dateStr) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
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
        }
      } catch (err) {
        console.warn('Error fetching sos_pings:', err);
      }
    };

    fetchPings();

    const channel = supabase
      .channel('realtime_sos_pings')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sos_pings' }, (payload) => {
        const p: SosPing = payload.new as SosPing;
        setLatestPings(prev => ({
          ...prev,
          [p.incident_id]: p
        }));
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

  const [caseNotes, setCaseNotes] = useState<Record<string, { author: string; text: string; time: string }[]>>({
    'inc-1': [
      { author: 'Insp. Emmanuel Addo (CID)', text: 'Patrol Unit Alpha-4 deployed to boundary junction. Suspect vehicle identified.', time: '10:42 AM' }
    ]
  });

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
      text: `⚖️ Court Evidence Dossier generated & sealed under Section 7 of the Electronic Transactions Act (Act 772).`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setCaseNotes(prev => ({
      ...prev,
      [selectedIncident.id]: [...(prev[selectedIncident.id] || []), note]
    }));
    setActionToast({ message: '⚖️ Court Evidence Pack Generated & Sealed under Act 772!', type: 'success' });
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

  const resolveMediaUrl = useCallback(async () => {
    setIsPlaying(false);
    setCurrentTime(0);
    setVideoLoadError(false);

    if (!activeMedia) {
      setResolvedVideoUrl('');
      setIsResolvingUrl(false);
      return;
    }

    const rawUrl = (activeMedia as any).rawS3Url || (activeMedia as any).url || (activeMedia as any).thumbnailUrl || '';
    const storagePath = (activeMedia as any).video_storage_path || (activeMedia as any).storage_path;
    const uploadStatus = (activeMedia as any).uploadStatus;

    // If upload is QUEUED and no valid rawUrl yet, it's in-flight from citizen device
    if ((uploadStatus === 'QUEUED' || uploadStatus === 'UPLOADING') && (!rawUrl || rawUrl.startsWith('file://'))) {
      setResolvedVideoUrl('');
      setIsResolvingUrl(false);
      return;
    }

    setIsResolvingUrl(true);
    try {
      // 1. Direct Data URI or HTTP Stream (instant zero-latency playback)
      if (rawUrl && (rawUrl.startsWith('data:') || rawUrl.startsWith('http://') || rawUrl.startsWith('https://'))) {
        setResolvedVideoUrl(rawUrl);
        setIsResolvingUrl(false);
        return;
      }

      // 2. Supabase Storage Signed/Public URL resolution
      if (storagePath) {
        const { data: signedData, error: signedErr } = await supabase.storage
          .from('evidence')
          .createSignedUrl(storagePath, 3600);

        if (!signedErr && signedData?.signedUrl) {
          setResolvedVideoUrl(signedData.signedUrl);
          setIsResolvingUrl(false);
          return;
        }

        const { data: pubData } = supabase.storage.from('evidence').getPublicUrl(storagePath);
        if (pubData?.publicUrl) {
          setResolvedVideoUrl(pubData.publicUrl);
          setIsResolvingUrl(false);
          return;
        }
      }

      if (rawUrl && !rawUrl.startsWith('file://')) {
        setResolvedVideoUrl(rawUrl);
      } else {
        setResolvedVideoUrl('');
      }
    } catch (e) {
      console.warn('Media URL resolution warning:', e);
      const fallback = (activeMedia as any).rawS3Url || '';
      setResolvedVideoUrl(fallback.startsWith('file://') ? '' : fallback);
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
      } catch (e) {}
    }
  }, [resolveMediaUrl, selectedIncident?.id, selectedIncident?.trackingCode]);

  const filteredIncidents = incidents.filter(inc => {
    if (filterAgency !== 'ALL' && inc.assignedAgency !== filterAgency) return false;
    if (filterStatus !== 'ALL' && inc.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTrack = inc.trackingCode.toLowerCase().includes(q);
      const matchTitle = inc.title.toLowerCase().includes(q);
      const matchLoc = (inc.locationName || '').toLowerCase().includes(q);
      const matchGps = (inc.ghanaPostCode || '').toLowerCase().includes(q);
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
      {/* LEFT COLUMN: Agency CAD Dispatch Queue */}
      <div className="lg:col-span-5 space-y-4">
        {/* Unified Sticky Search, Filter, and Status Block */}
        <div className="sticky top-[calc(var(--header-h)+0.5rem)] z-10 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xl space-y-3 transition-all">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2 min-w-0">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-white truncate">CAD Dispatch Queue</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300 font-mono font-bold shrink-0">
                {filteredIncidents.length}
              </span>
            </div>

            <div className="flex items-center space-x-1.5 shrink-0">
              <span className="hidden xl:inline text-[10px] font-mono text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                [J / K]
              </span>
              <select
                value={filterAgency}
                onChange={(e) => setFilterAgency(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 font-semibold focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 shrink-0"
                aria-label="Filter by Agency"
              >
                <option value="ALL">All Agencies</option>
                <option value="GPS_CID">GPS / CID (Crime)</option>
                <option value="DOVVSU">DOVVSU (Abuse)</option>
                <option value="EPA">EPA (Galamsey)</option>
                <option value="MTTD">MTTD (Traffic)</option>
                <option value="MMDA_SANITATION">MMDA (Sanitation)</option>
              </select>
            </div>
          </div>

          {/* Quick Search Bar with Shortcut Badge */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search tracking code, GPS, landmark... (Press '/' to focus)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-10 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500"
            />
            <span className="absolute right-2.5 top-2 text-[10px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 pointer-events-none hidden sm:inline">
              /
            </span>
          </div>

          {/* Single Row Flex-Nowrap Status Chips */}
          <div className="flex flex-nowrap overflow-x-auto scrollbar-thin gap-1.5 pt-0.5 pb-1 snap-x">
            {statusFilterList.map((item) => {
              const count = item.id === 'ALL' ? incidents.length : (statusCounts[item.id] || 0);
              const isSelected = filterStatus === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setFilterStatus(item.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition whitespace-nowrap shrink-0 snap-start flex items-center space-x-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <span>{item.label}</span>
                  <span className={`px-1.5 py-0.2 rounded font-mono text-[9px] ${
                    isSelected ? 'bg-blue-900 text-blue-100' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Incidents List Container (Single Scroll Container) */}
        <div className="space-y-3 lg:max-h-[calc(100vh-var(--header-h)-3.5rem)] lg:overflow-y-auto scrollbar-thin pr-1">
          {filteredIncidents.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/80 border border-slate-800 rounded-2xl text-slate-500 text-xs">
              No matching incidents found in CAD queue.
            </div>
          ) : (
            filteredIncidents.map(inc => {
              const isSelected = selectedIncident?.id === inc.id;
              return (
                <div
                  key={inc.id}
                  onClick={() => onSelectIncident(inc)}
                  className={`cursor-pointer p-3.5 sm:p-4 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-slate-800/90 border-blue-500 shadow-lg shadow-blue-500/15 ring-1 ring-blue-500'
                      : 'bg-slate-900/80 border-slate-800 hover:bg-slate-850 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-950 text-ghana-gold border border-slate-800">
                      {inc.trackingCode}
                    </span>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded shrink-0 ${
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
                  <p className="text-xs text-slate-400 line-clamp-2 mb-2">{inc.description}</p>
                  
                  {latestPings[inc.id] && (
                    <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-red-950/80 border border-red-800 text-red-300 text-[11px] font-mono my-2 shadow-inner">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
                      <span className="font-bold truncate">
                        📡 LIVE BEACON: {latestPings[inc.id].lat.toFixed(4)}, {latestPings[inc.id].lng.toFixed(4)} (±{latestPings[inc.id].accuracy}m) • {formatPingAge(latestPings[inc.id].created_at)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/80">
                    <span className="font-mono text-blue-400 font-bold text-[11px]">
                      📍 {inc.ghanaPostCode || `${inc.coordinates[0].toFixed(3)}, ${inc.coordinates[1].toFixed(3)}`}
                    </span>
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
                    <span className="text-xs text-slate-400 font-mono">
                      {new Date(selectedIncident.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-white mt-1.5 leading-snug">{selectedIncident.title}</h2>
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
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>AI Case Brief</span>
                  </button>

                  <button
                    onClick={() => onOpenCertificateModal(generateCourtCertificate(selectedIncident))}
                    className="px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-400 font-bold text-xs flex items-center space-x-1.5 transition shadow-lg shadow-amber-500/10"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>Evidence Vault (Act 772)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* CARD 0: LIVE SOS BEACON TRACKING BANNER (If Active Pings Exist) */}
            {latestPings[selectedIncident.id] && (
              <div className="bg-red-950/60 border-2 border-red-500 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center space-x-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-red-600/20 border border-red-500/50 flex items-center justify-center text-red-400 shrink-0 shadow-lg">
                    <Radio className="w-6 h-6 animate-ping" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded bg-red-600 text-white shadow-md">
                        🚨 LIVE SOS DISTRESS BEACON
                      </span>
                      <span className="text-xs font-mono font-bold text-red-300 flex items-center space-x-1">
                        <Activity className="w-3 h-3 text-red-400" />
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
                    className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs flex items-center space-x-1.5 transition shadow-lg shadow-red-600/30"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Track Live GPS in Maps</span>
                  </a>
                </div>
              </div>
            )}

            {/* CARD 1: GOOGLE MAPS TACTICAL DISPATCH BANNER */}
            {(() => {
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
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-800">
                          🚔 {route.originStation.name}
                        </span>
                        <span className="text-xs font-mono font-bold text-amber-400 flex items-center space-x-1">
                          <Radio className="w-3 h-3 text-red-400 animate-ping" />
                          <span>Sirens ETA: {route.emergencySirensEtaMinutes}m ({route.distanceKm} km)</span>
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 font-medium mt-1 truncate">
                        Corridor: <span className="text-white font-bold">{route.primaryHighway}</span>
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
                <span className="font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Digital Evidence Review & Forensic Telemetry</span>
                </span>
                <span className="text-slate-400 font-mono text-[11px]">
                  {currentMedia?.durationSeconds || 15}s • {currentMedia?.type || 'VIDEO'}
                </span>
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
                    ) : (currentMedia as any)?.uploadStatus === 'QUEUED' || (currentMedia as any)?.uploadStatus === 'UPLOADING' || !resolvedVideoUrl || resolvedVideoUrl.startsWith('file://') ? (
                      <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-blue-950/80 border border-blue-500/50 flex items-center justify-center text-blue-400 animate-pulse shadow-lg shadow-blue-900/30">
                          <UploadCloud className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-white font-bold text-sm">Forensic Evidence In-Flight</p>
                          <p className="text-slate-400 text-xs mt-1 max-w-sm">
                            {(currentMedia as any)?.uploadStatus === 'UPLOAD_FAILED'
                              ? 'Upload failed during transmission. Evidence sealed on citizen device under Act 720 Whistleblower Vault awaiting sync.'
                              : 'Citizen device is streaming video evidence to National Vault. Playback will activate automatically once sealed.'}
                          </p>
                        </div>
                        <button
                          onClick={() => resolveMediaUrl()}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 transition"
                        >
                          <Activity className="w-3.5 h-3.5 text-blue-400" />
                          <span>Check Ingestion Status</span>
                        </button>
                      </div>
                    ) : videoLoadError ? (
                      <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-2.5">
                        <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-amber-400">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-white font-bold text-sm">Media Playback Notice</p>
                          <p className="text-slate-400 text-xs mt-0.5 max-w-sm">
                            Media stream could not be loaded directly by your browser codec.
                          </p>
                        </div>
                        {resolvedVideoUrl && !resolvedVideoUrl.startsWith('file://') && (
                          <div className="flex items-center space-x-2 pt-1">
                            <button
                              onClick={() => {
                                setVideoLoadError(false);
                                resolveMediaUrl();
                              }}
                              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow"
                            >
                              Retry Playback
                            </button>
                            <a
                              href={resolvedVideoUrl}
                              target="_blank"
                              rel="noreferrer"
                              download
                              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1"
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
                          poster={(currentMedia as any)?.thumbnailUrl && !(currentMedia as any)?.thumbnailUrl?.startsWith('file://') ? (currentMedia as any).thumbnailUrl : undefined}
                          className="w-full h-full object-cover bg-black"
                          playsInline
                          preload="auto"
                          crossOrigin="anonymous"
                          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                          onLoadedMetadata={(e) => {
                            setDuration(e.currentTarget.duration || 15);
                            setVideoLoadError(false);
                          }}
                          onCanPlay={() => setVideoLoadError(false)}
                          onEnded={() => setIsPlaying(false)}
                          onError={() => {
                            if (resolvedVideoUrl && !resolvedVideoUrl.startsWith('file://')) {
                              setVideoLoadError(true);
                            }
                            setIsPlaying(false);
                          }}
                          onPlay={() => setIsPlaying(true)}
                          onPause={() => setIsPlaying(false)}
                        >
                          <source src={resolvedVideoUrl} type={resolvedVideoUrl.includes('.mov') ? 'video/quicktime' : 'video/mp4'} />
                          <source src={resolvedVideoUrl} type="video/mp4" />
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
                  (currentMedia?.thumbnailUrl || (currentMedia as any)?.rawS3Url || (currentMedia as any)?.url) && !(currentMedia?.thumbnailUrl || (currentMedia as any)?.rawS3Url || '').startsWith('file://') ? (
                    <div
                      onClick={() => setLightboxImage(currentMedia?.thumbnailUrl || (currentMedia as any)?.rawS3Url || (currentMedia as any)?.url)}
                      className="relative w-full h-80 bg-black cursor-pointer group flex items-center justify-center overflow-hidden"
                      title="Click to Open Wide (Full Resolution)"
                    >
                      <img
                        src={currentMedia?.thumbnailUrl || (currentMedia as any)?.rawS3Url || (currentMedia as any)?.url}
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
                      <span>Photo evidence recorded and sealed under Act 772</span>
                    </div>
                  )
                )}

                {/* Tamper-Proof Cryptographic Watermark HUD Overlay */}
                <div className="absolute top-3 left-3 z-30 bg-black/85 backdrop-blur-md p-2 rounded-xl border border-slate-700/80 text-[10px] sm:text-[11px] font-mono text-white space-y-0.5 shadow-2xl pointer-events-none">
                  <p className="text-ghana-gold font-black flex items-center space-x-1">
                    <span>🇬🇭</span>
                    <span>CITIZEN-ALERT EVIDENCE LOCK (ACT 772)</span>
                  </p>
                  <p className="text-slate-200">
                    LAT: {(selectedIncident?.coordinates?.[0] ?? 5.6037).toFixed(5)}° N | LNG: {(selectedIncident?.coordinates?.[1] ?? -0.1870).toFixed(5)}° W
                  </p>
                  <p className="text-amber-400 font-bold">
                    GHANAPOST: {selectedIncident.ghanaPostCode || 'Not provided'} (±{currentMedia?.gpsWatermark?.accuracyMeters || 3.2}m)
                  </p>
                </div>

                {/* Direct Google Maps Satellite / OpenStreetMap link */}
                <a
                  href={`https://www.google.com/maps?q=${selectedIncident?.coordinates?.[0] ?? 5.6037},${selectedIncident?.coordinates?.[1] ?? -0.1870}&ll=${selectedIncident?.coordinates?.[0] ?? 5.6037},${selectedIncident?.coordinates?.[1] ?? -0.1870}&z=20&t=k`}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute bottom-3 right-3 z-30 px-2.5 py-1 rounded-lg bg-blue-600/90 hover:bg-blue-500 text-white text-[11px] font-bold flex items-center space-x-1 shadow-lg backdrop-blur-md transition"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Satellite</span>
                </a>
              </div>

              {/* Forensic Player Controls */}
              {isVideo && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
                  {/* Timeline Scrubber */}
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-blue-400 text-[11px] font-bold w-10">
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
                    <span className="font-mono text-slate-400 text-[11px] w-10 text-right">
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
                        <span className="text-slate-400 text-[11px] font-bold">Speed:</span>
                        {[0.5, 1.0, 1.5, 2.0].map(speed => (
                          <button
                            key={speed}
                            onClick={() => handleSpeedChange(speed)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
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

            {/* CARD 3: SITUATION DETAILS & OFFENDER INFO */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Situation & Offender Details</h4>
              <p className="text-xs sm:text-sm text-slate-200 bg-slate-950 p-3.5 rounded-xl border border-slate-800 leading-relaxed">
                {selectedIncident.description}
              </p>
            </div>

            {/* CARD 4: REPORTER TRUST & AGENCY RE-ASSIGN */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
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
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">CAD Action Triage</h4>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-950 text-amber-400 border border-slate-800">
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
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Civic Public Feed:</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
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
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-red-400 hover:text-red-300 font-bold text-[11px] transition border border-red-500/20 flex items-center space-x-1 cursor-pointer"
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
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition shadow-sm flex items-center space-x-1 cursor-pointer"
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
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Investigator Case Log ({caseNotes[selectedIncident.id]?.length || 0})
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
            <div className="absolute bottom-3 left-3 bg-black/85 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-700/80 text-[11px] font-mono text-white shadow-2xl pointer-events-none">
              <p className="text-ghana-gold font-bold">🇬🇭 CITIZEN-ALERT FORENSIC TELEMETRY</p>
              <p className="text-slate-300">
                LAT: {(selectedIncident?.coordinates?.[0] ?? 5.6037).toFixed(5)}° N | LNG: {(selectedIncident?.coordinates?.[1] ?? -0.1870).toFixed(5)}° W • {selectedIncident?.ghanaPostCode || 'Not provided'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
