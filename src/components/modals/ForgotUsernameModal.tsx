import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Phone, CheckCircle2, X, ArrowLeft } from "lucide-react";
import * as api from "@/lib/api";

type RecoveryType = "email" | "phone";

interface ForgotUsernameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginClick?: () => void;
  onForgotPasswordClick?: () => void;
}

export default function ForgotUsernameModal({
  isOpen,
  onClose,
  onLoginClick,
  onForgotPasswordClick,
}: ForgotUsernameModalProps) {
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [recoveryType, setRecoveryType] = useState<RecoveryType>("email");
  const [contact, setContact] = useState("");
  const [error, setError] = useState("");
  const [responseMessage, setResponseMessage] = useState("");
  const [maskedContact, setMaskedContact] = useState("");

  const resetModal = () => {
    setContact("");
    setError("");
    setIsSubmitted(false);
    setRecoveryType("email");
    setResponseMessage("");
    setMaskedContact("");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!contact) {
      setError(recoveryType === "email" ? "Please enter your phone number" : "Please enter your email address");
      return;
    }

    if (recoveryType === "email") {
      // Recovering email using phone
      const isMobile = /^\+?[1-9]\d{9,14}$/.test(contact.trim());
      if (!isMobile) {
        setError("Please enter a valid phone number.");
        return;
      }
    } else {
      // Recovering phone using email
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
      if (!isEmail) {
        setError("Please enter a valid email address.");
        return;
      }
    }

    setLoading(true);
    try {
      let response;
      if (recoveryType === "email") {
        // Call forgot-email API with phone
        response = await api.forgotEmail(contact.trim());
      } else {
        // Call forgot-phone API with email
        response = await api.forgotPhone(contact.trim());
      }
      
      // Extract message from response
      const data = response?.data || response;
      
      // Get the main message from backend
      let displayMessage = data?.message || "";
      
      // Get data.message if it exists
      const dataMessage = data?.data?.message || "";
      
      // Get masked contact
      const masked = data?.data?.phone || data?.data?.email || "";
      
      // Use backend message or create user-friendly one
      if (!displayMessage) {
        displayMessage = recoveryType === "email"
          ? "Your email has been sent to your WhatsApp"
          : "Your phone number has been sent to your email";
      }

      setResponseMessage(displayMessage);
      setMaskedContact(masked || maskContact(contact, recoveryType));
      
      setIsSubmitted(true);
    } catch (err: any) {
      if (err?.status && Number(err.status) >= 500) {
        setError("Server error. Please try again later.");
      } else {
        const message = err?.message || "Unable to send recovery information. Please try again.";
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  function maskContact(c: string, type: RecoveryType) {
    if (!c) return "";
    const s = c.trim();
    if (type === "phone") {
      // Masking email
      if (s.includes("@")) {
        const [local, domain] = s.split("@");
        const first = local.charAt(0) || "";
        const last = local.charAt(local.length - 1) || "";
        return `${first}***${last}@${domain}`;
      }
      return s;
    } else {
      // Masking phone
      const digits = s.replace(/\D/g, "");
      if (digits.length <= 4) return `***${digits}`;
      return `******${digits.slice(-4)}`;
    }
  }

  function getDeliveryMethod(type: RecoveryType) {
    return type === "email" ? "WhatsApp" : "email";
  }

  function getRecoveryLabel(type: RecoveryType) {
    return type === "email" ? "Email" : "Phone Number";
  }

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
              {isSubmitted ? (
                <div className="relative px-6 py-8 text-center">
                  <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
                    <CheckCircle2 className="w-10 h-10 text-white" />
                  </div>
                  
                  <h2 className="text-2xl font-bold text-gray-900 mt-4">
                    {recoveryType === "email" ? "Email" : "Phone Number"} Sent!
                  </h2>
                  
                  <p className="text-gray-600 mt-2">
                    Check your {recoveryType === "email" ? "WhatsApp" : "email"}
                  </p>

                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-4">
                    <p className="text-gray-700 text-sm font-medium">
                      {responseMessage}
                    </p>
                    {maskedContact && (
                      <p className="mt-2 text-xs text-gray-600">
                        Sent to: <span className="font-semibold">{maskedContact}</span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-3 mt-6">
                    <button
                      onClick={() => {
                        handleClose();
                        onLoginClick?.();
                      }}
                      className="w-full py-3 px-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-semibold rounded-xl transition-all shadow-lg"
                    >
                      Go to Login
                    </button>
                    <button
                      onClick={() => {
                        setIsSubmitted(false);
                        setContact("");
                        setResponseMessage("");
                        setMaskedContact("");
                      }}
                      className="w-full py-3 px-4 border-2 border-orange-600 text-orange-600 hover:bg-orange-50 font-semibold rounded-xl transition-all"
                    >
                      Try Another Contact
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Form State */}
              {!isSubmitted ? (
                <motion.div
                  className="relative px-6 py-8"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Credential Recovery</h2>
                    <p className="text-gray-600 text-sm mt-2">
                      Recover your {recoveryType === "email" ? "email" : "phone number"}
                    </p>
                  </div>

                  {/* Recovery Type Tabs */}
                  <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setRecoveryType("email");
                        setContact("");
                        setError("");
                      }}
                      className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all ${
                        recoveryType === "email"
                          ? "bg-white text-orange-600 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      <Mail className="inline h-4 w-4 mr-2" />
                      Forgot Email
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRecoveryType("phone");
                        setContact("");
                        setError("");
                      }}
                      className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all ${
                        recoveryType === "phone"
                          ? "bg-white text-orange-600 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      <Phone className="inline h-4 w-4 mr-2" />
                      Forgot Phone
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
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
                      <Label htmlFor="contact" className="text-gray-700 font-medium">
                        {recoveryType === "email" ? "Phone Number" : "Email Address"}
                      </Label>
                      <div className="relative">
                        {recoveryType === "email" ? (
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-orange-500" />
                        ) : (
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-orange-500" />
                        )}
                        <Input
                          id="contact"
                          name="contact"
                          type={recoveryType === "phone" ? "email" : "tel"}
                          value={contact}
                          onChange={(e) => {
                            setContact(e.target.value);
                            setError("");
                          }}
                          placeholder={recoveryType === "email" ? "Enter phone number (e.g., +1234567890)" : "Enter email address"}
                          autoComplete="off"
                          className="h-11 pl-10 border-2 border-gray-200 focus:border-orange-500 rounded-xl bg-white/80 backdrop-blur-sm"
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        {recoveryType === "email" 
                          ? "Your email will be sent to your WhatsApp" 
                          : "Your phone number will be sent to your email"}
                      </p>
                    </div>

                    <Alert className="bg-blue-50 border-blue-200 rounded-xl">
                      <AlertDescription className="text-blue-800 text-xs">
                        <strong>Note:</strong> The {recoveryType === "email" ? "phone number" : "email address"} must be registered with your account.
                      </AlertDescription>
                    </Alert>

                    <motion.button
                      type="submit"
                      className="w-full py-3 px-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-semibold rounded-xl transition-all shadow-lg disabled:opacity-50"
                      disabled={loading}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {loading ? "Sending..." : `Send ${getRecoveryLabel(recoveryType)}`}
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
                        onForgotPasswordClick?.();
                        handleClose();
                      }}
                      className="w-full py-3 px-4 border-2 border-orange-600 text-orange-600 hover:bg-orange-50 font-semibold rounded-xl transition-all"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Forgot password instead?
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
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
