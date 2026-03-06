import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import * as api from "@/lib/api";
import { requestFcmToken } from "@/lib/firebase";
import heroImg from "@/assets/dashboard-hero.jpg";
import ForgotPasswordModal from "@/components/modals/ForgotPasswordModal";
import ForgotUsernameModal from "@/components/modals/ForgotUsernameModal";

// --- Animation variants ---
const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

const blobVariants: Variants = {
  animate: { opacity: [0.6, 0.4, 0.6], scale: [1, 1.02, 1], transition: { duration: 8, repeat: Infinity } },
};

const formSlideVariants: Variants = {
  hidden: (dir: number) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
  visible: { opacity: 1, x: 0, transition: { duration: 0.35 } },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -20 : 20, transition: { duration: 0.25 } }),
};

const formContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.03 } },
};

const fieldVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 340, damping: 28 } },
};

const Auth: React.FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [direction, setDirection] = useState(1);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showForgotUsernameModal, setShowForgotUsernameModal] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(false);
        
  // Sign in fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Sign up state
  const [formData, setFormData] = useState<any>({
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
    country: "USA",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  
  // Account lockout states
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [showAccountLockedDialog, setShowAccountLockedDialog] = useState(false);
  const [accountLockedMessage, setAccountLockedMessage] = useState("");

  



  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  function getPasswordStrength(pw = "") {
    let score = 0;
    if (pw.length >= 8) score += 2;
    if (/[A-Z]/.test(pw)) score += 1;
    if (/[a-z]/.test(pw)) score += 1;
    if (/[0-9]/.test(pw)) score += 1;
    if (/[^A-Za-z0-9]/.test(pw)) score += 1;

    const label = score <= 2 ? "Weak" : score <= 4 ? "Good" : "Strong";
    const color = score <= 2 ? "bg-red-500" : score <= 4 ? "bg-yellow-400" : "bg-green-500";
    return { score, label, color };
  }

  const validateForm = () => {
    const nerrors: Record<string, string> = {};
    if (!formData.firstName) nerrors.firstName = "Required";
    if (!formData.email) nerrors.email = "Required";
    if (!formData.mobile) nerrors.mobile = "Required";
    if (!formData.password) nerrors.password = "Required";
    if (formData.password !== formData.confirmPassword) nerrors.confirmPassword = "Passwords must match";
    setErrors(nerrors);
    return Object.keys(nerrors).length === 0;
  };

  const switchMode = (newMode: "signin" | "signup") => {
    setDirection(newMode === "signup" ? 1 : -1);
    setMode(newMode);
  };

  const handleCompleteProfile = async () => {
    const token = localStorage.getItem("authToken");
    
    if (token) {
      // Token exists, check if vendor profile exists
      setCheckingProfile(true);
      try {
        const vendorProfile = await api.getVendorMe();
        
        if (vendorProfile && vendorProfile.id) {
          // Profile exists, check approval status
          const approvalStatus = vendorProfile.approvalStatus || vendorProfile.approval_status;
          
          if (approvalStatus === "PENDING") {
            toast({
              title: "Profile Pending Approval",
              description: "Your profile is awaiting admin approval. You'll be notified once approved.",
              variant: "default",
            });
            return;
          } else if (approvalStatus === "APPROVED") {
            toast({
              title: "Profile Already Complete",
              description: "Your profile is complete and approved.",
            });
            navigate("/dashboard");
            return;
          }
        }
        
        // No profile found, navigate to setup
        navigate("/vendor-setup");
      } catch (err: any) {
        // Error fetching profile (likely 404 - no profile exists)
        // This is expected for onboarding state, allow navigation
        console.log("No vendor profile found, proceeding to setup:", err?.message);
        navigate("/vendor-setup");
      } finally {
        setCheckingProfile(false);
      }
    } else {
      // No token, show message to login first
      toast({
        title: "Login Required",
        description: "Please login to complete your vendor profile.",
        variant: "default",
      });
      setMode("signin");
    }
  };

  const handleSignIn = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    // Check if account is already locked
    if (failedAttempts >= 3) {
      setAccountLockedMessage("Your account has been blocked due to reaching maximum login attempts (3). Please reset your password to unlock your account.");
      setShowAccountLockedDialog(true);
      return;
    }
    
    if (!email || !password) {
      toast({ title: "Missing fields", description: "Please enter email and password", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await api.login({ login: email, password });

      // Reset failed attempts on successful login
      setFailedAttempts(0);

      // The API may return a wrapper { success, status, message, data: { accessToken, ... } }
      // or return the payload directly. Normalize both shapes.
      const inner = res?.data ?? res;

      const accessToken = inner?.accessToken ?? inner?.token ?? res?.token ?? null;
      const refreshToken = inner?.refreshToken ?? null;
      const tokenType = inner?.tokenType ?? res?.tokenType ?? "Bearer";
      const expiresIn = inner?.expiresIn ?? null;

      if (accessToken) {
        localStorage.setItem("authToken", accessToken);
        if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
        localStorage.setItem("tokenType", tokenType || "Bearer");
        if (expiresIn) localStorage.setItem("expiresIn", String(expiresIn));
        console.log("Auth.handleSignIn - stored tokens:", { tokenType: tokenType || "Bearer", accessToken, refreshToken, expiresIn });
      }

      // User info may be inside `inner.user` or at top-level `inner`
      const user = inner?.user ?? inner ?? {};
      const userId = user?.userId || user?.id || inner?.userId || inner?.id;
      const userType = user?.userType || inner?.userType;
      const emailResp = user?.email || inner?.email;
      const phone = user?.phone || inner?.phone;
      const firstName = user?.firstName || inner?.firstName;
      const lastName = user?.lastName || inner?.lastName;
      const fullName = user?.fullName || `${firstName || ""} ${lastName || ""}`.trim();
      const country = user?.country || inner?.country;
      const profileUrl = user?.profileUrl || inner?.profileUrl;

      if (userId) localStorage.setItem("userId", String(userId));
      if (userType) localStorage.setItem("userType", String(userType));
      if (emailResp) localStorage.setItem("email", String(emailResp));
      if (phone) localStorage.setItem("phone", String(phone));
      if (firstName) localStorage.setItem("firstName", String(firstName));
      if (lastName) localStorage.setItem("lastName", String(lastName));
      if (fullName) localStorage.setItem("fullName", String(fullName));
      if (country) localStorage.setItem("country", String(country));
      if (profileUrl) localStorage.setItem("profileUrl", String(profileUrl));

      // Backwards-compatible vendor ids
      const vendorId = inner?.vendorId || user?.vendorId || userId;
      const vendorOrgId = inner?.vendorOrganizationId || user?.vendorOrganizationId || null;
      if (vendorId) {
        localStorage.setItem("vendorId", String(vendorId));
        localStorage.setItem("id", String(vendorId));
      }
      if (vendorOrgId) localStorage.setItem("vendorOrganizationId", String(vendorOrgId));

      // Fetch and store complete vendor profile after successful login
      try {
        const vendorProfile = await api.getVendorMe();
        console.debug("Auth.handleSignIn - getVendorMe response:", vendorProfile);
        if (vendorProfile) {
          // Store complete vendor response for future use
          localStorage.setItem("vendorProfile", JSON.stringify(vendorProfile));
          // Update vendorId from profile if available
          if (vendorProfile.id) {
            localStorage.setItem("vendorId", String(vendorProfile.id));
            localStorage.setItem("id", String(vendorProfile.id));
          }
          
          // Check approval status
          const approvalStatus = vendorProfile.approvalStatus || vendorProfile.approval_status;
          
          if (approvalStatus === "PENDING") {
            // Profile exists but pending approval
            toast({ 
              title: "Profile Pending Approval", 
              description: "Your profile is awaiting admin approval. You'll be notified once approved.",
              variant: "default"
            });
            // Clear token and prevent dashboard access
            localStorage.clear();
            setLoading(false);
            return;
          } else if (approvalStatus === "APPROVED") {
            // Profile approved, proceed to dashboard
            toast({ title: `Welcome back${fullName ? `, ${fullName}` : ""}` });
            requestFcmToken().catch(() => {});
            navigate("/dashboard");
            return;
          }
        }
      } catch (vendorErr: any) {
        // No vendor profile found (404 or similar)
        // This means vendor is in "Onboarding State" - allow them to create profile
        console.log("No vendor profile found - redirecting to profile setup:", vendorErr?.message);
        toast({ 
          title: "Complete Your Profile", 
          description: "Please complete your vendor profile to get started.",
        });
        navigate("/vendor-setup");
        setLoading(false);
        return;
      }

      toast({ title: `Welcome back${fullName ? `, ${fullName}` : ""}` });
      requestFcmToken().catch(() => {});
      navigate("/dashboard");
    } catch (err: any) {
      // Increment failed attempts
      const newFailedAttempts = failedAttempts + 1;
      setFailedAttempts(newFailedAttempts);
      
      // Check if account should be locked (3 failed attempts)
      if (newFailedAttempts >= 3) {
        setAccountLockedMessage("Your account has been blocked due to reaching maximum login attempts (3). Please reset your password to unlock your account.");
        setShowAccountLockedDialog(true);
      } else {
        // Show remaining attempts
        const remainingAttempts = 3 - newFailedAttempts;
        toast({ 
          title: "Login failed", 
          description: `Invalid credentials. You have ${remainingAttempts} attempt(s) left.`,
          variant: "destructive" 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setServerError("");
    try {
      const payload = {
        email: formData.email,
        phone: formData.mobile,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName || "",
        userType: "VENDOR",
        country: formData.country || "USA",
      };
      const res = await api.registerAuth(payload);
      
      // Store registration response for vendor profile setup
      const registrationData = {
        ...(res?.data || res),
        country: formData.country || "USA",
      };
      localStorage.setItem("registrationData", JSON.stringify(registrationData));
      
      // Store tokens if returned
      const inner = res?.data ?? res;
      const accessToken = inner?.accessToken ?? inner?.token ?? null;
      if (accessToken) {
        localStorage.setItem("authToken", accessToken);
        if (inner?.refreshToken) localStorage.setItem("refreshToken", inner.refreshToken);
        if (inner?.tokenType) localStorage.setItem("tokenType", inner.tokenType);
      }
      
      // Store user data
      const user = inner?.user ?? inner;
      if (user?.userId) localStorage.setItem("userId", String(user.userId));
      if (user?.email) localStorage.setItem("email", String(user.email));
      if (formData.firstName) localStorage.setItem("firstName", formData.firstName);
      if (formData.lastName) localStorage.setItem("lastName", formData.lastName);
      if (formData.country) localStorage.setItem("country", formData.country);
      
      toast({ title: "Registration successful!", description: "Please complete your vendor profile." });
      
      // Navigate to vendor profile setup with registration data
      navigate("/vendor-setup", { state: { registrationData } });
    } catch (err: any) {
      setServerError(err?.message || "Registration failed. Please try again.");
      toast({ title: "Registration failed", description: err?.message || "Network error while registering", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.section variants={pageVariants} initial="initial" animate="animate" className="relative h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-orange-600 via-orange-400 to-orange-500 px-4 md:px-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div variants={blobVariants} animate="animate" className="absolute -top-32 -left-24 h-80 w-80 rounded-full bg-orange-400/20 blur-3xl" />
        <motion.div variants={blobVariants} animate="animate" transition={{ delay: 3, duration: 16 }} className="absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-amber-400/15 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.15),transparent_55%),radial-gradient(circle_at_bottom,_rgba(245,158,11,0.1),transparent_55%)] opacity-60" />
      </div>

      <div className="relative z-10 grid h-[520px] w-full max-w-5xl items-stretch gap-6 md:h-[580px] lg:h-[620px] lg:grid-cols-12">
        <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }} className="relative hidden h-full flex-col justify-end overflow-hidden rounded-3xl border border-border bg-card shadow-lg lg:col-span-5 lg:flex">
          <div className="absolute inset-0">
            <motion.img src={heroImg} alt="hero" className="h-full w-full object-cover" initial={{ scale: 1.05 }} animate={{ scale: 1 }} transition={{ duration: 1 }} whileHover={{ scale: 1.02 }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent" />
          </div>
          <div className="relative z-10 space-y-4 p-7 text-white">
            <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.45, duration: 0.5 }}>
              <span className="inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-primary border border-white/20 backdrop-blur">
                <ArrowRight className="h-3 w-3" />
                Hosting made simple
              </span>
            </motion.div>
            <motion.h2 initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.55, duration: 0.5 }} className="text-3xl font-extrabold leading-snug text-white lg:text-4xl drop-shadow-md">
              Plan every event with <span className="text-primary">confidence</span>.
            </motion.h2>
            <motion.p initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.65, duration: 0.5 }} className="max-w-md text-sm text-white/85">
              Compare menus, manage proposals, and coordinate with trusted caterers in one place.
            </motion.p>
            <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.75, duration: 0.5 }} className="flex items-center gap-4 pt-1">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/25 border border-primary/60">
                  <span className="text-[11px] font-semibold text-white">✓</span>
                </div>
                <span className="text-xs text-white/80">Instant quotes</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 border border-white/40">
                  <span className="text-[11px] font-semibold text-white">✓</span>
                </div>
                <span className="text-xs text-white/80">Verified partners</span>
              </div>
            </motion.div>
          </div>
        </motion.div>

        <motion.div variants={cardVariants} initial="hidden" animate="visible" className="flex h-full items-center lg:col-span-7">
          <div className="relative flex h-full w-full flex-col overflow-visible rounded-3xl border border-border bg-card p-6 md:p-8 shadow-xl">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

            <div className="relative mb-7">
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
                <p className="text-xs text-muted-foreground md:text-sm">{mode === "signin" ? "Sign in to manage your events and menus." : "It only takes a minute to get started."}</p>
              </motion.div>

              <motion.div className="mt-5 flex items-center gap-3" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35 }}>
                <div className="inline-flex gap-2 rounded-2xl border border-border bg-background/60 p-1.5 backdrop-blur flex-1">
                  <button type="button" onClick={() => switchMode("signin")} className={`relative rounded-xl px-5 py-2 text-xs font-semibold transition-colors md:px-6 md:text-sm flex-1 ${mode === "signin" ? "text-background" : "text-muted-foreground hover:text-foreground"}`}>
                    {mode === "signin" && <motion.div layoutId="authTab" className="absolute inset-0 rounded-xl bg-primary shadow-md" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
                    <span className="relative z-10">Sign In</span>
                  </button>
                  <button type="button" onClick={() => switchMode("signup")} className={`relative rounded-xl px-5 py-2 text-xs font-semibold transition-colors md:px-6 md:text-sm flex-1 ${mode === "signup" ? "text-background" : "text-muted-foreground hover:text-foreground"}`}>
                    {mode === "signup" && <motion.div layoutId="authTab" className="absolute inset-0 rounded-xl bg-primary shadow-md" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
                    <span className="relative z-10">Sign Up</span>
                  </button>
                </div>
                
                {/* Complete Profile Button - Right Side */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCompleteProfile}
                  disabled={checkingProfile}
                  className="rounded-xl border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary font-semibold text-xs h-[42px] px-4 whitespace-nowrap"
                  title="Already registered? Complete your vendor profile setup."
                >
                  {checkingProfile ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <ArrowRight className="h-3.5 w-3.5 mr-1.5" />
                      <span className="hidden sm:inline">Complete Profile</span>
                      <span className="sm:hidden">Profile</span>
                    </>
                  )}
                </Button>
              </motion.div>
            </div>

            <div className="relative flex-1 flex flex-col overflow-hidden">
              <div className="absolute inset-0 overflow-hidden">
                <AnimatePresence mode="wait" custom={direction}>
                  {mode === "signin" ? (
                    <motion.form id="signinForm" key="signin" custom={direction} variants={formSlideVariants} initial="hidden" animate="visible" exit="exit" onSubmit={handleSignIn} className="h-full flex flex-col">
                      <div className="flex-1 overflow-auto pr-2">
                        <motion.div variants={formContainerVariants} initial="hidden" animate="visible" className="space-y-5 p-1">
                          <motion.div variants={fieldVariants} className="space-y-2">
                            <div className="ml-1 flex items-center justify-between">
                              <Label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Email or Mobile <span className="text-red-500">*</span></Label>
                              <button 
                                type="button"
                                onClick={() => setShowForgotUsernameModal(true)}
                                className="text-[11px] font-semibold text-primary hover:brightness-110"
                              >
                                Forgot Username?
                              </button>
                            </div>
                            <div className="group relative">
                              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="h-10 rounded-xl border-border bg-background/60 pl-10 text-sm font-medium text-foreground placeholder:text-muted-foreground" required />
                            </div>
                          </motion.div>

                          <motion.div variants={fieldVariants} className="space-y-2">
                            <div className="ml-1 flex items-center justify-between">
                              <Label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Password <span className="text-red-500">*</span></Label>
                              <button 
                                type="button"
                                onClick={() => setShowForgotPasswordModal(true)}
                                className="text-[11px] font-semibold text-primary hover:brightness-110"
                              >
                                Forgot?
                              </button>
                            </div>
                            <div className="group relative">
                              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                              <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="h-10 rounded-xl border-border bg-background/60 pl-10 pr-10 text-sm font-medium text-foreground placeholder:text-muted-foreground" required />
                              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-primary">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                            </div>
                          </motion.div>

                          <motion.div variants={fieldVariants} className="pt-6">
                            <Button form="signinForm" type="submit" disabled={loading} className="group relative flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-md hover:brightness-105 active:scale-[0.98] transition-all overflow-hidden">
                              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-white/0 via-white/20 to-white/0 transition-transform duration-700 group-hover:translate-x-full" />
                              <span className="relative flex items-center gap-2">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}{!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}</span>
                            </Button>
                          </motion.div>
                        </motion.div>
                      </div>
                    </motion.form>
                  ) : (
                    <motion.form id="signupForm" key="signup" custom={direction} variants={formSlideVariants} initial="hidden" animate="visible" exit="exit" onSubmit={handleSignUp} className="h-full flex flex-col">
                      <div className="flex-1 overflow-auto pr-2">
                        <motion.div variants={formContainerVariants} initial="hidden" animate="visible" className="space-y-5 p-1">
                          <div className="grid grid-cols-2 gap-4">
                            <motion.div variants={fieldVariants} className="space-y-2">
                              <Label htmlFor="firstName" className="ml-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">First Name <span className="text-red-500">*</span></Label>
                              <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="First name" className={`${errors.firstName ? "border-red-500" : ""} h-10 rounded-xl border-border bg-background/60 text-sm font-medium text-foreground`} />
                              {errors.firstName && <p className="text-sm text-red-500">{errors.firstName}</p>}
                            </motion.div>

                            <motion.div variants={fieldVariants} className="space-y-2">
                              <Label htmlFor="lastName" className="ml-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Last Name</Label>
                              <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Last name" className={`h-10 rounded-xl border-border bg-background/60 text-sm font-medium text-foreground`} />
                            </motion.div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <motion.div variants={fieldVariants} className="space-y-2">
                              <Label htmlFor="email" className="ml-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Email Address <span className="text-red-500">*</span></Label>
                              <div className="group relative">
                                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" className={`${errors.email ? "border-red-500" : ""} h-10 rounded-xl border-border bg-background/60 pl-10 text-sm font-medium text-foreground`} />
                              </div>
                              {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                            </motion.div>

                            <motion.div variants={fieldVariants} className="space-y-2">
                              <Label htmlFor="mobile" className="ml-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Mobile <span className="text-red-500">*</span></Label>
                              <div className="relative">
                                <Input id="mobile" name="mobile" value={formData.mobile} onChange={handleChange} placeholder="Mobile number" className={`${errors.mobile ? "border-red-500" : ""} h-10 rounded-xl border-border bg-background/60 pl-3 text-sm font-medium text-foreground`} />
                              </div>
                              {errors.mobile && <p className="text-sm text-red-500">{errors.mobile}</p>}
                            </motion.div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-6">
                            <motion.div variants={fieldVariants} className="space-y-2">
                              <Label htmlFor="password" className="ml-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Password <span className="text-red-500">*</span></Label>
                              <div className="relative">
                                <Input id="password" name="password" type={showRegPassword ? "text" : "password"} value={formData.password} onChange={handleChange} placeholder="Create a strong password" className={`${errors.password ? "border-red-500" : ""} h-10 rounded-xl border-border bg-background/60 pr-12 text-sm font-medium text-foreground`} />
                                <button type="button" aria-label={showRegPassword ? "Hide password" : "Show password"} onClick={() => setShowRegPassword((p) => !p)} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700">{showRegPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
                              </div>
                              {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
                            </motion.div>

                            <motion.div variants={fieldVariants} className="space-y-2">
                              <Label htmlFor="confirmPassword" className="ml-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Confirm Password <span className="text-red-500">*</span></Label>
                              <div className="relative">
                                <Input id="confirmPassword" name="confirmPassword" type={showRegPassword ? "text" : "password"} value={formData.confirmPassword} onChange={handleChange} placeholder="Re-enter password" className={`${errors.confirmPassword ? "border-red-500" : ""} h-10 rounded-xl border-border bg-background/60`} />
                              </div>
                              {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword}</p>}
                            </motion.div>
                          </div>

                          <motion.div variants={fieldVariants} className="space-y-2">
                            <Label htmlFor="country">Country <span className="text-red-500">*</span></Label>
                            <Select value={formData.country} onValueChange={(v) => setFormData((p: any) => ({ ...p, country: v }))}>
                              <SelectTrigger className={`h-10 rounded-xl border-border bg-background/60 text-sm ${errors.country ? "border-red-500" : ""}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="USA">USA</SelectItem>
                                <SelectItem value="INDIA">INDIA</SelectItem>
                              </SelectContent>
                            </Select>
                            {errors.country && <p className="text-sm text-red-500">{errors.country}</p>}
                          </motion.div>

                          <motion.div variants={fieldVariants} className="pt-4">
                            <Button type="submit" disabled={loading} className="group relative flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-md hover:brightness-105 active:scale-[0.98] transition-all overflow-hidden">
                              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-white/0 via-white/20 to-white/0 transition-transform duration-700 group-hover:translate-x-full" />
                              <span className="relative flex items-center gap-2">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}{!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}</span>
                            </Button>
                          </motion.div>
                        </motion.div>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Modals - Outside main container to avoid z-index stacking issues */}
      <ForgotPasswordModal 
        isOpen={showForgotPasswordModal}
        onClose={() => setShowForgotPasswordModal(false)}
        onLoginClick={() => {}}
        onForgotUsernameClick={() => {
          setShowForgotPasswordModal(false);
          setShowForgotUsernameModal(true);
        }}
      />
      <ForgotUsernameModal 
        isOpen={showForgotUsernameModal}
        onClose={() => setShowForgotUsernameModal(false)}
        onLoginClick={() => {}}
        onForgotPasswordClick={() => {
          setShowForgotUsernameModal(false);
          setShowForgotPasswordModal(true);
        }}
      />

      {/* Account Locked Dialog */}
      <AlertDialog open={showAccountLockedDialog} onOpenChange={setShowAccountLockedDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-red-100 p-3">
                <svg className="h-12 w-12 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            <AlertDialogTitle className="text-center text-2xl text-red-600">Account Blocked</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-base leading-relaxed pt-2">
              {accountLockedMessage || "Your account has been blocked due to reaching maximum login attempts. Please reset your password to unlock your account."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowAccountLockedDialog(false);
                setFailedAttempts(0);
              }}
              className="w-full sm:w-auto"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setShowAccountLockedDialog(false);
                setShowForgotPasswordModal(true);
              }}
              className="w-full sm:w-auto bg-primary"
            >
              Reset Password
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.section>
  );
};

export default Auth;
