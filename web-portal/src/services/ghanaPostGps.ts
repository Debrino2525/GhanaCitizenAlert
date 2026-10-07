interface GhanaPostLocation {
  districtCode: string;
  postcode: string;
  region: string;
  areaName: string;
  lat: number;
  lng: number;
}

const REGION_PREFIX_MAP: Record<string, { region: string; baseLat: number; baseLng: number }> = {
  'GA': { region: 'Greater Accra', baseLat: 5.6037, baseLng: -0.1870 },
  'GM': { region: 'Greater Accra', baseLat: 5.6811, baseLng: -0.1652 },
  'GD': { region: 'Greater Accra', baseLat: 5.7142, baseLng: -0.1588 },
  'GW': { region: 'Greater Accra', baseLat: 5.5600, baseLng: -0.2800 },
  'AK': { region: 'Ashanti', baseLat: 6.6885, baseLng: -1.6244 },
  'AH': { region: 'Ashanti', baseLat: 6.6500, baseLng: -1.6000 },
  'WS': { region: 'Western', baseLat: 4.9016, baseLng: -1.7831 },
  'CR': { region: 'Central', baseLat: 5.1053, baseLng: -1.2466 },
  'ER': { region: 'Eastern', baseLat: 6.0945, baseLng: -0.2591 },
  'NR': { region: 'Northern', baseLat: 9.4008, baseLng: -0.8393 },
  'VR': { region: 'Volta', baseLat: 6.6101, baseLng: 0.4785 }
};

export function validateGhanaPostGps(code: string): boolean {
  const regex = /^[A-Z]{2}-\d{3,4}-\d{4}$/i;
  return regex.test(code.trim().toUpperCase());
}

export function resolveGhanaPostGps(code: string): GhanaPostLocation {
  const normalized = code.trim().toUpperCase();
  const prefix = normalized.substring(0, 2);
  const info = REGION_PREFIX_MAP[prefix] || { region: 'Greater Accra', baseLat: 5.6037, baseLng: -0.1870 };

  const digits = normalized.replace(/[^0-9]/g, '');
  const numVal = parseInt(digits.substring(0, 4) || '1000', 10);
  const latOffset = ((numVal % 100) - 50) * 0.0002;
  const lngOffset = (((numVal * 7) % 100) - 50) * 0.0002;

  return {
    districtCode: prefix,
    postcode: normalized,
    region: info.region,
    areaName: getAreaNameByPrefix(prefix),
    lat: Number((info.baseLat + latOffset).toFixed(6)),
    lng: Number((info.baseLng + lngOffset).toFixed(6))
  };
}

function getAreaNameByPrefix(prefix: string): string {
  switch (prefix) {
    case 'GA': return 'Accra Metropolitan (Central)';
    case 'GM': return 'Madina-Adenta Municipal';
    case 'GD': return 'Adentan / Dodowa Corridor';
    case 'GW': return 'Ga West / Amasaman';
    case 'AK': return 'Kumasi Metropolitan (Bantama / Adum)';
    case 'AH': return 'Asokwa / Oforikrom';
    case 'WS': return 'Sekondi-Takoradi Metropolitan';
    case 'CR': return 'Cape Coast / Dunkwa-on-Offin';
    case 'ER': return 'Koforidua / Akuapem';
    case 'NR': return 'Tamale Metropolitan';
    case 'VR': return 'Ho / Volta Basin';
    default: return 'Greater Accra District';
  }
}
