import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { ChefHat, Mail, Lock, CheckCircle2, ArrowLeft } from "lucide-react";
import * as api from "@/lib/api";

type Step = "request" | "reset" | "success";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("request");
  const [loading, setLoading] = useState(false);
  const [contact, setContact] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [tokenSent, setTokenSent] = useState(false);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!contact) {
      setError("Please enter your email or mobile number");
      return;
    }

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
    // Accept E.164-like mobile numbers: optional +, 10-15 digits, not starting with 0
    const isMobile = /^\+?[1-9]\d{9,14}$/.test(contact.trim());

    if (!isEmail && !isMobile) {
      setError("Please enter a valid email address or mobile number (10–15 digits, optional +).");
      return;
    }

    setLoading(true);
    try {
      // Match backend DTO: send `email` or `mobile`
      const payload: any = {};
      if (isEmail) payload.email = contact.trim();
      else payload.mobile = contact.trim();

      await api.forgotPassword(payload);
      setTokenSent(true);
      setStep("reset");
    } catch (err: any) {
      setError(err?.message || "Unable to send reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!newPassword) {
      setError("Please enter a new password");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (!/^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!]).*$/.test(newPassword)) {
      setError("Password must contain uppercase, lowercase, number, and special character");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!token) {
      setError("Please enter the OTP sent to your contact");
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword({ contact, otp: token, newPassword });
      setStep("success");
    } catch (err: any) {
      setError(err?.message || "Unable to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendToken = async () => {
    setLoading(true);
    try {
      const payload: any = {};
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
      if (isEmail) payload.email = contact.trim();
      else payload.mobile = contact.trim();

      await api.forgotPassword(payload);
      setTokenSent(true);
    } catch (err: any) {
      setError(err?.message || "Unable to resend reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (step === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center border-2 border-green-200 shadow-2xl">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-3xl text-green-700">Password Reset Successful!</CardTitle>
            <CardDescription className="text-base mt-2">
              Your password has been updated
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <AlertDescription className="text-gray-700">
                You can now log in to your account using your new password.
              </AlertDescription>
            </Alert>
            <div className="pt-4">
              <Button
                onClick={() => navigate("/login")}
                className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 py-6"
              >
                Proceed to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <h1 className="text-4xl font-bold text-gray-900">Reset Password</h1>
          <p className="text-gray-600 mt-2">
            {step === "request" && "We'll send you a password reset link if an account exists"}
            {step === "reset" && "Enter the OTP from your contact and create your new password"}
          </p>
        </div>

        <Card className="shadow-2xl border-2">
          <CardHeader>
            <CardTitle className="text-2xl">
              {step === "request" && "Password Recovery"}
              {step === "reset" && "Reset Password"}
            </CardTitle>
            <CardDescription>
              {step === "request" && "Enter your registered contact information"}
              {step === "reset" && `Enter the OTP from the password reset message for ${contact}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Step 1: Request reset link */}
            {step === "request" && (
              <form onSubmit={handleRequestOtp} className="space-y-6">
                {error && (
                  <Alert variant="destructive" className="bg-red-50 border-red-200">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="contact">Email or Mobile Number</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="contact"
                      value={contact}
                      onChange={(e) => {
                        setContact(e.target.value);
                        setError("");
                      }}
                      placeholder="Enter email or mobile (e.g. +919876543210)"
                      className="h-12 pl-10"
                    />
                  </div>
                </div>

                <Alert className="bg-blue-50 border-blue-200">
                  <AlertDescription className="text-sm text-gray-700">
                    <strong>Security:</strong> We'll send a password reset link to your email if an account exists.
                  </AlertDescription>
                </Alert>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white py-6 text-lg"
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>

                <div className="space-y-3">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-gray-500">Remember your password?</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/login")}
                    className="w-full border-2 border-orange-600 text-orange-600 hover:bg-orange-50 py-6"
                  >
                    Back to Login
                  </Button>

                  <div className="text-center text-sm">
                    <button
                      type="button"
                      onClick={() => navigate("/forgot-username")}
                      className="text-orange-600 hover:text-orange-700 font-medium hover:underline"
                    >
                      Forgot your username instead?
                    </button>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => navigate("/")}
                    className="w-full"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Home
                  </Button>
                </div>
              </form>
            )}

            {/* Step 2: Reset Password (enter token & new password) */}
            {step === "reset" && (
              <form onSubmit={handleResetPassword} className="space-y-6">
                {error && (
                  <Alert variant="destructive" className="bg-red-50 border-red-200">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="token">OTP</Label>
                  <Input
                    id="token"
                    value={token}
                    onChange={(e) => {
                      setToken(e.target.value.trim());
                      setError("");
                    }}
                    placeholder="Enter OTP"
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setError("");
                      }}
                      placeholder="Enter new password"
                      className="h-12 pl-10"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Must be 8+ characters with uppercase, lowercase, number & special character
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setError("");
                      }}
                      placeholder="Re-enter new password"
                      className="h-12 pl-10"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white py-6 text-lg"
                  disabled={loading}
                >
                  {loading ? "Resetting..." : "Reset Password"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate("/login")}
                  className="w-full"
                >
                  Cancel
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
