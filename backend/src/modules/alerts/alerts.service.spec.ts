import { EmergencyAlertsService } from './alerts.service';
import { MockCellBroadcastAdapter } from '../../core/adapters/cell-broadcast.adapter';
import { MockSMSUSSDGatewayAdapter } from '../../core/adapters/sms-ussd-gateway.adapter';
import { MockGhanaPostGPSAdapter } from '../../core/adapters/ghanapost-gps.adapter';

describe('EmergencyAlertsService', () => {
  let service: EmergencyAlertsService;
  let cellBroadcastAdapter: MockCellBroadcastAdapter;
  let smsAdapter: MockSMSUSSDGatewayAdapter;
  let ghanaPostAdapter: MockGhanaPostGPSAdapter;

  beforeEach(() => {
    cellBroadcastAdapter = new MockCellBroadcastAdapter();
    smsAdapter = new MockSMSUSSDGatewayAdapter();
    ghanaPostAdapter = new MockGhanaPostGPSAdapter();

    service = new EmergencyAlertsService(
      cellBroadcastAdapter,
      smsAdapter,
      ghanaPostAdapter
    );
  });

  it('should enforce Two-Man Commander rule: draft alert cannot broadcast without commander authorization', async () => {
    // Step 1: Requesting Officer requests Amber Alert
    const draftAlert = await service.requestAlert({
      alertType: 'AMBER',
      title: 'AMBER ALERT: Missing 7-Year-Old Boy in Madina',
      subjectName: 'Emmanuel Kwabena Boateng',
      subjectAge: 7,
      subjectPhotoUrl: 'https://s3.safety.gov.gh/missing/emmanuel.jpg',
      lastSeenLocation: 'Madina Market Complex',
      ghanaPostCode: 'GM-014-9923',
      radiusKm: 35,
      details: 'Last seen near Zongo junction in yellow school uniform',
      requestingOfficerId: 'OFFICER-INSPECTOR-8841'
    });

    expect(draftAlert.status).toBe('DRAFT_PENDING_AUTHORIZATION');

    // Step 2: Prevent self-approval (Four-Eyes policy violation)
    await expect(
      service.authorizeAlert(draftAlert.id, 'OFFICER-INSPECTOR-8841', '123456')
    ).rejects.toThrow('Four-Eyes Policy Violation');

    // Step 3: Approving Commander authorizes alert with valid MFA
    const activeAlert = await service.authorizeAlert(
      draftAlert.id,
      'COMMANDER-SUPT-0019',
      '994821'
    );

    expect(activeAlert.status).toBe('ACTIVE_BROADCASTING');
    expect(activeAlert.approvingCommanderId).toBe('COMMANDER-SUPT-0019');
    expect(activeAlert.cellBroadcastId).toBeDefined();

    // Verify active alert query
    const activeList = await service.getActiveAlerts();
    expect(activeList.length).toBe(1);
  });

  it('should aggregate citizen sighting tips with GhanaPost GPS coordinates', async () => {
    const draftAlert = await service.requestAlert({
      alertType: 'RED',
      title: 'RED ALERT: Escaped Dangerous Suspect',
      subjectName: 'Ibrahim Tanko',
      subjectPhotoUrl: 'https://s3.safety.gov.gh/wanted/tanko.jpg',
      lastSeenLocation: 'Circle Interchange',
      ghanaPostCode: 'GA-089-1120',
      radiusKm: 20,
      details: 'Armed and dangerous fugitive',
      requestingOfficerId: 'OFFICER-001'
    });

    await service.authorizeAlert(draftAlert.id, 'COMMANDER-002', '654321');

    const tip = await service.submitSightingTip({
      alertId: draftAlert.id,
      ghanaPostCode: 'GD-003-8812',
      locationName: 'Adenta Barrier Shell station',
      comment: 'Spotted individual entering commercial bus towards Dodowa',
      reporterPhone: '+233 24 990 1122'
    });

    expect(tip.ghanaPostCode).toBe('GD-003-8812');
    expect(tip.latitude).toBeCloseTo(5.7142, 1);

    const sightings = await service.getSightingsForAlert(draftAlert.id);
    expect(sightings.length).toBe(1);
    expect(sightings[0].locationName).toContain('Adenta Barrier');
    expect(sightings[0].comment).toContain('commercial bus towards Dodowa');
  });

  it('should allow commander to issue emergency false alarm retraction', async () => {
    const alert = await service.requestAlert({
      alertType: 'RED',
      title: 'False Alarm Test',
      subjectPhotoUrl: 'https://s3.safety.gov.gh/test.jpg',
      lastSeenLocation: 'Test Location',
      ghanaPostCode: 'GA-112-4091',
      radiusKm: 10,
      details: 'Test details',
      requestingOfficerId: 'OFFICER-001'
    });

    await service.authorizeAlert(alert.id, 'COMMANDER-002', '123456');

    const retracted = await service.retractFalseAlarm(
      alert.id,
      'COMMANDER-002',
      'Target suspect identity misreported; threat cleared'
    );

    expect(retracted.status).toBe('RETRACTED_FALSE_ALARM');
    const active = await service.getActiveAlerts();
    expect(active.length).toBe(0);
  });
});
