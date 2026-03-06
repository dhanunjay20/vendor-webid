import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { NotificationProvider } from "@/contexts/NotificationContext";
import AutoLogout from "@/components/AutoLogout";
import DashboardLayout from "@/components/DashboardLayout";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import VendorProfileSetup from "./pages/VendorProfileSetup.tsx";
import Index from "./pages/Index";
import Orders from "./pages/Orders";
import Menu from "./pages/Menu";
import Notifications from "./pages/Notifications";
import Messaging from "./pages/Messaging";
import Reviews from "./pages/Reviews";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import BidsNew from "./pages/BidsNew.tsx";
import Support from "./pages/Support";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <NotificationProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
            <AutoLogout />
            <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/vendor-setup" element={<VendorProfileSetup />} />
            {/* Dashboard Routes */}
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<Index />} />
              <Route path="bids" element={<BidsNew />} />
              <Route path="orders" element={<Orders />} />
              <Route path="menu" element={<Menu />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="messaging" element={<Messaging />} />
              <Route path="reviews" element={<Reviews />} />
              <Route path="profile" element={<Profile />} />
              <Route path="support" element={<Support />} />
            </Route>
            
            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </NotificationProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
