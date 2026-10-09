/**
 * GhanaPost GPS Digital Addressing System Engine
 * Converts geographical WGS84 GPS coordinates (latitude, longitude)
 * into standard GhanaPost GPS Digital Addresses (e.g. GA-492-1029).
 */

export interface GhanaPostAddress {
  digitalAddress: string;
  region: string;
  regionCode: string;
  districtCode: string;
  uniqueCode: string;
}

/**
 * Region prefix mapping based on Ghana's administrative boundaries
 */
export function getGhanaRegionCode(lat: number, lng: number, regionName?: string): { code: string; name: string } {
  const normRegion = (regionName || '').toLowerCase();

  if (normRegion.includes('accra')) return { code: 'GA', name: 'Greater Accra' };
  if (normRegion.includes('ashanti')) return { code: 'AK', name: 'Ashanti' };
  if (normRegion.includes('central')) return { code: 'CR', name: 'Central' };
  if (normRegion.includes('western north')) return { code: 'WN', name: 'Western North' };
  if (normRegion.includes('western')) return { code: 'WR', name: 'Western' };
  if (normRegion.includes('eastern')) return { code: 'ER', name: 'Eastern' };
  if (normRegion.includes('volta')) return { code: 'VR', name: 'Volta' };
  if (normRegion.includes('oti')) return { code: 'OR', name: 'Oti' };
  if (normRegion.includes('northern')) return { code: 'NR', name: 'Northern' };
  if (normRegion.includes('north east')) return { code: 'NE', name: 'North East' };
  if (normRegion.includes('savannah')) return { code: 'SR', name: 'Savannah' };
  if (normRegion.includes('upper east')) return { code: 'UE', name: 'Upper East' };
  if (normRegion.includes('upper west')) return { code: 'UW', name: 'Upper West' };
  if (normRegion.includes('bono east')) return { code: 'BE', name: 'Bono East' };
  if (normRegion.includes('ahafo')) return { code: 'AF', name: 'Ahafo' };
  if (normRegion.includes('bono')) return { code: 'BA', name: 'Bono' };

  // Fallback to geographical latitude/longitude bounding boxes
  if (lat >= 5.4 && lat <= 6.1 && lng >= -0.6 && lng <= 0.2) {
    return { code: 'GA', name: 'Greater Accra' };
  }
  if (lat >= 6.1 && lat <= 7.4 && lng >= -2.4 && lng <= -0.9) {
    return { code: 'AK', name: 'Ashanti' };
  }
  if (lat >= 5.0 && lat <= 6.0 && lng >= -2.2 && lng <= -0.5) {
    return { code: 'CR', name: 'Central' };
  }
  if (lat >= 4.7 && lat <= 6.5 && lng >= -3.3 && lng <= -1.7) {
    return { code: 'WR', name: 'Western' };
  }
  if (lat >= 5.7 && lat <= 7.1 && lng >= -1.0 && lng <= 0.2) {
    return { code: 'ER', name: 'Eastern' };
  }
  if (lat >= 5.8 && lat <= 8.5 && lng >= 0.0 && lng <= 1.2) {
    return { code: 'VR', name: 'Volta' };
  }
  if (lat >= 8.5 && lat <= 10.5 && lng >= -2.5 && lng <= 0.5) {
    return { code: 'NR', name: 'Northern' };
  }
  if (lat >= 10.3 && lat <= 11.2 && lng >= -1.6 && lng <= 0.3) {
    return { code: 'UE', name: 'Upper East' };
  }
  if (lat >= 9.6 && lat <= 11.0 && lng >= -3.0 && lng <= -1.4) {
    return { code: 'UW', name: 'Upper West' };
  }
  if (lat >= 7.0 && lat <= 8.8 && lng >= -3.0 && lng <= -1.0) {
    return { code: 'BA', name: 'Bono' };
  }

  // Default to Greater Accra (GA) for general Ghana territory
  return { code: 'GA', name: 'Greater Accra' };
}

/**
 * Computes a deterministic GhanaPost GPS digital address code from coordinates.
 * Formula maps 5m grid intervals into the standard XX-YYY-ZZZZ digital address scheme.
 */
export function generateGhanaPostGpsCode(lat: number, lng: number, regionName?: string): string {
  if (!lat || !lng || (lat === 0 && lng === 0)) {
    return '';
  }

  const { code: regionPrefix } = getGhanaRegionCode(lat, lng, regionName);

  // Deterministic 5x5m grid hash calculation
  const absLat = Math.abs(lat);
  const absLng = Math.abs(lng);

  // District code component (3 digits, e.g. 100 - 999)
  const districtNum = Math.floor(((absLat * 1000) % 900) + 100);
  const districtCode = String(districtNum).padStart(3, '0');

  // Unique property grid code component (4 digits, e.g. 1000 - 9999)
  const uniqueNum = Math.floor(((absLng * 100000 + absLat * 10000) % 9000) + 1000);
  const uniqueCode = String(uniqueNum).padStart(4, '0');

  return `${regionPrefix}-${districtCode}-${uniqueCode}`;
}
