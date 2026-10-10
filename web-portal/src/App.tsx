import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { IncidentMap } from './components/IncidentMap';
import { PoliceCommandDashboard } from './components/PoliceCommandDashboard';
import { ModeratorConsole } from './components/ModeratorConsole';
import { EmergencyAlertHub } from './components/EmergencyAlertHub';
import { PublicWebFeed } from './components/PublicWebFeed';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { CourtCertificateModal } from './components/CourtCertificateModal';
import { AuthModal } from './components/AuthModal';
import { OfficerManagementModal } from './components/OfficerManagementModal';
import { SetPasswordScreen } from './components/SetPasswordScreen';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { IncidentReport, EmergencyAlert, SightingTip, IncidentStatus, AgencyType, OfficerUser, SosPing } from './types';
import { CourtCertificate } from './services/evidenceVault';
import { supabase } from './services/supabaseClient';
import { Shield, Loader2 } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'COMMAND' | 'MODERATOR' | 'ALERTS' | 'FEED' | 'ANALYTICS'>('COMMAND');
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [sightings, setSightings] = useState<SightingTip[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<IncidentReport | null>(null);
  const [latestPings, setLatestPings] = useState<Record<string, SosPing>>({});
  const [activeCertificate, setActiveCertificate] = useState<CourtCertificate | null>(null);

  // Authentication State
  const [authSession, setAuthSession] = useState<Session | null>(null);
  const [currentOfficer, setCurrentOfficer] = useState<OfficerUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [authErrorMsg, setAuthErrorMsg] = useState<string | null>(null);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isOfficerMgmtOpen, setIsOfficerMgmtOpen] = useState<boolean>(false);
  const [isSetPasswordRoute, setIsSetPasswordRoute] = useState<boolean>(() => {
    return (
      window.location.pathname === '/set-password' ||
      window.location.hash.includes('type=recovery') ||
      window.location.hash.includes('type=invite')
    );
  });
  const [isPrivacyRoute, setIsPrivacyRoute] = useState<boolean>(() => {
    return (
      window.location.pathname === '/privacy' ||
      window.location.pathname === '/privacy-policy'
    );
  });

  // Refs for tracking lookup state and preventing duplicate queries
  const loadedUserIdRef = useRef<string | null>(null);
  const isFetchingOfficerRef = useRef<boolean>(false);
  const lastActivityRef = useRef<number>(Date.now());

  // Single centralized function to fetch and verify officer record from database
  const loadOfficerWithRetry = useCallback(async (session: Session): Promise<OfficerUser | null> => {
    const userId = session.user.id;
    const userEmail = session.user.email;

    let attempts = 0;
    const maxAttempts = 3; // 1 initial + up to 2 retries

    while (attempts < maxAttempts) {
      attempts++;
      try {
        if (attempts > 1) {
          // Allow token propagation on retry and re-check session
          await new Promise((res) => setTimeout(res, 250 * attempts));
          await supabase.auth.getSession();
        }

        const { data: officerRow, error: officerErr } = await supabase
          .from('officers')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        // If query failed (e.g. 401, 42501, network issue)
        if (officerErr) {
          console.warn(`[Auth] Officers query error on attempt ${attempts}/${maxAttempts}:`, officerErr.message);
          if (attempts < maxAttempts) {
            continue; // Retry
          }
          // Exhausted retries due to server/network error:
          // Do NOT call signOut(), do NOT grant access
          setAuthErrorMsg('Could not verify your account, please try again.');
          return null;
        }

        // Query SUCCEEDED (HTTP 200) but returned no row
        if (!officerRow) {
          console.warn('[Auth] Verified: No officer record found for user ID:', userId);
          setAuthErrorMsg('Not authorized: No officer credentials registered for this account.');
          await supabase.auth.signOut();
          return null;
        }

        // Query SUCCEEDED but officer is deactivated
        if (officerRow.is_active === false) {
          console.warn('[Auth] Verified: Officer account is deactivated.');
          setAuthErrorMsg('Not authorized: This officer account is deactivated.');
          await supabase.auth.signOut();
          return null;
        }

        // Query SUCCEEDED and officer is active
        setAuthErrorMsg(null);
        const verifiedOfficer: OfficerUser = {
          id: officerRow.id,
          name: officerRow.full_name || officerRow.name || 'Officer',
          badgeNumber: officerRow.badge_number || officerRow.service_id || 'GPS-CAD',
          service_id: officerRow.service_id,
          agency: officerRow.agency || 'GPS_CID',
          role: officerRow.role,
          rank: officerRow.rank || 'Duty Officer',
          email: officerRow.email || userEmail || '',
          avatarUrl: officerRow.avatar_url || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80`,
          clearanceLevel: officerRow.clearance_level || 'RESTRICTED',
          station_id: officerRow.station_id,
          is_active: Boolean(officerRow.is_active),
          must_change_password: Boolean(officerRow.must_change_password),
          created_at: officerRow.created_at
        };

        return verifiedOfficer;
      } catch (err) {
        console.warn(`[Auth] Unexpected exception on attempt ${attempts}/${maxAttempts}:`, err);
        if (attempts < maxAttempts) {
          continue;
        }
        setAuthErrorMsg('Could not verify your account, please try again.');
        return null;
      }
    }

    return null;
  }, []);

  // 1. Initial Mount & Auth State Listener (Does NOT call queries directly in callback)
  useEffect(() => {
    // Delete legacy mock localStorage keys
    localStorage.removeItem('citizen_alert_officer_session');
    localStorage.removeItem('citizen_alert_officers_vault');

    // Route listener
    const checkRoute = () => {
      setIsSetPasswordRoute(
        window.location.pathname === '/set-password' ||
        window.location.hash.includes('type=recovery') ||
        window.location.hash.includes('type=invite')
      );
      setIsPrivacyRoute(
        window.location.pathname === '/privacy' ||
        window.location.pathname === '/privacy-policy'
      );
    };
    window.addEventListener('popstate', checkRoute);

    // Fetch initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthSession(session);
      if (!session) {
        setIsAuthChecking(false);
      }
    });

    // onAuthStateChange ONLY stores the session without executing database queries directly
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsSetPasswordRoute(true);
      }
      setAuthSession(session);
      if (!session) {
        loadedUserIdRef.current = null;
        setCurrentOfficer(null);
        setIsAuthChecking(false);
      }
    });

    return () => {
      window.removeEventListener('popstate', checkRoute);
      subscription.unsubscribe();
    };
  }, []);

  // 2. React Effect to Load Officer Record via setTimeout (Ensures Token is Attached and Runs ONCE)
  useEffect(() => {
    if (!authSession?.user) {
      setCurrentOfficer(null);
      loadedUserIdRef.current = null;
      setIsAuthChecking(false);
      return;
    }

    const userId = authSession.user.id;

    // Prevent duplicate lookups if already loaded or currently fetching for the same user
    if (loadedUserIdRef.current === userId && currentOfficer) {
      setIsAuthChecking(false);
      return;
    }

    if (isFetchingOfficerRef.current) {
      return;
    }

    isFetchingOfficerRef.current = true;
    setIsAuthChecking(true);

    // Dispatch via setTimeout(..., 0) so authorization headers settle on the Supabase client
    const timer = setTimeout(async () => {
      try {
        const officer = await loadOfficerWithRetry(authSession);
        if (officer) {
          loadedUserIdRef.current = userId;
          setCurrentOfficer(officer);
        } else {
          loadedUserIdRef.current = null;
          setCurrentOfficer(null);
        }
      } finally {
        isFetchingOfficerRef.current = false;
        setIsAuthChecking(false);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [authSession, currentOfficer, loadOfficerWithRetry]);

  // 3. 15-Minute Inactivity Auto-Logout
  useEffect(() => {
    if (!currentOfficer) return;

    let intervalId: any;

    const recordActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const checkInactivity = async () => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        console.warn('15 minutes of inactivity reached. Automatically signing out CAD workstation...');
        await supabase.auth.signOut();
        setCurrentOfficer(null);
        loadedUserIdRef.current = null;
        alert('CAD Terminal Locked: You have been automatically signed out due to 15 minutes of inactivity.');
      }
    };

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    activityEvents.forEach((ev) => window.addEventListener(ev, recordActivity, { passive: true }));
    intervalId = setInterval(checkInactivity, 30000); // Check every 30s

    return () => {
      clearInterval(intervalId);
      activityEvents.forEach((ev) => window.removeEventListener(ev, recordActivity));
    };
  }, [currentOfficer]);

  // 4. Load Incidents & Realtime Events from Supabase when authenticated
  useEffect(() => {
    if (!currentOfficer) return;

    const fetchSupabaseData = async () => {
      try {
        const { data: incidentRows } = await supabase
          .from('incidents')
          .select('*')
          .order('created_at', { ascending: false });

        if (incidentRows && incidentRows.length > 0) {
          const formatted: IncidentReport[] = incidentRows.map((r: any) => {
            let parsedMedia = Array.isArray(r.media) ? r.media : [];
            if (typeof r.media === 'string') {
              try {
                parsedMedia = JSON.parse(r.media);
              } catch (e) {
                parsedMedia = [];
              }
            }
            parsedMedia = parsedMedia.map((m: any) => ({
              ...m,
              url: m.url || m.rawS3Url || '',
              rawS3Url: m.rawS3Url || m.url || '',
              video_storage_path: m.video_storage_path || m.storage_path || '',
              uploadStatus: m.uploadStatus || (m.rawS3Url || m.url ? 'UPLOADED' : 'QUEUED'),
              thumbnailUrl: m.thumbnailUrl || m.rawS3Url || m.url || ''
            }));

            const hasValidCoords = typeof r.latitude === 'number' && !isNaN(r.latitude) && typeof r.longitude === 'number' && !isNaN(r.longitude);
            const lat = hasValidCoords ? r.latitude : null;
            const lng = hasValidCoords ? r.longitude : null;

            return {
              id: r.id,
              trackingCode: r.tracking_code || `GH-2026-${r.id.substring(0, 4)}`,
              title: r.title || 'Civic Incident Report',
              category: r.category || 'CRIMINAL_OFFENSE',
              description: r.description || 'No description provided.',
              locationName: r.location_name || 'Location Not Specified',
              ghanaPostCode: r.ghanapost_code || '',
              region: r.region || 'National',
              coordinates: hasValidCoords ? [lat, lng] : null,
              latitude: lat,
              longitude: lng,
              locationSource: r.location_source || null,
              gpsFixAgeSeconds: typeof r.gps_fix_age_s === 'number' ? r.gps_fix_age_s : null,
              gpsAccuracyM: typeof r.gps_accuracy_m === 'number' ? r.gps_accuracy_m : null,
              media: parsedMedia,
              reporter: r.reporter_data || { isAnonymous: Boolean(r.is_anonymous), trustScore: r.reporter_trust_score || 85 },
              assignedAgency: r.assigned_agency || 'GPS_CID',
              secondaryAgencies: r.secondary_agencies || [],
              status: r.status || 'RECEIVED_PENDING_TRIAGE',
              severity: r.severity || 'NORMAL',
              isPublicEligible: Boolean(r.is_public_eligible),
              isPublicPublished: Boolean(r.is_public_published),
              publicCorroborations: r.public_corroborations || 0,
              createdAt: r.created_at || new Date().toISOString(),
              updatedAt: r.updated_at || new Date().toISOString(),
              investigatorNotes: r.investigator_notes || []
            };
          });
          setIncidents(formatted);
          setSelectedIncident(formatted[0]);
        }
      } catch (err) {
        console.error('Error fetching live incidents:', err);
      }
    };

    const fetchPings = async () => {
      try {
        const { data } = await supabase
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
        console.warn('Error fetching initial sos_pings:', err);
      }
    };

    fetchSupabaseData();
    fetchPings();

    // Subscribe to Realtime Incidents channel (INSERT, UPDATE, DELETE)
    const channel = supabase
      .channel('realtime_incidents')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, (payload) => {
        const r: any = payload.new;
        if (!r || !r.id) return;

        let parsedMedia = Array.isArray(r.media) ? r.media : [];
        if (typeof r.media === 'string') {
          try {
            parsedMedia = JSON.parse(r.media);
          } catch (e) {
            parsedMedia = [];
          }
        }
        parsedMedia = parsedMedia.map((m: any) => ({
          ...m,
          url: m.url || m.rawS3Url || '',
          rawS3Url: m.rawS3Url || m.url || '',
          video_storage_path: m.video_storage_path || m.storage_path || '',
          uploadStatus: m.uploadStatus || (m.rawS3Url || m.url ? 'UPLOADED' : 'QUEUED'),
          thumbnailUrl: m.thumbnailUrl || m.rawS3Url || m.url || ''
        }));

        const hasValidCoords = typeof r.latitude === 'number' && !isNaN(r.latitude) && typeof r.longitude === 'number' && !isNaN(r.longitude);
        const lat = hasValidCoords ? r.latitude : null;
        const lng = hasValidCoords ? r.longitude : null;

        const incomingInc: IncidentReport = {
          id: r.id,
          trackingCode: r.tracking_code || `GH-2026-${r.id.substring(0, 4)}`,
          title: r.title || 'Civic Incident Report',
          category: r.category || 'CRIMINAL_OFFENSE',
          description: r.description || 'No description provided.',
          locationName: r.location_name || 'Location Not Specified',
          ghanaPostCode: r.ghanapost_code || '',
          region: r.region || 'National',
          coordinates: hasValidCoords ? [lat, lng] : null,
          latitude: lat,
          longitude: lng,
          locationSource: r.location_source || null,
          gpsFixAgeSeconds: typeof r.gps_fix_age_s === 'number' ? r.gps_fix_age_s : null,
          gpsAccuracyM: typeof r.gps_accuracy_m === 'number' ? r.gps_accuracy_m : null,
          media: parsedMedia,
          reporter: r.reporter_data || { isAnonymous: Boolean(r.is_anonymous), trustScore: r.reporter_trust_score || 85 },
          assignedAgency: r.assigned_agency || 'GPS_CID',
          secondaryAgencies: r.secondary_agencies || [],
          status: r.status || 'RECEIVED_PENDING_TRIAGE',
          severity: r.severity || 'NORMAL',
          isPublicEligible: Boolean(r.is_public_eligible),
          isPublicPublished: Boolean(r.is_public_published),
          publicCorroborations: r.public_corroborations || 0,
          createdAt: r.created_at || new Date().toISOString(),
          updatedAt: r.updated_at || new Date().toISOString(),
          investigatorNotes: r.investigator_notes || []
        };

        if (payload.eventType === 'INSERT') {
          setIncidents(prev => [incomingInc, ...prev.filter(i => i.id !== incomingInc.id)]);
          setSelectedIncident(incomingInc);
        } else if (payload.eventType === 'UPDATE') {
          setIncidents(prev => prev.map(i => i.id === incomingInc.id ? incomingInc : i));
          setSelectedIncident(prev => prev?.id === incomingInc.id ? incomingInc : prev);
        }
      })
      .subscribe();

    // Subscribe to Realtime SOS pings stream for live moving beacon tracking
    const sosChannel = supabase
      .channel('realtime_sos_pings_global')
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
      supabase.removeChannel(sosChannel);
    };
  }, [currentOfficer]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    loadedUserIdRef.current = null;
    setCurrentOfficer(null);
    setAuthSession(null);
    setAuthErrorMsg(null);
  };

  const handleUpdateStatus = async (incidentId: string, newStatus: IncidentStatus) => {
    setIncidents(prev => prev.map(inc => {
      if (inc.id === incidentId) {
        const updated = { ...inc, status: newStatus, updatedAt: new Date().toISOString() };
        if (selectedIncident?.id === incidentId) setSelectedIncident(updated);
        return updated;
      }
      return inc;
    }));

    try {
      await supabase.from('incidents').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', incidentId);
    } catch (e) {}
  };

  const handleReassignAgency = async (incidentId: string, newAgency: AgencyType) => {
    setIncidents(prev => prev.map(inc => {
      if (inc.id === incidentId) {
        const updated = { ...inc, assignedAgency: newAgency, updatedAt: new Date().toISOString() };
        if (selectedIncident?.id === incidentId) setSelectedIncident(updated);
        return updated;
      }
      return inc;
    }));

    try {
      await supabase.from('incidents').update({ assigned_agency: newAgency, updated_at: new Date().toISOString() }).eq('id', incidentId);
    } catch (e) {}
  };

  const handleApprovePublicPublish = async (incidentId: string) => {
    setIncidents(prev => prev.map(inc => {
      if (inc.id === incidentId) {
        const updated = { ...inc, isPublicPublished: true, isPublicEligible: true, updatedAt: new Date().toISOString() };
        if (selectedIncident?.id === incidentId) setSelectedIncident(updated);
        return updated;
      }
      return inc;
    }));

    try {
      await supabase.from('incidents').update({ 
        is_public_published: true, 
        is_public_eligible: true, 
        updated_at: new Date().toISOString() 
      }).eq('id', incidentId);
    } catch (e) {
      console.warn('Supabase publish update error:', e);
    }
  };

  const handleRejectPublicPublish = async (incidentId: string) => {
    setIncidents(prev => prev.map(inc => {
      if (inc.id === incidentId) {
        const updated = { ...inc, isPublicPublished: false, isPublicEligible: false, updatedAt: new Date().toISOString() };
        if (selectedIncident?.id === incidentId) setSelectedIncident(updated);
        return updated;
      }
      return inc;
    }));

    try {
      await supabase.from('incidents').update({ 
        is_public_published: false, 
        is_public_eligible: false, 
        updated_at: new Date().toISOString() 
      }).eq('id', incidentId);
    } catch (e) {
      console.warn('Supabase reject update error:', e);
    }
  };

  const handleCorroborate = async (incidentId: string) => {
    setIncidents(prev => prev.map(inc => {
      if (inc.id === incidentId) {
        return { ...inc, publicCorroborations: inc.publicCorroborations + 1 };
      }
      return inc;
    }));

    try {
      await supabase.rpc('increment_corroboration', { row_id: incidentId });
    } catch (e) {}
  };

  const handleAddSighting = async (sighting: SightingTip) => {
    setSightings(prev => [sighting, ...prev]);
    try {
      await supabase.from('alert_sightings').insert({
        alert_id: sighting.alertId,
        location_name: sighting.locationName,
        ghanapost_code: null,
        latitude: sighting.coordinates ? sighting.coordinates[0] : null,
        longitude: sighting.coordinates ? sighting.coordinates[1] : null,
        comment: sighting.comment,
        reporter_phone: sighting.reporterPhone,
        is_verified: sighting.isVerified
      });
    } catch (e) {}
  };

  const handleCreateAlert = async (newAlert: EmergencyAlert) => {
    setAlerts(prev => [newAlert, ...prev]);
  };

  // 5. If visitor is on /privacy or /privacy-policy, render PrivacyPolicyPage directly
  if (isPrivacyRoute) {
    return (
      <PrivacyPolicyPage
        onBack={() => {
          window.history.pushState({}, '', '/');
          setIsPrivacyRoute(false);
        }}
      />
    );
  }

  // 6. Loading Splash Screen while checking initial auth
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 space-y-4 text-white">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-ghana-gold via-amber-600 to-ghana-red flex items-center justify-center shadow-2xl border border-white/20">
          <Shield className="w-8 h-8 text-slate-950 stroke-[2.5]" />
        </div>
        <div className="flex items-center space-x-2 text-sm text-slate-300">
          <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
          <span>Verifying CAD Credentials...</span>
        </div>
      </div>
    );
  }

  // 6. If User is on /set-password route OR has must_change_password === true, render SetPasswordScreen ONLY
  const isMandatoryPasswordSetup = currentOfficer?.must_change_password === true || isSetPasswordRoute;
  if (isMandatoryPasswordSetup && authSession) {
    return (
      <SetPasswordScreen
        userEmail={currentOfficer?.email || authSession.user.email}
        onPasswordChanged={(updatedOfficer) => {
          loadedUserIdRef.current = updatedOfficer.id;
          setCurrentOfficer(updatedOfficer);
          setIsSetPasswordRoute(false);
        }}
        onSignOut={handleLogout}
      />
    );
  }

  // 7. If not authenticated or verification failed, visitor sees ONLY the login screen
  if (!currentOfficer) {
    return (
      <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(30,58,138,0.25),rgba(0,0,0,0))] flex flex-col items-center justify-center p-4">
        <AuthModal
          isOpen={true}
          externalError={authErrorMsg}
        />
      </div>
    );
  }

  // Phase 2 KPI Strip Metrics computed strictly from incidents prop
  const activeCount = incidents.filter(i => i.status !== 'RESOLVED' && i.status !== 'DISMISSED').length;
  const dispatchedCount = incidents.filter(i => i.status === 'DISPATCHED').length;
  const investigatingCount = incidents.filter(i => i.status === 'UNDER_ACTIVE_INVESTIGATION').length;
  const resolvedCount = incidents.filter(i => i.status === 'RESOLVED').length;
  const sealedEvidenceCount = incidents.reduce((sum, i) => sum + (i.media?.length || 1), 0);

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(30,58,138,0.15),rgba(255,255,255,0))] text-slate-100 flex flex-col font-sans selection:bg-ghana-gold selection:text-black">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeAlerts={alerts}
        onOpenAlertModal={() => setActiveTab('ALERTS')}
        currentOfficer={currentOfficer}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onOpenOfficerProvisioning={() => setIsOfficerMgmtOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">
        {activeTab === 'COMMAND' && (
          <div className="space-y-4">
            {/* Slim KPI Command Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-lg flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold shrink-0">
                  🚨
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">Active Queue</p>
                  <p className="text-base sm:text-lg font-black font-mono text-white tracking-tight">{activeCount}</p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-lg flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-600/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                  ⚡
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">Units Dispatched</p>
                  <p className="text-base sm:text-lg font-black font-mono text-emerald-400 tracking-tight">{dispatchedCount}</p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-lg flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold shrink-0">
                  🔍
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">Investigating</p>
                  <p className="text-base sm:text-lg font-black font-mono text-indigo-300 tracking-tight">{investigatingCount}</p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-lg flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-purple-600/15 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold shrink-0">
                  ⚖️
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">Act 772 Sealed</p>
                  <p className="text-base sm:text-lg font-black font-mono text-purple-300 tracking-tight">{sealedEvidenceCount}</p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-lg flex items-center space-x-3 col-span-2 sm:col-span-1">
                <div className="w-9 h-9 rounded-xl bg-amber-600/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold shrink-0">
                  ✅
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">Resolved Today</p>
                  <p className="text-base sm:text-lg font-black font-mono text-amber-400 tracking-tight">{resolvedCount}</p>
                </div>
              </div>
            </div>

            {/* Map Container */}
            <div className="relative h-[320px] md:h-[clamp(340px,45vh,560px)]">
              <IncidentMap
                incidents={incidents}
                alerts={alerts}
                selectedIncident={selectedIncident}
                onSelectIncident={(inc) => setSelectedIncident(inc)}
                latestPings={latestPings}
              />
            </div>
            <PoliceCommandDashboard
              incidents={incidents}
              selectedIncident={selectedIncident}
              onSelectIncident={(inc) => setSelectedIncident(inc)}
              onUpdateStatus={handleUpdateStatus}
              onReassignAgency={handleReassignAgency}
              onOpenCertificateModal={(cert) => setActiveCertificate(cert)}
              onApprovePublicPublish={handleApprovePublicPublish}
              onRejectPublicPublish={handleRejectPublicPublish}
            />
          </div>
        )}

        {activeTab === 'MODERATOR' && (
          <ModeratorConsole
            incidents={incidents}
            onApprovePublicPublish={handleApprovePublicPublish}
            onRejectPublicPublish={handleRejectPublicPublish}
          />
        )}

        {activeTab === 'ALERTS' && (
          <div className="space-y-6">
            <div className="relative h-[320px] md:h-[clamp(340px,45vh,560px)]">
              <IncidentMap
                incidents={incidents}
                alerts={alerts}
                selectedIncident={selectedIncident}
                onSelectIncident={(inc) => setSelectedIncident(inc)}
                latestPings={latestPings}
              />
            </div>
            <EmergencyAlertHub currentOfficer={currentOfficer} />
          </div>
        )}

        {activeTab === 'FEED' && (
          <PublicWebFeed />
        )}

        {activeTab === 'ANALYTICS' && (
          <AnalyticsDashboard incidents={incidents} />
        )}
      </main>

      <CourtCertificateModal
        certificate={activeCertificate}
        onClose={() => setActiveCertificate(null)}
      />

      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          externalError={authErrorMsg}
        />
      )}

      {isOfficerMgmtOpen && (
        <OfficerManagementModal
          isOpen={isOfficerMgmtOpen}
          onClose={() => setIsOfficerMgmtOpen(false)}
          currentOfficer={currentOfficer}
        />
      )}

      <footer className="mt-auto border-t border-slate-800 bg-slate-950 py-6 text-xs text-slate-500 text-center">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <p>&copy; 2026 Republic of Ghana • Supabase Realtime Connected</p>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => {
                window.history.pushState({}, '', '/privacy');
                setIsPrivacyRoute(true);
              }}
              className="hover:text-amber-400 transition underline font-bold"
            >
              Privacy Policy (Act 843)
            </button>
            <span>Electronic Transactions Act (Act 772)</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
