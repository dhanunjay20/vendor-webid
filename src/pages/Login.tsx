import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// inline alert removed; using toasts only
import { useNavigate } from "react-router-dom";
import { ChefHat, LogIn, AlertCircle, Eye, EyeOff } from "lucide-react";
import * as api from "@/lib/api";
import { toast } from "@/hooks/use-toast";

export default function Login() {
  const navigate = useNavigate();
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
      toast({ title: "Login failed", description: "Please enter both username and password", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await api.login({ login: formData.username, password: formData.password });
      
      // Debug: Log the entire response to see what backend returns
      );
      
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
        
        // Debug: Show what was stored
        ,
          id: localStorage.getItem('id'),
          vendorOrganizationId: localStorage.getItem('vendorOrganizationId'),
          userType: localStorage.getItem('userType')
        });
      }
      // Validate vendorId was stored
      const storedVendorId = localStorage.getItem('vendorId');
      const storedUserType = localStorage.getItem('userType');
      const userName = res.name || res.vendor?.name || res.username || formData.username;
      
      if (!storedVendorId) {
        toast({ 
          title: "Login Warning", 
          description: "Vendor ID missing. Some features may not work. Contact support.", 
          variant: "destructive" 
        });
      }
      
      // Play success sound
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSA0PVKzn77BdGAg+mdr0xnMoBSuAzPLaizsIGGS67OihUBELTKXh8bllHAU2jtX0zoU1Bhxqvu7mnEoODlKq5O+zYBoGPJPY88p1KwYuhM3y3YU2Bhdo');
        audio.volume = 0.3;
        audio.play().catch(() => {}); // Ignore if audio play fails
      } catch (e) {}
      
      // Show success notification with user info
      toast({ 
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
        toast({ title: "Login failed", description: "Username or password is invalid", variant: "destructive" });
      } else {
        const text = err?.message || "Login failed. Please check credentials.";
        setError(text);
        toast({ title: "Login failed", description: text, variant: "destructive" });
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center px-3 py-4 sm:px-4 sm:py-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex justify-center mb-3 sm:mb-4">
              <div className="flex items-center space-x-2">
              <ChefHat className="h-8 w-8 sm:h-10 sm:w-10 text-orange-600" />
              <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                Bidzaro
              </span>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">Welcome Back</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-2">Sign in to your vendor account</p>
        </div>

        <Card className="shadow-xl sm:shadow-2xl border sm:border-2">
          <CardHeader className="px-4 py-4 sm:px-6 sm:py-6">
            <CardTitle className="text-xl sm:text-2xl">Login to Dashboard</CardTitle>
            <CardDescription className="text-sm sm:text-base">Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent className="px-4 py-4 sm:px-6 sm:py-6">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                {/* Errors are shown via toast notifications; inline form alert removed */}

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="username" className="text-sm sm:text-base">Username</Label>
                <Input
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Enter your username"
                  autoComplete="username"
                  className="h-11 sm:h-12 text-sm sm:text-base"
                />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="password" className="text-sm sm:text-base">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="h-11 sm:h-12 pr-10 sm:pr-12 text-sm sm:text-base"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 text-xs sm:text-sm">
                <button
                  type="button"
                  onClick={() => navigate("/forgot-username")}
                  className="text-orange-600 hover:text-orange-700 font-medium hover:underline"
                >
                  Forgot Username?
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="text-orange-600 hover:text-orange-700 font-medium hover:underline"
                >
                  Forgot Password?
                </button>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white h-11 sm:h-auto sm:py-6 text-base sm:text-lg"
                disabled={loading}
              >
                {loading ? (
                  "Signing in..."
                ) : (
                  <>
                    <LogIn className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    Sign In
                  </>
                )}
              </Button>

              <div className="relative my-4 sm:my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-xs sm:text-sm">
                  <span className="px-3 sm:px-4 bg-white text-gray-500">Don't have an account?</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/register")}
                className="w-full border sm:border-2 border-orange-600 text-orange-600 hover:bg-orange-50 h-11 sm:h-auto sm:py-6 text-base sm:text-lg"
              >
                Create New Account
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate("/")}
                className="w-full h-10 sm:h-auto text-sm sm:text-base"
              >
                Back to Home
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-gray-500 px-2">
          <p>By signing in, you agree to our Terms of Service and Privacy Policy</p>
        </div>
      </div>
    </div>
  );
}
