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
  region: string;
  locationName: string;
  fetchCurrentLocation: () => Promise<void>;
  setLocationName: (name: string) => void;
  setManualLocation: (name: string, regionName?: string, manualCoords?: GpsCoordinates | null) => void;
}

const FRESH_FIX_MAX_AGE_SECONDS = 15;

/**
 * Truthful GPS Engine for Ghana CitizenAlert.
 * - Enforces a strict 15-second freshness threshold.
 * - Rejects stale cached fixes from being flagged as 'LIVE'.
 * - Switches to watchPositionAsync if getCurrentPositionAsync returns stale cache.
 * - Never invents or defaults coordinates.
 */
export const useGpsLocation = (): UseGpsLocationResult => {
  const [coords, setCoords] = useState<GpsCoordinates | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [gpsStatus, setGpsStatus] = useState<GpsLockStatus>('LOCATING');
  const [locationSource, setLocationSource] = useState<LocationSource>('UNAVAILABLE');
  const [gpsFixAgeSeconds, setGpsFixAgeSeconds] = useState<number | null>(null);
  const [region, setRegion] = useState<string>('UNKNOWN');
  const [locationName, setLocationName] = useState<string>('Location pending');

  const watcherRef = useRef<Location.LocationSubscription | null>(null);

  const cleanupWatcher = useCallback(() => {
    if (watcherRef.current) {
      try {
        watcherRef.current.remove();
      } catch {}
      watcherRef.current = null;
    }
  }, []);

  const handleApplyLocationFix = useCallback(
    async (location: Location.LocationObject, apiMethod: string): Promise<boolean> => {
      const now = Date.now();
      const fixTimestamp = location.timestamp;
      const ageMs = Math.max(0, now - fixTimestamp);
      const ageSeconds = Math.floor(ageMs / 1000);
      const isFresh = ageSeconds <= FRESH_FIX_MAX_AGE_SECONDS;
      const lat = location.coords.latitude;
      const lng = location.coords.longitude;
      const rawAcc = typeof location.coords.accuracy === 'number' ? location.coords.accuracy : null;
      const accuracy = rawAcc !== null ? Math.round(rawAcc * 10) / 10 : null;

      if (__DEV__) {
        console.log(
          `[GPS Fix Audit] API: ${apiMethod} | Timestamp: ${new Date(fixTimestamp).toISOString()} | Age: ${ageSeconds}s | ` +
            `Fresh: ${isFresh} | Lat: ${lat.toFixed(5)} | Lng: ${lng.toFixed(5)} | Accuracy: ±${accuracy ?? 'N/A'}m | ` +
            `Speed: ${location.coords.speed ?? 'N/A'}`
        );
      }

      setCoords({ latitude: lat, longitude: lng });
      setGpsAccuracy(accuracy);
      setGpsFixAgeSeconds(ageSeconds);

      if (isFresh) {
        setLocationSource('LIVE');
        setGpsStatus('LIVE');
      } else {
        setLocationSource('LAST_KNOWN');
        setGpsStatus('STALE');
      }

      // Region boundary detection
      let detectedRegion = getGhanaRegionCode(lat, lng).name;
      setRegion(detectedRegion);

      // Reverse geocoding attempt (non-blocking)
      try {
        const revPromise = Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        const revTimeout = new Promise<Location.LocationGeocodedAddress[]>((resolve) =>
          setTimeout(() => resolve([]), 2500)
        );
        const reverseResults = await Promise.race([revPromise, revTimeout]);

        if (reverseResults && reverseResults.length > 0) {
          const rev = reverseResults[0];
          const parts = [
            rev.street,
            rev.district || rev.subregion,
            rev.city || rev.name,
            rev.region,
          ].filter(Boolean);

          const autoAreaName = parts.join(', ') || '';
          if (autoAreaName) {
            setLocationName(autoAreaName);
          }
          if (rev.region) {
            setRegion(rev.region);
          }
        }
      } catch {
        // Safe reverse geocode ignore
      }

      return isFresh;
    },
    []
  );

  const fetchCurrentLocation = useCallback(async () => {
    setIsLocating(true);
    setGpsStatus('LOCATING');
    cleanupWatcher();

    try {
      // 1. Permission Check
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        const req = await Location.requestForegroundPermissionsAsync();
        status = req.status;
      }

      if (status !== 'granted') {
        setGpsStatus('ERROR');
        setLocationSource('UNAVAILABLE');
        setCoords(null);
        setGpsAccuracy(null);
        setGpsFixAgeSeconds(null);
        setLocationName('Location pending');
        setRegion('UNKNOWN');
        setIsLocating(false);
        Alert.alert(
          'Location Permission Needed',
          'CitizenAlert requires GPS permissions to tag evidence with tamper-proof coordinates and enable emergency dispatch.'
        );
        return;
      }

      // 2. Query getCurrentPositionAsync with High Accuracy
      let directFix: Location.LocationObject | null = null;
      try {
        const posPromise = Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        const posTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4500));
        directFix = await Promise.race([posPromise, posTimeout]);
      } catch (e) {
        directFix = null;
      }

      let isFresh = false;
      if (directFix && directFix.coords) {
        isFresh = await handleApplyLocationFix(directFix, 'getCurrentPositionAsync(High)');
      }

      // 3. If direct fix was missing or STALE (>15s), activate watchPositionAsync for a true hardware fix
      if (!isFresh) {
        if (__DEV__) {
          console.log('[GPS Engine] getCurrentPosition returned stale or timed out. Activating watchPositionAsync...');
        }

        // Check last known position as intermediate fallback while watcher acquires satellite lock
        if (!directFix) {
          try {
            const lastKnown = await Location.getLastKnownPositionAsync();
            if (lastKnown && lastKnown.coords) {
              await handleApplyLocationFix(lastKnown, 'getLastKnownPositionAsync(CacheFallback)');
            }
          } catch {}
        }

        // Launch continuous high-accuracy watcher to capture the next live satellite pulse
        watcherRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 1000,
            distanceInterval: 1,
          },
          async (freshLocation) => {
            const freshApplied = await handleApplyLocationFix(freshLocation, 'watchPositionAsync(LiveStream)');
            if (freshApplied) {
              // Successfully acquired live fix; detach watcher and finish locating
              cleanupWatcher();
              setIsLocating(false);
            }
          }
        );

        // Allow watcher up to 5 seconds to receive a live satellite event before releasing spinner
        setTimeout(() => {
          setIsLocating(false);
        }, 5000);
        return;
      }
    } catch (err) {
      if (__DEV__) {
        console.warn('[GPS Engine Error]', err);
      }
      if (!coords) {
        setGpsStatus('UNAVAILABLE');
        setLocationSource('UNAVAILABLE');
        setCoords(null);
        setGpsAccuracy(null);
      }
    } finally {
      if (!watcherRef.current) {
        setIsLocating(false);
      }
    }
  }, [cleanupWatcher, handleApplyLocationFix, coords]);

  const setManualLocation = useCallback(
    (name: string, regionName: string = 'UNKNOWN', manualCoords: GpsCoordinates | null = null) => {
      cleanupWatcher();
      setLocationSource('MANUAL');
      setGpsStatus('MANUAL');
      setCoords(manualCoords);
      setGpsAccuracy(null); // Never report accuracy for manual entries
      setGpsFixAgeSeconds(null);
      setLocationName(name || 'Manual Location');
      setRegion(regionName || 'UNKNOWN');
    },
    [cleanupWatcher]
  );

  useEffect(() => {
    fetchCurrentLocation();
    return () => {
      cleanupWatcher();
    };
  }, [fetchCurrentLocation, cleanupWatcher]);

  return {
    coords,
    gpsAccuracy,
    isLocating,
    gpsStatus,
    locationSource,
    gpsFixAgeSeconds,
    region,
    locationName,
    fetchCurrentLocation,
    setLocationName,
    setManualLocation,
  };
};
