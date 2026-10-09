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
  RefreshControl,
  Keyboard,
  TouchableWithoutFeedback,
  Share
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
  ShieldCheck,
  ThumbsUp,
  Image as ImageIcon,
  CheckCircle2,
  Share2,
  X,
  Filter
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

export interface MobilePublicCivicBulletin {
  id: string;
  tracking_code: string;
  category: string;
  title: string;
  description: string;
  location_name: string;
  ghanapost_code?: string;
  region: string;
  latitude: number;
  longitude: number;
  severity: string;
  status: string;
  assigned_agency?: string;
  public_corroborations: number;
  created_at: string;
}

type BulletinFilter = 'ALL' | 'EMERGENCY' | 'CIVIC';

interface AmberAlertsScreenProps {
  coords: GpsCoordinates | null;
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
  const [activeFilter, setActiveFilter] = useState<BulletinFilter>('ALL');
  const [emergencyAlerts, setEmergencyAlerts] = useState<MobileEmergencyAlert[]>([]);
  const [civicBulletins, setCivicBulletins] = useState<MobilePublicCivicBulletin[]>([]);
  const [corroboratedIds, setCorroboratedIds] = useState<Record<string, boolean>>({});
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  
  // Sighting tip modal state
  const [selectedAlert, setSelectedAlert] = useState<MobileEmergencyAlert | null>(null);
  const [isTipModalOpen, setIsTipModalOpen] = useState<boolean>(false);
  const [tipDescription, setTipDescription] = useState<string>('');
  const [isSubmittingTip, setIsSubmittingTip] = useState<boolean>(false);

  // Fetch both Emergency Alerts and Published Public Incidents
  const fetchAllBulletins = useCallback(async () => {
    try {
      const nowIso = new Date().toISOString();

      // 1. Fetch Emergency & Amber Alerts
      const { data: amberData, error: amberErr } = await supabase
        .from('emergency_alerts')
        .select('*')
        .eq('is_active', true)
        .gte('active_until', nowIso)
        .order('created_at', { ascending: false });

      if (amberErr) {
        console.warn('[AlertsHub] Emergency alerts query notice:', amberErr.message);
      } else {
        setEmergencyAlerts((amberData as MobileEmergencyAlert[]) || []);
      }

      // 2. Fetch Officer-Published Civic Bulletins
      const { data: civicData, error: civicErr } = await supabase
        .from('incidents')
        .select('id, tracking_code, category, title, description, location_name, ghanapost_code, region, latitude, longitude, severity, status, assigned_agency, public_corroborations, created_at')
        .eq('is_public_published', true)
        .order('created_at', { ascending: false });

      if (civicErr) {
        console.warn('[AlertsHub] Public civic bulletins query notice:', civicErr.message);
      } else {
        setCivicBulletins((civicData as MobilePublicCivicBulletin[]) || []);
      }
    } catch (err) {
      console.warn('[AlertsHub] Network fetch exception:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllBulletins();

    // Subscribe to realtime updates on both tables
    const amberChannel = supabase
      .channel('mobile_emergency_alerts_feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'emergency_alerts' }, () => {
        fetchAllBulletins();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => {
        fetchAllBulletins();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(amberChannel);
    };
  }, [fetchAllBulletins]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    safeHaptics.light();
    fetchAllBulletins();
  };

  // Corroborate Civic Bulletin
  const handleCorroborate = async (bulletinId: string) => {
    if (corroboratedIds[bulletinId]) {
      Alert.alert('Already Corroborated', 'You have already confirmed this safety hazard. Thank you for assisting emergency services!');
      return;
    }

    safeHaptics.success();
    setCorroboratedIds(prev => ({ ...prev, [bulletinId]: true }));
    setCivicBulletins(prev =>
      prev.map(b => (b.id === bulletinId ? { ...b, public_corroborations: (b.public_corroborations || 0) + 1 } : b))
    );
    announceAccessibility('Safety hazard corroborated. Count updated on Police CAD.');

    try {
      await supabase.rpc('increment_corroboration', { row_id: bulletinId });
    } catch (e) {
      console.warn('[AlertsHub] Corroboration RPC fallback:', e);
    }
  };

  // Share Safety Bulletin
  const handleShareBulletin = async (title: string, location: string, trackingCode: string) => {
    try {
      await Share.share({
        message: `🚨 Ghana CitizenAlert Public Safety Bulletin: ${title}\n📍 Location: ${location}\n🛡️ Case Ref: ${trackingCode}\nStay alert and stay safe.`
      });
    } catch (e) {}
  };

  // Open Sighting Tip Modal for Amber Alerts
  const handleOpenTipModal = (alertItem: MobileEmergencyAlert) => {
    setSelectedAlert(alertItem);
    setTipDescription('');
    setIsTipModalOpen(true);
    safeHaptics.light();
  };

  const handleSendAmberTip = async () => {
    if (!selectedAlert) return;
    if (!tipDescription.trim()) {
      Alert.alert('Missing Details', 'Please provide a brief description of your sighting.');
      return;
    }

    if (!coords || (coords.latitude === 0 && coords.longitude === 0)) {
      safeHaptics.warning();
      Alert.alert('GPS Fix Needed', 'Location unavailable. Refresh GPS or move outdoors to attach live sighting coordinates.');
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

      const { error } = await supabase.from('alert_sightings').insert(payload);

      if (error) throw error;

      safeHaptics.success();
      announceAccessibility('Sighting tip transmitted to Police Operations.');
      setIsTipModalOpen(false);
      setTipDescription('');
      Alert.alert(
        '✅ Sighting Transmitted',
        'Your sighting details and live coordinates have been transmitted directly to the Police Operations Room.'
      );
    } catch (e: any) {
      console.warn('[AlertsHub] Error transmitting sighting:', e?.message || e);
      safeHaptics.warning();
      Alert.alert(
        '⚠️ Transmission Failed',
        `Could not transmit sighting tip: ${e?.message || 'Network error'}. Would you like to retry?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: () => handleSendAmberTip() }
        ]
      );
    } finally {
      setIsSubmittingTip(false);
    }
  };

  const totalBulletinsCount = emergencyAlerts.length + civicBulletins.length;

  return (
    <View style={styles.section}>
      {/* Geofence Hub Header */}
      <View style={styles.geofenceHeader}>
        <Radio color={tokens.colors.status.warning} size={18} />
        <Text style={styles.geofenceHeaderText}>NATIONAL PUBLIC SAFETY & EMERGENCY ALERTS</Text>
      </View>

      {/* Act 843 Privacy & Sanitization Banner */}
      <View style={styles.act843Banner}>
        <ShieldCheck color={tokens.colors.police.badge} size={16} />
        <Text style={styles.act843BannerText}>
          <Text style={{ fontWeight: 'bold', color: tokens.colors.text.white }}>Act 843 Sanitized Feed: </Text>
          Official police bulletins broadcast verified hazard warnings without private citizen identities.
        </Text>
      </View>

      {/* Filter Chips Bar */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          onPress={() => {
            safeHaptics.light();
            setActiveFilter('ALL');
          }}
          style={[styles.filterChip, activeFilter === 'ALL' && styles.filterChipActive]}
        >
          <Text style={[styles.filterChipText, activeFilter === 'ALL' && styles.filterChipTextActive]}>
            All ({totalBulletinsCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            safeHaptics.light();
            setActiveFilter('EMERGENCY');
          }}
          style={[styles.filterChip, activeFilter === 'EMERGENCY' && styles.filterChipActiveAmber]}
        >
          <AlertTriangle color={activeFilter === 'EMERGENCY' ? tokens.colors.status.amber : tokens.colors.text.muted} size={12} />
          <Text style={[styles.filterChipText, activeFilter === 'EMERGENCY' && styles.filterChipTextActive]}>
            Emergency ({emergencyAlerts.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            safeHaptics.light();
            setActiveFilter('CIVIC');
          }}
          style={[styles.filterChip, activeFilter === 'CIVIC' && styles.filterChipActiveCivic]}
        >
          <ShieldCheck color={activeFilter === 'CIVIC' ? tokens.colors.brand.gold : tokens.colors.text.muted} size={12} />
          <Text style={[styles.filterChipText, activeFilter === 'CIVIC' && styles.filterChipTextActive]}>
            Civic Feeds ({civicBulletins.length})
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tokens.colors.brand.gold} />
          <Text style={styles.loadingText}>Connecting to National Safety Broadcast Relay...</Text>
        </View>
      ) : totalBulletinsCount === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <ShieldAlert color={tokens.colors.text.muted} size={36} />
          </View>
          <Text style={styles.emptyTitle}>No Active Safety Bulletins</Text>
          <Text style={styles.emptySub}>
            There are currently no active emergency broadcasts or road hazard feeds in your district.
          </Text>
          <TouchableOpacity
            onPress={handleRefresh}
            style={styles.refreshBtn}
            accessibilityRole="button"
            accessibilityLabel="Refresh Alert Feed"
          >
            <Text style={styles.refreshBtnText}>Check for Updates</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ gap: tokens.spacing.md }}>
          {/* 1. RENDER EMERGENCY & AMBER ALERTS */}
          {(activeFilter === 'ALL' || activeFilter === 'EMERGENCY') &&
            emergencyAlerts.map((alertItem) => {
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
            })}

          {/* 2. RENDER OFFICER-PUBLISHED CIVIC BULLETINS */}
          {(activeFilter === 'ALL' || activeFilter === 'CIVIC') &&
            civicBulletins.map((bulletin) => {
              const isCorroborated = Boolean(corroboratedIds[bulletin.id]);
              const agencyLabel = bulletin.assigned_agency || (
                bulletin.category === 'TRAFFIC_RECKLESS'
                  ? 'MTTD'
                  : bulletin.category === 'GALAMSEY_ENVIRONMENTAL'
                  ? 'EPA'
                  : bulletin.category === 'DOMESTIC_ABUSE'
                  ? 'DOVVSU'
                  : 'POLICE CID'
              );

              return (
                <View key={bulletin.id} style={styles.civicCard}>
                  {/* Header Row: Tracking Code & Agency Pill */}
                  <View style={styles.civicHeaderRow}>
                    <View style={styles.civicBadgeGroup}>
                      <Text style={styles.trackingCodePill}>{bulletin.tracking_code}</Text>
                      <View style={styles.agencyPill}>
                        <Text style={styles.agencyPillText}>🚔 {agencyLabel}</Text>
                      </View>
                    </View>
                    <View style={styles.verifiedPill}>
                      <CheckCircle2 color={tokens.colors.status.success} size={12} />
                      <Text style={styles.verifiedPillText}>Verified Hazard</Text>
                    </View>
                  </View>

                  {/* Title & Description */}
                  <View style={{ gap: 4 }}>
                    <Text style={styles.civicTitle}>{bulletin.title}</Text>
                    <Text style={styles.civicDescription}>{bulletin.description}</Text>
                  </View>

                  {/* Location & GPS Landmark */}
                  <View style={styles.civicLocationBox}>
                    <MapPin color={tokens.colors.brand.gold} size={14} />
                    <Text style={styles.civicLocationText} numberOfLines={2}>
                      {bulletin.location_name} {bulletin.ghanapost_code ? `(${bulletin.ghanapost_code})` : ''} • {bulletin.region}
                    </Text>
                  </View>

                  {/* Action Row: Corroborate & Share */}
                  <View style={styles.civicActionRow}>
                    <TouchableOpacity
                      onPress={() => handleCorroborate(bulletin.id)}
                      style={[styles.corroborateBtn, isCorroborated && styles.corroborateBtnActive]}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel="Corroborate this hazard"
                    >
                      <ThumbsUp color={isCorroborated ? tokens.colors.status.success : tokens.colors.text.white} size={16} />
                      <Text style={[styles.corroborateBtnText, isCorroborated && { color: tokens.colors.status.success }]}>
                        {isCorroborated ? 'Corroborated' : 'Confirm Hazard'} ({bulletin.public_corroborations || 0})
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleShareBulletin(bulletin.title, bulletin.location_name, bulletin.tracking_code)}
                      style={styles.shareBtn}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel="Share Bulletin"
                    >
                      <Share2 color={tokens.colors.text.muted} size={16} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
        </View>
      )}

      {/* Sighting Tip Submission Sheet / Modal for Amber Alerts */}
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
                  <ShieldAlert color={tokens.colors.status.warning} size={20} />
                  <Text style={styles.modalTitle}>Sighting Intelligence</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setIsTipModalOpen(false)}
                  style={styles.modalCloseBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Close Modal"
                >
                  <X color={tokens.colors.text.muted} size={18} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalTargetBox}>
                <Text style={styles.modalTargetLabel}>EMERGENCY ALERT TARGET:</Text>
                <Text style={styles.modalTargetName}>
                  {selectedAlert?.subject_name || selectedAlert?.title}
                </Text>
              </View>

              <Text style={styles.modalSub}>
                Provide details about where and when you observed the person or vehicle. Your current GPS fix is automatically attached for dispatch triage.
              </Text>

              <TextInput
                style={[styles.input, { height: 110, textAlignVertical: 'top' }]}
                placeholder="e.g. Spotted vehicle heading towards Kasoa tollbooth at 10:15 AM..."
                placeholderTextColor={tokens.colors.text.muted}
                value={tipDescription}
                onChangeText={setTipDescription}
                multiline
                numberOfLines={4}
                maxLength={400}
              />

              <TouchableOpacity
                onPress={handleSendAmberTip}
                disabled={isSubmittingTip}
                style={[styles.sightingSubmitBtn, isSubmittingTip && { opacity: 0.6 }]}
                accessibilityRole="button"
                accessibilityLabel="Submit Sighting Tip"
              >
                {isSubmittingTip ? (
                  <ActivityIndicator color={tokens.colors.text.white} size="small" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.xs }}>
                    <Send color={tokens.colors.text.white} size={16} />
                    <Text style={styles.sightingSubmitBtnText}>Transmit Sighting to Police</Text>
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
    gap: tokens.spacing.md,
    paddingBottom: tokens.spacing.xl
  },
  geofenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    backgroundColor: tokens.colors.surface.card,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.status.warning
  },
  geofenceHeaderText: {
    color: tokens.colors.text.white,
    fontSize: tokens.typography.fontSize.xs,
    fontFamily: tokens.typography.fontFamily.monoBold,
    fontWeight: '900',
    letterSpacing: 0.4,
    flex: 1
  },
  act843Banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    backgroundColor: 'rgba(30, 58, 138, 0.25)',
    padding: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)'
  },
  act843BannerText: {
    color: tokens.colors.police.badge,
    fontSize: tokens.typography.fontSize.xxs,
    lineHeight: tokens.typography.lineHeight.xs,
    flex: 1
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.colors.surface.card,
    borderWidth: 1,
    borderColor: tokens.colors.border.subtle
  },
  filterChipActive: {
    backgroundColor: tokens.colors.police.dark,
    borderColor: tokens.colors.police.badge
  },
  filterChipActiveAmber: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: tokens.colors.status.amber
  },
  filterChipActiveCivic: {
    backgroundColor: 'rgba(252, 209, 22, 0.15)',
    borderColor: tokens.colors.brand.gold
  },
  filterChipText: {
    color: tokens.colors.text.secondary,
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: '700'
  },
  filterChipTextActive: {
    color: tokens.colors.text.white,
    fontWeight: '900'
  },
  loadingContainer: {
    padding: tokens.spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.md
  },
  loadingText: {
    color: tokens.colors.text.secondary,
    fontSize: tokens.typography.fontSize.xs
  },
  emptyContainer: {
    backgroundColor: tokens.colors.surface.card,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.sm,
    borderWidth: 1,
    borderColor: tokens.colors.border.subtle,
    marginTop: tokens.spacing.sm
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: tokens.colors.bg.base,
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
    color: tokens.colors.text.muted,
    fontSize: tokens.typography.fontSize.xs,
    textAlign: 'center',
    lineHeight: tokens.typography.lineHeight.sm,
    maxWidth: 280
  },
  refreshBtn: {
    marginTop: tokens.spacing.sm,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.lg,
    backgroundColor: tokens.colors.bg.base,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.colors.brand.gold
  },
  refreshBtnText: {
    color: tokens.colors.brand.gold,
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: 'bold'
  },
  amberCard: {
    backgroundColor: tokens.colors.surface.card,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.status.warning,
    padding: tokens.spacing.md,
    gap: tokens.spacing.md
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
    paddingVertical: 4,
    paddingHorizontal: tokens.spacing.sm,
    borderRadius: tokens.radius.sm
  },
  amberPillText: {
    fontSize: tokens.typography.fontSize.xxs,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  radiusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: tokens.colors.bg.base,
    paddingVertical: 4,
    paddingHorizontal: tokens.spacing.sm,
    borderRadius: tokens.radius.sm,
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

  /* Civic Bulletin Cards */
  civicCard: {
    backgroundColor: tokens.colors.surface.card,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.border.subtle,
    padding: tokens.spacing.md,
    gap: tokens.spacing.md
  },
  civicHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  civicBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  trackingCodePill: {
    backgroundColor: tokens.colors.bg.base,
    color: tokens.colors.brand.gold,
    fontSize: tokens.typography.fontSize.xxs,
    fontFamily: tokens.typography.fontFamily.monoBold,
    fontWeight: 'bold',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: tokens.colors.border.subtle
  },
  agencyPill: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4
  },
  agencyPillText: {
    color: tokens.colors.police.badge,
    fontSize: tokens.typography.fontSize.xxs,
    fontWeight: '800'
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  verifiedPillText: {
    color: tokens.colors.status.success,
    fontSize: tokens.typography.fontSize.xxs,
    fontWeight: 'bold'
  },
  civicTitle: {
    color: tokens.colors.text.white,
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: '800'
  },
  civicDescription: {
    color: tokens.colors.text.secondary,
    fontSize: tokens.typography.fontSize.xs,
    lineHeight: tokens.typography.lineHeight.xs
  },
  civicLocationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: tokens.colors.bg.base,
    padding: tokens.spacing.sm,
    borderRadius: tokens.radius.sm
  },
  civicLocationText: {
    color: tokens.colors.text.muted,
    fontSize: tokens.typography.fontSize.xxs,
    flex: 1
  },
  civicActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm
  },
  corroborateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: tokens.colors.police.dark,
    borderWidth: 1,
    borderColor: tokens.colors.police.badge,
    minHeight: 38,
    borderRadius: tokens.radius.md
  },
  corroborateBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: tokens.colors.status.success
  },
  corroborateBtnText: {
    color: tokens.colors.text.white,
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: '800'
  },
  shareBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colors.bg.base,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.colors.border.subtle
  },

  /* Modal Styles */
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
