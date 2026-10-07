import { IncidentCategory, AgencyCode, SeverityLevel } from '../../core/entities/incident.entity';

export interface TriageEvaluationResult {
  assignedAgency: AgencyCode;
  secondaryAgencies: AgencyCode[];
  severity: SeverityLevel;
  isPublicEligible: boolean;
  requiresImmediateSupervisoryReview: boolean;
  routingReason: string;
}

export class TriageRoutingService {
  /**
   * Evaluates category, text markers, and location to route to the appropriate agency
   */
  evaluateIncident(
    category: IncidentCategory,
    title: string,
    description: string,
    region: string
  ): TriageEvaluationResult {
    const textCorpus = `${title} ${description}`.toLowerCase();

    // 1. HARDCODED SAFETY RULE: Domestic Violence / Child Abuse -> DOVVSU (NEVER Public)
    if (category === 'DOMESTIC_ABUSE' || textCorpus.includes('domestic') || textCorpus.includes('child abuse') || textCorpus.includes('defilement')) {
      return {
        assignedAgency: 'DOVVSU',
        secondaryAgencies: ['GPS_CID'],
        severity: 'HIGH',
        isPublicEligible: false,
        requiresImmediateSupervisoryReview: true,
        routingReason: 'Routed to DOVVSU with strict privacy block under Ghana Child Rights & Domestic Violence Acts.'
      };
    }

    // 2. Armed Crimes / Robbery / Murder -> Ghana Police CID
    if (category === 'CRIMINAL_OFFENSE') {
      const isArmedOrViolent = textCorpus.includes('gun') || textCorpus.includes('pistol') || textCorpus.includes('machete') || textCorpus.includes('robbery') || textCorpus.includes('armed');
      return {
        assignedAgency: 'GPS_CID',
        secondaryAgencies: [],
        severity: isArmedOrViolent ? 'RED' : 'HIGH',
        isPublicEligible: false, // Private by default to prevent vigilantism
        requiresImmediateSupervisoryReview: isArmedOrViolent,
        routingReason: 'Routed to Ghana Police Service / CID Operations.'
      };
    }

    // 3. Galamsey / Mining / River Pollution -> EPA & Forestry Commission
    if (category === 'GALAMSEY_ENVIRONMENTAL' || textCorpus.includes('galamsey') || textCorpus.includes('excavator') || textCorpus.includes('cyanide') || textCorpus.includes('river')) {
      return {
        assignedAgency: 'EPA',
        secondaryAgencies: ['FORESTRY_COMM', 'GPS_CID'],
        severity: 'HIGH',
        isPublicEligible: true, // Environmental awareness permitted
        requiresImmediateSupervisoryReview: false,
        routingReason: 'Routed to Environmental Protection Agency joint taskforce.'
      };
    }

    // 4. Traffic / Reckless Driving -> MTTD & DVLA
    if (category === 'TRAFFIC_RECKLESS' || textCorpus.includes('highway') || textCorpus.includes('accident') || textCorpus.includes('wrong way')) {
      return {
        assignedAgency: 'MTTD',
        secondaryAgencies: ['GPS_CID'],
        severity: 'MEDIUM',
        isPublicEligible: true,
        requiresImmediateSupervisoryReview: false,
        routingReason: 'Routed to Motor Traffic & Transport Directorate (MTTD).'
      };
    }

    // 5. Sanitation / Illegal Structures -> Municipal Assemblies (AMA, KMA, etc.)
    if (category === 'SANITATION_ZONING') {
      const isAshanti = region === 'Ashanti';
      return {
        assignedAgency: isAshanti ? 'KMA' : 'AMA',
        secondaryAgencies: ['EPA'],
        severity: 'LOW',
        isPublicEligible: true,
        requiresImmediateSupervisoryReview: false,
        routingReason: `Routed to ${isAshanti ? 'Kumasi' : 'Accra'} Metropolitan Assembly Sanitation Directorate.`
      };
    }

    // Default fallback
    return {
      assignedAgency: 'GPS_CID',
      secondaryAgencies: [],
      severity: 'MEDIUM',
      isPublicEligible: false,
      requiresImmediateSupervisoryReview: false,
      routingReason: 'General civic incident routed to Police Command Triage.'
    };
  }
}
