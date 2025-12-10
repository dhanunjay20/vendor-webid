import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import * as api from "@/lib/api";
import heroImg from "@/assets/dashboard-hero.jpg";

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

  // Sign in fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Sign up state
  const [formData, setFormData] = useState<any>({
    businessName: "",
    ownerName: "",
    username: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    country: "",
    zipCode: "",
  });
  const [vendorOrgId, setVendorOrgId] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
    if (name === "businessName" || name === "ownerName") {
      const nextBiz = name === "businessName" ? value : formData.businessName;
      const nextOwner = name === "ownerName" ? value : formData.ownerName;
      setVendorOrgId(computeVendorOrgId(nextBiz, nextOwner));
    }
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
    if (!formData.businessName) nerrors.businessName = "Required";
    if (!formData.ownerName) nerrors.ownerName = "Required";
    if (!formData.email) nerrors.email = "Required";
    if (!formData.username) nerrors.username = "Required";
    if (!formData.password) nerrors.password = "Required";
    if (formData.password !== formData.confirmPassword) nerrors.confirmPassword = "Passwords must match";
    setErrors(nerrors);
    return Object.keys(nerrors).length === 0;
  };

  const switchMode = (newMode: "signin" | "signup") => {
    setDirection(newMode === "signup" ? 1 : -1);
    setMode(newMode);
  };

  const handleSignIn = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email || !password) {
      toast({ title: "Missing fields", description: "Please enter email and password", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await api.login({ login: email, password });
      if (res?.token) {
        localStorage.setItem("authToken", res.token);
        localStorage.setItem("tokenType", res.tokenType || "Bearer");
      }
      const vendorId = res.vendorId || res.vendor?.id || res.vendor?._id || res.id || res._id;
      const vendorOrgId = res.vendorOrganizationId || res.vendor?.vendorOrganizationId;
      const userType = res.userType || res.user?.userType;
      const userId = res.userId || res.user?.id || res.user?.userId;
      const profileUrl = res.profileUrl || res.user?.profileUrl || res.vendor?.profileUrl;
      if (vendorId) {
        localStorage.setItem("vendorId", String(vendorId));
        localStorage.setItem("id", String(vendorId));
      }
      if (vendorOrgId) localStorage.setItem("vendorOrganizationId", String(vendorOrgId));
      if (userType) localStorage.setItem("userType", String(userType));
      if (userId) localStorage.setItem("userId", String(userId));
      if (profileUrl) localStorage.setItem("profileUrl", String(profileUrl));
      toast({ title: `Welcome back${res.name ? `, ${res.name}` : ""}` });
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Login failed", description: err?.message || "Network error while logging in", variant: "destructive" });
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
      toast({ title: "Registration successful!", description: "Please sign in." });
      switchMode("signin");
    } catch (err: any) {
      setServerError(err?.message || "Registration failed. Please try again.");
      toast({ title: "Registration failed", description: err?.message || "Network error while registering", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.section variants={pageVariants} initial="initial" animate="animate" className="relative h-screen flex items-center justify-center overflow-hidden bg-background px-4 md:px-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div variants={blobVariants} animate="animate" className="absolute -top-32 -left-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <motion.div variants={blobVariants} animate="animate" transition={{ delay: 3, duration: 16 }} className="absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-muted/40 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.25),transparent_55%),radial-gradient(circle_at_bottom,_rgba(15,23,42,0.95),transparent_55%)] opacity-40" />
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

              <motion.div className="mt-5 inline-flex gap-2 rounded-2xl border border-border bg-background/60 p-1.5 backdrop-blur" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35 }}>
                <button type="button" onClick={() => switchMode("signin")} className={`relative rounded-xl px-5 py-2 text-xs font-semibold transition-colors md:px-6 md:text-sm ${mode === "signin" ? "text-background" : "text-muted-foreground hover:text-foreground"}`}>
                  {mode === "signin" && <motion.div layoutId="authTab" className="absolute inset-0 rounded-xl bg-primary shadow-md" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
                  <span className="relative z-10">Sign In</span>
                </button>
                <button type="button" onClick={() => switchMode("signup")} className={`relative rounded-xl px-5 py-2 text-xs font-semibold transition-colors md:px-6 md:text-sm ${mode === "signup" ? "text-background" : "text-muted-foreground hover:text-foreground"}`}>
                  {mode === "signup" && <motion.div layoutId="authTab" className="absolute inset-0 rounded-xl bg-primary shadow-md" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
                  <span className="relative z-10">Sign Up</span>
                </button>
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
                            <Label className="ml-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Email or Mobile</Label>
                            <div className="group relative">
                              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="h-10 rounded-xl border-border bg-background/60 pl-10 text-sm font-medium text-foreground placeholder:text-muted-foreground" required />
                            </div>
                          </motion.div>

                          <motion.div variants={fieldVariants} className="space-y-2">
                            <div className="ml-1 flex items-center justify-between">
                              <Label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Password</Label>
                              <Link to="/forgot-password" className="text-[11px] font-semibold text-primary hover:brightness-110">Forgot?</Link>
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
                              <Label htmlFor="businessName" className="ml-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Business Name <span className="text-red-500">*</span></Label>
                              <Input id="businessName" name="businessName" value={formData.businessName} onChange={handleChange} placeholder="Enter your business name" className={`${errors.businessName ? "border-red-500" : ""} h-10 rounded-xl border-border bg-background/60 text-sm font-medium text-foreground`} />
                              {errors.businessName && <p className="text-sm text-red-500">{errors.businessName}</p>}
                            </motion.div>

                            <motion.div variants={fieldVariants} className="space-y-2">
                              <Label htmlFor="ownerName" className="ml-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Owner Name <span className="text-red-500">*</span></Label>
                              <Input id="ownerName" name="ownerName" value={formData.ownerName} onChange={handleChange} placeholder="Enter owner name" className={`${errors.ownerName ? "border-red-500" : ""} h-10 rounded-xl border-border bg-background/60 text-sm font-medium text-foreground`} />
                              {errors.ownerName && <p className="text-sm text-red-500">{errors.ownerName}</p>}
                            </motion.div>
                          </div>

                          <motion.div variants={fieldVariants} className="space-y-2 md:col-span-2">
                            <Label htmlFor="vendorOrgId">Organization ID</Label>
                            <div className="flex items-center space-x-2">
                              <Input id="vendorOrgId" name="vendorOrgId" value={vendorOrgId} readOnly className="w-full bg-gray-100" />
                              <Button type="button" onClick={regenerateOrgId} className="h-10">Regenerate</Button>
                            </div>
                            <p className="text-xs text-gray-500">Auto-generated from business & owner name. You can regenerate.</p>
                          </motion.div>

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
                              <Label htmlFor="mobile" className="ml-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Mobile <span className="text-[9px] font-normal tracking-normal text-muted-foreground">(Required)</span></Label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">+91</span>
                                <Input id="mobile" name="mobile" value={formData.mobile} onChange={handleChange} placeholder="10-digit mobile number" maxLength={10} className={`${errors.mobile ? "border-red-500" : ""} h-10 rounded-xl border-border bg-background/60 pl-11 text-sm font-medium text-foreground`} />
                              </div>
                              {errors.mobile && <p className="text-sm text-red-500">{errors.mobile}</p>}
                            </motion.div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="username" className="ml-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Username <span className="text-red-500">*</span></Label>
                            <Input id="username" name="username" value={formData.username} onChange={handleChange} placeholder="Choose a unique username" className={`${errors.username ? "border-red-500" : ""} h-10 rounded-xl border-border bg-background/60 text-sm font-medium text-foreground`} />
                            {errors.username && <p className="text-sm text-red-500">{errors.username}</p>}
                          </div>

                          <div className="grid md:grid-cols-2 gap-6">
                            <motion.div variants={fieldVariants} className="space-y-2">
                              <Label htmlFor="password" className="ml-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Password <span className="text-red-500">*</span></Label>
                              <div className="relative">
                                <Input id="password" name="password" type={showRegPassword ? "text" : "password"} value={formData.password} onChange={handleChange} placeholder="Create a strong password" className={`${errors.password ? "border-red-500" : ""} h-10 rounded-xl border-border bg-background/60 pr-12 text-sm font-medium text-foreground`} />
                                <button type="button" aria-label={showRegPassword ? "Hide password" : "Show password"} onClick={() => setShowRegPassword((p) => !p)} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700">{showRegPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
                              </div>
                              {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
                              {formData.password && (() => {
                                const s = getPasswordStrength(formData.password);
                                const pct = Math.min(100, Math.round((s.score / 6) * 100));
                                return (
                                  <div className="mt-2">
                                    <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
                                      <div className={`${s.color} h-2`} style={{ width: `${pct}%` }} />
                                    </div>
                                    <div className="text-xs text-gray-600 mt-1">Strength: {s.label}</div>
                                  </div>
                                );
                              })()}
                            </motion.div>

                            <motion.div variants={fieldVariants} className="space-y-2">
                              <Label htmlFor="confirmPassword" className="ml-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Confirm Password <span className="text-red-500">*</span></Label>
                              <div className="relative">
                                <Input id="confirmPassword" name="confirmPassword" type="text" value={formData.confirmPassword} onChange={handleChange} placeholder="Re-enter password" className={`${errors.confirmPassword ? "border-red-500" : ""} h-10 rounded-xl border-border bg-background/60`} />
                              </div>
                              {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword}</p>}
                            </motion.div>
                          </div>

                          <div className="grid grid-cols-1 gap-4">
                            <motion.div variants={fieldVariants} className="space-y-2">
                              <Label htmlFor="addressLine1">Address Line 1 <span className="text-red-500">*</span></Label>
                              <Input id="addressLine1" name="addressLine1" value={formData.addressLine1} onChange={handleChange} placeholder="Street address, P.O. box, company name, c/o" className={`${errors.addressLine1 ? "border-red-500" : ""} h-10 rounded-xl border-border bg-background/60`} />
                              {errors.addressLine1 && <p className="text-sm text-red-500">{errors.addressLine1}</p>}
                            </motion.div>

                            <motion.div variants={fieldVariants} className="space-y-2">
                              <Label htmlFor="addressLine2">Address Line 2</Label>
                              <Input id="addressLine2" name="addressLine2" value={formData.addressLine2} onChange={handleChange} placeholder="Apartment, suite, etc. (optional)" className="h-10 rounded-xl border-border bg-background/60" />
                            </motion.div>

                            <motion.div variants={fieldVariants} className="grid md:grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="city">City <span className="text-red-500">*</span></Label>
                                <Input id="city" name="city" value={formData.city} onChange={handleChange} placeholder="City" className={`${errors.city ? "border-red-500" : ""} h-10 rounded-xl border-border bg-background/60`} />
                                {errors.city && <p className="text-sm text-red-500">{errors.city}</p>}
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="state">State / Province <span className="text-red-500">*</span></Label>
                                <Input id="state" name="state" value={formData.state} onChange={handleChange} placeholder="State or Province" className={`${errors.state ? "border-red-500" : ""} h-10 rounded-xl border-border bg-background/60`} />
                                {errors.state && <p className="text-sm text-red-500">{errors.state}</p>}
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="zipCode">ZIP / Postal Code <span className="text-red-500">*</span></Label>
                                <Input id="zipCode" name="zipCode" value={formData.zipCode} onChange={handleChange} placeholder="Postal code" className={`${errors.zipCode ? "border-red-500" : ""} h-10 rounded-xl border-border bg-background/60`} />
                                {errors.zipCode && <p className="text-sm text-red-500">{errors.zipCode}</p>}
                              </div>
                            </motion.div>

                            <motion.div variants={fieldVariants} className="grid md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="country">Country <span className="text-red-500">*</span></Label>
                                <Input id="country" name="country" value={formData.country} onChange={handleChange} placeholder="Country" className={`${errors.country ? "border-red-500" : ""} h-10 rounded-xl border-border bg-background/60`} />
                                {errors.country && <p className="text-sm text-red-500">{errors.country}</p>}
                              </div>
                            </motion.div>

                            {/* Create account button at bottom of signup form */}
                            <motion.div variants={fieldVariants} className="pt-4">
                              <Button type="submit" disabled={loading} className="group relative flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-md hover:brightness-105 active:scale-[0.98] transition-all overflow-hidden">
                                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-white/0 via-white/20 to-white/0 transition-transform duration-700 group-hover:translate-x-full" />
                                <span className="relative flex items-center gap-2">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}{!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}</span>
                              </Button>
                            </motion.div>
                          </div>
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
    </motion.section>
  );
};

export default Auth;
