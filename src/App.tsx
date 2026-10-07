import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { IncidentMap } from './components/IncidentMap';
import { PoliceCommandDashboard } from './components/PoliceCommandDashboard';
import { EmergencyAlertHub } from './components/EmergencyAlertHub';
import { CitizenMobileSimulator } from './components/CitizenMobileSimulator';
import { PublicCorroborationFeed } from './components/PublicCorroborationFeed';
import { CourtCertificateModal } from './components/CourtCertificateModal';
import { INITIAL_INCIDENTS, INITIAL_ALERTS, INITIAL_SIGHTINGS } from './data/mockData';
import { IncidentReport, EmergencyAlert, SightingTip, IncidentStatus, AgencyType } from './types';
import { CourtCertificate } from './services/evidenceVault';
import { Shield, Radio, MapPin, Eye, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'COMMAND' | 'ALERTS' | 'REPORT' | 'FEED'>('COMMAND');
  const [incidents, setIncidents] = useState<IncidentReport[]>(INITIAL_INCIDENTS);
  const [alerts, setAlerts] = useState<EmergencyAlert[]>(INITIAL_ALERTS);
  const [sightings, setSightings] = useState<SightingTip[]>(INITIAL_SIGHTINGS);
  const [selectedIncident, setSelectedIncident] = useState<IncidentReport | null>(INITIAL_INCIDENTS[0]);
  const [activeCertificate, setActiveCertificate] = useState<CourtCertificate | null>(null);

  // Status updates
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

  const handleAddIncident = (newIncident: IncidentReport) => {
    setIncidents(prev => [newIncident, ...prev]);
    setSelectedIncident(newIncident);
  };

  const handleAddSighting = (sighting: SightingTip) => {
    setSightings(prev => [sighting, ...prev]);
  };

  const handleCreateAlert = (newAlert: EmergencyAlert) => {
    setAlerts(prev => [newAlert, ...prev]);
  };

  const handleCorroborate = (incidentId: string) => {
    setIncidents(prev => prev.map(inc => {
      if (inc.id === incidentId) {
        return { ...inc, publicCorroborations: inc.publicCorroborations + 1 };
      }
      return inc;
    }));
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
        {/* Global Key Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Total Active Incidents</span>
              <Shield className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl font-black text-white mt-1">{incidents.length}</p>
            <span className="text-[10px] text-emerald-400 font-semibold font-mono">100% Cryptographically Sealed</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Active Geofence Alerts</span>
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
            <p className="text-2xl font-black text-amber-400 mt-1">{alerts.filter(a => a.isActive).length}</p>
            <span className="text-[10px] text-slate-400 font-mono">Amber & Red Broadcasts</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Citizen Sightings Received</span>
              <Eye className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-emerald-400 mt-1">{sightings.length + 23}</p>
            <span className="text-[10px] text-emerald-400 font-mono font-semibold">+12 in last 2 hours</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Partner Agencies</span>
              <Layers className="w-4 h-4 text-ghana-gold" />
            </div>
            <p className="text-2xl font-black text-white mt-1">6 Agencies</p>
            <span className="text-[10px] text-slate-400 font-mono">GPS • DOVVSU • EPA • MTTD</span>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'COMMAND' && (
          <div className="space-y-6">
            {/* Embedded Live Map on Command View */}
            <div className="h-[440px]">
              <IncidentMap
                incidents={incidents}
                alerts={alerts}
                selectedIncident={selectedIncident}
                onSelectIncident={(inc) => setSelectedIncident(inc)}
              />
            </div>

            {/* Police Command Dashboard */}
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

        {activeTab === 'REPORT' && (
          <CitizenMobileSimulator
            onSubmitIncident={(newInc) => {
              handleAddIncident(newInc);
              setActiveTab('COMMAND');
            }}
          />
        )}

        {activeTab === 'FEED' && (
          <PublicCorroborationFeed
            incidents={incidents}
            onCorroborate={handleCorroborate}
          />
        )}
      </main>

      {/* Legal Court Certificate Modal */}
      <CourtCertificateModal
        certificate={activeCertificate}
        onClose={() => setActiveCertificate(null)}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800 bg-slate-950 py-6 text-xs text-slate-500 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-between items-center gap-4">
          <p>
            &copy; 2026 Republic of Ghana • National Civic Safety & Incident Response System.
          </p>
          <div className="flex space-x-4">
            <span className="hover:text-slate-400 cursor-pointer">Ghana Data Protection Act (Act 843)</span>
            <span className="hover:text-slate-400 cursor-pointer">Electronic Transactions Act (Act 772)</span>
            <span className="hover:text-slate-400 cursor-pointer">Whistleblower Act (Act 720)</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
