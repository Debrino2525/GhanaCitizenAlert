import React from 'react';
import { ShieldCheck, Lock, MapPin, Video, EyeOff, Trash2, ArrowLeft, FileText, CheckCircle } from 'lucide-react';

interface PrivacyPolicyPageProps {
  onBack?: () => void;
}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-ghana-gold/20 selection:text-ghana-gold">
      {/* Header Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {onBack ? (
              <button
                onClick={onBack}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center space-x-1.5 text-xs font-bold"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : (
              <a
                href="/"
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center space-x-1.5 text-xs font-bold"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Command Center</span>
              </a>
            )}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-ghana-gold/10 border border-ghana-gold/30 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-ghana-gold" />
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-black text-white tracking-tight">CitizenAlert Ghana</h1>
                <p className="text-[10px] text-slate-400">National Privacy & Telemetry Governance</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Act 843 Certified
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Title Header */}
        <div className="space-y-3 border-b border-slate-800 pb-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono font-bold">
            <FileText className="w-3.5 h-3.5" />
            <span>STATUTORY PRIVACY & TELEMETRY POLICY</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Data Protection, Telemetry & Whistleblower Privacy Policy
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Effective Date: October 2026 • Governed under the <strong>Data Protection Act, 2012 (Act 843)</strong>, 
            <strong> Electronic Transactions Act, 2008 (Act 772)</strong>, and the <strong>Whistleblower Act, 2006 (Act 720)</strong> of the Republic of Ghana.
          </p>
        </div>

        {/* Section 1: Executive Overview */}
        <section className="space-y-3">
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <span className="text-ghana-gold">1.</span>
            <span>Purpose & Scope of Service</span>
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            CitizenAlert Ghana is a national civic safety, incident reporting, and emergency dispatch integration system operated in cooperation with law enforcement agencies (including Ghana Police Service CID, DOVVSU, MTTD, and EPA). This Policy explains how user location, multimedia evidence, and identity telemetry are gathered, processed, secured, and purged.
          </p>
        </section>

        {/* Section 2: GPS Telemetry & Geospatial Data */}
        <section className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-amber-400" />
            <span>2. GPS Location & Geospatial Telemetry</span>
          </h3>
          <div className="text-sm text-slate-300 space-y-2 leading-relaxed">
            <p>
              When a citizen captures incident evidence or activates the Emergency SOS Distress Beacon:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-400">
              <li>
                <strong className="text-slate-200">Foreground High-Accuracy GPS:</strong> Coordinates (Latitude, Longitude) and accuracy error radius (meters) are sampled only while the user explicitly interacts with the capture viewfinder or holds the SOS beacon.
              </li>
              <li>
                <strong className="text-slate-200">Forensic Embedding:</strong> Location telemetry is cryptographically sealed into evidence dossiers under Act 772 standards for court admissibility.
              </li>
              <li>
                <strong className="text-slate-200">No Continuous Background Tracking:</strong> CitizenAlert does not track your location in the background when the application is closed. SOS coordinate updates occur only while the screen remains active on the beacon view.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 3: Camera, Audio & Evidence Integrity */}
        <section className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <Video className="w-5 h-5 text-blue-400" />
            <span>3. Camera, Microphone & Raw Byte Cryptography</span>
          </h3>
          <div className="text-sm text-slate-300 space-y-2 leading-relaxed">
            <p>
              Evidence recordings adhere to strict statutory safeguards:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-400">
              <li>
                <strong className="text-slate-200">60-Second Statutory Limit:</strong> Camera captures are constrained to a maximum of 60 seconds to prevent unnecessary surveillance.
              </li>
              <li>
                <strong className="text-slate-200">Raw Byte SHA-256 Hashing:</strong> Every media recording has its raw binary bytes hashed on-device using SHA-256 prior to vault transmission, guaranteeing tamper detection.
              </li>
              <li>
                <strong className="text-slate-200">Sandboxed Storage:</strong> Local evidence is stored in app-sandboxed directories and purged upon verified cloud vault delivery or upon manual queue removal.
              </li>
            </ul>
          </div>
        </section>

        {/* Section 4: Whistleblower Anonymity */}
        <section className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <EyeOff className="w-5 h-5 text-emerald-400" />
            <span>4. Anonymous Whistleblower Protection (Act 720)</span>
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            Under Section 12 of the Whistleblower Act, 2006 (Act 720), citizens submitting reports anonymously receive absolute statutory protection. When anonymous reporting or SOS is active:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="font-bold text-emerald-400 block mb-1">✓ What is Sent:</span>
              <span className="text-slate-400">Incident category, narrative, raw coordinates, and media payload.</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="font-bold text-rose-400 block mb-1">✗ What is Withheld:</span>
              <span className="text-slate-400">Reporter name, phone number, email address, Ghana Card, and user-typed landmark PII.</span>
            </div>
          </div>
        </section>

        {/* Section 5: Account Deletion & Right to Erasure */}
        <section className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <Trash2 className="w-5 h-5 text-rose-400" />
            <span>5. User Rights, Account Deletion & Data Erasure</span>
          </h3>
          <div className="text-sm text-slate-300 space-y-3 leading-relaxed">
            <p>
              In accordance with Section 35 of the Data Protection Act (Act 843), you have the right to request deletion of your personal account and associated data at any time:
            </p>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">How to Delete Your Account:</h4>
              <ol className="list-decimal pl-5 space-y-1 text-xs text-slate-400">
                <li>Open the <strong>CitizenAlert Ghana</strong> mobile app.</li>
                <li>Tap your profile avatar in the upper right corner to open the <strong>Citizen Profile & Trust Vault</strong>.</li>
                <li>Tap <strong className="text-rose-400">"Delete Account & Purge Data"</strong> and confirm your request.</li>
                <li>Your profile credentials, authentication tokens, and local offline queue will be immediately and permanently erased from the device and identity directory.</li>
              </ol>
            </div>
            <p className="text-xs text-slate-400">
              To request manual data erasure via web, email our Data Protection Officer at: <a href="mailto:privacy@safety.gov.gh" className="text-ghana-gold underline">privacy@safety.gov.gh</a> with your registered email address.
            </p>
          </div>
        </section>

        {/* Section 6: Emergency Call Notice */}
        <section className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 leading-relaxed">
          <strong className="text-amber-300 block mb-1">⚠️ Emergency Services Notice:</strong>
          CitizenAlert Ghana is an auxiliary digital telemetry and evidentiary transmission conduit. It does not replace direct telephone dispatch. In an immediate life-threatening crisis, dial <strong>191 (Police)</strong> or <strong>112 (National Emergency)</strong> directly.
        </section>

        {/* Footer info */}
        <div className="text-center pt-4 border-t border-slate-800 text-xs text-slate-500">
          <p>© 2026 Republic of Ghana • Ministry of the Interior & Ghana Police Service CID</p>
          <p className="mt-1 font-mono text-[10px]">Data Controller Registration: DPC-GH-2026-ACT843</p>
        </div>
      </main>
    </div>
  );
};
