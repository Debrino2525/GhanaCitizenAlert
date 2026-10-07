import * as crypto from 'crypto';
import { ICellBroadcastAdapter } from '../../core/adapters/cell-broadcast.adapter';
import { ISMSUSSDGatewayAdapter } from '../../core/adapters/sms-ussd-gateway.adapter';
import { IGhanaPostGPSAdapter } from '../../core/adapters/ghanapost-gps.adapter';

export type AlertType = 'AMBER' | 'RED' | 'CIVIL_DISASTER';
export type AlertState = 
  | 'DRAFT_PENDING_AUTHORIZATION'
  | 'BROADCAST_AUTHORIZED'
  | 'ACTIVE_BROADCASTING'
  | 'RESOLVED'
  | 'RETRACTED_FALSE_ALARM'
  | 'EXPIRED';

export interface AlertEntity {
  id: string;
  alertType: AlertType;
  title: string;
  subjectName?: string;
  subjectAge?: number;
  subjectPhotoUrl: string;
  lastSeenLocation: string;
  ghanaPostCode: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  details: string;
  suspectDetails?: string;
  vehicleDetails?: string;
  status: AlertState;
  requestingOfficerId: string;
  approvingCommanderId?: string;
  authorizedAt?: string;
  activeUntil: string;
  createdAt: string;
  sightingsCount: number;
  cellBroadcastId?: string;
}

export interface SightingTipEntity {
  id: string;
  alertId: string;
  ghanaPostCode: string;
  locationName: string;
  latitude: number;
  longitude: number;
  comment: string;
  reporterPhone?: string;
  photoUrl?: string;
  isVerified: boolean;
  createdAt: string;
}

export class EmergencyAlertsService {
  private alerts: Map<string, AlertEntity> = new Map();
  private sightings: Map<string, SightingTipEntity> = new Map();

  constructor(
    private readonly cellBroadcastAdapter: ICellBroadcastAdapter,
    private readonly smsAdapter: ISMSUSSDGatewayAdapter,
    private readonly ghanaPostAdapter: IGhanaPostGPSAdapter
  ) {}

  async requestAlert(input: {
    alertType: AlertType;
    title: string;
    subjectName?: string;
    subjectAge?: number;
    subjectPhotoUrl: string;
    lastSeenLocation: string;
    ghanaPostCode: string;
    radiusKm: number;
    details: string;
    suspectDetails?: string;
    vehicleDetails?: string;
    requestingOfficerId: string;
    ttlHours?: number;
  }): Promise<AlertEntity> {
    const geo = await this.ghanaPostAdapter.resolveAddress(input.ghanaPostCode);
    const id = crypto.randomUUID();
    const now = new Date();
    const ttl = input.ttlHours || 48;
    const activeUntil = new Date(now.getTime() + ttl * 3600 * 1000).toISOString();

    const alert: AlertEntity = {
      id,
      alertType: input.alertType,
      title: input.title,
      subjectName: input.subjectName,
      subjectAge: input.subjectAge,
      subjectPhotoUrl: input.subjectPhotoUrl,
      lastSeenLocation: input.lastSeenLocation,
      ghanaPostCode: geo.postcode,
      latitude: geo.latitude,
      longitude: geo.longitude,
      radiusKm: input.radiusKm,
      details: input.details,
      suspectDetails: input.suspectDetails,
      vehicleDetails: input.vehicleDetails,
      status: 'DRAFT_PENDING_AUTHORIZATION', // Enforces Two-Man Commander Approval
      requestingOfficerId: input.requestingOfficerId,
      activeUntil,
      createdAt: now.toISOString(),
      sightingsCount: 0
    };

    this.alerts.set(id, alert);
    return alert;
  }

  async authorizeAlert(
    alertId: string,
    commanderId: string,
    approverMfaCode: string
  ): Promise<AlertEntity> {
    const alert = this.alerts.get(alertId);
    if (!alert) throw new Error('Alert not found');
    if (alert.status !== 'DRAFT_PENDING_AUTHORIZATION') {
      throw new Error(`Cannot authorize alert in state ${alert.status}`);
    }
    if (!approverMfaCode || approverMfaCode.length < 6) {
      throw new Error('Mandatory Commander MFA token verification failed');
    }

    // Two-Man Check: Approving commander cannot be the same requesting officer
    if (alert.requestingOfficerId === commanderId) {
      throw new Error('Four-Eyes Policy Violation: Approving commander must be distinct from requesting officer');
    }

    alert.approvingCommanderId = commanderId;
    alert.authorizedAt = new Date().toISOString();
    alert.status = 'ACTIVE_BROADCASTING';

    // Dispatch Cell-Broadcast
    const cbResult = await this.cellBroadcastAdapter.transmitNationalAlert({
      alertId: alert.id,
      severity: alert.alertType,
      headline: alert.title,
      body: alert.details,
      centerLatitude: alert.latitude,
      centerLongitude: alert.longitude,
      radiusKm: alert.radiusKm
    });
    alert.cellBroadcastId = cbResult.broadcastId;

    // Dispatch Emergency SMS fallback to towers in radius
    await this.smsAdapter.broadcastEmergencySMS(alert.ghanaPostCode, `${alert.alertType} ALERT: ${alert.title}`);

    this.alerts.set(alertId, alert);
    return alert;
  }

  async retractFalseAlarm(alertId: string, commanderId: string, retractionReason: string): Promise<AlertEntity> {
    const alert = this.alerts.get(alertId);
    if (!alert) throw new Error('Alert not found');

    alert.status = 'RETRACTED_FALSE_ALARM';
    if (alert.cellBroadcastId) {
      await this.cellBroadcastAdapter.cancelBroadcast(alert.cellBroadcastId, retractionReason);
    }

    this.alerts.set(alertId, alert);
    return alert;
  }

  async markResolved(alertId: string): Promise<AlertEntity> {
    const alert = this.alerts.get(alertId);
    if (!alert) throw new Error('Alert not found');

    alert.status = 'RESOLVED';
    if (alert.cellBroadcastId) {
      await this.cellBroadcastAdapter.cancelBroadcast(alert.cellBroadcastId, 'Subject successfully recovered / apprehended');
    }

    this.alerts.set(alertId, alert);
    return alert;
  }

  async submitSightingTip(input: {
    alertId: string;
    ghanaPostCode: string;
    locationName: string;
    comment: string;
    reporterPhone?: string;
    photoUrl?: string;
  }): Promise<SightingTipEntity> {
    const alert = this.alerts.get(input.alertId);
    if (!alert) throw new Error('Target alert not found');

    const geo = await this.ghanaPostAdapter.resolveAddress(input.ghanaPostCode);
    const sightingId = crypto.randomUUID();

    const tip: SightingTipEntity = {
      id: sightingId,
      alertId: input.alertId,
      ghanaPostCode: geo.postcode,
      locationName: input.locationName,
      latitude: geo.latitude,
      longitude: geo.longitude,
      comment: input.comment,
      reporterPhone: input.reporterPhone,
      photoUrl: input.photoUrl,
      isVerified: false,
      createdAt: new Date().toISOString()
    };

    this.sightings.set(sightingId, tip);
    alert.sightingsCount += 1;
    this.alerts.set(input.alertId, alert);

    return tip;
  }

  async getActiveAlerts(): Promise<AlertEntity[]> {
    return Array.from(this.alerts.values()).filter(a => a.status === 'ACTIVE_BROADCASTING');
  }

  async getSightingsForAlert(alertId: string): Promise<SightingTipEntity[]> {
    return Array.from(this.sightings.values()).filter(s => s.alertId === alertId);
  }
}
