export interface CellBroadcastPayload {
  alertId: string;
  severity: 'AMBER' | 'RED' | 'CIVIL_DISASTER';
  headline: string;
  body: string;
  centerLatitude: number;
  centerLongitude: number;
  radiusKm: number;
}

export interface ICellBroadcastAdapter {
  transmitNationalAlert(payload: CellBroadcastPayload): Promise<{ broadcastId: string; towersTargeted: number; isMocked: boolean }>;
  cancelBroadcast(broadcastId: string, reason: string): Promise<{ success: boolean; isMocked: boolean }>;
}

export class MockCellBroadcastAdapter implements ICellBroadcastAdapter {
  async transmitNationalAlert(payload: CellBroadcastPayload): Promise<{ broadcastId: string; towersTargeted: number; isMocked: boolean }> {
    return {
      broadcastId: `CB-GH-${Date.now()}`,
      towersTargeted: Math.max(12, Math.round(payload.radiusKm * 4.5)),
      isMocked: true
    };
  }

  async cancelBroadcast(broadcastId: string, reason: string): Promise<{ success: boolean; isMocked: boolean }> {
    return {
      success: true,
      isMocked: true
    };
  }
}
