import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import { GpsCoordinates, GpsLockStatus, LocationSource } from '../types';
import { getGhanaRegionCode } from '../utils/ghanaPostGps';

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
  fetchCurrentLocation: () => Promise<void>;
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
    async (location: Location.LocationObject, apiMethod: string, reqId: number): Promise<boolean> => {
      if (!isMountedRef.current || reqId !== requestIdRef.current) return false;

      const now = Date.now();
      const fixTimestamp = location.timestamp;
      const ageMs = Math.max(0, now - fixTimestamp);
      const ageSeconds = Math.floor(ageMs / 1000);
      const isFresh = ageSeconds <= FRESH_FIX_MAX_AGE_SECONDS;
      const lat = location.coords.latitude;
      const lng = location.coords.longitude;
      const rawAcc = typeof location.coords.accuracy === 'number' ? location.coords.accuracy : null;
      const accuracy = rawAcc !== null ? Math.round(rawAcc * 10) / 10 : null;

      const targetStatus: GpsLockStatus = isFresh ? 'LIVE' : 'STALE';
      const targetSource: LocationSource = isFresh ? 'LIVE' : 'LAST_KNOWN';

      if (__DEV__) {
        console.log(
          `[GPS State] [Req #${reqId}] ${apiMethod} -> ${targetStatus} | Age: ${ageSeconds}s | ` +
            `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)} | Acc: ±${accuracy ?? 'N/A'}m | Fresh: ${isFresh}`
        );
      }

      const newCoords = { latitude: lat, longitude: lng };
      coordsRef.current = newCoords;
      setCoords(newCoords);
      setGpsAccuracy(accuracy);
      setGpsFixAgeSeconds(ageSeconds);
      setGpsFixTimestamp(fixTimestamp);
      setLocationSource(targetSource);
      setGpsStatus(targetStatus);

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

  const fetchCurrentLocation = useCallback(async () => {
    // Single-writer mutex: if already acquiring, reject concurrent redundant requests
    if (inFlightRef.current) {
      if (__DEV__) {
        console.log('[GPS Engine] Acquisition already in flight. Request ignored.');
      }
      return;
    }

    inFlightRef.current = true;
    const currentReqId = ++requestIdRef.current;
    if (__DEV__) {
      devInFlightAcquisitionsCount++;
    }
    setIsLocating(true);
    setGpsStatus('LOCATING');
    cleanupWatcher();

    if (__DEV__) {
      console.log(`[GPS State] [Req #${currentReqId}] Started acquisition pipeline... Active in-flight=${devInFlightAcquisitionsCount}, watchers=${devActiveWatchersCount}`);
    }

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
        setGpsAccuracy(null);
        setGpsFixAgeSeconds(null);
        setGpsFixTimestamp(null);
        setLocationName('Location permission denied');
        setRegion('UNKNOWN');
        if (__DEV__) {
          console.log(`[GPS State] [Req #${currentReqId}] Location permission denied by user.`);
        }
        return;
      }

      // 2. Query getCurrentPositionAsync with 4.5s Promise.race timeout
      try {
        const posPromise = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const posTimeout = new Promise<null>((resolve) => {
          directFixTimeoutRef.current = setTimeout(() => {
            directFixTimeoutRef.current = null;
            resolve(null);
          }, 4500);
        });
        const directFix = await Promise.race([posPromise, posTimeout]);
        if (directFixTimeoutRef.current) {
          clearTimeout(directFixTimeoutRef.current);
          directFixTimeoutRef.current = null;
        }

        if (directFix && directFix.coords) {
          acquiredFresh = await applyLocationFix(directFix, 'getCurrentPositionAsync(High)', currentReqId);
        }
      } catch (e) {
        // Direct fix query failed or timed out
      }

      // 3. If fresh fix achieved, we are in a terminal LIVE state!
      if (acquiredFresh) {
        return;
      }

      // 4. Fallback Tier: Check last known position as intermediate fallback while watcher listens
      try {
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown && lastKnown.coords && isMountedRef.current && currentReqId === requestIdRef.current) {
          await applyLocationFix(lastKnown, 'getLastKnownPositionAsync(CacheFallback)', currentReqId);
        }
      } catch {}

      // 5. If still not fresh, start watchPositionAsync with hard bounded timeout
      if (__DEV__) {
        console.log(`[GPS State] [Req #${currentReqId}] Awaiting live satellite pulse via watchPositionAsync...`);
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

        // Hard timeout on watcher (e.g. 5.5s remaining to hit 10s total bounded window)
        watcherTimeoutRef.current = setTimeout(() => {
          watcherTimeoutRef.current = null;
          if (__DEV__ && isMountedRef.current) {
            console.log(`[GPS State] [Req #${currentReqId}] Watcher acquisition window expired.`);
          }
          completeWatcher();
        }, 5500);

        Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 1000,
            distanceInterval: 1,
          },
          async (freshLocation) => {
            const freshApplied = await applyLocationFix(freshLocation, 'watchPositionAsync(LiveStream)', currentReqId);
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

        // Guarantee a terminal state if no coords were ever resolved
        if (!coordsRef.current) {
          setGpsStatus((prev) => (prev === 'PERMISSION_DENIED' ? 'PERMISSION_DENIED' : 'UNAVAILABLE'));
          setLocationSource('UNAVAILABLE');
        }

        if (__DEV__) {
          console.log(
            `[GPS State] [Req #${currentReqId}] Acquisition finished (terminal state reached). In-flight=${devInFlightAcquisitionsCount}, Watchers=${devActiveWatchersCount}`
          );
        }
      }
    }
  }, [cleanupWatcher, applyLocationFix]);

  const setManualLocation = useCallback(
    (name: string, regionName: string = 'UNKNOWN', manualCoords: GpsCoordinates | null = null) => {
      cleanupWatcher();
      inFlightRef.current = false;
      setIsLocating(false);
      setLocationSource('MANUAL');
      setGpsStatus('MANUAL');
      setCoords(manualCoords);
      coordsRef.current = manualCoords;
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
    fetchCurrentLocation();

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
