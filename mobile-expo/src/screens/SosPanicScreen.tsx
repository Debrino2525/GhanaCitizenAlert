import React, { memo, useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Linking,
  Animated,
  ActivityIndicator
} from 'react-native';
import {
  Radio,
  PhoneCall,
  AlertOctagon,
  XCircle,
  ShieldCheck,
  Flame,
  Volume2,
  RefreshCw,
  AlertTriangle
} from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import * as Crypto from 'expo-crypto';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { GpsCoordinates, LocationSource } from '../types';
import { effectiveLocationSource } from '../hooks/useGpsLocation';
import { tokens } from '../theme/tokens';
import { safeHaptics, announceAccessibility } from '../utils/haptics';

export const SOS_HOLD_MS = 1500; // Hold duration in milliseconds

interface SosPanicScreenProps {
  coords: GpsCoordinates | null;
  gpsAccuracy: number | null;
  locationSource?: LocationSource;
  gpsFixAgeSeconds?: number | null;
  locationName: string;
  landmark: string;
  region: string;
  isAnonymous: boolean;
  reporterPhone: string;
}

function generateSosTrackingCode(): string {
  const bytes = Crypto.getRandomBytes(6);
  let val = 0n;
  for (let i = 0; i < 6; i++) {
    val = (val << 8n) | BigInt(bytes[i]);
  }
  const alphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  let suffix = '';
  for (let i = 0; i < 8; i++) {
    suffix += alphabet[Number(val % BigInt(alphabet.length))];
    val /= BigInt(alphabet.length);
  }
  return `SOS-${suffix}`;
}

export interface SosResolvedLocation {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  locationSource: LocationSource;
  fixAgeSeconds: number | null;
}

/**
 * Multi-tiered truthful location resolution for Emergency SOS.
 * Never invents coordinates or defaults to unverified locations.
 */
async function getBestAvailableLocation(
  fallbackCoords: GpsCoordinates | null,
  fallbackAccuracy: number | null,
  fallbackSource: LocationSource = 'UNAVAILABLE',
  fallbackAge: number | null = null
): Promise<SosResolvedLocation> {
  const now = Date.now();

  // Tier 1: Fast fresh position check (3.5s timeout)
  try {
    const locPromise = Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High
    });
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500));
    const loc = await Promise.race([locPromise, timeoutPromise]);
    if (loc?.coords && loc.coords.latitude !== 0 && loc.coords.longitude !== 0) {
      const ageSeconds = Math.max(0, Math.floor((now - loc.timestamp) / 1000));
      const acc = typeof loc.coords.accuracy === 'number' ? Math.round(loc.coords.accuracy * 10) / 10 : null;
      const source = effectiveLocationSource(loc.timestamp, acc, now);

      return {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: acc,
        locationSource: source,
        fixAgeSeconds: ageSeconds
      };
    }
  } catch (e) {}

  // Tier 2: Last Known Location from device sensor cache
  try {
    const lastKnown = await Location.getLastKnownPositionAsync();
    if (lastKnown?.coords && lastKnown.coords.latitude !== 0 && lastKnown.coords.longitude !== 0) {
      const ageSeconds = Math.max(0, Math.floor((now - lastKnown.timestamp) / 1000));
      const acc = typeof lastKnown.coords.accuracy === 'number' ? Math.round(lastKnown.coords.accuracy * 10) / 10 : null;
      const source = effectiveLocationSource(lastKnown.timestamp, acc, now);

      return {
        latitude: lastKnown.coords.latitude,
        longitude: lastKnown.coords.longitude,
        accuracy: acc,
        locationSource: source,
        fixAgeSeconds: ageSeconds
      };
    }
  } catch (e) {}

  // Tier 3: Location hook coordinates passed down via props
  if (fallbackCoords && fallbackCoords.latitude !== 0 && fallbackCoords.longitude !== 0) {
    const source = effectiveLocationSource(undefined, fallbackAccuracy, now, fallbackSource);
    return {
      latitude: fallbackCoords.latitude,
      longitude: fallbackCoords.longitude,
      accuracy: fallbackAccuracy,
      locationSource: source,
      fixAgeSeconds: fallbackAge ?? 30
    };
  }

  // Tier 4: No GPS available - Send UNAVAILABLE with NULL coordinates (Never invent a point)
  return {
    latitude: null,
    longitude: null,
    accuracy: null,
    locationSource: 'UNAVAILABLE',
    fixAgeSeconds: null
  };
}

export const SosPanicScreen: React.FC<SosPanicScreenProps> = memo(({
  coords,
  gpsAccuracy,
  locationSource = 'UNAVAILABLE',
  gpsFixAgeSeconds = null,
  locationName,
  landmark,
  region,
  isAnonymous,
  reporterPhone
}) => {
  const [sosActive, setSosActive] = useState(false);
  const [activeIncidentId, setActiveIncidentId] = useState<string | null>(null);
  const [activeTrackingCode, setActiveTrackingCode] = useState<string | null>(null);
  const [activeCoords, setActiveCoords] = useState<SosResolvedLocation | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);

  const [successfulPings, setSuccessfulPings] = useState(0);
  const [failedPings, setFailedPings] = useState(0);

  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0); // 0 to 1

  const holdTimerRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const activeIncidentIdRef = useRef<string | null>(null);
  activeIncidentIdRef.current = activeIncidentId;
  const activeTrackingCodeRef = useRef<string | null>(null);
  activeTrackingCodeRef.current = activeTrackingCode;
  const sosWatcherRef = useRef<Location.LocationSubscription | null>(null);

  // Pulse animation for active beacon
  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;
    if (sosActive) {
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.12,
            duration: 800,
            useNativeDriver: true
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true
          })
        ])
      );
      animation.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => {
      animation?.stop();
    };
  }, [sosActive, pulseAnim]);

  // Periodic CAD GPS coordinate pinging every 10s while SOS is active
  useEffect(() => {
    let pingInterval: any;
    if (sosActive && activeIncidentId) {
      pingInterval = setInterval(async () => {
        const fallbackGps: GpsCoordinates | null = (activeCoords && activeCoords.latitude !== null && activeCoords.longitude !== null)
          ? { latitude: activeCoords.latitude, longitude: activeCoords.longitude }
          : null;
        const freshFix = await getBestAvailableLocation(
          fallbackGps,
          activeCoords?.accuracy ?? null,
          activeCoords?.locationSource ?? 'UNAVAILABLE',
          activeCoords?.fixAgeSeconds ?? null
        );

        try {
          const authUser = (await supabase.auth.getUser().catch(() => ({ data: { user: null } }))).data?.user;
          const reporterId = !isAnonymous && authUser?.id ? authUser.id : null;

          if (freshFix.latitude !== null && freshFix.longitude !== null) {
            const { error } = await supabase.from('sos_pings').insert({
              incident_id: activeIncidentIdRef.current,
              reporter_id: reporterId,
              lat: freshFix.latitude,
              lng: freshFix.longitude,
              accuracy: freshFix.accuracy
            });

            if (!error) {
              setSuccessfulPings((prev) => prev + 1);
              setActiveCoords(freshFix);
              safeHaptics.light();
            } else {
              setFailedPings((prev) => prev + 1);
            }
          }
        } catch (err) {
          setFailedPings((prev) => prev + 1);
        }
      }, 10000);
    }
    return () => clearInterval(pingInterval);
  }, [sosActive, activeIncidentId, isAnonymous, activeCoords]);

  const triggerSosDispatch = useCallback(async () => {
    setIsActivating(true);
    setActivationError(null);
    safeHaptics.heavy();
    announceAccessibility('Transmitting emergency distress beacon to Police Command...');

    // 1. Acquire best available location without delay or timeout
    const bestGps = await getBestAvailableLocation(coords, gpsAccuracy, locationSource, gpsFixAgeSeconds);

    // 2. Prepare payload with crypto UUID and retry on unique violation (code 23505)
    const incidentId = Crypto.randomUUID();
    let authUser = null;
    try {
      authUser = (await supabase.auth.getUser()).data?.user;
    } catch (e) {}
    const reporterId = !isAnonymous && authUser?.id ? authUser.id : null;

    let attempts = 0;
    let insertSuccess = false;
    let lastError = '';
    let trackingCodeUsed = '';

    const effectiveLocationName = isAnonymous
      ? 'Withheld (anonymous)'
      : (landmark ? `${landmark} (${locationName})` : (locationName || (bestGps.locationSource === 'UNAVAILABLE' ? 'Location pending' : 'SOS Distress Beacon')));

    const descCoords = bestGps.latitude !== null && bestGps.longitude !== null
      ? `Coordinates: ${bestGps.latitude.toFixed(5)}, ${bestGps.longitude.toFixed(5)} (±${bestGps.accuracy ?? 25}m, ${bestGps.locationSource}).`
      : 'Coordinates: Location unavailable (pending satellite lock).';

    while (attempts < 3 && !insertSuccess) {
      attempts++;
      trackingCodeUsed = generateSosTrackingCode();
      const payload: any = {
        id: incidentId,
        tracking_code: trackingCodeUsed,
        category: 'CRIMINAL_OFFENSE',
        title: '🚨 EMERGENCY SOS BEACON (ACTIVE)',
        description: `CITIZEN EMERGENCY DISTRESS BEACON ACTIVATED. ${descCoords} Sent to Police Command.`,
        location_name: effectiveLocationName,
        ghanapost_code: null,
        region: region || 'UNKNOWN',
        latitude: bestGps.latitude,
        longitude: bestGps.longitude,
        location_source: bestGps.locationSource,
        gps_fix_age_s: bestGps.fixAgeSeconds,
        gps_accuracy_m: (bestGps.locationSource === 'LIVE' || bestGps.locationSource === 'LAST_KNOWN') && typeof bestGps.accuracy === 'number'
          ? bestGps.accuracy
          : null,
        media: [],
        is_anonymous: isAnonymous,
        reporter_data: {
          isAnonymous: isAnonymous,
          phone: isAnonymous ? null : (reporterPhone || null),
          isEmergencyPanic: true,
          trustScore: 99
        },
        assigned_agency: 'GPS_CID',
        status: 'RECEIVED_PENDING_TRIAGE',
        severity: 'RED',
        is_public_eligible: false,
        is_public_published: false,
        public_corroborations: 0
      };

      if (reporterId) {
        payload.reporter_id = reporterId;
      }

      const { error } = await supabase.from('incidents').insert(payload);
      if (!error) {
        insertSuccess = true;
        break;
      }

      if (error.code === '23505') {
        // Unique tracking_code violation - retry with a new code
        continue;
      }

      lastError = error.message;
      break;
    }

    setIsActivating(false);

    if (insertSuccess) {
      setActiveIncidentId(incidentId);
      setActiveTrackingCode(trackingCodeUsed);
      setActiveCoords(bestGps);
      setSuccessfulPings(1);
      setFailedPings(0);
      setSosActive(true);
      safeHaptics.success();
      announceAccessibility('Emergency SOS distress beacon transmitted. Location sent to Police Command.');

      if (__DEV__) {
        console.log(
          `[SOS Dispatch] Beacon transmitted: tracking_code=${trackingCodeUsed}, source=${bestGps.locationSource}, age=${bestGps.fixAgeSeconds ?? 0}s, coords=(${bestGps.latitude ?? 'NULL'}, ${bestGps.longitude ?? 'NULL'}), accuracy=±${bestGps.accuracy ?? 'N/A'}m`
        );
      }

      // Start background watcher if initial fix was not live
      if (bestGps.locationSource !== 'LIVE') {
        try {
          if (sosWatcherRef.current) {
            sosWatcherRef.current.remove();
          }
          sosWatcherRef.current = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              timeInterval: 2000,
              distanceInterval: 2,
            },
            async (freshLoc) => {
              const nowMs = Date.now();
              const fixAge = Math.max(0, Math.floor((nowMs - freshLoc.timestamp) / 1000));
              const freshAcc = typeof freshLoc.coords.accuracy === 'number'
                ? Math.round(freshLoc.coords.accuracy * 10) / 10
                : null;
              const source: LocationSource = effectiveLocationSource(freshLoc.timestamp, freshAcc, nowMs);
              const freshResolved: SosResolvedLocation = {
                latitude: freshLoc.coords.latitude,
                longitude: freshLoc.coords.longitude,
                accuracy: freshAcc,
                locationSource: source,
                fixAgeSeconds: fixAge,
              };
              setActiveCoords(freshResolved);

              if (__DEV__) {
                console.log(
                  `[SOS Watcher] Fix received: source=${source}, age=${fixAge}s, coords=(${freshLoc.coords.latitude.toFixed(5)}, ${freshLoc.coords.longitude.toFixed(5)}), acc=±${freshAcc}m. Upgrading report...`
                );
              }

              // Update the live incident location in Supabase via server RPC
              try {
                const { data: rpcResult, error: rpcErr } = await supabase.rpc('update_incident_location', {
                  p_tracking_code: trackingCodeUsed,
                  p_lat: freshLoc.coords.latitude,
                  p_lng: freshLoc.coords.longitude,
                  p_accuracy: freshAcc,
                  p_source: source,
                  p_age_s: fixAge,
                });

                if (rpcErr || rpcResult === false) {
                  console.warn('[SOS Location Update Rejected/Error]', rpcErr?.message || `update_incident_location returned false for ${trackingCodeUsed}`);
                } else {
                  if (__DEV__) {
                    console.log(`[SOS Watcher] Successfully updated ${trackingCodeUsed} via update_incident_location (source=${source}, age=${fixAge}s)`);
                  }
                }
              } catch (e: any) {
                console.warn('[SOS Location Update Exception]', e?.message);
              }
            }
          );
        } catch (watchErr) {
          console.warn('[SOS Background Watcher Error]', watchErr);
        }
      }
    } else {
      safeHaptics.warning();
      setActivationError(`Failed to transmit distress beacon to Police Command: ${lastError || 'Network/Server Error'}. Please use the direct emergency call buttons below.`);
    }
  }, [coords, gpsAccuracy, locationSource, gpsFixAgeSeconds, landmark, locationName, region, isAnonymous, reporterPhone]);

  const handlePressIn = () => {
    if (sosActive || isActivating) return;
    setIsHolding(true);
    startTimeRef.current = Date.now();
    safeHaptics.medium();

    holdTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(elapsed / SOS_HOLD_MS, 1);
      setHoldProgress(progress);

      if (elapsed >= SOS_HOLD_MS) {
        clearInterval(holdTimerRef.current);
        setIsHolding(false);
        setHoldProgress(0);
        triggerSosDispatch();
      } else if (elapsed > SOS_HOLD_MS * 0.5) {
        safeHaptics.light();
      }
    }, 40);
  };

  const handlePressOut = () => {
    if (sosActive || isActivating) return;
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
    }
    setIsHolding(false);
    setHoldProgress(0);
  };

  const handleCancelSos = () => {
    if (sosWatcherRef.current) {
      try {
        sosWatcherRef.current.remove();
      } catch {}
      sosWatcherRef.current = null;
    }
    setSosActive(false);
    setActiveIncidentId(null);
    setActiveTrackingCode(null);
    setSuccessfulPings(0);
    setFailedPings(0);
    safeHaptics.warning();
    announceAccessibility('Emergency distress beacon stopped on device.');

    Alert.alert(
      'Distress Beacon Stopped',
      'Live location transmissions have stopped on this device. Note: If you are safe or this was triggered in error, please call 191 to advise operators.',
      [{ text: 'OK' }]
    );
  };

  const handleCallEmergency = (number: string) => {
    safeHaptics.medium();
    Linking.openURL(`tel:${number}`).catch(() => {
      Alert.alert('Call Failed', `Please dial ${number} manually from your phone app.`);
    });
  };

  // SVG Progress Ring calculations
  const buttonRadius = 75;
  const strokeWidth = 6;
  const normalizedRadius = buttonRadius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - holdProgress * circumference;

  return (
    <View style={[styles.section, { alignItems: 'center' }]}>
      {/* Top Banner */}
      <View style={styles.bannerRow}>
        <AlertOctagon color={tokens.colors.status.danger} size={20} />
        <Text style={styles.sosHeadline}>NATIONAL EMERGENCY BEACON</Text>
      </View>

      <Text style={styles.sosSubtext}>
        Press and hold for 1.5 seconds to instantly transmit your live GPS coordinates to Police Command. The app must stay open while the beacon is active.
      </Text>

      {/* Error state if transmission failed */}
      {activationError && !sosActive && (
        <View style={styles.errorBanner}>
          <AlertTriangle color={tokens.colors.status.danger} size={20} />
          <View style={{ flex: 1 }}>
            <Text style={styles.errorBannerTitle}>Transmission Notice</Text>
            <Text style={styles.errorBannerText}>{activationError}</Text>
          </View>
          <TouchableOpacity
            onPress={triggerSosDispatch}
            disabled={isActivating}
            style={styles.retryBtn}
            accessibilityRole="button"
            accessibilityLabel="Retry SOS transmission"
          >
            <RefreshCw color={tokens.colors.text.white} size={14} />
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main Hold-to-Activate SOS Beacon Container */}
      <View style={styles.beaconOuterRing}>
        <Animated.View
          style={[
            styles.beaconMidRing,
            sosActive && { transform: [{ scale: pulseAnim }] }
          ]}
        >
          {/* Radial Progress Ring SVG */}
          {isHolding && !sosActive && !isActivating && (
            <Svg
              height="170"
              width="170"
              style={StyleSheet.absoluteFill}
            >
              <Circle
                stroke="rgba(255, 255, 255, 0.2)"
                fill="transparent"
                strokeWidth={strokeWidth}
                r={normalizedRadius}
                cx="85"
                cy="85"
              />
              <Circle
                stroke={tokens.colors.brand.gold}
                fill="transparent"
                strokeWidth={strokeWidth}
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                r={normalizedRadius}
                cx="85"
                cy="85"
                transform="rotate(-90 85 85)"
              />
            </Svg>
          )}

          <TouchableOpacity
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={sosActive || isActivating}
            style={[
              styles.sosBigBtn,
              sosActive && styles.sosBigBtnActive,
              isHolding && styles.sosBigBtnHolding,
              isActivating && styles.sosBigBtnHolding
            ]}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="Press and hold 1.5 seconds to send emergency location to Police Command"
            accessibilityHint="Hold down until haptic buzz confirms location transmission"
          >
            {isActivating ? (
              <ActivityIndicator size="large" color={tokens.colors.text.white} />
            ) : (
              <>
                <Radio color={tokens.colors.text.white} size={32} style={{ marginBottom: 4 }} />
                <Text style={styles.sosBigBtnText}>SOS</Text>
                <Text style={styles.sosBigBtnSub}>
                  {sosActive ? 'BEACON ACTIVE' : isHolding ? 'HOLDING...' : 'HOLD 1.5s'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Active Tracking Card */}
      {sosActive && activeCoords && (
        <View style={styles.sosActiveCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.xs }}>
            <Radio color={tokens.colors.status.danger} size={16} />
            <Text style={styles.sosActiveText}>LIVE LOCATION SENT TO POLICE COMMAND</Text>
          </View>

          <Text style={styles.sosActiveSub}>
            Tracking Code: {activeTrackingCode || 'SOS-ACTIVE'}
          </Text>
          <Text style={styles.sosActiveSub}>
            GPS: {activeCoords.latitude !== null && activeCoords.longitude !== null
              ? `${activeCoords.latitude.toFixed(5)}, ${activeCoords.longitude.toFixed(5)} (${activeCoords.locationSource}) ${activeCoords.accuracy !== null ? `(±${activeCoords.accuracy.toFixed(1)}m)` : ''}`
              : 'Location pending satellite lock (Tracking in background...)'}
          </Text>
          <Text style={styles.sosActiveSub}>
            Live Pings Sent: {successfulPings} {failedPings > 0 ? `(${failedPings} failed)` : ''}
          </Text>
          <Text style={styles.sosKeepOpenNotice}>
            ⚠️ Keep this app open to continue transmitting live location updates every 10 seconds.
          </Text>

          <TouchableOpacity
            onPress={handleCancelSos}
            style={styles.sosCancelBtn}
            accessibilityRole="button"
            accessibilityLabel="Stop Distress Beacon"
          >
            <XCircle color={tokens.colors.text.white} size={16} />
            <Text style={styles.sosCancelText}>Stop Distress Beacon</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Always-visible Direct Telephone Emergency Hotlines */}
      <View style={styles.hotlineSection}>
        <Text style={styles.hotlineTitle}>DIRECT NATIONAL EMERGENCY DIALERS</Text>
        <View style={styles.hotlineBtnRow}>
          <TouchableOpacity
            onPress={() => handleCallEmergency('191')}
            style={styles.hotlineBtn}
            accessibilityRole="button"
            accessibilityLabel="Call Ghana Police Service Emergency 191"
          >
            <ShieldCheck color={tokens.colors.brand.gold} size={18} />
            <View style={{ flex: 1 }}>
              <Text style={styles.hotlineBtnMain}>CALL 191</Text>
              <Text style={styles.hotlineBtnSub} numberOfLines={1}>Police Emergency</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleCallEmergency('112')}
            style={styles.hotlineBtn}
            accessibilityRole="button"
            accessibilityLabel="Call National Emergency Command 112"
          >
            <PhoneCall color={tokens.colors.police.badge} size={18} />
            <View style={{ flex: 1 }}>
              <Text style={styles.hotlineBtnMain}>CALL 112</Text>
              <Text style={styles.hotlineBtnSub} numberOfLines={1}>National Dispatch</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.hotlineBtnRow}>
          <TouchableOpacity
            onPress={() => handleCallEmergency('192')}
            style={styles.hotlineBtn}
            accessibilityRole="button"
            accessibilityLabel="Call Ghana National Fire Service 192"
          >
            <Flame color={tokens.colors.status.danger} size={18} />
            <View style={{ flex: 1 }}>
              <Text style={styles.hotlineBtnMain}>CALL 192</Text>
              <Text style={styles.hotlineBtnSub} numberOfLines={1}>Fire Service</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleCallEmergency('193')}
            style={styles.hotlineBtn}
            accessibilityRole="button"
            accessibilityLabel="Call National Ambulance Service 193"
          >
            <Volume2 color={tokens.colors.brand.green} size={18} />
            <View style={{ flex: 1 }}>
              <Text style={styles.hotlineBtnMain}>CALL 193</Text>
              <Text style={styles.hotlineBtnSub} numberOfLines={1}>Ambulance (NAS)</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    gap: tokens.spacing.lg
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    marginTop: tokens.spacing.sm
  },
  sosHeadline: {
    color: tokens.colors.status.danger,
    fontSize: tokens.typography.fontSize.lg,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  sosSubtext: {
    color: tokens.colors.text.secondary,
    fontSize: tokens.typography.fontSize.xs,
    textAlign: 'center',
    lineHeight: tokens.typography.lineHeight.xs,
    paddingHorizontal: tokens.spacing.lg
  },
  errorBanner: {
    width: '100%',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: tokens.colors.status.danger,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm
  },
  errorBannerTitle: {
    color: tokens.colors.status.danger,
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: 'bold'
  },
  errorBannerText: {
    color: tokens.colors.text.primary,
    fontSize: tokens.typography.fontSize.xxs,
    marginTop: 2
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: tokens.colors.status.danger,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.md
  },
  retryBtnText: {
    color: tokens.colors.text.white,
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: 'bold'
  },
  beaconOuterRing: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  beaconMidRing: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  sosBigBtn: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: tokens.colors.status.danger,
    borderWidth: 5,
    borderColor: tokens.colors.status.emergencyRing,
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.elevation.high
  },
  sosBigBtnHolding: {
    backgroundColor: tokens.colors.status.emergencyDark,
    transform: [{ scale: 0.98 }]
  },
  sosBigBtnActive: {
    backgroundColor: tokens.colors.status.emergencyDark,
    borderColor: tokens.colors.status.danger
  },
  sosBigBtnText: {
    color: tokens.colors.text.white,
    fontSize: tokens.typography.fontSize.xxl,
    fontWeight: '900'
  },
  sosBigBtnSub: {
    color: tokens.colors.brand.gold,
    fontSize: tokens.typography.fontSize.xxs,
    fontWeight: 'bold',
    letterSpacing: 1
  },
  sosActiveCard: {
    width: '100%',
    backgroundColor: tokens.colors.surface.card,
    padding: tokens.spacing.lg,
    borderRadius: tokens.radius.xl,
    borderWidth: 1.5,
    borderColor: tokens.colors.status.danger,
    alignItems: 'center',
    gap: tokens.spacing.xs,
    ...tokens.elevation.medium
  },
  sosActiveText: {
    color: tokens.colors.status.danger,
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: 'bold'
  },
  sosActiveSub: {
    color: tokens.colors.text.secondary,
    fontSize: tokens.typography.fontSize.xs
  },
  sosKeepOpenNotice: {
    color: tokens.colors.brand.gold,
    fontSize: tokens.typography.fontSize.xxs,
    textAlign: 'center',
    marginTop: tokens.spacing.xs
  },
  sosCancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    marginTop: tokens.spacing.sm,
    backgroundColor: tokens.colors.border.subtle,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.md
  },
  sosCancelText: {
    color: tokens.colors.text.white,
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: 'bold'
  },
  hotlineSection: {
    width: '100%',
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.sm
  },
  hotlineTitle: {
    color: tokens.colors.text.muted,
    fontSize: tokens.typography.fontSize.xxs,
    fontWeight: 'bold',
    letterSpacing: 1,
    textAlign: 'center'
  },
  hotlineBtnRow: {
    flexDirection: 'row',
    gap: tokens.spacing.md
  },
  hotlineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    backgroundColor: tokens.colors.surface.card,
    borderWidth: 1,
    borderColor: tokens.colors.border.subtle,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    minHeight: tokens.touchTarget.minHeight
  },
  hotlineBtnMain: {
    color: tokens.colors.text.white,
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: '900'
  },
  hotlineBtnSub: {
    color: tokens.colors.text.muted,
    fontSize: 9
  }
});
