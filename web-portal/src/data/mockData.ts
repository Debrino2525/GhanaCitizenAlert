import { IncidentReport, EmergencyAlert, SightingTip } from '../types';

export const INITIAL_INCIDENTS: IncidentReport[] = [
  {
    id: 'inc-001',
    trackingCode: 'GH-2026-9812',
    title: 'Armed Daylight Break-in & Robbery Attempt',
    category: 'CRIMINAL_OFFENSE',
    description: 'Two masked individuals armed with machetes and a pistol attempting to breach compound gate on East Legon Boundary Road. Escaped in an unlicensed black sedan heading towards Shiashie.',
    locationName: 'East Legon Boundary Road',
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
          accuracyMeters: 3.5
        },
        isTamperProofVerified: true,
        deepfakeScore: 0.02
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
    secondaryAgencies: [],
    status: 'DISPATCHED',
    severity: 'RED',
    isPublicEligible: false,
    isPublicPublished: false,
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
    description: 'Heavy excavators operating directly in the Offin River buffer zone causing severe chemical pollution and turbidity behind Dunkwa-on-Offin.',
    locationName: 'Offin River Basin, Dunkwa-on-Offin',
    ghanaPostCode: 'CR-104-7721',
    region: 'Central',
    coordinates: [5.9667, -1.9833],
    media: [
      {
        id: 'med-002',
        type: 'VIDEO',
        durationSeconds: 58,
        url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&auto=format&fit=crop&q=80',
        sha256Hash: 'a8b5e913a6e9d3b1451f2e19d7d4c1b9201f654b12398a719c8d621f35791240',
        timestampUtc: '2026-10-06T14:30:10Z',
        gpsWatermark: {
          lat: 5.9667,
          lng: -1.9833,
          ghanaPostCode: 'CR-104-7721',
          accuracyMeters: 4.8
        },
        isTamperProofVerified: true,
        deepfakeScore: 0.01
      }
    ],
    reporter: {
      isAnonymous: true,
      trustScore: 88
    },
    assignedAgency: 'EPA',
    secondaryAgencies: ['FORESTRY_COMM', 'GPS_CID'],
    status: 'UNDER_ACTIVE_INVESTIGATION',
    severity: 'HIGH',
    isPublicEligible: true,
    isPublicPublished: true,
    publicCorroborations: 42,
    createdAt: '2026-10-06T14:40:00Z',
    updatedAt: '2026-10-06T16:00:00Z',
    investigatorNotes: [
      'EPA Joint Taskforce alerted with Forestry Commission liaison.',
      'Drone reconnaissance flight scheduled.'
    ]
  },
  {
    id: 'inc-003',
    trackingCode: 'GH-2026-1184',
    title: 'Urgent Child Physical Abuse in Rental Quarters',
    category: 'DOMESTIC_ABUSE',
    description: 'Witnessed severe physical abuse and child endangerment in rental quarters at Bantama. Minor sustained visible head injuries.',
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
        isTamperProofVerified: true,
        deepfakeScore: 0.01
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
    isPublicEligible: false,
    isPublicPublished: false,
    publicCorroborations: 3,
    createdAt: '2026-10-07T07:20:00Z',
    updatedAt: '2026-10-07T07:35:00Z',
    investigatorNotes: [
      'DOVVSU Kumasi Central unit en route with Social Welfare officer.'
    ]
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
    details: 'Emmanuel was last seen around 15:30 wearing a yellow primary school uniform with navy blue shorts and black sandals. Believed to have been accompanied by an adult in a green taxi.',
    suspectDetails: 'Unidentified male, approximately 35-40 yrs, wearing dark polo shirt.',
    vehicleDetails: 'Green/Yellow Daewoo Matiz taxi.',
    isActive: true,
    issuedByAgency: 'GPS_CID',
    issuingOfficerName: 'Insp. Kofi Badu',
    approvingCommanderName: 'Supt. David Agbenyega (GPS-HQ-8841)',
    badgeNumber: 'GPS-OFF-8841',
    activeUntil: '2026-10-08T15:30:00Z',
    createdAt: '2026-10-07T06:00:00Z',
    sightingsCount: 8
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
    comment: 'Saw child matching this description at fuel station heading towards Dodowa road in green taxi.',
    reporterPhone: '+233 24 990 1122',
    isVerified: true
  }
];
