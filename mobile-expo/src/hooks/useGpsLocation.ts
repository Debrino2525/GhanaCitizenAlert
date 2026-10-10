import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import { GpsCoordinates, GpsLockStatus, LocationSource } from '../types';
import { getGhanaRegionCode } from '../utils/ghanaPostGps';
import { safeHaptics } from '../utils/haptics';

export type GpsTriggerType = 'USER_TAP' | 'MOUNT' | 'WATCHER' | 'TIMER';

export interface UseGpsLocationResult {
  coords: GpsCoordinates | null;
  gpsAccuracy: number | null;
  isLocating: boolean;
  gpsStatus: GpsLockStatus;
  locationSource: LocationSource;
  gpsFixAgeSeconds: number | null;
  gpsFixTimestamp: number | null;
  region: string;
  locationName: string;
  fetchCurrentLocation: (trigger?: GpsTriggerType) => Promise<void>;
  setLocationName: (name: string) => void;
  setManualLocation: (name: string, regionName?: string, manualCoords?: GpsCoordinates | null) => void;
}

const FRESH_FIX_MAX_AGE_SECONDS = 15;
const ACQUISITION_HARD_TIMEOUT_MS = 10000; // 10s maximum bounded acquisition window

// Dev-only counters to verify 0/0 leak-free lifecycle
let devActiveWatchersCount = 0;
let devInFlightAcquisitionsCount = 0;

export const getGpsDevMetrics = () => ({
  activeWatchers: devActiveWatchersCount,
  inFlightAcquisitions: devInFlightAcquisitionsCount,
});

/**
 * Derives the effective location source at USE time based on the fix's age and accuracy.
 * Rule: LIVE if age <= 10s (any accuracy), or if age <= 30s and accuracy <= 25m; otherwise LAST_KNOWN.
 */
export const effectiveLocationSource = (
  fixTimestamp: number | null | undefined,
  accuracy: number | null | undefined,
  now: number = Date.now(),
  sourceOverride?: LocationSource
): LocationSource => {
  if (sourceOverride === 'MANUAL') return 'MANUAL';
  if (!fixTimestamp) return 'UNAVAILABLE';
  const ageSeconds = Math.max(0, Math.floor((now - fixTimestamp) / 1000));
  const isFresh = ageSeconds <= 10 || (ageSeconds <= 30 && typeof accuracy === 'number' && accuracy <= 25);
  return isFresh ? 'LIVE' : 'LAST_KNOWN';
};

/**
 * Truthful GPS Engine for Ghana CitizenAlert.
 * - Single writer: strictly 1 in-flight acquisition at a time.
 * - Deterministic terminal states: LIVE (fresh <=15s) | LAST_KNOWN (stale) | UNAVAILABLE.
 * - Eliminates effect re-trigger loops by removing mutable state dependencies from fetchCurrentLocation.
 * - Automatically falls back from getCurrentPositionAsync to watchPositionAsync within a single bounded 10s window.
 */
export const useGpsLocation = (): UseGpsLocationResult => {
  const [coords, setCoords] = useState<GpsCoordinates | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [gpsStatus, setGpsStatus] = useState<GpsLockStatus>('LOCATING');
  const [locationSource, setLocationSource] = useState<LocationSource>('UNAVAILABLE');
  const [gpsFixAgeSeconds, setGpsFixAgeSeconds] = useState<number | null>(null);
  const [gpsFixTimestamp, setGpsFixTimestamp] = useState<number | null>(null);
  const [region, setRegion] = useState<string>('UNKNOWN');
  const [locationName, setLocationName] = useState<string>('Location pending');

  // Single-writer and in-flight tracking refs
  const inFlightRef = useRef<boolean>(false);
  const requestIdRef = useRef<number>(0);
  const watcherRef = useRef<Location.LocationSubscription | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const directFixTimeoutRef = useRef<any>(null);
  const watcherTimeoutRef = useRef<any>(null);
  const lastFixTimestampRef = useRef<number | null>(null);
  const lastAccuracyRef = useRef<number | null>(null);

  // Keep latest coords in ref for non-reactive access inside async callbacks (prevents stale closure)
  const coordsRef = useRef<GpsCoordinates | null>(null);
  coordsRef.current = coords;

  const cleanupWatcher = useCallback(() => {
    if (watcherTimeoutRef.current) {
      clearTimeout(watcherTimeoutRef.current);
      watcherTimeoutRef.current = null;
    }
    if (watcherRef.current) {
      try {
        watcherRef.current.remove();
      } catch {}
      watcherRef.current = null;
      if (__DEV__) {
        devActiveWatchersCount = Math.max(0, devActiveWatchersCount - 1);
      }
    }
  }, []);

  const applyLocationFix = useCallback(
    async (
      location: Location.LocationObject,
      apiMethod: string,
      reqId: number,
      requestStartTime: number
    ): Promise<boolean> => {
      if (!isMountedRef.current || reqId !== requestIdRef.current) return false;

      const now = Date.now();
      const fixTimestamp = location.timestamp;
      const ageMs = Math.max(0, now - fixTimestamp);
      const ageSeconds = Math.floor(ageMs / 1000);

      const lat = location.coords.latitude;
      const lng = location.coords.longitude;
      const rawAcc = typeof location.coords.accuracy === 'number' ? location.coords.accuracy : null;
      const accuracy = rawAcc !== null ? Math.round(rawAcc * 10) / 10 : null;

      // Unified freshness rule: derived at use time via effectiveLocationSource
      const targetSource: LocationSource = effectiveLocationSource(fixTimestamp, accuracy, now);
      const isFresh = targetSource === 'LIVE';
      const targetStatus: GpsLockStatus = isFresh ? 'LIVE' : 'STALE';

      if (__DEV__) {
        console.log(
          `[GPS RAW TELEMETRY] Lat: ${lat}, Lng: ${lng}, Acc: ${rawAcc}m, fix.timestamp: ${fixTimestamp}, Date.now(): ${now}, computed age: ${ageSeconds}s (${ageMs}ms), isFresh: ${isFresh}`
        );
        console.log(
          `[GPS State] [Req #${reqId}] ${apiMethod} -> ${targetStatus} | Age: ${ageSeconds}s | ` +
            `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)} | Acc: ±${accuracy ?? 'N/A'}m | Fresh: ${isFresh}`
        );
      }

      const newCoords = { latitude: lat, longitude: lng };
      coordsRef.current = newCoords;
      lastFixTimestampRef.current = fixTimestamp;
      lastAccuracyRef.current = accuracy;
      setCoords(newCoords);
      setGpsAccuracy(accuracy);
      setGpsFixAgeSeconds(ageSeconds);
      setGpsFixTimestamp(fixTimestamp);
      setLocationSource(targetSource);
      setGpsStatus(targetStatus);

      if (isFresh) {
        safeHaptics.success();
      }

      // Detect Ghanaian Administrative Region
      const detectedRegion = getGhanaRegionCode(lat, lng).name;
      setRegion(detectedRegion);

      // Reverse geocode in background (non-blocking)
      Location.reverseGeocodeAsync({ latitude: lat, longitude: lng })
        .then((reverseResults) => {
          if (!isMountedRef.current || reqId !== requestIdRef.current) return;
          if (reverseResults && reverseResults.length > 0) {
            const rev = reverseResults[0];
            const parts = [rev.street, rev.district || rev.subregion, rev.city || rev.name, rev.region].filter(Boolean);
            const autoAreaName = parts.join(', ');
            if (autoAreaName) setLocationName(autoAreaName);
            if (rev.region) setRegion(rev.region);
          }
        })
        .catch(() => {});

      return isFresh;
    },
    []
  );

  const fetchCurrentLocation = useCallback(
    async (trigger: GpsTriggerType = 'USER_TAP') => {
      // Single-writer mutex: if already acquiring, reject concurrent redundant requests
      if (inFlightRef.current) {
        if (__DEV__) {
          console.log(`[GPS Engine] Acquisition already in flight (trigger=${trigger}). Request ignored.`);
        }
        return;
      }

      inFlightRef.current = true;
      const currentReqId = ++requestIdRef.current;
      const requestStartTime = Date.now();
      if (__DEV__) {
        devInFlightAcquisitionsCount++;
        console.log(
          `[GPS Request START] id=#${currentReqId}, trigger=${trigger}, time=${new Date(requestStartTime).toISOString()}, in-flight=${devInFlightAcquisitionsCount}, watchers=${devActiveWatchersCount}`
        );
      }
      setIsLocating(true);
      setGpsStatus('LOCATING');
      cleanupWatcher();

      // Minimum visual delay of 800ms so the ACQUIRING animation is clearly visible
      const minVisualDelay = new Promise<void>((resolve) => setTimeout(resolve, 800));

      let acquiredFresh = false;

      try {
        // 1. Permission Check
        let { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') {
          const req = await Location.requestForegroundPermissionsAsync();
          status = req.status;
        }

        if (status !== 'granted') {
          if (!isMountedRef.current || currentReqId !== requestIdRef.current) return;
          setGpsStatus('PERMISSION_DENIED');
          setLocationSource('UNAVAILABLE');
          setCoords(null);
          coordsRef.current = null;
          lastFixTimestampRef.current = null;
          lastAccuracyRef.current = null;
          setGpsAccuracy(null);
          setGpsFixAgeSeconds(null);
          setGpsFixTimestamp(null);
          setLocationName('Location permission denied');
          setRegion('UNKNOWN');
          if (__DEV__) {
            console.log(`[GPS State] [Req #${currentReqId}] Location permission denied by user.`);
          }
          await minVisualDelay;
          return;
        }

        // 2. Direct Hardware Position Query with 5.5s timeout (shares 10s ACQUISITION_HARD_TIMEOUT_MS budget)
        try {
          const posPromise = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          const posTimeout = new Promise<null>((resolve) => {
            directFixTimeoutRef.current = setTimeout(() => {
              directFixTimeoutRef.current = null;
              resolve(null);
            }, 5500);
          });
          const directFix = await Promise.race([posPromise, posTimeout]);
          if (directFixTimeoutRef.current) {
            clearTimeout(directFixTimeoutRef.current);
            directFixTimeoutRef.current = null;
          }

          if (directFix && directFix.coords) {
            acquiredFresh = await applyLocationFix(directFix, 'getCurrentPositionAsync(High)', currentReqId, requestStartTime);
          }
        } catch (e) {
          // Direct fix query failed or timed out
        }

        // 3. If fresh fix achieved, wait for minimum visual feedback and complete
        if (acquiredFresh) {
          await minVisualDelay;
          return;
        }

        // 4. If direct fix was stale or timed out, retry once via bounded watcher sharing remaining 10s budget
        const elapsedMs = Date.now() - requestStartTime;
        const remainingWatcherBudgetMs = Math.max(1500, ACQUISITION_HARD_TIMEOUT_MS - elapsedMs);

        if (__DEV__) {
          console.log(`[GPS State] [Req #${currentReqId}] Direct fix stale/timed out. Retrying via watchPositionAsync (${remainingWatcherBudgetMs}ms remaining budget)...`);
        }

        await new Promise<void>((resolve) => {
          let isResolved = false;

          const completeWatcher = () => {
            if (!isResolved) {
              isResolved = true;
              if (watcherTimeoutRef.current) {
                clearTimeout(watcherTimeoutRef.current);
                watcherTimeoutRef.current = null;
              }
              cleanupWatcher();
              resolve();
            }
          };

          // Bounded watcher window sharing 10s hard timeout budget
          watcherTimeoutRef.current = setTimeout(() => {
            watcherTimeoutRef.current = null;
            if (__DEV__ && isMountedRef.current) {
              console.log(`[GPS State] [Req #${currentReqId}] Watcher acquisition window expired (${remainingWatcherBudgetMs}ms budget).`);
            }
            completeWatcher();
          }, remainingWatcherBudgetMs);

          Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              timeInterval: 1000,
              distanceInterval: 1,
            },
            async (freshLocation) => {
              const freshApplied = await applyLocationFix(freshLocation, 'watchPositionAsync(LiveStream)', currentReqId, requestStartTime);
              if (freshApplied) {
                completeWatcher();
              }
            }
          )
            .then((sub) => {
              if (isResolved || !isMountedRef.current || currentReqId !== requestIdRef.current) {
                try {
                  sub.remove();
                } catch {}
              } else {
                watcherRef.current = sub;
                if (__DEV__) {
                  devActiveWatchersCount++;
                }
              }
            })
            .catch(() => {
              completeWatcher();
            });
        });

        await minVisualDelay;
      } catch (err) {
        if (__DEV__) {
          console.warn(`[GPS State] [Req #${currentReqId}] Error:`, err);
        }
      } finally {
        cleanupWatcher();
        if (directFixTimeoutRef.current) {
          clearTimeout(directFixTimeoutRef.current);
          directFixTimeoutRef.current = null;
        }

        if (isMountedRef.current && currentReqId === requestIdRef.current) {
          if (__DEV__) {
            devInFlightAcquisitionsCount = Math.max(0, devInFlightAcquisitionsCount - 1);
          }
          inFlightRef.current = false;
          setIsLocating(false);

          // Guarantee a terminal state
          if (!coordsRef.current) {
            setGpsStatus((prev) => (prev === 'PERMISSION_DENIED' ? 'PERMISSION_DENIED' : 'UNAVAILABLE'));
            setLocationSource('UNAVAILABLE');
          } else {
            // Old coords exist: if no fresh fix was obtained, explicitly derive STALE and LAST_KNOWN
            const now = Date.now();
            const currentFixTs = lastFixTimestampRef.current;
            const currentAcc = lastAccuracyRef.current;
            const eff = effectiveLocationSource(currentFixTs, currentAcc, now, locationSource);
            setLocationSource(eff);
            setGpsStatus(eff === 'LIVE' ? 'LIVE' : 'STALE');
          }

          if (__DEV__) {
            console.log(
              `[GPS Request END] id=#${currentReqId}, trigger=${trigger}, in-flight=${devInFlightAcquisitionsCount}, watchers=${devActiveWatchersCount}`
            );
          }
        }
      }
    },
    [cleanupWatcher, applyLocationFix]
  );

  const setManualLocation = useCallback(
    (name: string, regionName: string = 'UNKNOWN', manualCoords: GpsCoordinates | null = null) => {
      requestIdRef.current++;
      if (directFixTimeoutRef.current) {
        clearTimeout(directFixTimeoutRef.current);
        directFixTimeoutRef.current = null;
      }
      if (watcherTimeoutRef.current) {
        clearTimeout(watcherTimeoutRef.current);
        watcherTimeoutRef.current = null;
      }
      cleanupWatcher();
      if (inFlightRef.current) {
        inFlightRef.current = false;
        if (__DEV__) {
          devInFlightAcquisitionsCount = Math.max(0, devInFlightAcquisitionsCount - 1);
        }
      }
      setIsLocating(false);
      setLocationSource('MANUAL');
      setGpsStatus('MANUAL');
      setCoords(manualCoords);
      coordsRef.current = manualCoords;
      lastFixTimestampRef.current = null;
      lastAccuracyRef.current = null;
      setGpsAccuracy(null); // Never report accuracy for manual entries
      setGpsFixAgeSeconds(null);
      setGpsFixTimestamp(null);
      setLocationName(name || 'Manual Location');
      setRegion(regionName || 'UNKNOWN');
    },
    [cleanupWatcher]
  );

  // Run initial acquisition ONCE on mount
  useEffect(() => {
    isMountedRef.current = true;
    fetchCurrentLocation('MOUNT');

    return () => {
      isMountedRef.current = false;
      requestIdRef.current++;
      if (directFixTimeoutRef.current) {
        clearTimeout(directFixTimeoutRef.current);
        directFixTimeoutRef.current = null;
      }
      if (watcherTimeoutRef.current) {
        clearTimeout(watcherTimeoutRef.current);
        watcherTimeoutRef.current = null;
      }
      cleanupWatcher();
      if (inFlightRef.current) {
        inFlightRef.current = false;
        if (__DEV__) {
          devInFlightAcquisitionsCount = Math.max(0, devInFlightAcquisitionsCount - 1);
        }
      }

      if (__DEV__) {
        // Strict assertion: never forcibly reset to mask leaks; warn loudly if non-zero
        if (devInFlightAcquisitionsCount !== 0 || devActiveWatchersCount !== 0) {
          console.warn(
            `[GPS State CRITICAL LEAK] Hook unmounted with non-zero counters! in-flight=${devInFlightAcquisitionsCount}, watchers=${devActiveWatchersCount}`
          );
        } else {
          console.log('[GPS State] Unmounted hook cleanly. Verified dev counters: 0/0');
        }
      }
    };
  }, []); // Strictly empty dependency array: triggers ONLY once on mount

  return {
    coords,
    gpsAccuracy,
    isLocating,
    gpsStatus,
    locationSource,
    gpsFixAgeSeconds,
    gpsFixTimestamp,
    region,
    locationName,
    fetchCurrentLocation,
    setLocationName,
    setManualLocation,
  };
};
