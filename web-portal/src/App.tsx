import React, { useState } from 'react';
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

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'COMMAND' | 'MODERATOR' | 'ALERTS' | 'FEED' | 'ANALYTICS'>('COMMAND');
  const [incidents, setIncidents] = useState<IncidentReport[]>(INITIAL_INCIDENTS);
  const [alerts, setAlerts] = useState<EmergencyAlert[]>(INITIAL_ALERTS);
  const [sightings, setSightings] = useState<SightingTip[]>(INITIAL_SIGHTINGS);
  const [selectedIncident, setSelectedIncident] = useState<IncidentReport | null>(INITIAL_INCIDENTS[0]);
  const [activeCertificate, setActiveCertificate] = useState<CourtCertificate | null>(null);

  const handleUpdateStatus = (incidentId: string, newStatus: IncidentStatus) => {
    setIncidents(prev => prev.map(inc => {
      if (inc.id === incidentId) {
        const updated = { ...inc, status: newStatus, updatedAt: new Date().toISOString() };
        if (selectedIncident?.id === incidentId) setSelectedIncident(updated);
        return updated;
      }
      return inc;
    }));
  };

  const handleReassignAgency = (incidentId: string, newAgency: AgencyType) => {
    setIncidents(prev => prev.map(inc => {
      if (inc.id === incidentId) {
        const updated = { ...inc, assignedAgency: newAgency, updatedAt: new Date().toISOString() };
        if (selectedIncident?.id === incidentId) setSelectedIncident(updated);
        return updated;
      }
      return inc;
    }));
  };

  const handleApprovePublicPublish = (incidentId: string) => {
    setIncidents(prev => prev.map(inc => {
      if (inc.id === incidentId) {
        return { ...inc, isPublicPublished: true };
      }
      return inc;
    }));
  };

  const handleRejectPublicPublish = (incidentId: string) => {
    setIncidents(prev => prev.map(inc => {
      if (inc.id === incidentId) {
        return { ...inc, isPublicPublished: false, isPublicEligible: false };
      }
      return inc;
    }));
  };

  const handleCorroborate = (incidentId: string) => {
    setIncidents(prev => prev.map(inc => {
      if (inc.id === incidentId) {
        return { ...inc, publicCorroborations: inc.publicCorroborations + 1 };
      }
      return inc;
    }));
  };

  const handleAddSighting = (sighting: SightingTip) => {
    setSightings(prev => [sighting, ...prev]);
  };

  const handleCreateAlert = (newAlert: EmergencyAlert) => {
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
          <p>&copy; 2026 Republic of Ghana • National Civic Safety & Portals System.</p>
          <div className="flex space-x-4">
            <span>Ghana Data Protection Act (Act 843)</span>
            <span>Electronic Transactions Act (Act 772)</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
