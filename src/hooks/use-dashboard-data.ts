import { useState, useEffect, useCallback } from 'react';
import { analyticsApi, DashboardDataDto } from '@/lib/analyticsApi';

interface UseDashboardDataOptions {
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
 *   autoFetch: true,
 *   refreshInterval: 60000, // Refresh every 60 seconds
 * });
 * ```
 */
export const useDashboardData = (options: UseDashboardDataOptions = {}): UseDashboardDataReturn => {
  const { autoFetch = true, refreshInterval = 0 } = options;

  const [data, setData] = useState<DashboardDataDto | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const dashboardData = await analyticsApi.getCompleteDashboard();
      setData(dashboardData);
    } catch (err: any) {
      const backendMessage = err?.response?.data?.message || err?.response?.data;
      const errorMessage = typeof backendMessage === 'string' 
        ? backendMessage 
        : err?.message || 'Failed to fetch dashboard data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [autoFetch, fetchData]);

  // Auto-refresh interval
  useEffect(() => {
    if (refreshInterval > 0) {
      const intervalId = setInterval(() => {
        fetchData();
      }, refreshInterval);

      return () => clearInterval(intervalId);
    }
  }, [refreshInterval, fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
};
