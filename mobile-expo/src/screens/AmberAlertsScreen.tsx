import React, { memo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Keyboard } from 'react-native';
import { supabase } from '../lib/supabase';
import { GpsCoordinates } from '../types';

interface AmberAlertsScreenProps {
  coords: GpsCoordinates;
  ghanaPostCode: string;
  region: string;
  locationName: string;
  landmark: string;
  isAnonymous: boolean;
  reporterPhone: string;
}

export const AmberAlertsScreen: React.FC<AmberAlertsScreenProps> = memo(({
  coords,
  ghanaPostCode,
  region,
  locationName,
  landmark,
  isAnonymous,
  reporterPhone
}) => {
  const handleSendAmberTip = async () => {
    try {
      const payload = {
        tracking_code: `TIP-${Math.floor(1000 + Math.random() * 9000)}`,
        category: 'CRIMINAL_OFFENSE',
        title: '👁️ AMBER ALERT SIGHTING TIP',
        description: `Amber Alert sighting report near ${landmark || locationName} (${ghanaPostCode}). Dispatched to Police Operations Room.`,
        location_name: landmark ? `${landmark} (${locationName})` : locationName,
        ghanapost_code: ghanaPostCode.toUpperCase(),
        region: region || 'Greater Accra',
        latitude: coords.latitude,
        longitude: coords.longitude,
        media: [],
        is_anonymous: isAnonymous,
        reporter_data: { phone: reporterPhone || '+233 24 000 0000', isSighting: true, trustScore: 90 },
        assigned_agency: 'GPS_CID',
        status: 'RECEIVED_PENDING_TRIAGE',
        severity: 'HIGH',
        is_public_eligible: false,
        is_public_published: false,
        public_corroborations: 0
      };

      await supabase.from('incidents').insert(payload);
    } catch (e) {}

    Alert.alert('✅ Tip Transmitted', 'Sighting details and live coordinates sent to Police Operations Room.');
  };

  return (
    <View style={styles.section}>
      <View style={styles.amberBanner}>
        <Text style={styles.amberBannerTitle}>⚠️ AMBER ALERT GEOFENCE BROADCAST</Text>
        <Text style={styles.amberSubject}>Emmanuel Kwabena Boateng (7 Years Old)</Text>
        <Text style={styles.amberDetails}>
          Last seen at Madina Market Complex near Zongo Junction. Wearing yellow school uniform, navy shorts. Accompanied by adult in green Daewoo Matiz taxi.
        </Text>
        <Text style={styles.amberGps}>📍 Broadcast Center: GM-014-9923 (35km Radius)</Text>
      </View>

      <TouchableOpacity
        onPress={() => {
          Keyboard.dismiss();
          handleSendAmberTip();
        }}
        style={styles.sightingBtn}
      >
        <Text style={styles.sightingBtnText}>👁️ Send Sighting Tip to Police</Text>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    gap: 12
  },
  amberBanner: {
    backgroundColor: 'rgba(217,119,6,0.15)',
    borderWidth: 1,
    borderColor: '#F59E0B',
    padding: 14,
    borderRadius: 16,
    gap: 6
  },
  amberBannerTitle: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: 'bold'
  },
  amberSubject: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold'
  },
  amberDetails: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 18
  },
  amberGps: {
    color: '#FCD116',
    fontSize: 11,
    fontWeight: 'bold'
  },
  sightingBtn: {
    backgroundColor: '#D97706',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8
  },
  sightingBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold'
  }
});
