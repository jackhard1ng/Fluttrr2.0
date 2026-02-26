import { useEffect, useState, useCallback } from 'react';
import * as Location from 'expo-location';
import { DEFAULT_LAT, DEFAULT_LNG } from '@/constants/config';

interface LocationState {
  lat: number;
  lng: number;
  loading: boolean;
  error: string | null;
  granted: boolean;
  refresh: () => Promise<void>;
}

// Cache location for 5 minutes
let cachedLocation: { lat: number; lng: number; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

export function useLocation(): LocationState {
  const [lat, setLat] = useState(DEFAULT_LAT);
  const [lng, setLng] = useState(DEFAULT_LNG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [granted, setGranted] = useState(false);

  const fetchLocation = useCallback(async () => {
    // Use cache if fresh
    if (cachedLocation && Date.now() - cachedLocation.timestamp < CACHE_TTL) {
      setLat(cachedLocation.lat);
      setLng(cachedLocation.lng);
      setGranted(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission not granted');
        setGranted(false);
        setLoading(false);
        return;
      }

      setGranted(true);
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const newLat = position.coords.latitude;
      const newLng = position.coords.longitude;
      setLat(newLat);
      setLng(newLng);

      cachedLocation = { lat: newLat, lng: newLng, timestamp: Date.now() };
    } catch (err: any) {
      setError(err.message || 'Unable to get location');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  return { lat, lng, loading, error, granted, refresh: fetchLocation };
}
