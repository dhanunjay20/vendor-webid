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
    businessName: "",
    ownerName: "",
    email: "",
    mobile: "",
    username: "",
    password: "",
    confirmPassword: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    country: "",
    zipCode: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [vendorOrgId, setVendorOrgId] = useState("");

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

    if (!formData.businessName) newErrors.businessName = "Business name is required";
    if (!formData.ownerName) newErrors.ownerName = "Owner name is required";
    
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!formData.mobile) {
      newErrors.mobile = "Mobile number is required";
    } else if (!/^[0-9]{10}$/.test(formData.mobile)) {
      newErrors.mobile = "Mobile number must be 10 digits";
    }

    if (!formData.username) {
      newErrors.username = "Username is required";
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
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

    if (!formData.addressLine1) newErrors.addressLine1 = "Address line 1 is required";
    if (!formData.city) newErrors.city = "City is required";
    if (!formData.state) newErrors.state = "State is required";
    if (!formData.country) newErrors.country = "Country is required";
    if (!formData.zipCode) {
      newErrors.zipCode = "ZIP / Postal code is required";
    } else if (!/^[0-9A-Za-z\-\s]{3,10}$/.test(formData.zipCode)) {
      newErrors.zipCode = "Invalid ZIP / Postal code";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setServerError("");
    try {
      // Split owner name into first/last for user registration
      const owner = formData.ownerName.trim();
      const [firstName, ...rest] = owner.split(" ");
      const lastName = rest.join(" ") || "";

      const payload = {
        businessName: formData.businessName,
        ownerName: formData.ownerName,
        username: formData.username,
        email: formData.email,
        mobile: formData.mobile,
        password: formData.password,
        vendorOrganizationId: vendorOrgId,
        firstName: firstName || formData.ownerName,
        lastName,
        addressLine1: formData.addressLine1,
        addressLine2: formData.addressLine2,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        zipCode: formData.zipCode,
      };

      await api.registerUser(payload);
      setIsSubmitted(true);
    } catch (err: any) {
      setServerError(err?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // live-match password and confirm password
    setErrors(prev => {
      const next = { ...prev };
      if (name === "password") {
        if (value && formData.confirmPassword && value !== formData.confirmPassword) {
          next.confirmPassword = "Passwords do not match";
        } else {
          delete next.confirmPassword;
        }
      }
      if (name === "confirmPassword") {
        if (value && formData.password && value !== formData.password) {
          next.confirmPassword = "Passwords do not match";
        } else {
          delete next.confirmPassword;
        }
      }
      // clear this field's existing error when user types
      if (next[name]) delete next[name];
      return next;
    });
    // update vendorOrgId when businessName or ownerName change
    if (name === "businessName" || name === "ownerName") {
      const nextBiz = name === "businessName" ? value : formData.businessName;
      const nextOwner = name === "ownerName" ? value : formData.ownerName;
      setVendorOrgId(computeVendorOrgId(nextBiz, nextOwner));
    }
  };

  function firstTwoLettersPerWord(s?: string) {
    if (!s) return "";
    return s
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => (w.replace(/[^a-zA-Z0-9]/g, "").substring(0, 2) || ""))
      .join("");
  }

  function computeVendorOrgId(businessName: string, ownerName: string) {
    const bizPart = firstTwoLettersPerWord(businessName || "").toUpperCase();
    const ownerPart = firstTwoLettersPerWord(ownerName || "").toUpperCase();

    // deterministic pseudo-random digits derived from names
    const seedStr = (businessName || "") + "|" + (ownerName || "");
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      hash = (hash << 5) - hash + seedStr.charCodeAt(i);
      hash |= 0;
    }
    const minDigits = 4;
    const maxDigits = 9;
    const digitsCount = Math.abs(hash) % (maxDigits - minDigits + 1) + minDigits;
    let rand = "";
    let h = Math.abs(hash) || 1;
    for (let i = 0; i < digitsCount; i++) {
      rand += String(h % 10);
      h = Math.floor(h / 10) || (h + 7);
    }

    const parts: string[] = [];
    if (bizPart) parts.push(bizPart);
    if (ownerPart) parts.push(ownerPart);
    parts.push(rand);
    return parts.join("-");
  }

  function regenerateOrgId() {
    // regenerate using random digits length between 4-9
    const bizPart = firstTwoLettersPerWord(formData.businessName || "").toUpperCase();
    const ownerPart = firstTwoLettersPerWord(formData.ownerName || "").toUpperCase();
    const min = 4;
    const max = 9;
    const digits = Math.floor(Math.random() * (max - min + 1)) + min;
    let rand = "";
    for (let i = 0; i < digits; i++) rand += Math.floor(Math.random() * 10).toString();
    const parts: string[] = [];
    if (bizPart) parts.push(bizPart);
    if (ownerPart) parts.push(ownerPart);
    parts.push(rand);
    setVendorOrgId(parts.join("-"));
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
              Thank you for registering with VendorBid
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
                VendorBid
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
                  <Label htmlFor="businessName" className="text-sm sm:text-base">Business Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="businessName"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleChange}
                    placeholder="Enter your business name"
                    className={`text-sm sm:text-base ${errors.businessName ? "border-red-500" : ""}`}
                  />
                  {errors.businessName && (
                    <p className="text-xs sm:text-sm text-red-500">{errors.businessName}</p>
                  )}
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="ownerName" className="text-sm sm:text-base">Owner Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="ownerName"
                    name="ownerName"
                    value={formData.ownerName}
                    onChange={handleChange}
                    placeholder="Enter owner name"
                    className={`text-sm sm:text-base ${errors.ownerName ? "border-red-500" : ""}`}
                  />
                  {errors.ownerName && (
                    <p className="text-xs sm:text-sm text-red-500">{errors.ownerName}</p>
                  )}
                </div>
                
                <div className="space-y-1.5 sm:space-y-2 md:col-span-2">
                  <Label htmlFor="vendorOrgId" className="text-sm sm:text-base">Organization ID</Label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <Input
                      id="vendorOrgId"
                      name="vendorOrgId"
                      value={vendorOrgId}
                      readOnly
                      className="w-full bg-gray-100 text-sm sm:text-base"
                    />
                    <Button type="button" onClick={regenerateOrgId} className="h-9 sm:h-10 text-sm sm:text-base whitespace-nowrap">Regenerate</Button>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500">Auto-generated from business & owner name. You can regenerate.</p>
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
                    onChange={handleChange}
                    placeholder="your@email.com"
                    className={`text-sm sm:text-base ${errors.email ? "border-red-500" : ""}`}
                  />
                  {errors.email && (
                    <p className="text-xs sm:text-sm text-red-500">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="mobile" className="text-sm sm:text-base">Mobile Number <span className="text-red-500">*</span></Label>
                  <Input
                    id="mobile"
                    name="mobile"
                    value={formData.mobile}
                    onChange={handleChange}
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    className={`text-sm sm:text-base ${errors.mobile ? "border-red-500" : ""}`}
                  />
                  {errors.mobile && (
                    <p className="text-xs sm:text-sm text-red-500">{errors.mobile}</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="username" className="text-sm sm:text-base">Username <span className="text-red-500">*</span></Label>
                <Input
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Choose a unique username"
                  className={`text-sm sm:text-base ${errors.username ? "border-red-500" : ""}`}
                />
                {errors.username && (
                  <p className="text-xs sm:text-sm text-red-500">{errors.username}</p>
                )}
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
                      onChange={handleChange}
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
                  {errors.password && (
                    <p className="text-xs sm:text-sm text-red-500">{errors.password}</p>
                  )}
                  {/* Password strength meter */}
                  {formData.password && (
                    (() => {
                      const s = getPasswordStrength(formData.password);
                      const pct = Math.min(100, Math.round((s.score / 6) * 100));
                      return (
                        <div className="mt-1.5 sm:mt-2">
                          <div className="w-full h-1.5 sm:h-2 bg-gray-200 rounded overflow-hidden">
                            <div className={`${s.color} h-1.5 sm:h-2`} style={{ width: `${pct}%` }} />
                          </div>
                          <div className="text-xs sm:text-sm text-gray-600 mt-1">Strength: {s.label}</div>
                        </div>
                      );
                    })()
                  )}
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm sm:text-base">Confirm Password <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="text"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Re-enter password"
                      className={`text-sm sm:text-base ${errors.confirmPassword ? "border-red-500" : ""}`}
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-xs sm:text-sm text-red-500">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="addressLine1" className="text-sm sm:text-base">Address Line 1 *</Label>
                  <Input
                    id="addressLine1"
                    name="addressLine1"
                    value={formData.addressLine1}
                    onChange={handleChange}
                    placeholder="Street address, P.O. box, company name, c/o"
                    className={`text-sm sm:text-base ${errors.addressLine1 ? "border-red-500" : ""}`}
                  />
                  {errors.addressLine1 && (
                    <p className="text-xs sm:text-sm text-red-500">{errors.addressLine1}</p>
                  )}
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="addressLine2" className="text-sm sm:text-base">Address Line 2</Label>
                  <Input
                    id="addressLine2"
                    name="addressLine2"
                    value={formData.addressLine2}
                    onChange={handleChange}
                    placeholder="Apartment, suite, unit, building, floor, etc. (optional)"
                    className="text-sm sm:text-base"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="city" className="text-sm sm:text-base">City *</Label>
                    <Input
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="City"
                      className={`text-sm sm:text-base ${errors.city ? "border-red-500" : ""}`}
                    />
                    {errors.city && <p className="text-xs sm:text-sm text-red-500">{errors.city}</p>}
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="state" className="text-sm sm:text-base">State / Province *</Label>
                    <Input
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      placeholder="State or Province"
                      className={`text-sm sm:text-base ${errors.state ? "border-red-500" : ""}`}
                    />
                    {errors.state && <p className="text-xs sm:text-sm text-red-500">{errors.state}</p>}
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="zipCode" className="text-sm sm:text-base">ZIP / Postal Code *</Label>
                    <Input
                      id="zipCode"
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleChange}
                      placeholder="Postal code"
                      className={`text-sm sm:text-base ${errors.zipCode ? "border-red-500" : ""}`}
                    />
                    {errors.zipCode && <p className="text-xs sm:text-sm text-red-500">{errors.zipCode}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="country" className="text-sm sm:text-base">Country *</Label>
                    <Input
                      id="country"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      placeholder="Country"
                      className={`text-sm sm:text-base ${errors.country ? "border-red-500" : ""}`}
                    />
                    {errors.country && <p className="text-xs sm:text-sm text-red-500">{errors.country}</p>}
                  </div>
                </div>
              </div>

              <div className="pt-3 sm:pt-4 space-y-3 sm:space-y-4">
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white py-4 sm:py-5 md:py-6 text-base sm:text-lg"
                  disabled={loading}
                >
                  {loading ? "Registering..." : "Register Now"}
                </Button>

                {/* License document upload removed per request */}

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
