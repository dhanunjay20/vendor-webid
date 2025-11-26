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
      // store token
      if (res?.token) {
        localStorage.setItem("authToken", res.token);
        localStorage.setItem("tokenType", res.tokenType || "Bearer");
        // store common auth response fields (flexible mapping)
        const userType = res.userType || res.user?.userType;
        const userId = res.userId || res.user?.id || res.user?.userId;
        const vendorId = res.vendorId || res.vendor?.id;
        const vendorOrgId = res.vendorOrganizationId || res.vendor?.vendorOrganizationId || res.vendorId || res.vendor?.id;
        const convenienceId = res.id || res._id || (res.vendor ? res.vendor.id : undefined) || (res.user ? res.user.id : undefined);
        const profileUrl = res.profileUrl || res.user?.profileUrl;

        if (userType) localStorage.setItem("userType", userType);
        if (userId) localStorage.setItem("userId", userId);
        if (vendorId) localStorage.setItem("vendorId", vendorId);
        if (vendorOrgId) localStorage.setItem("vendorOrganizationId", vendorOrgId);
        if (convenienceId) localStorage.setItem("id", convenienceId);
        if (profileUrl) localStorage.setItem("profileUrl", profileUrl);
      }

      // store vendor organization id if returned by the API to avoid missing-vendor errors
      // API responses may use different keys; check common possibilities
      const vendorOrgId =
        (res && (res.vendorOrganizationId || res.vendorOrgId || (res.vendorOrganization && res.vendorOrganization.id))) ||
        null;
      if (vendorOrgId) {
        localStorage.setItem("vendorOrganizationId", String(vendorOrgId));
      }
      // success toast (green)
      toast({ title: "Signed in", description: "Welcome back!", variant: "success" });
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="flex items-center space-x-2">
              <ChefHat className="h-10 w-10 text-orange-600" />
              <span className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                VendorBid
              </span>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900">Welcome Back</h1>
          <p className="text-gray-600 mt-2">Sign in to your vendor account</p>
        </div>

        <Card className="shadow-2xl border-2">
          <CardHeader>
            <CardTitle className="text-2xl">Login to Dashboard</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Errors are shown via toast notifications; inline form alert removed */}

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Enter your username"
                  autoComplete="username"
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="h-12 pr-12"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
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
                className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white py-6 text-lg"
                disabled={loading}
              >
                {loading ? (
                  "Signing in..."
                ) : (
                  <>
                    <LogIn className="h-5 w-5 mr-2" />
                    Sign In
                  </>
                )}
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">Don't have an account?</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/register")}
                className="w-full border-2 border-orange-600 text-orange-600 hover:bg-orange-50 py-6 text-lg"
              >
                Create New Account
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate("/")}
                className="w-full"
              >
                Back to Home
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>By signing in, you agree to our Terms of Service and Privacy Policy</p>
        </div>
      </div>
    </div>
  );
}
