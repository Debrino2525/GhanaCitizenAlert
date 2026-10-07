import { IncidentReport, EmergencyAlert, SightingTip } from '../types';

export const INITIAL_INCIDENTS: IncidentReport[] = [
  {
    id: 'inc-001',
    trackingCode: 'GH-2026-9812',
    title: 'Armed Daylight Break-in & Armed Robbery Attempt',
    category: 'CRIMINAL_OFFENSE',
    description: 'Two masked individuals armed with machetes and a pistol attempting to breach compound gate on East Legon Boundary Road. Escaped in an unlicensed black Hyundai Elantra heading towards Shiashie.',
    locationName: 'East Legon (Near Mensvic Hotel)',
    ghanaPostCode: 'GA-382-9104',
    region: 'Greater Accra',
    coordinates: [5.6354, -0.1582],
    media: [
      {
        id: 'med-001',
        type: 'VIDEO',
        durationSeconds: 48,
        url: 'https://images.unsplash.com/photo-1590856029826-c7a73142bbf1?w=800&auto=format&fit=crop&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1590856029826-c7a73142bbf1?w=800&auto=format&fit=crop&q=80',
        sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        timestampUtc: '2026-10-07T08:14:22Z',
        gpsWatermark: {
          lat: 5.6354,
          lng: -0.1582,
          ghanaPostCode: 'GA-382-9104',
          accuracyMeters: 4.2
        },
        isTamperProofVerified: true
      }
    ],
    reporter: {
      isAnonymous: false,
      name: 'Kwame Mensah',
      phone: '+233 24 456 7890',
      ghanaCardId: 'GHA-712893812-4',
      trustScore: 96
    },
    assignedAgency: 'GPS_CID',
    secondaryAgencies: ['GPS_CID'],
    status: 'DISPATCHED',
    severity: 'RED',
    isPublicSafe: false, // Severe crime - private police review first
    publicCorroborations: 14,
    createdAt: '2026-10-07T08:16:00Z',
    updatedAt: '2026-10-07T08:22:00Z',
    investigatorNotes: [
      'Patrol Unit Delta-4 dispatched to East Legon corridor.',
      'CCTV request filed for Shiashie intersection cameras.'
    ]
  },
  {
    id: 'inc-002',
    trackingCode: 'GH-2026-4419',
    title: 'Severe Galamsey Excavators Dredging Offin River Buffer',
    category: 'GALAMSEY_ENVIRONMENTAL',
    description: 'Heavy excavators operating directly in the Offin River buffer zone causing severe chemical pollution and turbidity. Armed illegal operators operating behind Dunkwa-on-Offin.',
    locationName: 'Offin River Basin, Dunkwa-on-Offin',
    ghanaPostCode: 'CR-104-7721',
    region: 'Central',
    coordinates: [5.9667, -1.9833],
    media: [
      {
        id: 'med-002',
        type: 'VIDEO',
        durationSeconds: 59,
        url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop&q=80',
        sha256Hash: 'a8b5e913a6e9d3b1451f2e19d7d4c1b9201f654b12398a719c8d621f35791240',
        timestampUtc: '2026-10-06T14:30:10Z',
        gpsWatermark: {
          lat: 5.9667,
          lng: -1.9833,
          ghanaPostCode: 'CR-104-7721',
          accuracyMeters: 6.8
        },
        isTamperProofVerified: true
      }
    ],
    reporter: {
      isAnonymous: true,
      trustScore: 88
    },
    assignedAgency: 'EPA',
    secondaryAgencies: ['FORESTRY_COMM', 'GPS_CID'],
    status: 'UNDER_INVESTIGATION',
    severity: 'HIGH',
    isPublicSafe: true,
    publicCorroborations: 42,
    createdAt: '2026-10-06T14:40:00Z',
    updatedAt: '2026-10-06T16:00:00Z',
    investigatorNotes: [
      'EPA Joint Taskforce alerted with Forestry Commission liaison.',
      'Drone reconnaissance planned for 08:00 tomorrow.'
    ]
  },
  {
    id: 'inc-003',
    trackingCode: 'GH-2026-1184',
    title: 'Urgent Child Physical Abuse in Residential Compound',
    category: 'DOMESTIC_ABUSE',
    description: 'Repeated severe physical abuse and child endangerment heard and witnessed in rental quarters at Bantama. Minor sustained visible head lacerations.',
    locationName: 'Bantama High Street, Kumasi',
    ghanaPostCode: 'AK-042-9901',
    region: 'Ashanti',
    coordinates: [6.6983, -1.6369],
    media: [
      {
        id: 'med-003',
        type: 'PHOTO',
        url: 'https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?w=800&auto=format&fit=crop&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?w=800&auto=format&fit=crop&q=80',
        sha256Hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
        timestampUtc: '2026-10-07T07:10:00Z',
        gpsWatermark: {
          lat: 6.6983,
          lng: -1.6369,
          ghanaPostCode: 'AK-042-9901',
          accuracyMeters: 3.1
        },
        isTamperProofVerified: true
      }
    ],
    reporter: {
      isAnonymous: false,
      name: 'Abena Osei',
      phone: '+233 50 123 4567',
      ghanaCardId: 'GHA-892100412-9',
      trustScore: 98
    },
    assignedAgency: 'DOVVSU',
    secondaryAgencies: ['GPS_CID'],
    status: 'DISPATCHED',
    severity: 'HIGH',
    isPublicSafe: false, // Strict victim confidentiality
    publicCorroborations: 3,
    createdAt: '2026-10-07T07:20:00Z',
    updatedAt: '2026-10-07T07:35:00Z',
    investigatorNotes: [
      'DOVVSU Kumasi Central unit en route with Social Welfare officer.'
    ]
  },
  {
    id: 'inc-004',
    trackingCode: 'GH-2026-8802',
    title: 'Dangerous Wrong-Way VIP Driving & Collision Near Spanner Junction',
    category: 'TRAFFIC_RECKLESS',
    description: 'Commercial tipper truck and a Land Cruiser driving against traffic on the Tetteh Quarshie - Legon Highway, ramming two private vehicles and fleeing.',
    locationName: 'Spanner Junction, Tetteh Quarshie Interchange',
    ghanaPostCode: 'GA-112-4091',
    region: 'Greater Accra',
    coordinates: [5.6083, -0.1772],
    media: [
      {
        id: 'med-004',
        type: 'VIDEO',
        durationSeconds: 34,
        url: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&auto=format&fit=crop&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&auto=format&fit=crop&q=80',
        sha256Hash: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
        timestampUtc: '2026-10-07T06:50:00Z',
        gpsWatermark: {
          lat: 5.6083,
          lng: -0.1772,
          ghanaPostCode: 'GA-112-4091',
          accuracyMeters: 5.0
        },
        isTamperProofVerified: true
      }
    ],
    reporter: {
      isAnonymous: false,
      name: 'Kofi Asare',
      phone: '+233 20 889 0123',
      ghanaCardId: 'GHA-109382711-2',
      trustScore: 92
    },
    assignedAgency: 'MTTD',
    secondaryAgencies: ['GPS_CID'],
    status: 'COURT_EVIDENCE_FILED',
    severity: 'MEDIUM',
    isPublicSafe: true,
    publicCorroborations: 78,
    createdAt: '2026-10-07T06:55:00Z',
    updatedAt: '2026-10-07T08:00:00Z',
    investigatorNotes: [
      'Vehicle registration retrieved via DVLA database query.',
      'Summons issued for driver.'
    ]
  },
  {
    id: 'inc-005',
    trackingCode: 'GH-2026-3021',
    title: 'Illegal Chemical Waste Dumping in Korle Lagoon Drain',
    category: 'SANITATION_ZONING',
    description: 'Industrial tanker discharging untreated chemical slurry directly into the main storm drain leading into the Korle Lagoon at Agbogbloshie.',
    locationName: 'Agbogbloshie Industrial Road, Accra',
    ghanaPostCode: 'GA-145-2018',
    region: 'Greater Accra',
    coordinates: [5.5492, -0.2221],
    media: [
      {
        id: 'med-005',
        type: 'PHOTO',
        url: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=800&auto=format&fit=crop&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=800&auto=format&fit=crop&q=80',
        sha256Hash: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
        timestampUtc: '2026-10-06T18:10:00Z',
        gpsWatermark: {
          lat: 5.5492,
          lng: -0.2221,
          ghanaPostCode: 'GA-145-2018',
          accuracyMeters: 4.8
        },
        isTamperProofVerified: true
      }
    ],
    reporter: {
      isAnonymous: true,
      trustScore: 85
    },
    assignedAgency: 'AMA',
    secondaryAgencies: ['EPA'],
    status: 'UNDER_INVESTIGATION',
    severity: 'HIGH',
    isPublicSafe: true,
    publicCorroborations: 31,
    createdAt: '2026-10-06T18:20:00Z',
    updatedAt: '2026-10-06T19:00:00Z'
  }
];

export const INITIAL_ALERTS: EmergencyAlert[] = [
  {
    id: 'alert-amber-01',
    alertType: 'AMBER',
    title: 'AMBER ALERT: Missing 7-Year-Old Boy (Emmanuel K. Boateng)',
    subjectName: 'Emmanuel Kwabena Boateng',
    subjectAge: 7,
    subjectPhotoUrl: 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=800&auto=format&fit=crop&q=80',
    lastSeenLocation: 'Madina Market Complex near Zongo Junction, Accra',
    ghanaPostCode: 'GM-014-9923',
    centerCoordinates: [5.6811, -0.1652],
    radiusKm: 35,
    details: 'Emmanuel was last seen around 15:30 wearing a yellow primary school uniform with navy blue shorts and black sandals. Believed to have been led away by an unidentified adult in a green taxi.',
    suspectDetails: 'Unidentified male, approximately 35-40 yrs, wearing dark grey polo shirt.',
    vehicleDetails: 'Green/Yellow Daewoo Matiz taxi, partially obscured registration ending with "-21".',
    isActive: true,
    issuedByAgency: 'GPS_CID',
    issuingOfficerName: 'Supt. David Agbenyega',
    badgeNumber: 'GPS-OFF-8841',
    activeUntil: '2026-10-08T15:30:00Z',
    createdAt: '2026-10-07T06:00:00Z',
    sightingsCount: 8
  },
  {
    id: 'alert-red-02',
    alertType: 'RED',
    title: 'RED ALERT: Escaped Dangerous Armed Suspect on the Loose',
    subjectName: 'Ibrahim "Shaka" Tanko',
    subjectAge: 32,
    subjectPhotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80',
    lastSeenLocation: 'Circle interchange bush perimeter towards Industrial Area',
    ghanaPostCode: 'GA-089-1120',
    centerCoordinates: [5.5583, -0.2195],
    radiusKm: 20,
    details: 'High-risk fugitive wanted for multiple armed highway robberies escaped police custody during court transit. Suspect is believed to be armed and dangerous. Do not attempt to apprehend.',
    suspectDetails: 'Tall, athletic build, deep scar across left cheek, last seen in white singlet and torn blue jeans.',
    isActive: true,
    issuedByAgency: 'GPS_CID',
    issuingOfficerName: 'COP Maame Yaa Tiwaa',
    badgeNumber: 'GPS-HQ-0019',
    activeUntil: '2026-10-09T00:00:00Z',
    createdAt: '2026-10-07T07:30:00Z',
    sightingsCount: 15
  }
];

export const INITIAL_SIGHTINGS: SightingTip[] = [
  {
    id: 'sight-001',
    alertId: 'alert-amber-01',
    timestamp: '2026-10-07T08:45:00Z',
    locationName: 'Adenta Barrier Shell Fuel Station',
    ghanaPostCode: 'GD-003-8812',
    coordinates: [5.7142, -0.1588],
    comment: 'Saw a child fitting this description buying water accompanied by an older man in a green Matiz taxi heading towards Dodowa road.',
    reporterPhone: '+233 24 990 1122',
    isVerified: true
  },
  {
    id: 'sight-002',
    alertId: 'alert-amber-01',
    timestamp: '2026-10-07T09:15:00Z',
    locationName: 'Frafraha Junction near Pentecost University',
    ghanaPostCode: 'GD-119-2041',
    coordinates: [5.7301, -0.1412],
    comment: 'Taxi matching this profile parked briefly near roadside fruit stall.',
    isVerified: false
  }
];
