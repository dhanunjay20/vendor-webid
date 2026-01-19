import axios from 'axios';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE || 'http://localhost:8080'}/api`;

// Create axios instance with auth interceptor
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

axiosInstance.interceptors.request.use((config) => {
  try {
    const token =
      localStorage.getItem('token') ||
      localStorage.getItem('accessToken') ||
      localStorage.getItem('idToken') ||
      localStorage.getItem('jwt');
    if (token) {
      if (config.headers && typeof config.headers.set === 'function') {
        config.headers.set('Authorization', `Bearer ${token}`);
      } else if (config.headers) {
        (config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
      } else {
        // Fallback: mutate as Record<string, any> if set() is not available
        (config.headers as Record<string, any>)['Authorization'] = `Bearer ${token}`;
      }
    }
  } catch (e) {
    // ignore
  }
  return config;
});

export interface LocationUpdateDto {
  id: string;
  latitude: number;
  longitude: number;
  timestamp?: string;
  accuracyMeters?: number;
  source?: string;
  allowReverseGeocode?: boolean;
  address?: string; // Geocoded address returned from backend
}

export interface VendorLocationDto {
  id: string;
  businessName: string;
  latitude: number;
  longitude: number;
  lastLocationUpdatedAt: string;
  distance?: number;
  currentAddress?: string;
}

export const locationApi = {
  /**
   * Update a user/vendor current location. Sends `{ id, latitude, longitude, timestamp }`.
   * Returns the geocoded address from backend.
   */
  updateLocation: async (
    id: string,
    latitude: number,
    longitude: number,
    accuracyMeters?: number,
    source?: string
  ): Promise<LocationUpdateDto> => {
    try {
      const payload: LocationUpdateDto = {
        id,
        latitude,
        longitude,
        timestamp: new Date().toISOString(),
        accuracyMeters,
        source: source || 'gps',
        allowReverseGeocode: true,
      };

      const response = await axiosInstance.post<LocationUpdateDto>('/location/update', payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get nearby vendors within radius (in km)
   */
  getNearbyVendors: async (
    latitude: number,
    longitude: number,
    radiusKm: number = 10
  ): Promise<VendorLocationDto[]> => {
    try {
      const response = await axiosInstance.get<VendorLocationDto[]>('/location/nearby', {
        params: { latitude, longitude, radiusKm },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get vendor's last known location
   */
  getVendorLocation: async (vendorId: string): Promise<VendorLocationDto | null> => {
    try {
      const response = await axiosInstance.get<VendorLocationDto>(`/location/vendor/${vendorId}`);
      return response.data;
    } catch (error) {
      return null;
    }
  },
};
