/**
 * Rule-based case summary & triage suggestions.
 *
 * HONESTY NOTE: this module does NOT call Gemini or any AI/ML model. It matches
 * keywords in the report text and fills a template. Everything it returns must be
 * presented to officers as an automatic draft / suggestion, never as AI analysis,
 * verification, or a forensic finding. (File name kept to avoid churn in imports.)
 */

import { IncidentReport, AgencyType, SeverityLevel } from '../types';
import { GHANA_COMMAND_STATIONS, calculateHaversineDistanceKm } from './googleMapsService';

export interface AiTriageResult {
  recommendedAgency: AgencyType;
  assessedSeverity: SeverityLevel;
  confidenceScore: number;
  threatSummary: string;
  immediateActions: string[];
  keyRiskFactors: string[];
  statutoryViolations: string[];
  localDialectContext?: string;
  isHighPriorityAlert: boolean;
}

export interface PoliceCaseBrief {
  dossierNumber: string;
  generatedAt: string;
  incidentTrackingCode: string;
  title: string;
  executiveSummary: string;
  legalFramework: string[];
  geospatialAssessment: {
    ghanaPostCode: string;
    locationName: string;
    coordinates: string;
    tacticalSector: string;
    closestStationName: string;
    estimatedEtaMinutes: number;
  };
  forensicEvidenceAudit: {
    evidenceCount: number;
    sha256Seal: string;
    tamperProofStatus: string;
    chainOfCustodySummary: string;
    /** null = never analysed. No deepfake analysis exists in this system today. */
    deepfakeAuditScore: number | null;
  };
  suspectAndVehicleIntelligence: string;
  investigativeChecklist: string[];
  commandActionDirectives: string[];
}

/**
 * Keyword-based triage suggestion for an incident report (no AI model involved).
 * confidenceScore is a fixed per-rule value, not a statistical confidence; do not display it.
 */
export async function performAiTriageAnalysis(
  incident: IncidentReport
): Promise<AiTriageResult> {
  let recommendedAgency: AgencyType = incident.assignedAgency || 'GPS_CID';
  let assessedSeverity: SeverityLevel = incident.severity || 'HIGH';
  let confidenceScore = 94;
  const statutoryViolations: string[] = [];
  const immediateActions: string[] = [];
  const keyRiskFactors: string[] = [];
  let isHighPriorityAlert = false;
  let threatSummary = '';

  const desc = (incident.description || '').toLowerCase();
  const title = (incident.title || '').toLowerCase();
  const combined = `${title} ${desc}`;

  // Analyze by category and keywords
  if (incident.category === 'CRIMINAL_OFFENSE' || combined.includes('robbery') || combined.includes('weapon') || combined.includes('assault') || combined.includes('sos')) {
    recommendedAgency = 'GPS_CID';
    assessedSeverity = combined.includes('sos') || combined.includes('weapon') || combined.includes('gun') ? 'CRITICAL' : 'HIGH';
    confidenceScore = 98;
    isHighPriorityAlert = true;
    threatSummary = 'High-priority criminal offense detected. Physical security risk to citizens in immediate vicinity.';
    statutoryViolations.push(
      'Criminal Offences Act, 1960 (Act 29) § 149 (Armed Robbery / Physical Threat)',
      'Criminal Offences Act, 1960 (Act 29) § 172 (Unlawful Possession of Firearms)',
      'Electronic Transactions Act, 2008 (Act 772) § 7 (Forensic Electronic Evidence)'
    );
    immediateActions.push(
      'Dispatch Armed Rapid Response Patrol Unit from closest command station',
      'Establish tactical perimeter and cordoning along immediate arterial exits',
      'Activate real-time CCTV feeds and broadcast alert to mobile patrol callsigns'
    );
    keyRiskFactors.push('Potential armed suspect on the run', 'Public bystander proximity', 'Escape along major highway corridors');
  } else if (incident.category === 'GALAMSEY_ENVIRONMENTAL' || combined.includes('galamsey') || combined.includes('mining') || combined.includes('river') || combined.includes('pollution')) {
    recommendedAgency = 'EPA';
    assessedSeverity = 'HIGH';
    confidenceScore = 96;
    threatSummary = 'Severe environmental and water resource degradation. Unauthorized excavation / excavator machinery suspected.';
    statutoryViolations.push(
      'Minerals and Mining (Amendment) Act, 2019 (Act 995) § 99 (Illegal Small-Scale Mining / Galamsey)',
      'Environmental Protection Agency Act, 1994 (Act 490) § 12 (Waterbody Toxic Contamination)',
      'Whistleblower Act, 2006 (Act 720) § 12 (Citizen Whistleblower Immunity Protocol)'
    );
    immediateActions.push(
      'Deploy joint EPA-Military Task Force (Operation Vanguard / Halt II)',
      'Impound heavy excavators, washing boards, and fuel reserves at site',
      'Collect water sample specimens for certified forensic laboratory toxicology'
    );
    keyRiskFactors.push('Heavy machinery presence', 'River basin turbidity & cyanide risk', 'Armed site security guards');
  } else if (incident.category === 'DOMESTIC_ABUSE' || combined.includes('domestic') || combined.includes('spouse') || combined.includes('child') || combined.includes('abuse')) {
    recommendedAgency = 'DOVVSU';
    assessedSeverity = 'HIGH';
    confidenceScore = 95;
    threatSummary = 'Vulnerable citizen / domestic safety distress requiring specialized protective intervention.';
    statutoryViolations.push(
      'Domestic Violence Act, 2007 (Act 732) § 3 (Physical and Emotional Abuse)',
      'Children\'s Act, 1998 (Act 560) § 13 (Protection Against Child Exploitation & Neglect)',
      'Data Protection Act, 2012 (Act 843) § 20 (Special Sensitive Personal Data Protection)'
    );
    immediateActions.push(
      'Dispatch DOVVSU specialized social welfare and protective officer',
      'Issue Emergency Protection Order and secure emergency shelter referral',
      'Coordinate immediate medical evaluation and form medical report certificate'
    );
    keyRiskFactors.push('Imminent risk of continued violence', 'Minor children present at scene', 'Victim trauma & intimidation');
  } else if (incident.category === 'TRAFFIC_RECKLESS' || combined.includes('traffic') || combined.includes('hit and run') || combined.includes('accident') || combined.includes('speeding')) {
    recommendedAgency = 'MTTD';
    assessedSeverity = 'MEDIUM';
    confidenceScore = 92;
    threatSummary = 'Active traffic hazard, reckless driving, or arterial collision obstructing highway flow.';
    statutoryViolations.push(
      'Road Traffic Act, 2004 (Act 683) § 1 (Careless and Inconsiderate Driving)',
      'Road Traffic Regulations, 2012 (L.I. 2180) (Failure to Report Road Traffic Accident)'
    );
    immediateActions.push(
      'Dispatch MTTD motorcycle outriders for traffic diversion and clearance',
      'Cross-reference vehicle registration plate in DVLA National Registry',
      'Deploy tow recovery truck to restore multi-lane corridor transit'
    );
    keyRiskFactors.push('Secondary collision hazard', 'Gridlock on N1/N6 highway', 'Hit-and-run driver evasion');
  } else {
    recommendedAgency = incident.assignedAgency || 'GPS_CID';
    assessedSeverity = incident.severity || 'MEDIUM';
    confidenceScore = 90;
    threatSummary = `Civic incident requiring administrative agency verification: ${incident.title}.`;
    statutoryViolations.push(
      'Local Governance Act, 2016 (Act 936) (Civic Order and Public Safety)',
      'Electronic Transactions Act, 2008 (Act 772) (Digital Integrity & Record Sealing)'
    );
    immediateActions.push(
      'Conduct initial remote verification of citizen photographic submission',
      'Route notification to respective District Assembly Field Officer',
      'Issue case resolution acknowledgement to citizen app session'
    );
    keyRiskFactors.push('Unverified community hazard', 'Public disruption');
  }

  return {
    recommendedAgency,
    assessedSeverity,
    confidenceScore,
    threatSummary,
    immediateActions,
    keyRiskFactors,
    statutoryViolations,
    localDialectContext: combined.includes('obaa') || combined.includes('kofi') || combined.includes('chale') ? 'Akan/Ga colloquial terms detected and translated.' : undefined,
    isHighPriorityAlert
  };
}

/**
 * Generates an executive Police Case Brief dossier for senior investigators and court tender
 */
export async function generatePoliceCaseBrief(
  incident: IncidentReport
): Promise<PoliceCaseBrief> {
  const triage = await performAiTriageAnalysis(incident);
  const media = incident.media || [];
  const media0 = media[0];
  const rawHash = String(media0?.sha256Checksum || media0?.sha256Hash || '');
  const deviceHash = /^[a-f0-9]{64}$/i.test(rawHash) ? rawHash.toLowerCase() : null;

  // Calculate nearest station
  let closestStation = GHANA_COMMAND_STATIONS[0];
  let minDistance = 0;
  const hasCoords = Boolean(incident.coordinates && typeof incident.coordinates[0] === 'number' && typeof incident.coordinates[1] === 'number');

  if (hasCoords && incident.coordinates) {
    let minD = Infinity;
    for (const st of GHANA_COMMAND_STATIONS) {
      const dist = calculateHaversineDistanceKm(
        st.coordinates[0],
        st.coordinates[1],
        incident.coordinates[0],
        incident.coordinates[1]
      );
      if (dist < minD) {
        minD = dist;
        closestStation = st;
      }
    }
    minDistance = minD;
  }

  const estimatedEta = hasCoords ? Math.max(3, Math.round((minDistance * 1.25 / 65) * 60)) : 15;
  const dateStr = new Date(incident.createdAt).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  return {
    dossierNumber: `SUMMARY-${incident.trackingCode.replace(/[^0-9A-Z]/gi, '')}`,
    generatedAt: `${dateStr} • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC`,
    incidentTrackingCode: incident.trackingCode,
    title: incident.title,
    executiveSummary: `Report received on ${dateStr} through the CitizenAlert app. ${triage.threatSummary} Keyword rules suggest ${triage.recommendedAgency} with severity ${triage.assessedSeverity}; an officer must confirm both.`,
    legalFramework: triage.statutoryViolations,
    geospatialAssessment: {
      ghanaPostCode: '',
      locationName: incident.locationName || 'Location pending',
      coordinates: hasCoords && incident.coordinates ? `${incident.coordinates[0].toFixed(5)}° N, ${incident.coordinates[1].toFixed(5)}° W` : 'Coordinates unavailable',
      tacticalSector: `${incident.region || 'National'} Regional Operational Command Zone`,
      closestStationName: closestStation.name,
      estimatedEtaMinutes: estimatedEta
    },
    forensicEvidenceAudit: {
      evidenceCount: media.length,
      sha256Seal: deviceHash || (media.length ? 'Not recorded' : 'No evidence file'),
      tamperProofStatus: deviceHash ? 'DEVICE_HASH_RECORDED_NOT_INDEPENDENTLY_VERIFIED' : (media.length ? 'NO_HASH_RECORDED' : 'NO_EVIDENCE'),
      chainOfCustodySummary: deviceHash
        ? "The reporter's phone recorded a SHA-256 hash of the file at capture. Re-hashing the stored file and comparing shows whether it changed; this has not been done automatically. Timestamps and GPS come from the phone and are not independently verified."
        : 'No device hash is available, so file integrity cannot be checked. Timestamps and GPS come from the phone and are not independently verified.',
      deepfakeAuditScore: typeof media0?.deepfakeScore === 'number' ? media0.deepfakeScore : null
    },
    suspectAndVehicleIntelligence: incident.description.length > 30 
      ? `From the reporter's description: "${incident.description}". Not checked against any police database.`
      : 'The report contains no detailed suspect or vehicle description.',
    investigativeChecklist: [
      'Dispatch field detective team to scene coordinates with mobile CAD terminal',
      'Verify GhanaPost GPS boundary and interview potential eyewitnesses in 500m radius',
      'Extract nearby commercial/traffic CCTV footage within the incident timestamp window',
      'Prepare certified Evidence Package under Section 7 of the Electronic Transactions Act (Act 772)',
      'Submit preliminary investigation dossier to Divisional Station Commander for court filing'
    ],
    commandActionDirectives: triage.immediateActions
  };
}
