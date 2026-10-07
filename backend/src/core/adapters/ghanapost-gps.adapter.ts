export interface GhanaPostResolution {
  postcode: string;
  region: 'Greater Accra' | 'Ashanti' | 'Western' | 'Eastern' | 'Central' | 'Northern' | 'Volta' | 'Upper East' | 'Upper West' | 'Bono' | 'Ahafo';
  district: string;
  areaName: string;
  latitude: number;
  longitude: number;
  isMocked: boolean;
}

export interface IGhanaPostGPSAdapter {
  resolveAddress(code: string): Promise<GhanaPostResolution>;
  validateFormat(code: string): boolean;
}

export class MockGhanaPostGPSAdapter implements IGhanaPostGPSAdapter {
  private readonly regionMap: Record<string, { region: any; district: string; area: string; baseLat: number; baseLng: number }> = {
    'GA': { region: 'Greater Accra', district: 'Accra Metropolitan', area: 'Accra Central / High Street', baseLat: 5.6037, baseLng: -0.1870 },
    'GM': { region: 'Greater Accra', district: 'La-Nkwantanang-Madina', area: 'Madina / Zongo Junction', baseLat: 5.6811, baseLng: -0.1652 },
    'GD': { region: 'Greater Accra', district: 'Adentan Municipal', area: 'Adentan / Frafraha', baseLat: 5.7142, baseLng: -0.1588 },
    'GW': { region: 'Greater Accra', district: 'Ga West Municipal', area: 'Amasaman / Pokuase', baseLat: 5.5600, baseLng: -0.2800 },
    'AK': { region: 'Ashanti', district: 'Kumasi Metropolitan', area: 'Bantama / Adum / Kejetia', baseLat: 6.6885, baseLng: -1.6244 },
    'AH': { region: 'Ashanti', district: 'Asokwa Municipal', area: 'Asokwa / Oforikrom', baseLat: 6.6500, baseLng: -1.6000 },
    'WS': { region: 'Western', district: 'Sekondi-Takoradi Metro', area: 'Takoradi Market Circle', baseLat: 4.9016, baseLng: -1.7831 },
    'CR': { region: 'Central', district: 'Cape Coast Metropolitan', area: 'Cape Coast / Dunkwa-on-Offin', baseLat: 5.1053, baseLng: -1.2466 },
    'ER': { region: 'Eastern', district: 'New Juaben South', area: 'Koforidua Central', baseLat: 6.0945, baseLng: -0.2591 },
    'NR': { region: 'Northern', district: 'Tamale Metropolitan', area: 'Tamale Central / Aboabo', baseLat: 9.4008, baseLng: -0.8393 },
    'VR': { region: 'Volta', district: 'Ho Municipal', area: 'Ho Central / Bankoe', baseLat: 6.6101, baseLng: 0.4785 }
  };

  validateFormat(code: string): boolean {
    if (!code) return false;
    const regex = /^[A-Z]{2}-\d{3,4}-\d{4}$/i;
    return regex.test(code.trim().toUpperCase());
  }

  async resolveAddress(code: string): Promise<GhanaPostResolution> {
    const normalized = code.trim().toUpperCase();
    if (!this.validateFormat(normalized)) {
      throw new Error(`Invalid GhanaPost GPS format: "${code}". Expected format: AA-000-0000`);
    }

    const prefix = normalized.substring(0, 2);
    const info = this.regionMap[prefix] || {
      region: 'Greater Accra',
      district: 'Greater Accra District',
      area: 'Accra Metropolitan Area',
      baseLat: 5.6037,
      baseLng: -0.1870
    };

    // Calculate deterministic spatial offset based on numerical digits
    const digits = normalized.replace(/[^0-9]/g, '');
    const numVal = parseInt(digits.substring(0, 4) || '1000', 10);
    const latOffset = ((numVal % 100) - 50) * 0.0002;
    const lngOffset = (((numVal * 7) % 100) - 50) * 0.0002;

    return {
      postcode: normalized,
      region: info.region,
      district: info.district,
      areaName: info.area,
      latitude: Number((info.baseLat + latOffset).toFixed(6)),
      longitude: Number((info.baseLng + lngOffset).toFixed(6)),
      isMocked: true
    };
  }
}
