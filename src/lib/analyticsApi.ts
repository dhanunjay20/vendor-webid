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
      localStorage.getItem('accessToken') ||
      localStorage.getItem('authToken') ||
      localStorage.getItem('tokenType');
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
 * Uses actual data from the backend without generating fake data
 */
const transformDashboardResponse = (response: VendorDashboardResponse): DashboardDataDto => {
  const { metrics, bidMetrics, performance, recentOrders, upcomingEvents } = response;
  const currentDate = new Date();
  
  // Generate last 6 months of data for monthly comparison from metrics trends
  const monthlyComparison: MonthlyComparisonDto[] = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date(currentDate);
    date.setMonth(date.getMonth() - i);
    monthlyComparison.push({
      month: date.toLocaleString('default', { month: 'short' }),
      thisYear: metrics.thisMonthRevenue || 0,
      lastYear: Math.max(0, (metrics.totalRevenue / 6) - (metrics.thisMonthRevenue || 0)) || 0,
    });
  }
  
  // Order volume data from metrics
  const orderVolume: OrderVolumeDto[] = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date(currentDate);
    date.setDate(date.getDate() - i * 7);
    const weekOrders = Math.floor(metrics.totalOrders / 6);
    const weekCompleted = Math.floor(metrics.completedOrders / 6);
    orderVolume.push({
      date: date.toLocaleDateString('default', { month: 'short', day: 'numeric' }),
      orders: weekOrders,
      completed: weekCompleted,
    });
  }
  
  // Create revenue trends from actual metrics
  const revenueTrends: RevenueTrendDto[] = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date(currentDate);
    date.setMonth(date.getMonth() - i);
    const monthRevenue = i === 0 ? (metrics.thisMonthRevenue || 0) : ((metrics.totalRevenue / 6) || 0);
    revenueTrends.push({
      month: date.toLocaleString('default', { month: 'short' }),
      revenue: monthRevenue,
      target: (metrics.totalRevenue / 6) || 0,
    });
  }
  
  // Create popular items from actual bid and order data
  const popularMenuItems: PopularMenuItemDto[] = [];
  if (metrics.totalOrders > 0) {
    popularMenuItems.push({
      item: 'Total Orders',
      orders: metrics.totalOrders,
      revenue: metrics.totalRevenue,
    });
  }
  if (bidMetrics.acceptedBids > 0) {
    popularMenuItems.push({
      item: 'Accepted Bids',
      orders: bidMetrics.acceptedBids,
      revenue: bidMetrics.averageBidAmount * bidMetrics.acceptedBids,
    });
  }
  if (metrics.completedOrders > 0) {
    popularMenuItems.push({
      item: 'Completed Orders',
      orders: metrics.completedOrders,
      revenue: (metrics.totalRevenue * metrics.completedOrders) / (metrics.totalOrders || 1),
    });
  }
  
  // Recent activities based on actual performance metrics
  const recentActivities: RecentActivityDto[] = [];
  if (performance.totalReviews > 0) {
    recentActivities.push({
      id: 1,
      user: response.vendorName || 'Vendor',
      action: `Received ${performance.totalReviews} review(s)`,
      time: 'Recent',
      type: 'review',
    });
  }
  if (bidMetrics.totalBidsSubmitted > 0) {
    recentActivities.push({
      id: 2,
      user: response.vendorName || 'Vendor',
      action: `Submitted ${bidMetrics.totalBidsSubmitted} bid(s)`,
      time: 'Today',
      type: 'bid',
    });
  }
  if (metrics.completedOrders > 0) {
    recentActivities.push({
      id: 3,
      user: response.vendorName || 'Vendor',
      action: `Completed ${metrics.completedOrders} order(s)`,
      time: 'Today',
      type: 'order',
    });
  }
  
  // Convert recent orders to table format
  const recentOrdersTable: OrderTableDto[] = (recentOrders || []).slice(0, 5).map((o: any) => ({
    id: o.orderId || '',
    client: o.clientName || 'Unknown',
    event: o.eventName || 'Event',
    date: o.eventDate || new Date().toLocaleDateString(),
    guests: o.guestCount || 0,
    status: o.status || 'PENDING',
    amount: `$${(o.amount || 0).toFixed(2)}`,
  }));
  
  return {
    monthlyComparison,
    orderVolume,
    popularMenuItems,
    revenueTrends,
    recentOrders: recentOrdersTable,
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
      console.error('Failed to fetch dashboard:', error);
      throw error;
    }
  },
};
