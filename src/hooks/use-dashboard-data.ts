import { useState, useEffect, useCallback } from 'react';
import { analyticsApi, DashboardDataDto } from '@/lib/analyticsApi';

interface UseDashboardDataOptions {
  vendorId: string | null;
  autoFetch?: boolean;
  refreshInterval?: number; // in milliseconds, 0 to disable
}

interface UseDashboardDataReturn {
  data: DashboardDataDto | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * React hook to fetch and manage dashboard analytics data
 * 
 * @param options - Configuration options
 * @returns Dashboard data, loading state, error, and refetch function
 * 
 * @example
 * ```tsx
 * const { data, loading, error, refetch } = useDashboardData({
 *   vendorId: 'vendor123',
 *   autoFetch: true,
 *   refreshInterval: 60000, // Refresh every 60 seconds
 * });
 * ```
 */
export const useDashboardData = (options: UseDashboardDataOptions): UseDashboardDataReturn => {
  const { vendorId, autoFetch = true, refreshInterval = 0 } = options;

  const [data, setData] = useState<DashboardDataDto | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!vendorId) {
      setError('Vendor ID is required');
      console.warn('⚠️ No vendor ID provided to useDashboardData');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log(`🔄 Fetching dashboard data for vendor: ${vendorId}`);
      const dashboardData = await analyticsApi.getCompleteDashboard(vendorId);
      setData(dashboardData);
      console.log('✅ Dashboard data loaded successfully');
    } catch (err: any) {
      const backendMessage = err?.response?.data?.message || err?.response?.data;
      const errorMessage = typeof backendMessage === 'string' 
        ? backendMessage 
        : err?.message || 'Failed to fetch dashboard data';
      setError(errorMessage);
      console.error('❌ Error fetching dashboard data:', {
        vendorId,
        status: err?.response?.status,
        message: errorMessage,
        fullError: err,
      });
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  // Initial fetch
  useEffect(() => {
    if (autoFetch && vendorId) {
      fetchData();
    }
  }, [autoFetch, vendorId, fetchData]);

  // Auto-refresh interval
  useEffect(() => {
    if (refreshInterval > 0 && vendorId) {
      const intervalId = setInterval(() => {
        console.log('🔄 Auto-refreshing dashboard data...');
        fetchData();
      }, refreshInterval);

      return () => clearInterval(intervalId);
    }
  }, [refreshInterval, vendorId, fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
};

/**
 * Hook for fetching individual analytics components
 * Use this when you only need specific data instead of the complete dashboard
 */
export const useAnalyticsComponent = <T,>(
  fetchFunction: (vendorId: string, ...args: any[]) => Promise<T>,
  vendorId: string | null,
  ...params: any[]
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!vendorId) {
      setError('Vendor ID is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await fetchFunction(vendorId, ...params);
      setData(result);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to fetch data';
      setError(errorMessage);
      console.error('❌ Error fetching analytics component:', err);
    } finally {
      setLoading(false);
    }
  }, [vendorId, fetchFunction, ...params]);

  useEffect(() => {
    if (vendorId) {
      fetchData();
    }
  }, [vendorId, fetchData]);

  return { data, loading, error, refetch: fetchData };
};
