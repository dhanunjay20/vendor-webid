import { DollarSign, ShoppingCart, Star, TrendingUp, Loader2, RefreshCw } from "lucide-react";
import StatsCard from "@/components/StatsCard";
import OrdersTable from "@/components/OrdersTable";
import RecentActivity from "@/components/RecentActivity";
import RevenueChart from "@/components/analytics/RevenueChart";
import OrderVolumeChart from "@/components/analytics/OrderVolumeChart";
import MonthlyComparisonChart from "@/components/analytics/MonthlyComparisonChart";
import PopularMenuChart from "@/components/analytics/PopularMenuChart";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import dashboardHero from "@/assets/dashboard-hero.jpg";

const Index = () => {
  // Get vendor organization ID from localStorage
  // The analytics API expects vendorOrganizationId
  const vendorOrganizationId = localStorage.getItem("vendorOrganizationId");

  // Fetch dashboard data with auto-refresh every 30 minutes (1800000ms)
  const { data, loading, error, refetch } = useDashboardData({
    vendorId: vendorOrganizationId,
    autoFetch: true,
    refreshInterval: 1800000, // Auto-refresh every 30 minutes
  });

  // Log the received data for debugging
  console.log('📊 Dashboard data received:', data);
  console.log('💰 Revenue trends:', data?.revenueTrends);
  console.log('📦 Order volume:', data?.orderVolume);
  console.log('📋 Recent orders:', data?.recentOrders);
  console.log('🎯 Popular menu items:', data?.popularMenuItems);
  console.log('📈 Monthly comparison:', data?.monthlyComparison);
  console.log('⚡ Recent activities:', data?.recentActivities);

  // Calculate stats from dashboard data
  // Total Revenue: Sum of all revenue from revenue trends (cumulative)
  const totalRevenue = data?.revenueTrends?.reduce((sum, trend) => sum + (trend.revenue || 0), 0) || 0;
  
  // Active Orders: Count orders with 'pending' or 'confirmed' status (case-insensitive)
  const activeOrders = data?.recentOrders?.filter(o => {
    const status = o.status?.toLowerCase();
    return status === 'confirmed' || status === 'pending';
  })?.length || 0;
  
  // Total Orders: Sum of all orders from order volume data
  const totalOrders = data?.orderVolume?.reduce((sum, item) => sum + (item.orders || 0), 0) || 0;
  
  const stats = {
    totalRevenue,
    activeOrders,
    totalOrders,
  };
  
  console.log('📊 Calculated stats:', stats);
  console.log('  - Total Revenue (sum of all revenue trends):', totalRevenue);
  console.log('  - Active Orders (pending + confirmed):', activeOrders);
  console.log('  - Total Orders (sum of order volume):', totalOrders);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner - Mobile Responsive */}
      <div className="relative h-32 sm:h-40 md:h-48 w-full overflow-hidden">
        <img
          src={dashboardHero}
          alt="Dashboard Hero"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 to-background/50" />
        <div className="absolute inset-0 flex items-center px-3 sm:px-6 md:px-8">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground truncate">
              Welcome Back!
            </h1>
            <p className="mt-1 text-xs sm:text-sm md:text-base lg:text-lg text-muted-foreground line-clamp-2">
              Here's what's happening with your catering business today
            </p>
          </div>
        </div>
      </div>

      {/* Main Content - Mobile Responsive */}
      <main className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        {/* Missing Vendor ID Warning */}
        {!vendorOrganizationId && (
          <Alert variant="destructive" className="mb-4 sm:mb-6">
            <AlertDescription className="text-sm">
              Vendor organization ID not found. Please log in again.
            </AlertDescription>
          </Alert>
        )}

        {/* Error Alert with CORS Help */}
        {error && (
          <Alert variant="destructive" className="mb-4 sm:mb-6">
            <AlertDescription className="text-xs sm:text-sm">
              <div className="font-semibold mb-1">Unable to load dashboard data</div>
              <div className="text-xs opacity-90 mb-2">
                {error.includes('allowedOrigins') || error.includes('CORS') 
                  ? 'Backend CORS configuration needs to be updated. Contact your administrator.'
                  : error}
              </div>
              <button onClick={() => refetch()} className="underline text-xs font-medium">
                Try Again
              </button>
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {loading && !data && (
          <div className="flex flex-col items-center justify-center py-12 sm:py-16 md:py-20">
            <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary mb-2" />
            <span className="text-xs sm:text-sm text-muted-foreground">Loading dashboard data...</span>
          </div>
        )}

        {/* Dashboard Content */}
        {!loading || data ? (
          <>
            {/* Stats Grid - Mobile Responsive */}
            <div className="mb-6 sm:mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg sm:text-xl font-semibold text-foreground">
                  Overview
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={loading}
                  className="flex items-center gap-1.5"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
              </div>
              <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                <StatsCard
                  title="Total Revenue"
                  value={`$${stats.totalRevenue.toLocaleString()}`}
                  change={data?.revenueTrends?.length ? `Based on ${data.revenueTrends.length} months` : "No data yet"}
                  icon={DollarSign}
                  trend="up"
                />
                <StatsCard
                  title="Active Orders"
                  value={stats.activeOrders.toString()}
                  change={stats.totalOrders > 0 ? `${stats.totalOrders} total orders` : "No orders yet"}
                  icon={ShoppingCart}
                  trend="up"
                />
                <StatsCard
                  title="Avg Rating"
                  value="4.8"
                  change="Excellent"
                  icon={Star}
                  trend="up"
                />
                <StatsCard
                  title="Popular Items"
                  value={data?.popularMenuItems?.length?.toString() || "0"}
                  change={data?.popularMenuItems?.length ? "Top performers" : "No data yet"}
                  icon={TrendingUp}
                  trend="neutral"
                />
              </div>
            </div>

            {/* Analytics Section - Mobile Responsive */}
            <div className="mb-6 sm:mb-8">
              <div className="mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">
                  Analytics Overview
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Track your business performance and trends
                </p>
              </div>
              <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
                <RevenueChart data={data?.revenueTrends} />
                <OrderVolumeChart data={data?.orderVolume} />
                <MonthlyComparisonChart data={data?.monthlyComparison} />
                <PopularMenuChart data={data?.popularMenuItems} />
              </div>
            </div>

            {/* Content Grid - Mobile Responsive */}
            <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
              <OrdersTable data={data?.recentOrders} />
              <RecentActivity data={data?.recentActivities} />
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
};

export default Index;
