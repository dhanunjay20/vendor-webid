import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, CheckCircle2, X, ArrowLeft } from "lucide-react";
import * as api from "@/lib/api";

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
  const [contact, setContact] = useState("");
  const [error, setError] = useState("");

  const resetModal = () => {
    setContact("");
    setError("");
    setIsSubmitted(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!contact) {
      setError("Please enter your email or mobile number");
      return;
    }

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
    const isMobile = /^\+?[1-9]\d{9,14}$/.test(contact.trim());

    if (!isEmail && !isMobile) {
      setError("Please enter a valid email address or mobile number.");
      return;
    }

    setLoading(true);
    try {
      const payload: any = {};
      if (isEmail) payload.email = contact;
      else if (isMobile) payload.mobile = contact;
      else payload.contact = contact;

      await api.forgotUsername(payload);
      setIsSubmitted(true);
      
      // Auto-redirect to login after 3 seconds
      setTimeout(() => {
        handleClose();
        onLoginClick?.();
      }, 3000);
    } catch (err: any) {
      if (err?.status && Number(err.status) >= 500) {
        setError("Server error. Please try again later.");
      } else {
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
    if (s.includes("@")) {
      const [local, domain] = s.split("@");
      const first = local.charAt(0) || "";
      return `${first}****@${domain}`;
    }
    const digits = s.replace(/\D/g, "");
    if (digits.length <= 4) return `***${digits}`;
    return `****${digits.slice(-3)}`;
  }

  function getContactType(c: string) {
    if (!c) return "contact";
    return c.trim().includes("@") ? "email" : "WhatsApp";
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
              {isSubmitted && (
                <motion.div
                  className="relative px-6 py-8 text-center"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <>
                    <motion.div
                      className="mx-auto w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mb-4 shadow-lg"
                      animate={{ scale: [0, 1.2, 1] }}
                      transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    >
                      <CheckCircle2 className="w-10 h-10 text-white" />
                    </motion.div>
                    <h2 className="text-2xl font-bold text-gray-900 mt-4">Username Sent!</h2>
                    <p className="text-gray-600 mt-2">Check your {getContactType(contact)}</p>

                    <Alert className="bg-green-50 border-green-200 mt-4">
                      <AlertDescription className="text-gray-700 text-sm">
                        Your username has been sent to <strong>{maskContact(contact)}</strong> via{" "}
                        <strong>{getContactType(contact)}</strong>.
                        <div className="mt-2 text-xs text-gray-500">
                          Redirecting to login in 3 seconds...
                        </div>
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-3 mt-6">
                      <motion.button
                        onClick={() => {
                          handleClose();
                          onLoginClick?.();
                        }}
                        className="w-full py-3 px-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-semibold rounded-xl transition-all shadow-lg"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Go to Login
                      </motion.button>
                      <motion.button
                        onClick={() => {
                          setIsSubmitted(false);
                          setContact("");
                        }}
                        className="w-full py-3 px-4 border-2 border-orange-600 text-orange-600 hover:bg-orange-50 font-semibold rounded-xl transition-all"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Try Another Contact
                      </motion.button>
                    </div>
                  </>
                </motion.div>
              )}

              {/* Form State */}
              {!isSubmitted && (
                <motion.div
                  className="relative px-6 py-8"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Username Recovery</h2>
                    <p className="text-gray-600 text-sm mt-2">
                      Enter your registered contact information
                    </p>
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
                        Email or Mobile Number
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-orange-500" />
                        <Input
                          id="contact"
                          name="contact"
                          value={contact}
                          onChange={(e) => {
                            setContact(e.target.value);
                            setError("");
                          }}
                          placeholder="Enter email or mobile"
                          className="h-11 pl-10 border-2 border-gray-200 focus:border-orange-500 rounded-xl bg-white/80 backdrop-blur-sm"
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        Must be registered with your account
                      </p>
                    </div>

                    <Alert className="bg-blue-50 border-blue-200 rounded-xl">
                      <AlertDescription className="text-blue-800 text-xs">
                        <strong>Note:</strong> The contact information must be registered with your account.
                      </AlertDescription>
                    </Alert>

                    <motion.button
                      type="submit"
                      className="w-full py-3 px-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-semibold rounded-xl transition-all shadow-lg disabled:opacity-50"
                      disabled={loading}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {loading ? "Sending..." : "Send Username"}
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
              )}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
