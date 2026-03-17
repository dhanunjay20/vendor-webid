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

export interface VendorStatsResponse {
  vendorId: string;
  vendorName: string;
  metrics: VendorMetrics;
  bidMetrics: BidMetrics;
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
  dashboard: VendorDashboardResponse;
  stats: VendorStatsResponse | null;
}

// ==================== Helper Functions ====================

/**
 * Transform the backend API response into the frontend dashboard data structure
 * Use only data provided by the backend
 */
const transformDashboardResponse = (
  dashboard: VendorDashboardResponse,
  stats: VendorStatsResponse | null
): DashboardDataDto => {
  const source = dashboard || stats;
  const metrics = source?.metrics;
  const bidMetrics = source?.bidMetrics;
  const performance = source?.performance;
  const recentOrders = dashboard?.recentOrders || stats?.recentOrders || [];
  const upcomingEvents = dashboard?.upcomingEvents || stats?.upcomingEvents || [];

  const recentOrdersTable: OrderTableDto[] = recentOrders.slice(0, 5).map((o: any) => {
    const amount = o.amount ?? o.totalAmount ?? o.pricing?.totalAmount ?? 0;
    const currency = o.currency ?? o.pricing?.currency ?? metrics?.currency ?? "INR";
    const user = o.userDetails || {};
    const clientName = user.fullName || o.clientName || o.userName || "Unknown";
    const clientContact = user.email || user.phone || "";
    return {
      id: o.orderId || "",
      client: clientContact ? `${clientName} · ${clientContact}` : clientName,
      event: o.eventName || o.eventDetails?.eventName || "Event",
      date: o.eventDate || o.eventDetails?.eventDate || new Date().toLocaleDateString(),
      guests: o.guestCount || o.eventDetails?.numberOfGuests || 0,
      status: o.status || "CONFIRMED",
      amount: `${currency} ${Number(amount).toLocaleString()}`,
    };
  });

  const monthLabel = new Date().toLocaleString('default', { month: 'short' });
  const revenueTrends: RevenueTrendDto[] = metrics
    ? [{ month: monthLabel, revenue: metrics.thisMonthRevenue || 0, target: metrics.totalRevenue || 0 }]
    : [];

  const monthlyComparison: MonthlyComparisonDto[] = metrics
    ? [{ month: monthLabel, thisYear: metrics.thisMonthRevenue || 0, lastYear: 0 }]
    : [];

  const orderVolume: OrderVolumeDto[] = metrics
    ? [{ date: new Date().toLocaleDateString('default', { month: 'short', day: 'numeric' }), orders: metrics.totalOrders || 0, completed: metrics.completedOrders || 0 }]
    : [];

  const popularMenuItems: PopularMenuItemDto[] = [];
  if (metrics && metrics.totalOrders > 0) {
    popularMenuItems.push({
      item: 'Total Orders',
      orders: metrics.totalOrders,
      revenue: metrics.totalRevenue || 0,
    });
  }
  if (bidMetrics && bidMetrics.acceptedBids > 0) {
    popularMenuItems.push({
      item: 'Accepted Bids',
      orders: bidMetrics.acceptedBids,
      revenue: (bidMetrics.averageBidAmount || 0) * bidMetrics.acceptedBids,
    });
  }
  if (performance && performance.totalReviews > 0) {
    popularMenuItems.push({
      item: 'Total Reviews',
      orders: performance.totalReviews,
      revenue: 0,
    });
  }

  const recentActivities: RecentActivityDto[] = [];
  recentOrders.slice(0, 3).forEach((o: any, index: number) => {
    const user = o.userDetails || {};
    const userName = user.fullName || o.clientName || o.userName || "Customer";
    const eventName = o.eventName || o.eventDetails?.eventName || "Event";
    const status = o.status || "CONFIRMED";
    recentActivities.push({
      id: index + 1,
      user: userName,
      action: `order for ${eventName} is ${status.replace(/_/g, " ")}`,
      time: o.eventDate || o.eventDetails?.eventDate || "Recent",
      type: "order",
    });
  });

  upcomingEvents.slice(0, 2).forEach((e: any, index: number) => {
    const user = e.userDetails || {};
    const userName = user.fullName || "Customer";
    const eventName = e.eventName || "Upcoming event";
    const daysUntil = e.daysUntil !== undefined ? `${e.daysUntil} days` : "Upcoming";
    recentActivities.push({
      id: recentActivities.length + index + 1,
      user: userName,
      action: `${eventName} scheduled (${daysUntil})`,
      time: e.eventDate || "Upcoming",
      type: "order",
    });
  });

  return {
    monthlyComparison,
    orderVolume,
    popularMenuItems,
    revenueTrends,
    recentOrders: recentOrdersTable,
    recentActivities,
    dashboard,
    stats,
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
      const [dashboardRes, statsRes] = await Promise.all([
        axiosInstance.get<{ data: VendorDashboardResponse }>(`/v1/analytics/vendor/dashboard`),
        axiosInstance.get<{ data: VendorStatsResponse }>(`/v1/analytics/vendor/stats`),
      ]);
      const dashboardData = transformDashboardResponse(
        dashboardRes.data.data,
        statsRes?.data?.data || null
      );
      return dashboardData;
    } catch (error: any) {

      throw error;
    }
  },
};
