import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { ChefHat, Mail, CheckCircle2, ArrowLeft } from "lucide-react";
import * as api from "@/lib/api";

export default function ForgotUsername() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [contact, setContact] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!contact) {
      setError("Please enter your email or mobile number");
      return;
    }

    // Basic validation
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
    // Accept E.164-like mobile numbers: optional +, 10-15 digits, not starting with 0
    const isMobile = /^\+?[1-9]\d{9,14}$/.test(contact.trim());

    if (!isEmail && !isMobile) {
      setError("Please enter a valid email address or mobile number (10–15 digits, optional +). ");
      return;
    }

    setLoading(true);
    try {
      // Map to backend expected fields: prefer `email` or `mobile` instead of a generic `contact` key
      const payload: any = {};
      if (isEmail) payload.email = contact;
      else if (isMobile) payload.mobile = contact;
      else payload.contact = contact; // fallback

      await api.forgotUsername(payload);
      setIsSubmitted(true);
    } catch (err: any) {
      // If server returned a 5xx, show a friendly server error message
      if (err?.status && Number(err.status) >= 500) {
        setError("Server error. Please try again later.");
      } else {
        // Prefer server-provided message, otherwise fall back to friendly text
        const message = err?.message || "Unable to send username. Please try again.";
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  function maskContact(c: string) {
    if (!c) return "";
    const s = c.trim();
    // email: show first char, then ****, then @domain
    if (s.includes("@")) {
      const [local, domain] = s.split("@");
      const first = local.charAt(0) || "";
      return `${first}****@${domain}`;
    }
    // mobile: show last 3 digits
    const digits = s.replace(/\D/g, "");
    if (digits.length <= 4) return `***${digits}`;
    return `****${digits.slice(-3)}`;
  }

  if (isSubmitted) {
    const masked = maskContact(contact);
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center border-2 border-green-200 shadow-2xl">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-3xl text-green-700">Request Received</CardTitle>
            <CardDescription className="text-base mt-2">Check your messages</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <AlertDescription className="text-gray-700">
                If an account exists for the provided contact, instructions have been sent to <strong>{masked}</strong>.
              </AlertDescription>
            </Alert>
            <div className="pt-4 space-y-3">
              <Button
                onClick={() => navigate("/login")}
                className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700"
              >
                Go to Login
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsSubmitted(false);
                  setContact("");
                }}
                className="w-full"
              >
                Try Another Contact
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
          <h1 className="text-4xl font-bold text-gray-900">Forgot Username?</h1>
          <p className="text-gray-600 mt-2">No worries, we'll help you recover it</p>
        </div>

        <Card className="shadow-2xl border-2">
          <CardHeader>
            <CardTitle className="text-2xl">Username Recovery</CardTitle>
            <CardDescription>
              Enter your registered email address or mobile number to receive your username
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
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
                    name="contact"
                    value={contact}
                    onChange={(e) => {
                      setContact(e.target.value);
                      setError("");
                    }}
                    placeholder="Enter email or mobile (e.g. +919876543210)"
                    className="h-12 pl-10"
                  />
                </div>
                <p className="text-sm text-gray-500">
                  We'll send your username to this contact information
                </p>
              </div>

              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-sm text-gray-700">
                  <strong>Note:</strong> The contact information must be registered with your account.
                </AlertDescription>
              </Alert>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white py-6 text-lg"
                disabled={loading}
              >
                {loading ? "Sending..." : "Send Username"}
              </Button>

              <div className="space-y-3">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">Remember your username?</span>
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
                    onClick={() => navigate("/forgot-password")}
                    className="text-orange-600 hover:text-orange-700 font-medium hover:underline"
                  >
                    Forgot your password instead?
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
