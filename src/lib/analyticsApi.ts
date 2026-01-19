import axios from 'axios';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE || 'http://localhost:8080'}/api`;

// Create axios instance with auth interceptor
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
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
        (config.headers as any)['Authorization'] = `Bearer ${token}`;
      }
    }
  } catch (e) {
    // ignore
  }
  return config;
});

// ==================== DTOs ====================

export interface MonthlyComparisonDto {
  month: string;
  thisYear: number;
  lastYear: number;
}

export interface OrderVolumeDto {
  date: string;
  orders: number;
  completed: number;
}

export interface PopularMenuItemDto {
  item: string;
  orders: number;
  revenue: number;
}

export interface RevenueTrendDto {
  month: string;
  revenue: number;
  target: number;
}

export interface OrderTableDto {
  id: string;
  client: string;
  event: string;
  date: string;
  guests: number;
  status: string;
  amount: string;
}

export interface RecentActivityDto {
  id: number;
  user: string;
  action: string;
  time: string;
  type: 'order' | 'review' | 'bid' | 'message';
}

export interface DashboardDataDto {
  monthlyComparison: MonthlyComparisonDto[];
  orderVolume: OrderVolumeDto[];
  popularMenuItems: PopularMenuItemDto[];
  revenueTrends: RevenueTrendDto[];
  recentOrders: OrderTableDto[];
  recentActivities: RecentActivityDto[];
}

// ==================== API Functions ====================

export const analyticsApi = {
  /**
   * Get complete dashboard data in one call (RECOMMENDED)
   * @param vendorOrganizationId - Vendor organization ID
   */
  getCompleteDashboard: async (vendorOrganizationId: string): Promise<DashboardDataDto> => {
    try {
      const response = await axiosInstance.get<DashboardDataDto>(
        `/analytics/vendor/${vendorOrganizationId}/dashboard`
      );
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  /**
   * Get monthly revenue comparison (last 6 months)
   * @param vendorOrganizationId - Vendor organization ID
   */
  getMonthlyComparison: async (vendorOrganizationId: string): Promise<MonthlyComparisonDto[]> => {
    try {
      const response = await axiosInstance.get<MonthlyComparisonDto[]>(
        `/analytics/vendor/${vendorOrganizationId}/monthly-comparison`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get order volume trends (last 6 weeks)
   * @param vendorOrganizationId - Vendor organization ID
   */
  getOrderVolume: async (vendorOrganizationId: string): Promise<OrderVolumeDto[]> => {
    try {
      const response = await axiosInstance.get<OrderVolumeDto[]>(
        `/analytics/vendor/${vendorOrganizationId}/order-volume`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get popular menu items by order count
   * @param vendorOrganizationId - Vendor organization ID
   * @param limit - Number of items to return (default: 6)
   */
  getPopularMenuItems: async (
    vendorOrganizationId: string,
    limit: number = 6
  ): Promise<PopularMenuItemDto[]> => {
    try {
      const response = await axiosInstance.get<PopularMenuItemDto[]>(
        `/analytics/vendor/${vendorOrganizationId}/popular-menu-items`,
        { params: { limit } }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get revenue trends with targets (last 6 months)
   * @param vendorOrganizationId - Vendor organization ID
   */
  getRevenueTrends: async (vendorOrganizationId: string): Promise<RevenueTrendDto[]> => {
    try {
      const response = await axiosInstance.get<RevenueTrendDto[]>(
        `/analytics/vendor/${vendorOrganizationId}/revenue-trends`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get recent orders for orders table
   * @param vendorOrganizationId - Vendor organization ID
   * @param limit - Number of orders to return (default: 10)
   */
  getRecentOrders: async (vendorOrganizationId: string, limit: number = 10): Promise<OrderTableDto[]> => {
    try {
      const response = await axiosInstance.get<OrderTableDto[]>(
        `/analytics/vendor/${vendorOrganizationId}/recent-orders`,
        { params: { limit } }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get recent activities for activity feed
   * @param vendorOrganizationId - Vendor organization ID
   * @param limit - Number of activities to return (default: 10)
   */
  getRecentActivities: async (
    vendorOrganizationId: string,
    limit: number = 10
  ): Promise<RecentActivityDto[]> => {
    try {
      const response = await axiosInstance.get<RecentActivityDto[]>(
        `/analytics/vendor/${vendorOrganizationId}/recent-activities`,
        { params: { limit } }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};
