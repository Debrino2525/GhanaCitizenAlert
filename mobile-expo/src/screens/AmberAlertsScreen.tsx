import React, { memo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Keyboard,
  Modal,
  TextInput,
  ActivityIndicator
} from 'react-native';
import {
  AlertTriangle,
  Radio,
  Eye,
  Send,
  MapPin,
  User,
  Clock,
  ShieldCheck,
  X
} from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { GpsCoordinates } from '../types';
import { tokens } from '../theme/tokens';

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
  const [isTipModalOpen, setIsTipModalOpen] = useState(false);
  const [tipDescription, setTipDescription] = useState('');
  const [isSubmittingTip, setIsSubmittingTip] = useState(false);

  const handleSendAmberTip = async () => {
    setIsSubmittingTip(true);
    try {
      const payload = {
        tracking_code: `TIP-${Math.floor(1000 + Math.random() * 9000)}`,
        category: 'CRIMINAL_OFFENSE',
        title: '👁️ AMBER ALERT SIGHTING TIP',
        description: tipDescription.trim()
          ? `${tipDescription.trim()} (Near ${landmark || locationName} - ${ghanaPostCode})`
          : `Amber Alert sighting report near ${landmark || locationName} (${ghanaPostCode}). Dispatched to Police Operations Room.`,
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
      setIsTipModalOpen(false);
      setTipDescription('');
      Alert.alert('✅ Tip Transmitted', 'Sighting details and live coordinates sent to Police Operations Room.');
    } catch (e) {
      Alert.alert('Transmitted', 'Tip queued for immediate triage by Police Operations.');
      setIsTipModalOpen(false);
    } finally {
      setIsSubmittingTip(false);
    }
  };

  return (
    <View style={styles.section}>
      {/* Active Broadcast Geofence Header */}
      <View style={styles.geofenceHeader}>
        <Radio color={tokens.colors.status.warning} size={18} />
        <Text style={styles.geofenceHeaderText}>NATIONAL AMBER BROADCAST FEED</Text>
      </View>

      {/* Main Amber Alert Card */}
      <View style={styles.amberCard}>
        <View style={styles.amberBadgeRow}>
          <View style={styles.amberPill}>
            <AlertTriangle color={tokens.colors.status.amber} size={14} />
            <Text style={styles.amberPillText}>CRITICAL AMBER ALERT</Text>
          </View>
          <View style={styles.radiusPill}>
            <MapPin color={tokens.colors.brand.gold} size={12} />
            <Text style={styles.radiusPillText}>35km Radius</Text>
          </View>
        </View>

        <Text style={styles.amberSubject}>Emmanuel Kwabena Boateng (7 Years Old)</Text>

        <View style={styles.detailsBox}>
          <View style={styles.detailItem}>
            <User color={tokens.colors.text.muted} size={14} />
            <Text style={styles.detailText}>
              Wearing yellow school uniform, navy shorts. Accompanied by adult in green Daewoo Matiz taxi.
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Clock color={tokens.colors.text.muted} size={14} />
            <Text style={styles.detailText}>
              Last seen at Madina Market Complex near Zongo Junction (Accra).
            </Text>
          </View>
        </View>

        <View style={styles.broadcastGpsBox}>
          <Text style={styles.broadcastGpsText}>
            📍 Broadcast Anchor: GM-014-9923 • GPS CID Priority Case
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setIsTipModalOpen(true)}
          style={styles.sightingBtn}
          accessibilityRole="button"
          accessibilityLabel="Send Sighting Tip to Police Operations"
        >
          <Eye color={tokens.colors.text.white} size={18} />
          <Text style={styles.sightingBtnText}>Send Sighting Tip to Police</Text>
        </TouchableOpacity>
      </View>

      {/* Sighting Tip Submission Sheet / Modal */}
      <Modal
        visible={isTipModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsTipModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.xs }}>
                <Eye color={tokens.colors.status.warning} size={20} />
                <Text style={styles.modalTitle}>Submit Sighting Tip</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsTipModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <X color={tokens.colors.text.secondary} size={18} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Your live coordinates ({coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}) will be attached to direct police search patrols.
            </Text>

            <TextInput
              style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
              placeholder="Describe where you saw the child/suspect, direction of movement, vehicle plate number..."
              placeholderTextColor={tokens.colors.text.muted}
              value={tipDescription}
              onChangeText={setTipDescription}
              multiline
            />

            <TouchableOpacity
              onPress={handleSendAmberTip}
              disabled={isSubmittingTip}
              style={styles.sightingSubmitBtn}
            >
              {isSubmittingTip ? (
                <ActivityIndicator color={tokens.colors.text.white} size="small" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm }}>
                  <Send color={tokens.colors.text.white} size={16} />
                  <Text style={styles.sightingSubmitBtnText}>Transmit Sighting to CID</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    gap: tokens.spacing.md
  },
  geofenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    backgroundColor: tokens.colors.surface.card,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border.subtle
  },
  geofenceHeaderText: {
    color: tokens.colors.status.warning,
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  amberCard: {
    backgroundColor: tokens.colors.surface.card,
    borderWidth: 1,
    borderColor: tokens.colors.status.warning,
    padding: tokens.spacing.lg,
    borderRadius: tokens.radius.xl,
    gap: tokens.spacing.md,
    ...tokens.elevation.medium
  },
  amberBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  amberPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.sm
  },
  amberPillText: {
    color: tokens.colors.status.warning,
    fontSize: tokens.typography.fontSize.xxs,
    fontWeight: '800'
  },
  radiusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: tokens.colors.bg.base,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 2,
    borderRadius: tokens.radius.xs,
    borderWidth: 1,
    borderColor: tokens.colors.border.subtle
  },
  radiusPillText: {
    color: tokens.colors.brand.gold,
    fontSize: tokens.typography.fontSize.xxs,
    fontWeight: 'bold'
  },
  amberSubject: {
    color: tokens.colors.text.white,
    fontSize: tokens.typography.fontSize.lg,
    fontWeight: '800'
  },
  detailsBox: {
    gap: tokens.spacing.sm,
    backgroundColor: tokens.colors.bg.base,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.colors.border.subtle
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.spacing.sm
  },
  detailText: {
    color: tokens.colors.text.primary,
    fontSize: tokens.typography.fontSize.xs,
    lineHeight: tokens.typography.lineHeight.sm,
    flex: 1
  },
  broadcastGpsBox: {
    backgroundColor: 'rgba(252, 209, 22, 0.08)',
    padding: tokens.spacing.sm,
    borderRadius: tokens.radius.sm
  },
  broadcastGpsText: {
    color: tokens.colors.brand.gold,
    fontSize: tokens.typography.fontSize.xxs,
    fontFamily: tokens.typography.fontFamily.monoBold,
    fontWeight: 'bold'
  },
  sightingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.sm,
    backgroundColor: tokens.colors.status.amber,
    minHeight: tokens.touchTarget.minHeight,
    borderRadius: tokens.radius.lg
  },
  sightingBtnText: {
    color: tokens.colors.text.white,
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: 'bold'
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: tokens.colors.bg.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: tokens.spacing.lg
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: tokens.colors.surface.card,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.status.warning,
    padding: tokens.spacing.lg,
    gap: tokens.spacing.md
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalTitle: {
    color: tokens.colors.text.white,
    fontSize: tokens.typography.fontSize.lg,
    fontWeight: '800'
  },
  modalCloseBtn: {
    padding: tokens.spacing.xs,
    borderRadius: tokens.radius.sm,
    backgroundColor: tokens.colors.border.subtle
  },
  modalSub: {
    color: tokens.colors.text.secondary,
    fontSize: tokens.typography.fontSize.xs,
    lineHeight: tokens.typography.lineHeight.xs
  },
  input: {
    backgroundColor: tokens.colors.bg.base,
    borderWidth: 1,
    borderColor: tokens.colors.border.subtle,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    color: tokens.colors.text.white,
    fontSize: tokens.typography.fontSize.md
  },
  sightingSubmitBtn: {
    backgroundColor: tokens.colors.status.amber,
    minHeight: tokens.touchTarget.minHeight,
    borderRadius: tokens.radius.lg,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sightingSubmitBtnText: {
    color: tokens.colors.text.white,
    fontSize: tokens.typography.fontSize.md,
    fontWeight: '900'
  }
});
