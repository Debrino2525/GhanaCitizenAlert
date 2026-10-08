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
import { INITIAL_INCIDENTS, INITIAL_ALERTS, INITIAL_SIGHTINGS } from './data/mockData';
import { IncidentReport, EmergencyAlert, SightingTip, IncidentStatus, AgencyType, OfficerUser } from './types';
import { CourtCertificate } from './services/evidenceVault';
import { supabase } from './services/supabaseClient';
import { Shield, Loader2 } from 'lucide-react';

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'COMMAND' | 'MODERATOR' | 'ALERTS' | 'FEED' | 'ANALYTICS'>('COMMAND');
  const [incidents, setIncidents] = useState<IncidentReport[]>(INITIAL_INCIDENTS);
  const [alerts, setAlerts] = useState<EmergencyAlert[]>(INITIAL_ALERTS);
  const [sightings, setSightings] = useState<SightingTip[]>(INITIAL_SIGHTINGS);
  const [selectedIncident, setSelectedIncident] = useState<IncidentReport | null>(INITIAL_INCIDENTS[0]);
  const [activeCertificate, setActiveCertificate] = useState<CourtCertificate | null>(null);

  // Authentication & Officer Verification State
  const [currentOfficer, setCurrentOfficer] = useState<OfficerUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isOfficerMgmtOpen, setIsOfficerMgmtOpen] = useState<boolean>(false);
  const [isSetPasswordRoute, setIsSetPasswordRoute] = useState<boolean>(() => {
    return window.location.pathname === '/set-password' || window.location.hash.includes('type=recovery') || window.location.hash.includes('type=invite');
  });

  const lastActivityRef = useRef<number>(Date.now());

  // Function to load and verify officer record from database
  const loadAndVerifyOfficer = useCallback(async (userId: string, userEmail?: string): Promise<OfficerUser | null> => {
    try {
      const { data: officerRow, error: officerErr } = await supabase
        .from('officers')
        .select('*')
        .eq('id', userId)
        .single();

      if (officerErr || !officerRow) {
        console.warn('No officer record matching auth.uid():', officerErr?.message);
        await supabase.auth.signOut();
        return null;
      }

      if (officerRow.is_active === false) {
        console.warn('Officer account is deactivated.');
        await supabase.auth.signOut();
        return null;
      }

      const officer: OfficerUser = {
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

      return officer;
    } catch (err) {
      console.error('Error verifying officer credentials:', err);
      await supabase.auth.signOut();
      return null;
    }
  }, []);

  // 1. Session Initialization & Cleanup on Mount
  useEffect(() => {
    // Delete legacy mock localStorage keys
    localStorage.removeItem('citizen_alert_officer_session');
    localStorage.removeItem('citizen_alert_officers_vault');

    // Check URL route changes
    const checkRoute = () => {
      setIsSetPasswordRoute(
        window.location.pathname === '/set-password' ||
        window.location.hash.includes('type=recovery') ||
        window.location.hash.includes('type=invite')
      );
    };
    window.addEventListener('popstate', checkRoute);

    // Initial Supabase session retrieval
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const verified = await loadAndVerifyOfficer(session.user.id, session.user.email);
        setCurrentOfficer(verified);
      } else {
        setCurrentOfficer(null);
      }
      setIsAuthChecking(false);
    });

    // Subscribe to Supabase Auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        if (event === 'PASSWORD_RECOVERY') {
          setIsSetPasswordRoute(true);
        }
        const verified = await loadAndVerifyOfficer(session.user.id, session.user.email);
        setCurrentOfficer(verified);
      } else {
        setCurrentOfficer(null);
      }
      setIsAuthChecking(false);
    });

    return () => {
      window.removeEventListener('popstate', checkRoute);
      subscription.unsubscribe();
    };
  }, [loadAndVerifyOfficer]);

  // 2. 15-Minute Inactivity Auto-Logout
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
        alert('CAD Terminal Locked: You have been automatically signed out due to 15 minutes of inactivity.');
      }
    };

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    activityEvents.forEach((ev) => window.addEventListener(ev, recordActivity, { passive: true }));
    intervalId = setInterval(checkInactivity, 30000); // check every 30s

    return () => {
      clearInterval(intervalId);
      activityEvents.forEach((ev) => window.removeEventListener(ev, recordActivity));
    };
  }, [currentOfficer]);

  // 3. Load Incidents & Realtime Events from Supabase
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
              rawS3Url: m.rawS3Url || '',
              thumbnailUrl: m.thumbnailUrl || ''
            }));

            const lat = typeof r.latitude === 'number' && !isNaN(r.latitude) ? r.latitude : 5.6037;
            const lng = typeof r.longitude === 'number' && !isNaN(r.longitude) ? r.longitude : -0.1870;

            return {
              id: r.id,
              trackingCode: r.tracking_code || `GH-2026-${r.id.substring(0, 4)}`,
              title: r.title || 'Civic Incident Report',
              category: r.category || 'CRIMINAL_OFFENSE',
              description: r.description || 'No description provided.',
              locationName: r.location_name || 'Accra, Ghana',
              ghanaPostCode: r.ghanapost_code || 'GA-014-9923',
              region: r.region || 'Greater Accra',
              coordinates: [lat, lng],
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

    fetchSupabaseData();

    // Subscribe to Realtime Incidents channel
    const channel = supabase
      .channel('realtime_incidents')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'incidents' }, (payload) => {
        const r: any = payload.new;
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
          rawS3Url: m.rawS3Url || '',
          thumbnailUrl: m.thumbnailUrl || ''
        }));

        const lat = typeof r.latitude === 'number' && !isNaN(r.latitude) ? r.latitude : 5.6037;
        const lng = typeof r.longitude === 'number' && !isNaN(r.longitude) ? r.longitude : -0.1870;

        const newInc: IncidentReport = {
          id: r.id,
          trackingCode: r.tracking_code || `GH-2026-${r.id.substring(0, 4)}`,
          title: r.title || 'Civic Incident Report',
          category: r.category || 'CRIMINAL_OFFENSE',
          description: r.description || 'No description provided.',
          locationName: r.location_name || 'Accra, Ghana',
          ghanaPostCode: r.ghanapost_code || 'GA-014-9923',
          region: r.region || 'Greater Accra',
          coordinates: [lat, lng],
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
        setIncidents(prev => [newInc, ...prev]);
        setSelectedIncident(newInc);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOfficer]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentOfficer(null);
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
        return { ...inc, isPublicPublished: true };
      }
      return inc;
    }));

    try {
      await supabase.from('incidents').update({ is_public_published: true }).eq('id', incidentId);
    } catch (e) {}
  };

  const handleRejectPublicPublish = async (incidentId: string) => {
    setIncidents(prev => prev.map(inc => {
      if (inc.id === incidentId) {
        return { ...inc, isPublicPublished: false, isPublicEligible: false };
      }
      return inc;
    }));

    try {
      await supabase.from('incidents').update({ is_public_published: false, is_public_eligible: false }).eq('id', incidentId);
    } catch (e) {}
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
        ghanapost_code: sighting.ghanaPostCode,
        latitude: sighting.coordinates[0],
        longitude: sighting.coordinates[1],
        comment: sighting.comment,
        reporter_phone: sighting.reporterPhone,
        is_verified: sighting.isVerified
      });
    } catch (e) {}
  };

  const handleCreateAlert = async (newAlert: EmergencyAlert) => {
    setAlerts(prev => [newAlert, ...prev]);
  };

  // 4. Loading Splash Screen while checking initial auth
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 space-y-4 text-white">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-ghana-gold via-amber-600 to-ghana-red flex items-center justify-center shadow-2xl border border-white/20">
          <Shield className="w-8 h-8 text-slate-950 stroke-[2.5]" />
        </div>
        <div className="flex items-center space-x-2 text-sm text-slate-300">
          <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
          <span>Verifying Law Enforcement Credentials...</span>
        </div>
      </div>
    );
  }

  // 5. If User is on /set-password route OR has must_change_password === true, render SetPasswordScreen ONLY
  const isMandatoryPasswordSetup = currentOfficer?.must_change_password === true || isSetPasswordRoute;
  if (isMandatoryPasswordSetup) {
    return (
      <SetPasswordScreen
        userEmail={currentOfficer?.email}
        onPasswordChanged={(updatedOfficer) => {
          setCurrentOfficer(updatedOfficer);
          setIsSetPasswordRoute(false);
        }}
        onSignOut={handleLogout}
      />
    );
  }

  // 6. If not authenticated, visitor sees ONLY the login screen
  if (!currentOfficer) {
    return (
      <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(30,58,138,0.25),rgba(0,0,0,0))] flex flex-col items-center justify-center p-4">
        <AuthModal
          isOpen={true}
          onLoginSuccess={(officer) => {
            setCurrentOfficer(officer);
            setIsAuthModalOpen(false);
          }}
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
              />
            </div>
            <PoliceCommandDashboard
              incidents={incidents}
              selectedIncident={selectedIncident}
              onSelectIncident={(inc) => setSelectedIncident(inc)}
              onUpdateStatus={handleUpdateStatus}
              onReassignAgency={handleReassignAgency}
              onOpenCertificateModal={(cert) => setActiveCertificate(cert)}
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
              />
            </div>
            <EmergencyAlertHub
              alerts={alerts}
              sightings={sightings}
              onAddSighting={handleAddSighting}
              onCreateAlert={handleCreateAlert}
            />
          </div>
        )}

        {activeTab === 'FEED' && (
          <PublicWebFeed
            incidents={incidents}
            onCorroborate={handleCorroborate}
          />
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
          onClose={() => setIsAuthModalOpen(false)}
          onLoginSuccess={(officer) => {
            setCurrentOfficer(officer);
            setIsAuthModalOpen(false);
          }}
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
            <span>Ghana Data Protection Act (Act 843)</span>
            <span>Electronic Transactions Act (Act 772)</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
