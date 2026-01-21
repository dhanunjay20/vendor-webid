import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Lock, CheckCircle2, X, ArrowLeft } from "lucide-react";
import * as api from "@/lib/api";

type Step = "request" | "reset" | "success";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginClick?: () => void;
  onForgotUsernameClick?: () => void;
}

export default function ForgotPasswordModal({
  isOpen,
  onClose,
  onLoginClick,
  onForgotUsernameClick,
}: ForgotPasswordModalProps) {
  const [step, setStep] = useState<Step>("request");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [verificationId, setVerificationId] = useState("");
  const [expiresIn, setExpiresIn] = useState(0);
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [tokenSent, setTokenSent] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [otpMessage, setOtpMessage] = useState("");

  const resetModal = () => {
    setStep("request");
    setEmail("");
    setVerificationId("");
    setExpiresIn(0);
    setToken("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setTokenSent(false);
    setSuccessMessage("");
    setOtpMessage("");
  };

  // Clear modal fields each time it is opened to avoid autofill/populated values
  useEffect(() => {
    if (isOpen) resetModal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Please enter your email address");
      return;
    }

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!isEmail) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      console.log("Calling forgotPassword with email:", email.trim());
      const response = await api.forgotPassword(email.trim());
      console.log("forgotPassword response:", response);
      
      // Extract data from response
      const data = response?.data || response;
      const vId = data?.data?.verificationId || data?.verificationId;
      const expires = data?.data?.expiresInSeconds || data?.expiresInSeconds || 0;
      
      // Get the main message from backend
      let displayMessage = data?.message || "";
      const dataMessage = data?.data?.message || "";
      
      // Use backend message or create user-friendly one
      if (!displayMessage) {
        displayMessage = "Password reset OTP has been sent to your email. Please check your inbox.";
      }
      
      if (vId) {
        console.log("Verification ID:", vId);
        setVerificationId(vId);
      }
      
      if (expires) {
        console.log("Expires in seconds:", expires);
        setExpiresIn(expires);
      }

      console.log("=== FORGOT PASSWORD RESPONSE ===");
      console.log("Full response:", response);
      console.log("Main message:", displayMessage);
      console.log("Data message:", dataMessage);
      console.log("Verification ID:", vId);
      console.log("Expires:", expires);
      
      // set OTP message for the reset step UI
      setOtpMessage(displayMessage);
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
      setError("Please enter the OTP sent to your email");
      return;
    }

    setLoading(true);
    try {
      console.log("Calling resetPassword with:", { email: email.trim(), otp: token.trim() });
      const response = await api.resetPassword({ 
        email: email.trim(), 
        otp: token.trim(), 
        newPassword, 
        confirmPassword 
      });
      console.log("resetPassword response:", response);
      
      // Extract success message
      const data = response?.data || response;
      let displayMessage = data?.message || "";
      
      if (!displayMessage) {
        displayMessage = "Password reset successfully";
      }
      
      console.log("=== PASSWORD RESET RESPONSE ===");
      console.log("Full response:", response);
      console.log("Success message:", displayMessage);
      
      setSuccessMessage(displayMessage);
      
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
      const response = await api.forgotPassword(email.trim());
      
      // Extract data from response
      const data = response?.data || response;
      const vId = data?.data?.verificationId || data?.verificationId;
      const expires = data?.data?.expiresInSeconds || data?.expiresInSeconds || 0;
      
      if (vId) {
        setVerificationId(vId);
      }
      
      if (expires) {
        setExpiresIn(expires);
      }
      
      setTokenSent(true);
    } catch (err: any) {
      setError(err?.message || "Unable to resend reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] pointer-events-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-[61] flex items-center justify-center p-4 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-visible border border-white/20 pointer-events-auto"
              initial={{ scale: 0.5, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.5, y: 20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <motion.button
                onClick={handleClose}
                className="absolute -top-2 -right-2 z-20 p-2.5 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 hover:from-orange-200 hover:to-amber-200 text-orange-600 hover:text-orange-700 shadow-md border border-white"
                whileHover={{ scale: 1.15, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <X className="h-5 w-5" />
              </motion.button>

              {/* Success State */}
              {step === "success" ? (
                <div className="relative px-6 py-8 text-center">
                  <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
                    <CheckCircle2 className="h-10 w-10 text-white" />
                  </div>

                  <h2 className="text-2xl font-bold text-gray-900 mt-4">
                    Password Reset Successful!
                  </h2>
                  
                  <p className="text-gray-600 mt-2">
                    {successMessage}
                  </p>

                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-4">
                    <p className="text-gray-700 text-sm">
                      You can now log in to your account using your new password.
                    </p>
                  </div>

                  <div className="space-y-3 mt-6">
                    <button
                      onClick={() => {
                        handleClose();
                        onLoginClick?.();
                      }}
                      className="w-full py-3 px-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-semibold rounded-xl transition-all shadow-lg"
                    >
                      Proceed to Login
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Request Step */}
              {step === "request" ? (
                <motion.div
                  className="relative px-6 py-8"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="text-center mb-6"
                  >
                    <h2 className="text-2xl font-bold text-gray-900">Password Recovery</h2>
                    <p className="text-gray-600 text-sm mt-2">
                      Enter your registered email address
                    </p>
                  </div>

                  <form onSubmit={handleRequestOtp} className="space-y-4">
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-50 border border-red-200 rounded-xl p-3"
                      >
                        <AlertDescription className="text-red-700 text-sm">{error}</AlertDescription>
                      </motion.div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-gray-700 font-medium">
                        Email Address
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-orange-500" />
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            setError("");
                          }}
                          placeholder="Enter your email"
                          autoComplete="off"
                          className="h-11 pl-10 border-2 border-gray-200 focus:border-orange-500 rounded-xl bg-white/80 backdrop-blur-sm"
                        />
                      </div>
                    </div>

                    <Alert className="bg-blue-50 border-blue-200 rounded-xl">
                      <AlertDescription className="text-blue-800 text-xs">
                        We'll send a password reset OTP to your email if an account exists.
                      </AlertDescription>
                    </Alert>

                    <motion.button
                      type="submit"
                      className="w-full py-3 px-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-semibold rounded-xl transition-all shadow-lg disabled:opacity-50"
                      disabled={loading}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {loading ? "Sending..." : "Send OTP"}
                    </motion.button>

                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300"></div>
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="px-2 bg-white text-gray-500">or</span>
                      </div>
                    </div>

                    <motion.button
                      type="button"
                      onClick={() => {
                        onForgotUsernameClick?.();
                        handleClose();
                      }}
                      className="w-full py-3 px-4 border-2 border-orange-600 text-orange-600 hover:bg-orange-50 font-semibold rounded-xl transition-all"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Forgot email/phone instead?
                    </motion.button>

                    <motion.button
                      type="button"
                      onClick={handleClose}
                      className="w-full py-2 px-4 text-gray-700 hover:bg-gray-100 font-medium rounded-xl transition-all flex items-center justify-center gap-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to Login
                    </motion.button>
                  </form>
                </motion.div>
              ) : null}

              {/* Reset Step */}
              {step === "reset" ? (
                <motion.div
                  className="relative px-6 py-8"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Reset Password</h2>
                    <p className="text-gray-600 text-sm mt-2">
                      Enter the OTP and create your new password
                    </p>
                    {expiresIn > 0 && (
                      <p className="text-xs text-orange-600 mt-1">
                        OTP expires in {Math.floor(expiresIn / 60)} minutes
                      </p>
                    )}
                  </div>

                  {otpMessage ? (
                    <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <p className="text-blue-800 text-sm">{otpMessage}</p>
                    </div>
                  ) : null}

                  <form onSubmit={handleResetPassword} className="space-y-4">
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-50 border border-red-200 rounded-xl p-3"
                      >
                        <AlertDescription className="text-red-700 text-sm">{error}</AlertDescription>
                      </motion.div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="token" className="text-gray-700 font-medium">
                        OTP
                      </Label>
                      <Input
                        id="token"
                        value={token}
                        onChange={(e) => {
                          setToken(e.target.value.trim());
                          setError("");
                        }}
                        placeholder="Enter OTP"
                        autoComplete="off"
                        className="h-11 border-2 border-gray-200 focus:border-orange-500 rounded-xl bg-white/80 backdrop-blur-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newPassword" className="text-gray-700 font-medium">
                        New Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-orange-500" />
                        <Input
                          id="newPassword"
                          type="password"
                          value={newPassword}
                          onChange={(e) => {
                            setNewPassword(e.target.value);
                            setError("");
                          }}
                          placeholder="Enter new password"
                          autoComplete="off"
                          className="h-11 pl-10 border-2 border-gray-200 focus:border-orange-500 rounded-xl bg-white/80 backdrop-blur-sm"
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        8+ characters with uppercase, lowercase, number & special character
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-gray-700 font-medium">
                        Confirm Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-orange-500" />
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            setError("");
                          }}
                          placeholder="Re-enter new password"
                          autoComplete="off"
                          className="h-11 pl-10 border-2 border-gray-200 focus:border-orange-500 rounded-xl bg-white/80 backdrop-blur-sm"
                        />
                      </div>
                    </div>

                    <motion.button
                      type="submit"
                      className="w-full py-3 px-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-semibold rounded-xl transition-all shadow-lg disabled:opacity-50"
                      disabled={loading}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {loading ? "Resetting..." : "Reset Password"}
                    </motion.button>

                    {tokenSent && (
                      <motion.button
                        type="button"
                        onClick={handleResendToken}
                        className="w-full py-2 px-4 text-orange-600 hover:bg-orange-50 font-medium rounded-xl transition-all text-sm"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Resend OTP
                      </motion.button>
                    )}

                    <motion.button
                      type="button"
                      onClick={handleClose}
                      className="w-full py-2 px-4 text-gray-700 hover:bg-gray-100 font-medium rounded-xl transition-all"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Cancel
                    </motion.button>
                  </form>
                </motion.div>
              ) : null}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
