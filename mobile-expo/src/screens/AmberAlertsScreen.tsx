import React, { memo, useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Image,
  ScrollView,
  RefreshControl,
  Keyboard,
  TouchableWithoutFeedback
} from 'react-native';
import {
  AlertTriangle,
  Radio,
  Eye,
  Send,
  MapPin,
  User,
  Clock,
  Car,
  ShieldAlert,
  Image as ImageIcon,
  X
} from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { GpsCoordinates } from '../types';
import { tokens } from '../theme/tokens';
import { safeHaptics, announceAccessibility } from '../utils/haptics';

export interface MobileEmergencyAlert {
  id: string;
  type: 'AMBER' | 'RED' | 'CIVIL_DISASTER';
  title: string;
  subject_name?: string;
  subject_age?: number;
  subject_photo_url?: string;
  last_seen_location?: string;
  latitude: number;
  longitude: number;
  radius_km: number;
  details?: string;
  suspect_details?: string;
  vehicle_details?: string;
  is_active: boolean;
  active_until: string;
  ghanapost_code?: string;
  created_at: string;
}

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
  const [alerts, setAlerts] = useState<MobileEmergencyAlert[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedAlert, setSelectedAlert] = useState<MobileEmergencyAlert | null>(null);
  const [isTipModalOpen, setIsTipModalOpen] = useState<boolean>(false);
  const [tipDescription, setTipDescription] = useState<string>('');
  const [isSubmittingTip, setIsSubmittingTip] = useState<boolean>(false);

  const fetchActiveAlerts = useCallback(async () => {
    try {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from('emergency_alerts')
        .select('*')
        .eq('is_active', true)
        .gte('active_until', nowIso)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[AmberAlerts] Error fetching active alerts:', error.message);
      } else {
        setAlerts((data as MobileEmergencyAlert[]) || []);
      }
    } catch (err) {
      console.warn('[AmberAlerts] Network exception:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveAlerts();

    // Realtime channel for instant alert broadcasts & updates
    const channel = supabase
      .channel('mobile_emergency_alerts_feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_alerts' }, () => {
        fetchActiveAlerts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchActiveAlerts]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchActiveAlerts();
  };

  const handleOpenTipModal = (alertItem: MobileEmergencyAlert) => {
    setSelectedAlert(alertItem);
    setTipDescription('');
    setIsTipModalOpen(true);
    safeHaptics.light();
  };

  const handleSendAmberTip = async () => {
    if (!selectedAlert) return;
    if (!tipDescription.trim()) {
      Alert.alert('Missing Details', 'Please provide a brief description of the sighting.');
      return;
    }

    setIsSubmittingTip(true);
    try {
      const locationLabel = landmark.trim()
        ? `${landmark.trim()} (${locationName})`
        : (locationName || null);

      const payload = {
        alert_id: selectedAlert.id,
        location_name: locationLabel,
        ghanapost_code: ghanaPostCode.trim() ? ghanaPostCode.trim().toUpperCase() : null,
        latitude: coords.latitude,
        longitude: coords.longitude,
        comment: tipDescription.trim(),
        reporter_phone: isAnonymous ? null : (reporterPhone || null),
        is_verified: false
      };

      // Public cannot read alert_sightings: do NOT use .select() or .returning
      const { error } = await supabase.from('alert_sightings').insert(payload);

      if (error) {
        throw error;
      }

      safeHaptics.success();
      announceAccessibility('Sighting tip transmitted to Police Operations.');
      setIsTipModalOpen(false);
      setTipDescription('');
      Alert.alert(
        '✅ Sighting Transmitted',
        'Your sighting details and live coordinates have been transmitted directly to the Police Operations Room.'
      );
    } catch (e: any) {
      console.warn('[AmberAlerts] Error transmitting sighting:', e?.message || e);
      safeHaptics.warning();
      Alert.alert(
        '⚠️ Transmission Failed',
        `Could not transmit sighting tip: ${e?.message || 'Network/database error'}. Would you like to retry?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: () => handleSendAmberTip() }
        ]
      );
    } finally {
      setIsSubmittingTip(false);
    }
  };

  return (
    <View style={styles.section}>
      {/* Active Broadcast Geofence Header */}
      <View style={styles.geofenceHeader}>
        <Radio color={tokens.colors.status.warning} size={18} />
        <Text style={styles.geofenceHeaderText}>NATIONAL AMBER & EMERGENCY BROADCAST FEED</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tokens.colors.brand.gold} />
          <Text style={styles.loadingText}>Connecting to Emergency Alert Relay...</Text>
        </View>
      ) : alerts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <ShieldAlert color={tokens.colors.text.muted} size={36} />
          </View>
          <Text style={styles.emptyTitle}>No Active Emergency Alerts</Text>
          <Text style={styles.emptySub}>
            There are currently no active Amber Alerts or emergency regional broadcasts in your area.
          </Text>
          <TouchableOpacity
            onPress={handleRefresh}
            style={styles.refreshBtn}
            accessibilityRole="button"
            accessibilityLabel="Refresh Emergency Alert Feed"
          >
            <Text style={styles.refreshBtnText}>Check for Updates</Text>
          </TouchableOpacity>
        </View>
      ) : (
        alerts.map((alertItem) => {
          const isAmber = alertItem.type === 'AMBER';
          const badgeBg = isAmber ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)';
          const badgeColor = isAmber ? tokens.colors.status.amber : tokens.colors.status.danger;
          const badgeTitle = isAmber
            ? 'CRITICAL AMBER ALERT'
            : alertItem.type === 'RED'
            ? 'RED EMERGENCY BROADCAST'
            : 'CIVIL DISASTER ALERT';

          return (
            <View key={alertItem.id} style={[styles.amberCard, !isAmber && { borderColor: tokens.colors.status.danger }]}>
              {/* Badge Header Row */}
              <View style={styles.amberBadgeRow}>
                <View style={[styles.amberPill, { backgroundColor: badgeBg }]}>
                  <AlertTriangle color={badgeColor} size={14} />
                  <Text style={[styles.amberPillText, { color: badgeColor }]}>{badgeTitle}</Text>
                </View>
                <View style={styles.radiusPill}>
                  <MapPin color={tokens.colors.brand.gold} size={12} />
                  <Text style={styles.radiusPillText}>{alertItem.radius_km || 35}km Radius</Text>
                </View>
              </View>

              {/* Photo & Identity Section */}
              <View style={styles.identityRow}>
                {alertItem.subject_photo_url ? (
                  <Image
                    source={{ uri: alertItem.subject_photo_url }}
                    style={styles.subjectImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.placeholderImageBox}>
                    <ImageIcon color={tokens.colors.text.muted} size={28} />
                    <Text style={styles.placeholderImageText}>No Photo Provided</Text>
                  </View>
                )}

                <View style={styles.identityInfo}>
                  <Text style={styles.amberSubject}>
                    {alertItem.subject_name || alertItem.title}
                  </Text>
                  {alertItem.subject_age !== undefined && alertItem.subject_age !== null && (
                    <Text style={styles.subjectAgeText}>
                      Age: {alertItem.subject_age} Years Old
                    </Text>
                  )}
                  {alertItem.last_seen_location ? (
                    <View style={styles.lastSeenRow}>
                      <Clock color={tokens.colors.text.muted} size={12} />
                      <Text style={styles.lastSeenText} numberOfLines={2}>
                        Last seen: {alertItem.last_seen_location}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              {/* Situation Details */}
              <View style={styles.detailsBox}>
                {alertItem.details ? (
                  <View style={styles.detailItem}>
                    <User color={tokens.colors.text.muted} size={14} />
                    <Text style={styles.detailText}>{alertItem.details}</Text>
                  </View>
                ) : null}

                {alertItem.suspect_details ? (
                  <View style={styles.detailItem}>
                    <ShieldAlert color={tokens.colors.status.danger} size={14} />
                    <Text style={[styles.detailText, { color: tokens.colors.status.warning }]}>
                      Suspect: {alertItem.suspect_details}
                    </Text>
                  </View>
                ) : null}

                {alertItem.vehicle_details ? (
                  <View style={styles.detailItem}>
                    <Car color={tokens.colors.brand.gold} size={14} />
                    <Text style={styles.detailText}>
                      Vehicle: {alertItem.vehicle_details}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Broadcast Anchor */}
              {alertItem.ghanapost_code ? (
                <View style={styles.broadcastGpsBox}>
                  <Text style={styles.broadcastGpsText}>
                    📍 Broadcast Anchor: {alertItem.ghanapost_code} • GPS CID Priority
                  </Text>
                </View>
              ) : null}

              {/* Action Button */}
              <TouchableOpacity
                onPress={() => handleOpenTipModal(alertItem)}
                style={styles.sightingBtn}
                accessibilityRole="button"
                accessibilityLabel={`Send Sighting Tip for ${alertItem.subject_name || alertItem.title}`}
              >
                <Eye color={tokens.colors.text.white} size={18} />
                <Text style={styles.sightingBtnText}>Send Sighting Tip to Police</Text>
              </TouchableOpacity>
            </View>
          );
        })
      )}

      {/* Sighting Tip Submission Sheet / Modal */}
      <Modal
        visible={isTipModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          setIsTipModalOpen(false);
        }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.xs }}>
                  <Eye color={tokens.colors.status.warning} size={20} />
                  <Text style={styles.modalTitle}>Submit Sighting Tip</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    Keyboard.dismiss();
                    setIsTipModalOpen(false);
                  }}
                  style={styles.modalCloseBtn}
                >
                  <X color={tokens.colors.text.secondary} size={18} />
                </TouchableOpacity>
              </View>

              {selectedAlert && (
                <View style={styles.modalTargetBox}>
                  <Text style={styles.modalTargetLabel}>Subject / Alert:</Text>
                  <Text style={styles.modalTargetName}>
                    {selectedAlert.subject_name || selectedAlert.title}
                  </Text>
                </View>
              )}

              <Text style={styles.modalSub}>
                Your live coordinates ({coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}) will be attached to direct police search patrols.
              </Text>

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4 }}>
                <TouchableOpacity
                  onPress={Keyboard.dismiss}
                  style={{ paddingVertical: 2, paddingHorizontal: 6, backgroundColor: 'rgba(252, 209, 22, 0.1)', borderRadius: tokens.radius.sm }}
                >
                  <Text style={{ color: tokens.colors.brand.gold, fontSize: tokens.typography.fontSize.xs, fontWeight: 'bold' }}>
                    ✓ Hide Keyboard
                  </Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                placeholder="Describe where you saw the subject/suspect, direction of movement, vehicle plate number, or appearance details..."
                placeholderTextColor={tokens.colors.text.muted}
                value={tipDescription}
                onChangeText={setTipDescription}
                multiline
              />

              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  handleSendAmberTip();
                }}
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
        </TouchableWithoutFeedback>
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
  loadingContainer: {
    padding: tokens.spacing.xxl,
    alignItems: 'center',
    gap: tokens.spacing.md
  },
  loadingText: {
    color: tokens.colors.text.secondary,
    fontSize: tokens.typography.fontSize.xs
  },
  emptyContainer: {
    backgroundColor: tokens.colors.surface.card,
    padding: tokens.spacing.xl,
    borderRadius: tokens.radius.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.border.subtle,
    gap: tokens.spacing.sm
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing.xs
  },
  emptyTitle: {
    color: tokens.colors.text.white,
    fontSize: tokens.typography.fontSize.md,
    fontWeight: '800'
  },
  emptySub: {
    color: tokens.colors.text.secondary,
    fontSize: tokens.typography.fontSize.xs,
    textAlign: 'center',
    lineHeight: tokens.typography.lineHeight.xs,
    paddingHorizontal: tokens.spacing.md
  },
  refreshBtn: {
    marginTop: tokens.spacing.sm,
    backgroundColor: tokens.colors.border.subtle,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.md
  },
  refreshBtnText: {
    color: tokens.colors.brand.gold,
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: 'bold'
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
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.sm
  },
  amberPillText: {
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
  identityRow: {
    flexDirection: 'row',
    gap: tokens.spacing.md,
    alignItems: 'center'
  },
  subjectImage: {
    width: 80,
    height: 80,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.bg.base,
    borderWidth: 1,
    borderColor: tokens.colors.border.subtle
  },
  placeholderImageBox: {
    width: 80,
    height: 80,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.bg.base,
    borderWidth: 1,
    borderColor: tokens.colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4
  },
  placeholderImageText: {
    color: tokens.colors.text.muted,
    fontSize: 8,
    textAlign: 'center',
    marginTop: 2
  },
  identityInfo: {
    flex: 1,
    gap: 2
  },
  amberSubject: {
    color: tokens.colors.text.white,
    fontSize: tokens.typography.fontSize.md,
    fontWeight: '800'
  },
  subjectAgeText: {
    color: tokens.colors.brand.gold,
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: 'bold'
  },
  lastSeenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2
  },
  lastSeenText: {
    color: tokens.colors.text.muted,
    fontSize: tokens.typography.fontSize.xxs,
    flex: 1
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
  modalTargetBox: {
    backgroundColor: tokens.colors.bg.base,
    padding: tokens.spacing.sm,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    borderColor: tokens.colors.border.subtle
  },
  modalTargetLabel: {
    color: tokens.colors.text.muted,
    fontSize: tokens.typography.fontSize.xxs,
    fontWeight: 'bold'
  },
  modalTargetName: {
    color: tokens.colors.brand.gold,
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: 'bold'
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
