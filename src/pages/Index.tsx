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

  const dashboardMetrics = data?.dashboard?.metrics || data?.stats?.metrics;
  const bidMetrics = data?.dashboard?.bidMetrics || data?.stats?.bidMetrics;
  const performance = data?.dashboard?.performance || data?.stats?.performance;
  const vendorName = data?.dashboard?.vendorName || data?.stats?.vendorName || "";
  const currency = dashboardMetrics?.currency || "INR";

  const stats = {
    totalRevenue: dashboardMetrics?.totalRevenue || 0,
    activeOrders: dashboardMetrics?.pendingOrders || 0,
    totalOrders: dashboardMetrics?.totalOrders || 0,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
      {/* Hero Banner */}
      <div className="relative h-44 sm:h-52 md:h-60 w-full overflow-hidden">
        <img
          src={dashboardHero}
          alt="Dashboard Hero"
          className="h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-orange-950/80 via-orange-800/60 to-orange-500/40" />
        <div className="absolute inset-0">
          <div className="absolute -right-24 -top-20 h-56 w-56 rounded-full bg-orange-300/30 blur-3xl" />
          <div className="absolute left-6 bottom-0 h-24 w-64 rounded-full bg-white/20 blur-2xl" />
        </div>
        <div className="absolute inset-0 flex items-center px-4 sm:px-6 md:px-8">
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-[0.25em] text-orange-100/80">Vendor Console</p>
            <h1 className="mt-2 text-2xl sm:text-3xl md:text-4xl font-bold text-white">
              {vendorName ? `Welcome, ${vendorName}` : "Welcome Back"}
            </h1>
            <p className="mt-2 text-sm sm:text-base text-orange-100/90">
              Live metrics, orders, and performance at a glance.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/90">Currency: {currency}</span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/90">Orders: {stats.totalOrders}</span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/90">Pending: {stats.activeOrders}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

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
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">Overview</h3>
                  <p className="text-xs sm:text-sm text-gray-500">Key metrics from your vendor dashboard</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={loading}
                  className="flex items-center gap-1.5 border-orange-300 text-orange-700 hover:bg-orange-50 text-xs rounded-full"
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
                  value={`${currency} ${stats.totalRevenue.toLocaleString()}`}
                  change={dashboardMetrics ? "From vendor dashboard" : "No data yet"}
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
                  value={performance?.averageRating?.toFixed(1) || "0.0"}
                  change={performance?.totalReviews ? `${performance.totalReviews} reviews` : "No reviews yet"}
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

            {/* Vendor Dashboard Data */}
            <div className="mb-6">
              <div className="mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Vendor Dashboard Data</h3>
                <p className="text-xs sm:text-sm text-gray-500">Live metrics from vendor APIs</p>
              </div>
              <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
                <div className="rounded-2xl border border-orange-100 bg-white/80 p-5 shadow-sm backdrop-blur">
                  <div className="text-sm font-semibold text-gray-900 mb-2">Vendor</div>
                  <div className="text-sm text-gray-600">{vendorName || "-"}</div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-lg bg-orange-50 p-3">
                      <div className="text-gray-500">Total Orders</div>
                      <div className="font-semibold text-gray-900">{dashboardMetrics?.totalOrders ?? 0}</div>
                    </div>
                    <div className="rounded-lg bg-emerald-50 p-3">
                      <div className="text-gray-500">Completed</div>
                      <div className="font-semibold text-gray-900">{dashboardMetrics?.completedOrders ?? 0}</div>
                    </div>
                    <div className="rounded-lg bg-amber-50 p-3">
                      <div className="text-gray-500">Pending</div>
                      <div className="font-semibold text-gray-900">{dashboardMetrics?.pendingOrders ?? 0}</div>
                    </div>
                    <div className="rounded-lg bg-rose-50 p-3">
                      <div className="text-gray-500">Cancelled</div>
                      <div className="font-semibold text-gray-900">{dashboardMetrics?.cancelledOrders ?? 0}</div>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-orange-100 bg-white/80 p-5 shadow-sm backdrop-blur">
                  <div className="text-sm font-semibold text-gray-900 mb-2">Bid Metrics</div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-lg bg-blue-50 p-3">
                      <div className="text-gray-500">Total Bids</div>
                      <div className="font-semibold text-gray-900">{bidMetrics?.totalBidsSubmitted ?? 0}</div>
                    </div>
                    <div className="rounded-lg bg-violet-50 p-3">
                      <div className="text-gray-500">Accepted</div>
                      <div className="font-semibold text-gray-900">{bidMetrics?.acceptedBids ?? 0}</div>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <div className="text-gray-500">Pending</div>
                      <div className="font-semibold text-gray-900">{bidMetrics?.pendingBids ?? 0}</div>
                    </div>
                    <div className="rounded-lg bg-teal-50 p-3">
                      <div className="text-gray-500">Acceptance Rate</div>
                      <div className="font-semibold text-gray-900">{bidMetrics?.acceptanceRate ?? 0}%</div>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-gray-600">
                    Avg Bid: {currency} {bidMetrics?.averageBidAmount ?? 0}
                  </div>
                </div>
                <div className="rounded-2xl border border-orange-100 bg-white/80 p-5 shadow-sm backdrop-blur">
                  <div className="text-sm font-semibold text-gray-900 mb-2">Performance</div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-lg bg-amber-50 p-3">
                      <div className="text-gray-500">Avg Rating</div>
                      <div className="font-semibold text-gray-900">{performance?.averageRating ?? 0}</div>
                    </div>
                    <div className="rounded-lg bg-emerald-50 p-3">
                      <div className="text-gray-500">Total Reviews</div>
                      <div className="font-semibold text-gray-900">{performance?.totalReviews ?? 0}</div>
                    </div>
                    <div className="rounded-lg bg-sky-50 p-3">
                      <div className="text-gray-500">Response Rate</div>
                      <div className="font-semibold text-gray-900">{performance?.responseRate ?? 0}%</div>
                    </div>
                    <div className="rounded-lg bg-orange-50 p-3">
                      <div className="text-gray-500">On-time Delivery</div>
                      <div className="font-semibold text-gray-900">{performance?.onTimeDeliveryRate ?? 0}%</div>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-orange-100 bg-white/80 p-5 shadow-sm backdrop-blur">
                  <div className="text-sm font-semibold text-gray-900 mb-2">Revenue</div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-lg bg-emerald-50 p-3">
                      <div className="text-gray-500">Total Revenue</div>
                      <div className="font-semibold text-gray-900">{currency} {dashboardMetrics?.totalRevenue ?? 0}</div>
                    </div>
                    <div className="rounded-lg bg-orange-50 p-3">
                      <div className="text-gray-500">This Month</div>
                      <div className="font-semibold text-gray-900">{currency} {dashboardMetrics?.thisMonthRevenue ?? 0}</div>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3">
                      <div className="text-gray-500">Pending Payouts</div>
                      <div className="font-semibold text-gray-900">{currency} {dashboardMetrics?.pendingPayouts ?? 0}</div>
                    </div>
                  </div>
                </div>
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
