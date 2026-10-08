import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import { GpsCoordinates, GpsLockStatus } from '../types';

export const generateGhanaPostFromCoords = (lat: number, lng: number, regionName: string): string => {
  let prefix = 'GA';
  const reg = (regionName || '').toLowerCase();
  if (reg.includes('ashanti')) prefix = 'AK';
  else if (reg.includes('western')) prefix = 'WP';
  else if (reg.includes('central')) prefix = 'CR';
  else if (reg.includes('eastern')) prefix = 'ER';
  else if (reg.includes('volta')) prefix = 'VR';
  else if (reg.includes('northern')) prefix = 'NR';
  else if (reg.includes('upper east')) prefix = 'UE';
  else if (reg.includes('upper west')) prefix = 'UW';
  else if (reg.includes('bono')) prefix = 'BA';

  const part1 = String(Math.abs(Math.round(lat * 10000)) % 1000).padStart(3, '0');
  const part2 = String(Math.abs(Math.round(lng * 10000)) % 10000).padStart(4, '0');
  return `${prefix}-${part1}-${part2}`;
};

export interface UseGpsLocationResult {
  coords: GpsCoordinates;
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
  const [coords, setCoords] = useState<GpsCoordinates>({
    latitude: 5.6037,
    longitude: -0.1870
  });
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [gpsStatus, setGpsStatus] = useState<GpsLockStatus>('LOCATING');
  const [region, setRegion] = useState<string>('Greater Accra');
  const [locationName, setLocationName] = useState<string>('Accra Central, Greater Accra');
  const [ghanaPostCode, setGhanaPostCode] = useState<string>('GA-014-9923');

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
      const acc = location.coords.accuracy || 3.5;

      setCoords({ latitude: lat, longitude: lng });
      setGpsAccuracy(Math.round(acc * 10) / 10);
      setGpsStatus('LOCKED');

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

          const autoAreaName = parts.join(', ') || 'Ghana Coordinate Lock';
          setLocationName(autoAreaName);
          if (rev.region) {
            setRegion(rev.region);
          }

          const digitalCode = generateGhanaPostFromCoords(lat, lng, rev.region || 'Greater Accra');
          setGhanaPostCode(digitalCode);
        } else {
          const digitalCode = generateGhanaPostFromCoords(lat, lng, 'Greater Accra');
          setGhanaPostCode(digitalCode);
        }
      } catch (geoErr) {
        const digitalCode = generateGhanaPostFromCoords(lat, lng, region);
        setGhanaPostCode(digitalCode);
      }
    } catch (e: any) {
      setGpsStatus('ERROR');
    } finally {
      setIsLocating(false);
    }
  }, [region]);

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
