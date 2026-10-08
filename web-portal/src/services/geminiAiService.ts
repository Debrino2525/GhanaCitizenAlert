/**
 * AI Service Module
 * Note: Under security lockdown policies, all external AI/Gemini endpoints are disabled.
 * Returns static unavailable indicators with zero network requests and zero secrets.
 */

import { IncidentReport, AgencyType, SeverityLevel } from '../types';

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
  };
  forensicEvidenceAudit: {
    evidenceCount: number;
    sha256Seal: string;
    tamperProofStatus: string;
    chainOfCustodySummary: string;
  };
  suspectAndVehicleIntelligence: string;
  investigativeChecklist: string[];
  commandActionDirectives: string[];
}

export async function performAiTriageAnalysis(
  _incident: IncidentReport
): Promise<AiTriageResult | null> {
  // No network requests or canned text
  return null;
}

export async function generatePoliceCaseBrief(
  _incident: IncidentReport
): Promise<PoliceCaseBrief | null> {
  // No network requests or canned text
  return null;
}
