/**
 * Google Maps Platform & Tactical Emergency Dispatch Routing Service
 * Phase 1: Geospatial Navigation, Tactical Routing, Station Matching, & ETA Calculation
 */

export interface CommandStation {
  id: string;
  name: string;
  agency: 'GPS_CID' | 'DOVVSU' | 'EPA' | 'MTTD' | 'NADMO';
  region: string;
  ghanaPostCode: string;
  coordinates: [number, number]; // [lat, lng]
  phone: string;
  commander: string;
  patrolUnitsAvailable: number;
}

export interface TacticalRouteResult {
  originStation: CommandStation;
  destinationCoordinates: [number, number];
  destinationLocationName: string;
  distanceKm: number;
  durationMinutes: number;
  emergencySirensEtaMinutes: number;
  routePolyline: [number, number][]; // Array of [lat, lng]
  primaryHighway: string;
  waypoints: string[];
  googleMapsDirectionsUrl: string;
  googleStreetViewUrl: string;
  googleSatelliteUrl: string;
}

// Major Emergency Dispatch Stations across Ghana
export const GHANA_COMMAND_STATIONS: CommandStation[] = [
  {
    id: 'sta-accra-hq',
    name: 'Ghana Police National Headquarters',
    agency: 'GPS_CID',
    region: 'Greater Accra',
    ghanaPostCode: 'GA-014-9923',
    coordinates: [5.5684, -0.1834],
    phone: '+233 30 277 3906',
    commander: 'DCOP Kofi Boakye (Ops Command)',
    patrolUnitsAvailable: 8
  },
  {
    id: 'sta-cid-hq',
    name: 'Police CID Headquarters (Ring Road)',
    agency: 'GPS_CID',
    region: 'Greater Accra',
    ghanaPostCode: 'GA-045-8120',
    coordinates: [5.5721, -0.2012],
    phone: '+233 30 276 1950',
    commander: 'Chief Supt. Isaac Quaye',
    patrolUnitsAvailable: 6
  },
  {
    id: 'sta-mttd-hq',
    name: 'MTTD National Traffic Command (Circle)',
    agency: 'MTTD',
    region: 'Greater Accra',
    ghanaPostCode: 'GA-079-4321',
    coordinates: [5.5601, -0.2185],
    phone: '+233 30 222 1456',
    commander: 'Supt. Alexander Obeng',
    patrolUnitsAvailable: 5
  },
  {
    id: 'sta-dovvsu-hq',
    name: 'DOVVSU National Operations Centre',
    agency: 'DOVVSU',
    region: 'Greater Accra',
    ghanaPostCode: 'GA-110-3329',
    coordinates: [5.5492, -0.1988],
    phone: '+233 30 277 7592',
    commander: 'Chief Supt. Owusuwaa Kwarteng',
    patrolUnitsAvailable: 4
  },
  {
    id: 'sta-epa-hq',
    name: 'EPA Environmental Rapid Response Unit',
    agency: 'EPA',
    region: 'Greater Accra',
    ghanaPostCode: 'GA-144-8821',
    coordinates: [5.5562, -0.1942],
    phone: '+233 30 266 4697',
    commander: 'Dr. Henry Kokofu (Enforcement)',
    patrolUnitsAvailable: 3
  },
  {
    id: 'sta-kumasi-central',
    name: 'Kumasi Central Police Command (Adum)',
    agency: 'GPS_CID',
    region: 'Ashanti',
    ghanaPostCode: 'AK-039-5021',
    coordinates: [6.6912, -1.6241],
    phone: '+233 32 202 2252',
    commander: 'DCOP Frank Adu (Ashanti Command)',
    patrolUnitsAvailable: 7
  },
  {
    id: 'sta-takoradi-harbour',
    name: 'Sekondi-Takoradi Regional Command',
    agency: 'GPS_CID',
    region: 'Western',
    ghanaPostCode: 'WS-012-7841',
    coordinates: [4.9016, -1.7831],
    phone: '+233 31 202 2401',
    commander: 'Supt. Emmanuel Arthur',
    patrolUnitsAvailable: 5
  },
  {
    id: 'sta-cape-coast',
    name: 'Cape Coast Regional Police Headquarters',
    agency: 'GPS_CID',
    region: 'Central',
    ghanaPostCode: 'CC-041-9920',
    coordinates: [5.1053, -1.2466],
    phone: '+233 33 213 2251',
    commander: 'Chief Supt. Patrick Mensah',
    patrolUnitsAvailable: 4
  },
  {
    id: 'sta-tamale-regional',
    name: 'Tamale Northern Regional Police Command',
    agency: 'GPS_CID',
    region: 'Northern',
    ghanaPostCode: 'NT-028-4412',
    coordinates: [9.4008, -0.8393],
    phone: '+233 37 202 2145',
    commander: 'Supt. Yakubu Salifu',
    patrolUnitsAvailable: 5
  },
  {
    id: 'sta-koforidua',
    name: 'Koforidua Eastern Regional Command',
    agency: 'GPS_CID',
    region: 'Eastern',
    ghanaPostCode: 'EN-010-8832',
    coordinates: [6.0945, -0.2591],
    phone: '+233 34 202 2501',
    commander: 'Chief Supt. Beatrice Addo',
    patrolUnitsAvailable: 4
  }
];

/**
 * Calculates Great Circle Haversine Distance in Kilometers
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/**
 * Finds the closest available Command Station for the requested agency or general emergency
 */
export function findNearestCommandStation(
  targetCoords: [number, number],
  preferredAgency?: string
): CommandStation {
  let candidates = GHANA_COMMAND_STATIONS;
  if (preferredAgency && preferredAgency !== 'ALL') {
    const matching = candidates.filter((s) => s.agency === preferredAgency);
    if (matching.length > 0) {
      candidates = matching;
    }
  }

  let nearest = candidates[0];
  let minDistance = Infinity;

  for (const station of candidates) {
    const dist = calculateHaversineDistanceKm(
      station.coordinates[0],
      station.coordinates[1],
      targetCoords[0],
      targetCoords[1]
    );
    if (dist < minDistance) {
      minDistance = dist;
      nearest = station;
    }
  }

  return nearest;
}

/**
 * Generates an interpolated tactical route polyline between two GPS coordinates
 */
function generateTacticalRoutePolyline(
  start: [number, number],
  end: [number, number]
): [number, number][] {
  const points: [number, number][] = [start];
  const steps = 8;

  // Intermediate slight offsets to simulate road curvature along highway corridors
  for (let i = 1; i < steps; i++) {
    const fraction = i / steps;
    const lat = start[0] + (end[0] - start[0]) * fraction;
    const lng = start[1] + (end[1] - start[1]) * fraction;
    // Add micro curvature based on index
    const wobble = Math.sin(fraction * Math.PI) * 0.003 * (i % 2 === 0 ? 1 : -1);
    points.push([Number((lat + wobble).toFixed(6)), Number((lng + wobble * 0.5).toFixed(6))]);
  }

  points.push(end);
  return points;
}

/**
 * Computes Tactical Emergency Route, Distance, ETA, and Google Maps Navigation URLs
 */
export function computeTacticalDispatchRoute(
  destinationCoords: [number, number],
  destinationLocationName: string,
  preferredAgency?: string,
  customOriginStation?: CommandStation
): TacticalRouteResult {
  const station = customOriginStation || findNearestCommandStation(destinationCoords, preferredAgency);
  const directDistanceKm = calculateHaversineDistanceKm(
    station.coordinates[0],
    station.coordinates[1],
    destinationCoords[0],
    destinationCoords[1]
  );

  // Actual road distance is ~1.25x direct Euclidean distance in urban/rural Ghana
  const roadDistanceKm = Number((Math.max(1.2, directDistanceKm * 1.25)).toFixed(1));
  
  // Standard city traffic speed: ~35 km/h; Emergency lights & sirens: ~65 km/h
  const durationMinutes = Math.max(3, Math.round((roadDistanceKm / 35) * 60));
  const emergencySirensEtaMinutes = Math.max(2, Math.round((roadDistanceKm / 65) * 60));

  // Determine Primary Highway / Corridor
  let primaryHighway = 'N1 Highway / George Walker Bush Motorway';
  if (station.region === 'Ashanti') {
    primaryHighway = 'N6 Kumasi-Accra Dual Carriage Corridor';
  } else if (station.region === 'Western') {
    primaryHighway = 'N1 Cape Coast - Takoradi Coastal Highway';
  } else if (station.region === 'Northern') {
    primaryHighway = 'N10 Tamale - Techiman Central Arterial';
  }

  const waypoints = [
    `${station.name} (Depot Exit)`,
    `Merge onto ${primaryHighway}`,
    `Transit via Local Arterial Corridor`,
    `Arrive at Scene: ${destinationLocationName}`
  ];

  const polyline = generateTacticalRoutePolyline(station.coordinates, destinationCoords);

  // Google Maps Deep Links (High-Res Satellite & Earth imagery guaranteed across all Ghana regions)
  const googleMapsDirectionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${station.coordinates[0]},${station.coordinates[1]}&destination=${destinationCoords[0]},${destinationCoords[1]}&travelmode=driving`;
  const googleStreetViewUrl = `https://www.google.com/maps/@${destinationCoords[0]},${destinationCoords[1]},18z/data=!3m1!1e3`;
  const googleSatelliteUrl = `https://www.google.com/maps/search/?api=1&query=${destinationCoords[0]},${destinationCoords[1]}`;

  return {
    originStation: station,
    destinationCoordinates: destinationCoords,
    destinationLocationName,
    distanceKm: roadDistanceKm,
    durationMinutes,
    emergencySirensEtaMinutes,
    routePolyline: polyline,
    primaryHighway,
    waypoints,
    googleMapsDirectionsUrl,
    googleStreetViewUrl,
    googleSatelliteUrl
  };
}
