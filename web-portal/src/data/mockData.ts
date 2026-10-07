import { IncidentReport, EmergencyAlert, SightingTip } from '../types';

export const INITIAL_INCIDENTS: IncidentReport[] = [
  {
    id: 'inc-001',
    trackingCode: 'GH-2026-9812',
    title: 'Commercial Compound Breach Attempt',
    category: 'CRIMINAL_OFFENSE',
    description: 'Two masked individuals armed with implements attempting to breach perimeter compound gate on East Legon Boundary Road. Escaped in an unlicensed vehicle heading towards Shiashie corridor.',
    locationName: 'East Legon Boundary Road, Accra',
    ghanaPostCode: 'GA-382-9104',
    region: 'Greater Accra',
    coordinates: [5.6354, -0.1582],
    media: [
      {
        id: 'med-001',
        type: 'PHOTO',
        durationSeconds: 1,
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
      name: 'Verified Citizen Reporter',
      phone: '+233 24 *** 7890',
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
    title: 'Severe Illegal Mining Excavators Dredging River Buffer',
    category: 'GALAMSEY_ENVIRONMENTAL',
    description: 'Heavy excavators operating directly in river buffer zone causing severe turbidity and environmental disturbance near Dunkwa-on-Offin.',
    locationName: 'Offin River Basin, Dunkwa-on-Offin',
    ghanaPostCode: 'CR-104-7721',
    region: 'Central',
    coordinates: [5.9667, -1.9833],
    media: [
      {
        id: 'med-002',
        type: 'PHOTO',
        durationSeconds: 1,
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
    title: 'Emergency Domestic Incident & Vulnerable Individual Support',
    category: 'DOMESTIC_ABUSE',
    description: 'Report of high-risk domestic disturbance and vulnerable person endangerment in residential quarters at Bantama.',
    locationName: 'Bantama High Street, Kumasi',
    ghanaPostCode: 'AK-042-9901',
    region: 'Ashanti',
    coordinates: [6.6983, -1.6369],
    media: [
      {
        id: 'med-003',
        type: 'PHOTO',
        durationSeconds: 1,
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
      name: 'Citizen Informant (Verified)',
      phone: '+233 50 *** 4567',
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
      'DOVVSU Kumasi Central response unit en route with Social Welfare liaison officer.'
    ]
  }
];

export const INITIAL_ALERTS: EmergencyAlert[] = [
  {
    id: 'alert-cad-01',
    alertType: 'AMBER',
    title: 'AMBER ALERT CAD SIMULATION: Missing Youth (Case #GH-AMB-8812)',
    subjectName: 'Missing Youth (Case #GH-AMB-8812)',
    subjectAge: 8,
    subjectPhotoUrl: 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=800&auto=format&fit=crop&q=80',
    lastSeenLocation: 'Madina Market Complex near Zongo Junction, Accra',
    ghanaPostCode: 'GM-014-9923',
    centerCoordinates: [5.6811, -0.1652],
    radiusKm: 35,
    details: 'CAD Drill Simulation: Subject last seen around 15:30 wearing yellow school uniform with navy shorts. Accompanied by unknown individual in green commercial taxi.',
    suspectDetails: 'Subject person of interest, approx 35-40 yrs, wearing dark attire.',
    vehicleDetails: 'Commercial green/yellow registered taxi.',
    isActive: true,
    issuedByAgency: 'GPS_CID',
    issuingOfficerName: 'CAD Duty Officer Alpha',
    approvingCommanderName: 'Divisional Dispatch Unit 1',
    badgeNumber: 'GPS-CAD-8841',
    activeUntil: '2026-10-08T15:30:00Z',
    createdAt: '2026-10-07T06:00:00Z',
    sightingsCount: 8
  }
];

export const INITIAL_SIGHTINGS: SightingTip[] = [
  {
    id: 'sight-001',
    alertId: 'alert-cad-01',
    timestamp: '2026-10-07T08:45:00Z',
    locationName: 'Adenta Barrier Shell Station',
    ghanaPostCode: 'GD-003-8812',
    coordinates: [5.7142, -0.1588],
    comment: 'Vehicle matching CAD bulletin observed near fuel station heading north on Dodowa corridor.',
    reporterPhone: '+233 24 *** 1122',
    isVerified: true
  }
];
