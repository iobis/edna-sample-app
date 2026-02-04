import { useState, useEffect, useCallback } from 'react';
import { getCurrentLocation, LocationData, LocationError } from '../services/location';

export interface UseLocationReturn {
  location: LocationData | null;
  loading: boolean;
  error: LocationError | null;
  refresh: () => Promise<void>;
}

export function useLocation(): UseLocationReturn {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<LocationError | null>(null);

  const fetchLocation = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const loc = await getCurrentLocation();
      setLocation(loc);
    } catch (err) {
      setError(err as LocationError);
      setLocation(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  return {
    location,
    loading,
    error,
    refresh: fetchLocation,
  };
}

