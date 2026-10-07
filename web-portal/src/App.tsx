import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { IncidentMap } from './components/IncidentMap';
import { PoliceCommandDashboard } from './components/PoliceCommandDashboard';
import { ModeratorConsole } from './components/ModeratorConsole';
import { EmergencyAlertHub } from './components/EmergencyAlertHub';
import { PublicWebFeed } from './components/PublicWebFeed';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { CourtCertificateModal } from './components/CourtCertificateModal';
import { INITIAL_INCIDENTS, INITIAL_ALERTS, INITIAL_SIGHTINGS } from './data/mockData';
import { IncidentReport, EmergencyAlert, SightingTip, IncidentStatus, AgencyType } from './types';
import { CourtCertificate } from './services/evidenceVault';
import { supabase } from './services/supabaseClient';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'COMMAND' | 'MODERATOR' | 'ALERTS' | 'FEED' | 'ANALYTICS'>('COMMAND');
  const [incidents, setIncidents] = useState<IncidentReport[]>(INITIAL_INCIDENTS);
  const [alerts, setAlerts] = useState<EmergencyAlert[]>(INITIAL_ALERTS);
  const [sightings, setSightings] = useState<SightingTip[]>(INITIAL_SIGHTINGS);
  const [selectedIncident, setSelectedIncident] = useState<IncidentReport | null>(INITIAL_INCIDENTS[0]);
  const [activeCertificate, setActiveCertificate] = useState<CourtCertificate | null>(null);

  // 1. Load data from Supabase & Listen to Realtime Events
  useEffect(() => {
    // Fetch live incidents from Supabase if table exists
    const fetchSupabaseData = async () => {
      try {
        const { data: incidentRows } = await supabase.from('incidents').select('*');
        if (incidentRows && incidentRows.length > 0) {
          const formatted: IncidentReport[] = incidentRows.map((r: any) => ({
            id: r.id,
            trackingCode: r.tracking_code,
            title: r.title,
            category: r.category,
            description: r.description,
            locationName: r.location_name,
            ghanaPostCode: r.ghanapost_code,
            region: r.region,
            coordinates: [r.latitude, r.longitude],
            media: r.media || [],
            reporter: r.reporter_data || { isAnonymous: r.is_anonymous, trustScore: r.reporter_trust_score },
            assignedAgency: r.assigned_agency,
            secondaryAgencies: r.secondary_agencies || [],
            status: r.status,
            severity: r.severity,
            isPublicEligible: r.is_public_eligible,
            isPublicPublished: r.is_public_published,
            publicCorroborations: r.public_corroborations || 0,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            investigatorNotes: r.investigator_notes || []
          }));
          setIncidents(formatted);
          setSelectedIncident(formatted[0]);
        }
      } catch (err) {
        // Fallback to initial mock data
      }
    };

    fetchSupabaseData();

    // Subscribe to Realtime Incidents channel
    const channel = supabase
      .channel('realtime_incidents')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'incidents' }, (payload) => {
        const r: any = payload.new;
        const newInc: IncidentReport = {
          id: r.id,
          trackingCode: r.tracking_code,
          title: r.title,
          category: r.category,
          description: r.description,
          locationName: r.location_name,
          ghanaPostCode: r.ghanapost_code,
          region: r.region,
          coordinates: [r.latitude, r.longitude],
          media: r.media || [],
          reporter: r.reporter_data || { isAnonymous: r.is_anonymous, trustScore: r.reporter_trust_score },
          assignedAgency: r.assigned_agency,
          secondaryAgencies: r.secondary_agencies || [],
          status: r.status,
          severity: r.severity,
          isPublicEligible: r.is_public_eligible,
          isPublicPublished: r.is_public_published,
          publicCorroborations: r.public_corroborations || 0,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeAlerts={alerts}
        onOpenAlertModal={() => setActiveTab('ALERTS')}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {activeTab === 'COMMAND' && (
          <div className="space-y-6">
            <div className="h-[440px]">
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
            <div className="h-[380px]">
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
