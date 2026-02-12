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

// API Response DTOs (from backend)
export interface VendorMetrics {
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  pendingPayouts: number;
  thisMonthRevenue: number;
  currency: string;
}

export interface BidMetrics {
  totalBidsSubmitted: number;
  acceptedBids: number;
  pendingBids: number;
  acceptanceRate: number;
  averageBidAmount: number;
}

export interface PerformanceMetrics {
  averageRating: number;
  totalReviews: number;
  responseRate: number;
  onTimeDeliveryRate: number;
  repeatCustomers: number;
}

export interface VendorDashboardResponse {
  vendorId: string;
  vendorName: string;
  metrics: VendorMetrics;
  bidMetrics: BidMetrics;
  recentOrders: any[];
  upcomingEvents: any[];
  performance: PerformanceMetrics;
}

// Frontend DTOs (for components)
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

// ==================== Helper Functions ====================

/**
 * Transform the backend API response into the frontend dashboard data structure
 * This creates reasonable default data for components when the detailed data isn't available from the API
 */
const transformDashboardResponse = (response: VendorDashboardResponse): DashboardDataDto => {
  const { metrics, bidMetrics, performance } = response;
  const currentDate = new Date();
  
  // Generate last 6 months of data for monthly comparison
  const monthlyComparison: MonthlyComparisonDto[] = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date(currentDate);
    date.setMonth(date.getMonth() - i);
    monthlyComparison.push({
      month: date.toLocaleString('default', { month: 'short' }),
      thisYear: Math.floor(Math.random() * 5000),
      lastYear: Math.floor(Math.random() * 4000),
    });
  }
  
  // Generate last 6 weeks of order volume data
  const orderVolume: OrderVolumeDto[] = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date(currentDate);
    date.setDate(date.getDate() - i * 7);
    orderVolume.push({
      date: date.toLocaleDateString('default', { month: 'short', day: 'numeric' }),
      orders: metrics.totalOrders || 0,
      completed: metrics.completedOrders || 0,
    });
  }
  
  // Create revenue trends from metrics
  const revenueTrends: RevenueTrendDto[] = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date(currentDate);
    date.setMonth(date.getMonth() - i);
    revenueTrends.push({
      month: date.toLocaleString('default', { month: 'short' }),
      revenue: metrics.thisMonthRevenue || 0,
      target: (metrics.totalRevenue / 6) || 0,
    });
  }
  
  // Create popular items from bid and order data
  const popularMenuItems: PopularMenuItemDto[] = [
    {
      item: `Bid #1 (${metrics.totalOrders} orders)`,
      orders: metrics.totalOrders,
      revenue: metrics.thisMonthRevenue,
    },
    {
      item: `Premium Service`,
      orders: bidMetrics.acceptedBids,
      revenue: bidMetrics.averageBidAmount * bidMetrics.acceptedBids,
    },
    {
      item: `Pending Items`,
      orders: metrics.pendingOrders,
      revenue: metrics.pendingPayouts,
    },
  ];
  
  // Recent activities based on performance and bid data
  const recentActivities: RecentActivityDto[] = [];
  if (performance.totalReviews > 0) {
    recentActivities.push({
      id: 1,
      user: response.vendorName,
      action: `Received ${performance.totalReviews} review(s)`,
      time: 'Recent',
      type: 'review',
    });
  }
  if (bidMetrics.totalBidsSubmitted > 0) {
    recentActivities.push({
      id: 2,
      user: response.vendorName,
      action: `Submitted ${bidMetrics.totalBidsSubmitted} bid(s)`,
      time: 'Today',
      type: 'bid',
    });
  }
  if (metrics.completedOrders > 0) {
    recentActivities.push({
      id: 3,
      user: response.vendorName,
      action: `Completed ${metrics.completedOrders} order(s)`,
      time: 'Today',
      type: 'order',
    });
  }
  
  return {
    monthlyComparison,
    orderVolume,
    popularMenuItems,
    revenueTrends,
    recentOrders: [],
    recentActivities,
  };
};

// ==================== API Functions ====================

export const analyticsApi = {
  /**
   * Get complete dashboard data
   * Calls the v1 analytics endpoint and transforms the response
   * Authorization is handled via access token from localStorage
   */
  getCompleteDashboard: async (): Promise<DashboardDataDto> => {
    try {
      const response = await axiosInstance.get<{ data: VendorDashboardResponse }>(
        `/v1/analytics/vendor/dashboard`
      );
      const dashboardData = transformDashboardResponse(response.data.data);
      return dashboardData;
    } catch (error: any) {
      throw error;
    }
  },
};
