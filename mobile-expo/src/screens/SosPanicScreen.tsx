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
  ShieldCheck,
  Flame,
  RefreshCw,
  TriangleAlert,
  MapPin,
  LocateFixed,
  CircleCheck,
  Headset,
  Ambulance
} from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import * as Crypto from 'expo-crypto';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { GpsCoordinates, LocationSource } from '../types';
import { effectiveLocationSource } from '../hooks/useGpsLocation';
import { tokens } from '../theme/tokens';
import { safeHaptics, announceAccessibility } from '../utils/haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SOS_HOLD_MS = 1500; // Hold duration in milliseconds

import { CitizenUser } from '../components/CitizenAccessWall';

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
  citizen?: CitizenUser;
  onSosStateChange?: (isActive: boolean, trackingCode: string | null, pingCount: number) => void;
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
  reporterPhone,
  citizen,
  onSosStateChange
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
  const activeCoordsRef = useRef<SosResolvedLocation | null>(null);
  activeCoordsRef.current = activeCoords;
  const sosWatcherRef = useRef<Location.LocationSubscription | null>(null);

  // Dedicated movement watcher to continuously upgrade incident position in real time as user moves/drives
  const startMovementWatcher = useCallback((trackingCode: string) => {
    if (sosWatcherRef.current) {
      try {
        sosWatcherRef.current.remove();
      } catch {}
      sosWatcherRef.current = null;
    }
    Location.watchPositionAsync(
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
        activeCoordsRef.current = freshResolved;

        if (__DEV__) {
          console.log(
            `[SOS Watcher] Fix received: source=${source}, age=${fixAge}s, coords=(${freshLoc.coords.latitude.toFixed(5)}, ${freshLoc.coords.longitude.toFixed(5)}), acc=±${freshAcc}m. Upgrading report...`
          );
        }

        // Update the live incident location in Supabase via server RPC
        try {
          const { data: rpcResult, error: rpcErr } = await supabase.rpc('update_incident_location', {
            p_tracking_code: trackingCode,
            p_lat: freshLoc.coords.latitude,
            p_lng: freshLoc.coords.longitude,
            p_accuracy: freshAcc,
            p_source: source,
            p_age_s: fixAge,
          });

          if (rpcErr || rpcResult === false) {
            console.warn('[SOS Location Update Rejected/Error]', rpcErr?.message || `update_incident_location returned false for ${trackingCode}`);
          } else {
            if (__DEV__) {
              console.log(`[SOS Watcher] Successfully updated ${trackingCode} via update_incident_location (source=${source}, age=${fixAge}s)`);
            }
          }
        } catch (e: any) {
          console.warn('[SOS Location Update Exception]', e?.message);
        }
      }
    ).then((sub) => {
      sosWatcherRef.current = sub;
    }).catch((watchErr) => {
      console.warn('[SOS Movement Watcher Error]', watchErr);
    });
  }, []);

  // Restore active SOS state from AsyncStorage across tab switches
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const savedCode = await AsyncStorage.getItem('@active_sos_tracking_code');
        const savedId = await AsyncStorage.getItem('@active_sos_incident_id');
        if (isMounted && savedCode) {
          setActiveTrackingCode(savedCode);
          setActiveIncidentId(savedId || null);
          setSosActive(true);
          onSosStateChange?.(true, savedCode, 1);
          startMovementWatcher(savedCode);
        }
      } catch {}
    })();
    return () => {
      isMounted = false;
    };
  }, [startMovementWatcher, onSosStateChange]);

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
        const currentCoords = activeCoordsRef.current;
        const fallbackGps: GpsCoordinates | null = (currentCoords && currentCoords.latitude !== null && currentCoords.longitude !== null)
          ? { latitude: currentCoords.latitude, longitude: currentCoords.longitude }
          : null;
        const freshFix = await getBestAvailableLocation(
          fallbackGps,
          currentCoords?.accuracy ?? null,
          currentCoords?.locationSource ?? 'UNAVAILABLE',
          currentCoords?.fixAgeSeconds ?? null
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
              setSuccessfulPings((prev) => {
                const nextCount = prev + 1;
                onSosStateChange?.(true, activeTrackingCodeRef.current, nextCount);
                return nextCount;
              });
              setActiveCoords(freshFix);
              activeCoordsRef.current = freshFix;
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
  }, [sosActive, activeIncidentId, isAnonymous, onSosStateChange]);

  const triggerSosDispatch = useCallback(async () => {
    setIsActivating(true);
    setActivationError(null);
    safeHaptics.heavy();
    announceAccessibility('Sending SOS...');

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

    const savedAvatar = citizen?.id
      ? await AsyncStorage.getItem(`@citizen_avatar_${citizen.id}`).catch(() => null)
      : null;
    const effectiveAvatar = isAnonymous ? null : (citizen?.avatarUrl || savedAvatar || null);

    // In SOS Emergency distress mode, phone is transmitted for emergency CAD callback & carrier triangulation
    const emergencyPhone = citizen?.phone || reporterPhone || null;
    const telecomConsent = citizen?.emergencyTelecomConsent !== undefined ? citizen.emergencyTelecomConsent : Boolean(emergencyPhone);

    while (attempts < 3 && !insertSuccess) {
      attempts++;
      trackingCodeUsed = generateSosTrackingCode();
      const payload: any = {
        id: incidentId,
        tracking_code: trackingCodeUsed,
        category: 'CRIMINAL_OFFENSE',
        title: '🚨 EMERGENCY SOS BEACON (ACTIVE)',
        description: `CITIZEN EMERGENCY DISTRESS BEACON ACTIVATED. ${descCoords} Sent from the CitizenAlert app.`,
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
          name: isAnonymous ? null : (citizen?.name || null),
          phone: emergencyPhone, // ALWAYS transmitted for emergency rescue and carrier triangulation
          emergencyTelecomConsent: telecomConsent,
          emergencyConsentAct: telecomConsent ? 'DATA_PROTECTION_ACT_843_SEC_20' : null,
          carrierTriangulationAuthorized: Boolean(emergencyPhone && telecomConsent),
          carrierConsentTimestamp: citizen?.emergencyConsentAt || new Date().toISOString(),
          avatarUrl: effectiveAvatar,
          ghanaCardId: isAnonymous ? null : (citizen?.ghanaCard || null),
          isEmergencyPanic: true,
          trustScore: citizen?.trustScore ?? 0
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
      activeCoordsRef.current = bestGps;
      setSuccessfulPings(1);
      setFailedPings(0);
      setSosActive(true);
      onSosStateChange?.(true, trackingCodeUsed, 1);
      startMovementWatcher(trackingCodeUsed);
      await AsyncStorage.setItem('@active_sos_tracking_code', trackingCodeUsed).catch(() => {});
      await AsyncStorage.setItem('@active_sos_incident_id', incidentId).catch(() => {});
      safeHaptics.success();
      announceAccessibility('SOS sent. Your location is being shared with the CitizenAlert command centre.');

      if (__DEV__) {
        console.log(
          `[SOS Dispatch] Beacon transmitted: tracking_code=${trackingCodeUsed}, source=${bestGps.locationSource}, age=${bestGps.fixAgeSeconds ?? 0}s, coords=(${bestGps.latitude ?? 'NULL'}, ${bestGps.longitude ?? 'NULL'}), accuracy=±${bestGps.accuracy ?? 'N/A'}m`
        );
      }
    } else {
      safeHaptics.warning();
      setActivationError(`SOS could not be sent (${lastError || 'no connection'}). Call 191 or 112 using the buttons below, then try again.`);
    }
  }, [coords, gpsAccuracy, locationSource, gpsFixAgeSeconds, landmark, locationName, region, isAnonymous, reporterPhone, citizen, startMovementWatcher, onSosStateChange]);

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

  const handleCancelSos = async () => {
    const trackingCodeToCancel = activeTrackingCode || (await AsyncStorage.getItem('@active_sos_tracking_code').catch(() => null));

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
    onSosStateChange?.(false, null, 0);
    safeHaptics.warning();
    announceAccessibility('Emergency distress beacon stopped on device.');

    await AsyncStorage.removeItem('@active_sos_tracking_code').catch(() => {});
    await AsyncStorage.removeItem('@active_sos_incident_id').catch(() => {});

    // Notify dispatch that the live distress beacon has stopped.
    // Citizens cannot update incidents directly; the cancel_sos_beacon RPC
    // only stands down an active SOS raised by this device (tracking code + reporter match).
    try {
      if (trackingCodeToCancel) {
        const { data: cancelled, error } = await supabase.rpc('cancel_sos_beacon', {
          p_tracking_code: trackingCodeToCancel,
        });

        if (__DEV__ && (error || cancelled !== true)) {
          console.warn('[SOS Cancel Notice] cancel_sos_beacon:', error?.message || 'no active beacon matched');
        }
      }
    } catch (err: any) {
      if (__DEV__) {
        console.warn('[SOS Cancel Exception]', err?.message);
      }
    }

    Alert.alert(
      'SOS stopped',
      'Location sharing has stopped. If this was a mistake, you can call 191 to let them know you are safe.',
      [{ text: 'OK' }]
    );
  };

  const handleCallEmergency = (number: string) => {
    safeHaptics.medium();
    Linking.openURL(`tel:${number}`).catch(() => {
      Alert.alert('Call Failed', `Please dial ${number} manually from your phone app.`);
    });
  };

  // Hold progress ring geometry
  const ringSize = 212;
  const strokeWidth = 8;
  const normalizedRadius = ringSize / 2 - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - holdProgress * circumference;

  const callbackNumber = citizen?.phone || reporterPhone || '';
  const hasLiveFix = !!coords && (locationSource === 'LIVE' || locationSource === 'LAST_KNOWN');
  const placeLine = [locationName, region && region !== 'UNKNOWN' ? region : null].filter(Boolean).join(', ');
  const coordLine = (lat: number | null | undefined, lng: number | null | undefined, acc: number | null | undefined) =>
    lat != null && lng != null
      ? `${lat.toFixed(4)}, ${lng.toFixed(4)}${typeof acc === 'number' ? ` · ±${Math.round(acc)} m` : ''}`
      : null;
  const liveCoordLine = coordLine(coords?.latitude, coords?.longitude, gpsAccuracy);

  const EmergencyGrid = (
    <View style={styles.dialSection}>
      <Text style={styles.dialTitle}>Call emergency services · toll-free</Text>
      <View style={styles.dialGrid}>
        {EMERGENCY_LINES.map((line) => {
          const Icon = line.icon;
          return (
            <TouchableOpacity
              key={line.number}
              onPress={() => handleCallEmergency(line.number)}
              style={[styles.dialButton, sosActive && line.number === '191' && styles.dialButtonHot]}
              accessibilityRole="button"
              accessibilityLabel={`Call ${line.number}, ${line.label}`}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.dialNumber}>Call {line.number}</Text>
                <Text style={styles.dialLabel}>{line.label}</Text>
              </View>
              <View style={styles.dialIcon}>
                <Icon color={line.color} size={20} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  /* ------------------------------ ACTIVE STATE ------------------------------ */
  if (sosActive) {
    const sent = activeCoords ? coordLine(activeCoords.latitude, activeCoords.longitude, activeCoords.accuracy) : null;
    return (
      <View style={styles.section}>
        <View style={styles.activeBanner} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <View style={styles.row}>
            <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
            <Text style={styles.activeTitle}>SOS active</Text>
          </View>
          <Text style={styles.activeText}>
            Your location is being shared · {successfulPings} {successfulPings === 1 ? 'update' : 'updates'} sent
            {failedPings > 0 ? ` · ${failedPings} retrying` : ''}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <LocateFixed color={sent ? tokens.colors.text.emerald : tokens.colors.text.secondary} size={18} />
            <Text style={styles.overline}>Last location sent</Text>
          </View>
          {sent ? (
            <>
              {!!placeLine && <Text style={styles.placeText}>{placeLine}</Text>}
              <Text style={styles.monoText}>{sent}</Text>
            </>
          ) : (
            <Text style={styles.bodyMuted}>
              Waiting for GPS. Updates continue as soon as your phone finds a location.
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <View style={[styles.row, { alignItems: 'flex-start' }]}>
            <ShieldCheck color={tokens.colors.brand.gold} size={20} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.cardTitle}>Sent to the CitizenAlert command centre</Text>
              <Text style={styles.bodyMuted}>
                Keep this app open so location updates continue. If you can, also call 191.
              </Text>
              {!!callbackNumber && (
                <Text style={styles.bodyMuted}>Callback number shared: {callbackNumber}</Text>
              )}
            </View>
          </View>
          <TouchableOpacity
            onPress={handleCancelSos}
            style={styles.safeButton}
            accessibilityRole="button"
            accessibilityLabel="I am safe, stop SOS"
          >
            <CircleCheck color={tokens.colors.text.emerald} size={20} />
            <Text style={styles.safeButtonText}>I'm safe — stop SOS</Text>
          </TouchableOpacity>
        </View>

        {EmergencyGrid}

        {!!activeTrackingCode && (
          <Text style={[styles.monoText, { textAlign: 'center' }]}>Reference {activeTrackingCode}</Text>
        )}
      </View>
    );
  }

  /* ------------------------------ STANDBY STATE ----------------------------- */
  return (
    <View style={styles.section}>
      <View style={{ alignItems: 'center', gap: tokens.spacing.sm }}>
        <View style={[styles.gpsChip, !hasLiveFix && styles.gpsChipPending]}>
          <View style={[styles.gpsDot, !hasLiveFix && { backgroundColor: tokens.colors.brand.gold }]} />
          <Text style={styles.gpsChipText}>{hasLiveFix ? 'GPS ready' : 'Finding location…'}</Text>
        </View>
        <Text style={styles.title}>Emergency SOS</Text>
        <Text style={styles.subtitle}>
          Hold for 1.5 seconds to send your live location to the CitizenAlert command centre. If you can, also call 191.
        </Text>
      </View>

      {activationError && (
        <View style={styles.errorBanner} accessibilityRole="alert">
          <TriangleAlert color={tokens.colors.text.crimson} size={20} />
          <Text style={[styles.bodyText, { flex: 1 }]}>{activationError}</Text>
          <TouchableOpacity
            onPress={triggerSosDispatch}
            disabled={isActivating}
            style={styles.retryButton}
            accessibilityRole="button"
            accessibilityLabel="Retry sending SOS"
          >
            <RefreshCw color={tokens.colors.text.white} size={16} />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Hold button */}
      <View style={styles.holdArea}>
        <View style={styles.holdHalo}>
          {isHolding && !isActivating && (
            <Svg height={ringSize} width={ringSize} style={StyleSheet.absoluteFill}>
              <Circle
                stroke="rgba(255, 255, 255, 0.15)"
                fill="transparent"
                strokeWidth={strokeWidth}
                r={normalizedRadius}
                cx={ringSize / 2}
                cy={ringSize / 2}
              />
              <Circle
                stroke={tokens.colors.brand.gold}
                fill="transparent"
                strokeWidth={strokeWidth}
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                r={normalizedRadius}
                cx={ringSize / 2}
                cy={ringSize / 2}
                transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
              />
            </Svg>
          )}
          <TouchableOpacity
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={isActivating}
            style={[styles.holdButton, (isHolding || isActivating) && styles.holdButtonPressed]}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="Emergency SOS. Press and hold for 1.5 seconds to send your location."
            accessibilityHint="Keep holding until your phone vibrates"
          >
            {isActivating ? (
              <>
                <ActivityIndicator size="large" color={tokens.colors.text.white} />
                <Text style={styles.holdSub}>SENDING…</Text>
              </>
            ) : (
              <>
                <Radio color={tokens.colors.text.white} size={34} />
                <Text style={styles.holdLabel}>SOS</Text>
                <Text style={styles.holdSub}>{isHolding ? 'KEEP HOLDING' : 'HOLD 1.5S'}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Location + callback, stacked so nothing gets clipped */}
      <View style={styles.card}>
        <View style={[styles.row, { alignItems: 'flex-start' }]}>
          <MapPin color={tokens.colors.text.secondary} size={18} />
          <View style={{ flex: 1 }}>
            <Text style={styles.placeText}>{placeLine || 'Location not found yet'}</Text>
            {!!liveCoordLine && <Text style={styles.monoText}>{liveCoordLine}</Text>}
          </View>
        </View>
        <View style={styles.divider} />
        <View style={[styles.row, { alignItems: 'flex-start' }]}>
          <PhoneCall color={tokens.colors.text.secondary} size={18} />
          <View style={{ flex: 1 }}>
            <Text style={styles.overline}>Callback number</Text>
            <Text style={styles.placeText}>
              {callbackNumber || 'None yet. Add one in your Profile so responders can call you.'}
            </Text>
          </View>
        </View>
      </View>

      {EmergencyGrid}
    </View>
  );
});

const EMERGENCY_LINES = [
  { number: '191', label: 'Ghana Police', icon: ShieldCheck, color: tokens.colors.brand.gold },
  { number: '112', label: 'National emergency', icon: Headset, color: tokens.colors.sos.text },
  { number: '192', label: 'Fire Service', icon: Flame, color: tokens.colors.brand.gold },
  { number: '193', label: 'Ambulance', icon: Ambulance, color: tokens.colors.text.emerald }
];

const f = tokens.typography.fontFamily;
const c = tokens.colors;

const styles = StyleSheet.create({
  section: { gap: tokens.spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm },
  card: { backgroundColor: c.surface.card, borderRadius: tokens.radius.lg, padding: tokens.spacing.lg, gap: tokens.spacing.sm },
  divider: { height: 1, backgroundColor: c.border.subtle, marginVertical: tokens.spacing.xs },
  title: { color: c.text.primary, fontSize: tokens.typography.fontSize.xxl, lineHeight: 36, fontFamily: f.sansBold, textAlign: 'center' },
  subtitle: { color: c.text.secondary, fontSize: tokens.typography.fontSize.lg, lineHeight: 24, fontFamily: f.sansRegular, textAlign: 'center' },
  cardTitle: { color: c.text.primary, fontSize: tokens.typography.fontSize.lg, fontFamily: f.sans },
  bodyText: { color: c.text.primary, fontSize: tokens.typography.fontSize.md, lineHeight: 20, fontFamily: f.sansRegular },
  bodyMuted: { color: c.text.secondary, fontSize: tokens.typography.fontSize.md, lineHeight: 20, fontFamily: f.sansRegular },
  overline: { color: c.text.secondary, fontSize: tokens.typography.fontSize.sm, fontFamily: f.mono, textTransform: 'uppercase', letterSpacing: 0.5 },
  placeText: { color: c.text.primary, fontSize: tokens.typography.fontSize.lg, lineHeight: 24, fontFamily: f.sans },
  monoText: { color: c.text.secondary, fontSize: tokens.typography.fontSize.sm, fontFamily: f.mono },

  gpsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: tokens.radius.full,
    backgroundColor: c.surface.cardHover
  },
  gpsChipPending: { backgroundColor: c.brand.goldMuted },
  gpsDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.text.emerald },
  gpsChipText: { color: c.text.primary, fontSize: tokens.typography.fontSize.sm, fontFamily: f.mono },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    backgroundColor: c.sos.soft,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.md
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: tokens.touchTarget.minHeight,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    backgroundColor: c.sos.container
  },
  retryText: { color: c.text.white, fontFamily: f.sans, fontSize: tokens.typography.fontSize.md },

  holdArea: { alignItems: 'center', paddingVertical: tokens.spacing.lg },
  holdHalo: {
    width: 212,
    height: 212,
    borderRadius: 106,
    backgroundColor: c.sos.soft,
    alignItems: 'center',
    justifyContent: 'center'
  },
  holdButton: {
    width: 176,
    height: 176,
    borderRadius: 88,
    backgroundColor: c.sos.container,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderWidth: 4,
    borderColor: c.sos.ring,
    ...tokens.elevation.high,
    shadowColor: c.sos.container
  },
  holdButtonPressed: { backgroundColor: c.sos.containerPressed, transform: [{ scale: 0.97 }] },
  holdLabel: { color: c.text.white, fontSize: 30, fontFamily: f.sansBold, letterSpacing: 1 },
  holdSub: { color: c.sos.onContainer, fontSize: tokens.typography.fontSize.md, fontFamily: f.monoBold },

  dialSection: { gap: tokens.spacing.sm },
  dialTitle: { color: c.text.secondary, fontSize: tokens.typography.fontSize.sm, fontFamily: f.mono, textTransform: 'uppercase', letterSpacing: 0.5 },
  dialGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm },
  dialButton: {
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    backgroundColor: c.surface.card
  },
  dialButtonHot: { backgroundColor: c.sos.container },
  dialNumber: { color: c.text.primary, fontSize: tokens.typography.fontSize.lg, fontFamily: f.sansBold },
  dialLabel: { color: c.text.secondary, fontSize: tokens.typography.fontSize.sm, fontFamily: f.sansRegular },
  dialIcon: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.md,
    backgroundColor: c.surface.cardHover,
    alignItems: 'center',
    justifyContent: 'center'
  },

  activeBanner: {
    backgroundColor: c.sos.container,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    gap: 4
  },
  liveDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: c.text.white },
  activeTitle: { color: c.text.white, fontSize: tokens.typography.fontSize.xxl, lineHeight: 36, fontFamily: f.sansBold },
  activeText: { color: c.sos.onContainer, fontSize: tokens.typography.fontSize.lg, lineHeight: 24, fontFamily: f.sansMedium },
  safeButton: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    marginTop: tokens.spacing.sm,
    borderRadius: tokens.radius.lg,
    backgroundColor: c.surface.cardHover
  },
  safeButtonText: { color: c.text.primary, fontSize: tokens.typography.fontSize.lg, fontFamily: f.sansBold }
});
