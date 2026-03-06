import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// inline alert removed; using toasts only
import { useNavigate } from "react-router-dom";
import { ChefHat, LogIn, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useModernToast } from "@/components/ModernToastProvider";
import * as api from "@/lib/api";

export default function Login() {
  const navigate = useNavigate();
  const { showToast } = useModernToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.username || !formData.password) {
      showToast({ title: "Login failed", description: "Please enter both username and password", variant: "error" });
      return;
    }

    setLoading(true);
    try {
      const res = await api.login({ login: formData.username, password: formData.password });
      
      // store token
      if (res?.token) {
        localStorage.setItem("authToken", res.token);
        localStorage.setItem("tokenType", res.tokenType || "Bearer");
        
        // Extract vendor MongoDB _id (critical for chat system)
        // Try multiple possible field names from backend
        const vendorId = res.vendorId || res.vendor?.id || res.vendor?._id || res.id || res._id;
        const vendorOrgId = res.vendorOrganizationId || res.vendor?.vendorOrganizationId;
        const userType = res.userType || res.user?.userType;
        const userId = res.userId || res.user?.id || res.user?.userId;
        const convenienceId = res.id || res._id;
        const profileUrl = res.profileUrl || res.user?.profileUrl || res.vendor?.profileUrl;

        // Store vendorId (MongoDB _id) - CRITICAL for chat
        if (vendorId) {
          localStorage.setItem("vendorId", vendorId);
          localStorage.setItem("id", vendorId); // Also store as 'id' for fallback
        } else {
        }
        
        // Store other fields
        if (userType) localStorage.setItem("userType", userType);
        if (userId) localStorage.setItem("userId", userId);
        if (vendorOrgId) localStorage.setItem("vendorOrganizationId", vendorOrgId);
        if (profileUrl) localStorage.setItem("profileUrl", profileUrl);
        

      }
      // Validate vendorId was stored
      const storedVendorId = localStorage.getItem('vendorId');
      const storedUserType = localStorage.getItem('userType');
      const userName = res.name || res.vendor?.name || res.username || formData.username;
      
      if (!storedVendorId) {
        showToast({ 
          title: "Login Warning", 
          description: "Vendor ID missing. Some features may not work. Contact support.", 
          variant: "warning" 
        });
      }
      
      // Play success sound
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSA0PVKzn77BdGAg+mdr0xnMoBSuAzPLaizsIGGS67OihUBELTKXh8bllHAU2jtX0zoU1Bhxqvu7mnEoODlKq5O+zYBoGPJPY88p1KwYuhM3y3YU2Bhdo');
        audio.volume = 0.3;
        audio.play().catch(() => {}); // Ignore if audio play fails
      } catch (e) {}
      
      // Show success notification with user info
      showToast({ 
        title: `Welcome back, ${userName}! 👋`, 
        description: `Logged in as ${storedUserType || 'Vendor'}. You're all set!`,
        variant: "success",
        duration: 4000,
      });
      
      // Show browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Login Successful', {
          body: `Welcome back, ${userName}!`,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
        });
      }
      // Always navigate to dashboard after successful login
      navigate("/dashboard");
    } catch (err: any) {
      const msg: string = (err?.message || "").toString();
      const lowered = msg.toLowerCase();
      if (lowered.includes("401") || lowered.includes("unauthor") || lowered.includes("invalid") || lowered.includes("credentials")) {
        setError("Username or password is invalid");
        showToast({ title: "Login failed", description: "Username or password is invalid", variant: "error" });
      } else {
        const text = err?.message || "Login failed. Please check credentials.";
        setError(text);
        showToast({ title: "Login failed", description: text, variant: "error" });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError("");
  };

  return (
    <div className="min-h-screen w-full bg-white flex flex-col lg:flex-row">
      {/* Left side - Welcome section (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-600 to-orange-700 flex-col items-center justify-center px-6 py-12">
        <div className="text-center max-w-md">
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-white/20 rounded-full">
              <ChefHat className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">Bidzaro</h1>
          <p className="text-lg text-orange-100 mb-8">Professional Catering Services Marketplace</p>
          
          <div className="space-y-6 text-left">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-white/20">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div>
                <p className="text-white font-medium">Manage your bids and quotes</p>
                <p className="text-orange-100 text-sm">Track all opportunities in one place</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-white/20">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div>
                <p className="text-white font-medium">Real-time notifications</p>
                <p className="text-orange-100 text-sm">Get instant updates on your orders</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-white/20">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div>
                <p className="text-white font-medium">Grow your business</p>
                <p className="text-orange-100 text-sm">Reach more customers and increase revenue</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {/* Mobile header with logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="flex items-center space-x-2">
                <ChefHat className="h-8 w-8 text-orange-600" />
                <span className="text-3xl font-bold text-orange-600">Bidzaro</span>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
            <p className="text-gray-600 mt-2">Sign in to your vendor account</p>
          </div>

          {/* Desktop header */}
          <div className="hidden lg:block mb-10">
            <h2 className="text-3xl font-bold text-gray-900">Log in</h2>
            <p className="text-gray-600 mt-2">Enter your credentials to access your account</p>
          </div>

          {/* Login form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username field */}
            <div>
              <Label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username <span className="text-red-500">*</span>
              </Label>
              <Input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                placeholder="Enter your username"
                autoComplete="username"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
              />
            </div>

            {/* Password field */}
            <div>
              <Label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition pr-12"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Forgot credentials links */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between text-sm">
              <button
                type="button"
                onClick={() => navigate("/forgot-username")}
                className="text-orange-600 hover:text-orange-700 font-medium transition"
              >
                Forgot username?
              </button>
              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                className="text-orange-600 hover:text-orange-700 font-medium transition"
              >
                Forgot password?
              </button>
            </div>

            {/* Sign in button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  Sign In
                </>
              )}
            </Button>

            {/* Sign up link */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-gray-600">New to Bidzaro?</span>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => navigate("/register")}
              className="w-full border-2 border-orange-600 text-orange-600 bg-white hover:bg-orange-50 font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
            >
              Create Account
              <ArrowRight className="h-5 w-5" />
            </Button>

            {/* Back to home link */}
            <button
              type="button"
              onClick={() => navigate("/")}
              className="w-full text-gray-600 hover:text-gray-900 font-medium py-2 transition"
            >
              ← Back to Home
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
