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
}

export interface VendorLocationDto {
  id: string;
  businessName: string;
  latitude: number;
  longitude: number;
  lastLocationUpdatedAt: string;
  distance?: number;
}

export const locationApi = {
  /**
   * Update a user/vendor current location. Sends `{ id, latitude, longitude, timestamp }`.
   */
  updateLocation: async (id: string, latitude: number, longitude: number): Promise<void> => {
    try {
      const payload: LocationUpdateDto = {
        id,
        latitude,
        longitude,
        timestamp: new Date().toISOString(),
      };

      await axiosInstance.put('/location/update', payload);
      console.log('Location updated successfully');
    } catch (error) {
      console.error('Error updating location:', error);
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
      console.error('Error fetching nearby vendors:', error);
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
      console.error('Error fetching vendor location:', error);
      return null;
    }
  },
};
