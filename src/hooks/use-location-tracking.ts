import { useState, useCallback } from 'react';
import { locationApi } from '@/lib/locationApi';

interface LocationState {
  isUpdating: boolean;
  error: string | null;
}

export const useLocationUpdate = (vendorId: string | null) => {
  const [state, setState] = useState<LocationState>({
    isUpdating: false,
    error: null,
  });

  const updateLocation = useCallback(async (): Promise<{ latitude: number; longitude: number } | null> => {
    if (!navigator.geolocation) {
      setState({ isUpdating: false, error: 'Geolocation not supported by browser' });
      return null;
    }

    if (!vendorId) {
      setState({ isUpdating: false, error: 'Vendor ID not found' });
      return null;
    }

    setState({ isUpdating: true, error: null });

    return new Promise((resolve) => {
      // Request high accuracy GPS location (not network/IP-based)
      const options: PositionOptions = {
        enableHighAccuracy: true, // Use GPS, not network triangulation
        timeout: 15000, // Increased timeout for GPS lock
        maximumAge: 0, // Don't use cached position
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          
          console.log(`📍 Got location: lat=${latitude.toFixed(6)}, lon=${longitude.toFixed(6)}, accuracy=±${accuracy.toFixed(0)}m`);
          
          try {
            await locationApi.updateLocation(vendorId, latitude, longitude);
            console.log(`✅ Location saved to backend`);
            setState({ isUpdating: false, error: null });
            resolve({ latitude, longitude });
          } catch (error) {
            console.error('Failed to update location to backend:', error);
            setState({ isUpdating: false, error: 'Failed to save location' });
            resolve(null);
          }
        },
        (error) => {
          let errorMessage = 'Unknown location error';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable. Please ensure GPS is enabled.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timeout. Please try again in a moment.';
              break;
          }
          setState({ isUpdating: false, error: errorMessage });
          console.error('Geolocation error:', error.code, errorMessage);
          resolve(null);
        },
        options
      );
    });
  }, [vendorId]);

  return {
    ...state,
    updateLocation,
  };
};
