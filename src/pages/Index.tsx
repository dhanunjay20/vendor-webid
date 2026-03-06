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
  // Fetch dashboard data with auto-refresh every 30 minutes (1800000ms)
  // No need to pass vendorId as it's determined from the auth token
  const { data, loading, error, refetch } = useDashboardData({
    autoFetch: true,
    refreshInterval: 1800000, // Auto-refresh every 30 minutes
  });

  // Log the received data for debugging
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
  // stats prepared for display

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Banner */}
      <div className="relative h-28 sm:h-36 md:h-44 w-full overflow-hidden">
        <img
          src={dashboardHero}
          alt="Dashboard Hero"
          className="h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-orange-900/80 to-orange-600/50" />
        <div className="absolute inset-0 flex items-center px-4 sm:px-6 md:px-8">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
              Welcome Back!
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-orange-100">
              Here's what's happening with your catering business today
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-4 sm:px-6 lg:px-8 py-5 sm:py-6">

        {/* Error Alert */}
        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
            <div className="flex-1 text-sm text-red-700">
              <div className="font-semibold mb-0.5">Unable to load dashboard data</div>
              <div className="text-xs text-red-600 mb-2">
                {error.includes('allowedOrigins') || error.includes('CORS')
                  ? 'Backend CORS configuration needs to be updated.'
                  : error}
              </div>
              <button onClick={() => refetch()} className="underline text-xs font-medium">
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && !data && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-orange-600 mb-3" />
            <span className="text-sm text-gray-600">Loading dashboard data...</span>
          </div>
        )}

        {/* Dashboard Content */}
        {(!loading || data) && (
          <>
            {/* Stats Grid */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Overview</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={loading}
                  className="flex items-center gap-1.5 border-orange-300 text-orange-600 hover:bg-orange-50 text-xs"
                >
                  {loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
              </div>
              <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
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

            {/* Analytics Section */}
            <div className="mb-6">
              <div className="mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Analytics Overview</h3>
                <p className="text-xs sm:text-sm text-gray-500">Track your business performance and trends</p>
              </div>
              <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                <RevenueChart data={data?.revenueTrends} />
                <OrderVolumeChart data={data?.orderVolume} />
                <MonthlyComparisonChart data={data?.monthlyComparison} />
                <PopularMenuChart data={data?.popularMenuItems} />
              </div>
            </div>

            {/* Content Grid */}
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
              <OrdersTable data={data?.recentOrders} />
              <RecentActivity data={data?.recentActivities} />
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Index;
