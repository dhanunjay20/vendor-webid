import { useState } from "react";
import { DollarSign, ShoppingCart, Star, TrendingUp } from "lucide-react";
import DashboardHeader from "@/components/DashboardHeader";
import StatsCard from "@/components/StatsCard";
import OrdersTable from "@/components/OrdersTable";
import RecentActivity from "@/components/RecentActivity";
import dashboardHero from "@/assets/dashboard-hero.jpg";

const Index = () => {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader theme={theme} toggleTheme={toggleTheme} />

      {/* Hero Banner */}
      <div className="relative h-48 w-full overflow-hidden">
        <img
          src={dashboardHero}
          alt="Dashboard Hero"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 to-background/50" />
        <div className="absolute inset-0 flex items-center px-8">
          <div>
            <h2 className="text-4xl font-bold text-foreground">Welcome Back!</h2>
            <p className="mt-2 text-lg text-muted-foreground">
              Here's what's happening with your catering business today
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Revenue"
            value="$45,231"
            change="+20.1% from last month"
            icon={DollarSign}
            trend="up"
          />
          <StatsCard
            title="Active Orders"
            value="23"
            change="+12 new this week"
            icon={ShoppingCart}
            trend="up"
          />
          <StatsCard
            title="Average Rating"
            value="4.8"
            change="Excellent performance"
            icon={Star}
            trend="up"
          />
          <StatsCard
            title="Active Bids"
            value="8"
            change="+3 pending responses"
            icon={TrendingUp}
            trend="neutral"
          />
        </div>

        {/* Content Grid */}
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-foreground">Recent Orders</h3>
              <p className="text-muted-foreground">Manage and track your catering orders</p>
            </div>
            <OrdersTable />
          </div>

          <div className="lg:col-span-1">
            <RecentActivity />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
