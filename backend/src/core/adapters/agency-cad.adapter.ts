export interface IncidentCADDispatchPayload {
  trackingCode: string;
  agency: 'GPS_CID' | 'DOVVSU' | 'EPA' | 'MTTD' | 'NADMO' | 'AMA' | 'KMA';
  category: string;
  severity: string;
  locationName: string;
  ghanaPostCode: string;
  latitude: number;
  longitude: number;
  evidenceMediaCount: number;
}

export interface IAgencyDispatchCADAdapter {
  dispatchToCAD(payload: IncidentCADDispatchPayload): Promise<{ cadIncidentNumber: string; assignedUnit?: string; isMocked: boolean }>;
}

export class MockAgencyDispatchCADAdapter implements IAgencyDispatchCADAdapter {
  async dispatchToCAD(payload: IncidentCADDispatchPayload): Promise<{ cadIncidentNumber: string; assignedUnit?: string; isMocked: boolean }> {
    return {
      cadIncidentNumber: `CAD-${payload.agency}-${Date.now().toString().slice(-6)}`,
      assignedUnit: payload.agency === 'GPS_CID' ? 'Patrol Unit Delta-4' : 'Unit Echo-1',
      isMocked: true
    };
  }
}
