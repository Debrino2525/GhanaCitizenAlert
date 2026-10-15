/**
 * Ghana Administrative Region Resolver
 * Maps geographical WGS84 GPS coordinates (latitude, longitude)
 * into official Ghanaian administrative regions.
 * 
 * Note: Formula-based Digital Address generation has been removed.
 */

export interface GhanaRegionInfo {
  code: string;
  name: string;
}

/**
 * Maps GPS coordinates and/or reverse geocoded names to official Ghana region names.
 */
export function getGhanaRegionCode(lat: number | null, lng: number | null, regionName?: string): GhanaRegionInfo {
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

  if (lat === null || lng === null || (lat === 0 && lng === 0)) {
    return { code: 'UNKNOWN', name: 'UNKNOWN' };
  }

  // Geographical bounding boxes for Ghana's administrative boundaries
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

  return { code: 'UNKNOWN', name: 'UNKNOWN' };
}
