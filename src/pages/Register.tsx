import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { ChefHat, CheckCircle2, ArrowLeft, Eye, EyeOff } from "lucide-react";
import * as api from "@/lib/api";

export default function Register() {
  const navigate = useNavigate();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    country: "USA",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function getPasswordStrength(pw: string) {
    let score = 0;
    if (!pw) return { score: 0, label: "", color: "bg-gray-200" };
    if (pw.length >= 8) score += 1;
    if (pw.length >= 12) score += 1;
    if (/[a-z]/.test(pw)) score += 1;
    if (/[A-Z]/.test(pw)) score += 1;
    if (/[0-9]/.test(pw)) score += 1;
    if (/[@#$%^&+=!]/.test(pw)) score += 1;

    // score range 0-6
    if (score <= 2) return { score, label: "Weak", color: "bg-red-400" };
    if (score <= 4) return { score, label: "Medium", color: "bg-yellow-400" };
    return { score, label: "Strong", color: "bg-green-400" };
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName) newErrors.firstName = "First name is required";
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!formData.phone) {
      newErrors.phone = "Phone number is required";
    } else if (!/^\+?[0-9]{7,15}$/.test(formData.phone)) {
      newErrors.phone = "Invalid phone number";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else if (!/^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!]).*$/.test(formData.password)) {
      newErrors.password = "Password must contain uppercase, lowercase, number, and special character";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!formData.country) newErrors.country = "Country is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setServerError("");
    try {
      const payload = {
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        userType: "VENDOR",
        country: formData.country || "USA",
      };

      await api.registerAuth(payload);
      setIsSubmitted(true);
    } catch (err: any) {
      setServerError(err?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // file upload removed — handler not needed

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center px-3 sm:px-4 py-4 sm:py-6">
        <Card className="max-w-md w-full text-center border-2 border-green-200 shadow-2xl">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
            <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
              <CheckCircle2 className="h-8 w-8 sm:h-10 sm:w-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl sm:text-3xl md:text-3xl text-green-700">Registration Successful!</CardTitle>
            <CardDescription className="text-sm sm:text-base mt-2">
              Thank you for registering with Bidzaro
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
            <Alert className="bg-green-50 border-green-200">
              <AlertDescription className="text-sm sm:text-base text-gray-700">
                Our respected team will get in touch with you shortly to complete your account verification 
                and help you get started.
              </AlertDescription>
            </Alert>
            <div className="pt-2 sm:pt-4">
              <Button
                onClick={() => navigate("/login")}
                className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-sm sm:text-base py-2 sm:py-2.5"
              >
                Proceed to Login
              </Button>
            </div>
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="w-full text-sm sm:text-base py-2 sm:py-2.5"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 py-6 sm:py-8 md:py-12 px-3 sm:px-4 md:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex justify-center mb-3 sm:mb-4">
              <div className="flex items-center space-x-2">
              <ChefHat className="h-8 w-8 sm:h-10 sm:w-10 text-orange-600" />
              <span className="text-2xl sm:text-3xl md:text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                Bidzaro
              </span>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">Create Your Account</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-2">Join the leading catering platform today</p>
        </div>

        <Card className="shadow-2xl border-2">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
            <CardTitle className="text-xl sm:text-2xl md:text-2xl">Vendor Registration</CardTitle>
            <CardDescription className="text-sm sm:text-base">Fill in your business details to get started</CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              {serverError && (
                <Alert variant="destructive" className="bg-red-50 border-red-200">
                  <AlertDescription className="text-sm sm:text-base">{serverError}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="firstName" className="text-sm sm:text-base">First Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="First name"
                    className={`text-sm sm:text-base ${errors.firstName ? "border-red-500" : ""}`}
                  />
                  {errors.firstName && <p className="text-xs sm:text-sm text-red-500">{errors.firstName}</p>}
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="lastName" className="text-sm sm:text-base">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Last name"
                    className="text-sm sm:text-base"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="email" className="text-sm sm:text-base">Email Address <span className="text-red-500">*</span></Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="you@email.com"
                    className={`text-sm sm:text-base ${errors.email ? "border-red-500" : ""}`}
                  />
                  {errors.email && <p className="text-xs sm:text-sm text-red-500">{errors.email}</p>}
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="phone" className="text-sm sm:text-base">Phone <span className="text-red-500">*</span></Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+919xxxxxxxxx"
                    className={`text-sm sm:text-base ${errors.phone ? "border-red-500" : ""}`}
                  />
                  {errors.phone && <p className="text-xs sm:text-sm text-red-500">{errors.phone}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="password" className="text-sm sm:text-base">Password <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Create a strong password"
                      className={`text-sm sm:text-base ${errors.password ? "border-red-500" : ""} pr-10 sm:pr-12`}
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword(prev => !prev)}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs sm:text-sm text-red-500">{errors.password}</p>}
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm sm:text-base">Confirm Password <span className="text-red-500">*</span></Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Re-enter password"
                    className={`text-sm sm:text-base ${errors.confirmPassword ? "border-red-500" : ""}`}
                  />
                  {errors.confirmPassword && <p className="text-xs sm:text-sm text-red-500">{errors.confirmPassword}</p>}
                </div>
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="country" className="text-sm sm:text-base">Country <span className="text-red-500">*</span></Label>
                <Input
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                  placeholder="Country"
                  className={`text-sm sm:text-base ${errors.country ? "border-red-500" : ""}`}
                />
                {errors.country && <p className="text-xs sm:text-sm text-red-500">{errors.country}</p>}
              </div>

              <div className="pt-3 sm:pt-4 space-y-3 sm:space-y-4">
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white py-4 sm:py-5 md:py-6 text-base sm:text-lg"
                  disabled={loading}
                >
                  {loading ? "Registering..." : "Register Now"}
                </Button>

                <div className="text-center text-xs sm:text-sm text-gray-600">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="text-orange-600 hover:text-orange-700 font-semibold"
                  >
                    Sign in here
                  </button>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate("/")}
                  className="w-full text-sm sm:text-base py-2 sm:py-2.5"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
