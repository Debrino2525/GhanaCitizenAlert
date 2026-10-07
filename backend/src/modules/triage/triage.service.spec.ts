import { TriageRoutingService } from './triage.service';

describe('TriageRoutingService', () => {
  let service: TriageRoutingService;

  beforeEach(() => {
    service = new TriageRoutingService();
  });

  it('should route domestic abuse to DOVVSU with strict privacy block (NEVER public)', () => {
    const result = service.evaluateIncident(
      'DOMESTIC_ABUSE',
      'Child physical endangerment in rental quarters',
      'Witnessed physical harm on minor',
      'Ashanti'
    );

    expect(result.assignedAgency).toBe('DOVVSU');
    expect(result.isPublicEligible).toBe(false);
    expect(result.requiresImmediateSupervisoryReview).toBe(true);
    expect(result.severity).toBe('HIGH');
  });

  it('should route armed crimes to GPS CID with high priority', () => {
    const result = service.evaluateIncident(
      'CRIMINAL_OFFENSE',
      'Armed robbery attempt on Boundary Road',
      'Masked men with pistol and machete',
      'Greater Accra'
    );

    expect(result.assignedAgency).toBe('GPS_CID');
    expect(result.severity).toBe('RED');
    expect(result.isPublicEligible).toBe(false); // Private-first
  });

  it('should route galamsey and river pollution to EPA with public eligibility', () => {
    const result = service.evaluateIncident(
      'GALAMSEY_ENVIRONMENTAL',
      'Illegal galamsey excavators in Offin River',
      'Heavy turbidity and chemical discharge',
      'Central'
    );

    expect(result.assignedAgency).toBe('EPA');
    expect(result.secondaryAgencies).toContain('FORESTRY_COMM');
    expect(result.isPublicEligible).toBe(true);
  });

  it('should route traffic offenses to MTTD', () => {
    const result = service.evaluateIncident(
      'TRAFFIC_RECKLESS',
      'Dangerous wrong way driving on motorway',
      'Truck driving against traffic near Spanner junction',
      'Greater Accra'
    );

    expect(result.assignedAgency).toBe('MTTD');
    expect(result.severity).toBe('MEDIUM');
    expect(result.isPublicEligible).toBe(true);
  });
});
