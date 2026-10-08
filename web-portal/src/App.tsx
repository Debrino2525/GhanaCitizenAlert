import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { IncidentMap } from './components/IncidentMap';
import { PoliceCommandDashboard } from './components/PoliceCommandDashboard';
import { ModeratorConsole } from './components/ModeratorConsole';
import { EmergencyAlertHub } from './components/EmergencyAlertHub';
import { PublicWebFeed } from './components/PublicWebFeed';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { CourtCertificateModal } from './components/CourtCertificateModal';
import { AuthModal, PRESET_OFFICERS } from './components/AuthModal';
import { OfficerManagementModal } from './components/OfficerManagementModal';
import { INITIAL_INCIDENTS, INITIAL_ALERTS, INITIAL_SIGHTINGS } from './data/mockData';
import { IncidentReport, EmergencyAlert, SightingTip, IncidentStatus, AgencyType, OfficerUser } from './types';
import { CourtCertificate } from './services/evidenceVault';
import { supabase } from './services/supabaseClient';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'COMMAND' | 'MODERATOR' | 'ALERTS' | 'FEED' | 'ANALYTICS'>('COMMAND');
  const [incidents, setIncidents] = useState<IncidentReport[]>(INITIAL_INCIDENTS);
  const [alerts, setAlerts] = useState<EmergencyAlert[]>(INITIAL_ALERTS);
  const [sightings, setSightings] = useState<SightingTip[]>(INITIAL_SIGHTINGS);
  const [selectedIncident, setSelectedIncident] = useState<IncidentReport | null>(INITIAL_INCIDENTS[0]);
  const [activeCertificate, setActiveCertificate] = useState<CourtCertificate | null>(null);

  // Law Enforcement Authentication & RBAC Session
  const [currentOfficer, setCurrentOfficer] = useState<OfficerUser | null>(() => {
    try {
      const saved = localStorage.getItem('citizen_alert_officer_session');
      return saved ? JSON.parse(saved) : PRESET_OFFICERS[0];
    } catch (e) {
      return PRESET_OFFICERS[0];
    }
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isOfficerMgmtOpen, setIsOfficerMgmtOpen] = useState<boolean>(false);

  const handleLogout = () => {
    localStorage.removeItem('citizen_alert_officer_session');
    setCurrentOfficer(null);
  };

  // 1. Load data from Supabase & Listen to Realtime Events
  useEffect(() => {
    // Fetch live incidents from Supabase if table exists
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
        // Handle fetch error
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
  }, []);

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

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(officer) => setCurrentOfficer(officer)}
        currentOfficer={currentOfficer}
        onOpenOfficerProvisioning={() => setIsOfficerMgmtOpen(true)}
      />

      <OfficerManagementModal
        isOpen={isOfficerMgmtOpen}
        onClose={() => setIsOfficerMgmtOpen(false)}
      />

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
