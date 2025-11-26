import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import DashboardLayout from "@/components/DashboardLayout";
import Landing from "./pages/Landing";
import Register from "./pages/Register";
import Login from "./pages/Login";
import ForgotUsername from "./pages/ForgotUsername";
import ForgotPassword from "./pages/ForgotPassword";
import Index from "./pages/Index";
import Bids from "./pages/Bids";
import Orders from "./pages/Orders";
import Menu from "./pages/Menu";
import Messaging from "./pages/Messaging";
import Reviews from "./pages/Reviews";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-username" element={<ForgotUsername />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            
            {/* Dashboard Routes */}
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<Index />} />
              <Route path="bids" element={<Bids />} />
              <Route path="orders" element={<Orders />} />
              <Route path="menu" element={<Menu />} />
              <Route path="messaging" element={<Messaging />} />
              <Route path="reviews" element={<Reviews />} />
              <Route path="profile" element={<Profile />} />
            </Route>
            
            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
