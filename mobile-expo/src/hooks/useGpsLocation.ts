import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import { GpsCoordinates, GpsLockStatus } from '../types';
import { generateGhanaPostGpsCode } from '../utils/ghanaPostGps';

export interface UseGpsLocationResult {
  coords: GpsCoordinates | null;
  gpsAccuracy: number | null;
  isLocating: boolean;
  gpsStatus: GpsLockStatus;
  region: string;
  locationName: string;
  ghanaPostCode: string;
  fetchCurrentLocation: () => Promise<void>;
  setLocationName: (name: string) => void;
  setGhanaPostCode: (code: string) => void;
}

export const useGpsLocation = (): UseGpsLocationResult => {
  const [coords, setCoords] = useState<GpsCoordinates | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [gpsStatus, setGpsStatus] = useState<GpsLockStatus>('LOCATING');
  const [region, setRegion] = useState<string>('Greater Accra');
  const [locationName, setLocationName] = useState<string>('');
  const [ghanaPostCode, setGhanaPostCode] = useState<string>('');

  const fetchCurrentLocation = useCallback(async () => {
    setIsLocating(true);
    setGpsStatus('LOCATING');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsStatus('ERROR');
        setIsLocating(false);
        Alert.alert(
          'Location Permission Needed',
          'CitizenAlert uses your GPS coordinates to plot incidents on the national emergency map and tag your evidence with tamper-proof watermarks.'
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });

      const lat = location.coords.latitude;
      const lng = location.coords.longitude;
      const acc = typeof location.coords.accuracy === 'number' ? location.coords.accuracy : null;

      setCoords({ latitude: lat, longitude: lng });
      setGpsAccuracy(acc !== null ? Math.round(acc * 10) / 10 : null);
      setGpsStatus('LOCKED');

      let detectedRegion = 'Greater Accra';

      try {
        const reverseResults = await Location.reverseGeocodeAsync({
          latitude: lat,
          longitude: lng
        });

        if (reverseResults && reverseResults.length > 0) {
          const rev = reverseResults[0];
          const parts = [
            rev.street,
            rev.district || rev.subregion,
            rev.city || rev.name,
            rev.region
          ].filter(Boolean);

          const autoAreaName = parts.join(', ') || '';
          if (autoAreaName) {
            setLocationName(autoAreaName);
          }
          if (rev.region) {
            detectedRegion = rev.region;
            setRegion(rev.region);
          }
        }
      } catch (geoErr) {
        console.warn('Reverse geocode notice:', geoErr);
      }

      // Automatically generate and populate the official GhanaPost GPS Digital Address
      const autoGhanaPostCode = generateGhanaPostGpsCode(lat, lng, detectedRegion);
      if (autoGhanaPostCode) {
        setGhanaPostCode(autoGhanaPostCode);
      }
    } catch (e: any) {
      setGpsStatus('ERROR');
    } finally {
      setIsLocating(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentLocation();
  }, [fetchCurrentLocation]);

  return {
    coords,
    gpsAccuracy,
    isLocating,
    gpsStatus,
    region,
    locationName,
    ghanaPostCode,
    fetchCurrentLocation,
    setLocationName,
    setGhanaPostCode
  };
};
