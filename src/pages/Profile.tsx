import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, MapPin, Phone, Mail, Loader2, CheckCircle2, XCircle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { LocationTracker } from "@/components/LocationTracker";
import { toast } from "@/hooks/use-toast";
import * as api from "@/lib/api";

interface VendorProfile {
  // IDs
  id?: string;
  vendorId?: string;
  userId?: string;
  vendorOrganizationId?: string;
  
  // Registration Info
  registeredEmail?: string;
  registeredPhone?: string;
  registeredEmailVerified?: boolean;
  registeredPhoneVerified?: boolean;
  
  // Business Contact
  businessName?: string;
  businessEmail?: string;
  businessPhone?: string;
  businessEmailVerified?: boolean;
  businessPhoneVerified?: boolean;
  
  // Business Details
  businessType?: string;
  businessRegistrationNumber?: string;
  taxId?: string;
  description?: string;
  establishedYear?: number;
  country?: string;
  cuisinesOffered?: string[];
  specialties?: string[];
  
  // Address
  businessAddress?: {
    streetAddress?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  };
  
  // Owner Information
  ownerInfo?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    idProofType?: string;
    idProofNumber?: string;
  };
  
  // Service Areas
  serviceAreas?: Array<{
    city?: string;
    state?: string;
    radiusKm?: number;
  }>;
  
  // Capacity
  capacity?: {
    minGuests?: number;
    maxGuests?: number;
    concurrentEvents?: number;
  };
  
  // Pricing
  pricing?: {
    currency?: string;
    startingPricePerPlate?: number;
    averagePricePerPlate?: number;
  };
  
  // Ratings
  ratings?: {
    averageRating?: number;
    totalReviews?: number;
  };
  
  // Statistics
  stats?: {
    totalOrders?: number;
    completedOrders?: number;
  };
  
  // Status & Verification
  status?: string;
  approvalStatus?: string;
  verified?: boolean;
  featured?: boolean;
  
  // Documents
  documents?: Array<{
    documentId?: string;
    documentType?: string;
    documentName?: string;
    documentUrl?: string;
    documentNumber?: string;
    issueDate?: string;
    expiryDate?: string;
    verificationStatus?: string;
    uploadedAt?: string;
  }>;
  
  // Timestamps
  createdAt?: string;
  
  // Location Tracking
  profileUrl?: string;
  isOnline?: boolean;
  lastSeenAt?: string;
  latitude?: number;
  longitude?: number;
  currentAddress?: string;
  lastLocationUpdatedAt?: string;
  
  // Legacy fields for backward compatibility
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
}

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vendorProfile, setVendorProfile] = useState<VendorProfile | null>(null);
  const [formData, setFormData] = useState<VendorProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // OTP Verification states
  const [showEmailOtpDialog, setShowEmailOtpDialog] = useState(false);
  const [showPhoneOtpDialog, setShowPhoneOtpDialog] = useState(false);
  const [showPhoneChannelDialog, setShowPhoneChannelDialog] = useState(false);
  const [emailOtp, setEmailOtp] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [selectedPhoneChannel, setSelectedPhoneChannel] = useState<"WHATSAPP" | "SMS">("WHATSAPP");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [verificationType, setVerificationType] = useState<"business" | "registered">("business");

  // Fetch vendor profile on mount
  useEffect(() => {
    fetchData();
  }, []);
  // Normalize various backend shapes into the `VendorProfile` shape used by this page
  const normalizeVendor = (raw: any): VendorProfile => {
    if (!raw) return {} as VendorProfile;
    const src = raw.data ?? raw;

    const pickArray = (val: any) => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      if (typeof val === "string") return val.split(",").map((s: string) => s.trim()).filter(Boolean);
      return [];
    };

    const addressFromSrc = () => {
      if (src.businessAddress) return src.businessAddress;
      if (src.addresses && Array.isArray(src.addresses) && src.addresses.length) {
        const a = src.addresses[0];
        return {
          streetAddress: a.addressLine1 || a.street || a.addressLine1 || "",
          city: a.city || a.town || "",
          state: a.state || "",
          postalCode: a.zipCode || a.postalCode || a.zip || "",
          country: a.country || "",
          latitude: a.latitude || a.lat,
          longitude: a.longitude || a.lng,
        };
      }
      return {};
    };

    const ownerFromSrc = () => {
      if (src.ownerInfo) return src.ownerInfo;
      return {
        firstName: src.ownerFirstName || src.owner_first_name || (src.ownerName ? String(src.ownerName).split(" ")[0] : "") || "",
        lastName: src.ownerLastName || src.owner_last_name || (src.ownerName ? String(src.ownerName).split(" ").slice(1).join(" ") : "") || "",
        phone: src.ownerPhone || src.owner_phone || src.ownerContact || "",
        email: src.ownerEmail || src.owner_email || src.owner_contact_email || "",
        idProofType: src.ownerIdProofType || src.idProofType || src.id_proof_type || "",
        idProofNumber: src.ownerIdProofNumber || src.idProofNumber || src.id_proof_number || "",
      };
    };

    return {
      // IDs
      id: src.id || src.vendorId || src.vendor_id,
      vendorId: src.vendorId || src.vendor_id || src.id,
      userId: src.userId || src.user_id,
      vendorOrganizationId: src.vendorOrganizationId || src.vendor_organization_id || src.vendorOrgId,
      
      // Registration Info
      registeredEmail: src.registeredEmail || src.registered_email,
      registeredPhone: src.registeredPhone || src.registered_phone,
      registeredEmailVerified: src.registeredEmailVerified ?? src.registered_email_verified ?? false,
      registeredPhoneVerified: src.registeredPhoneVerified ?? src.registered_phone_verified ?? false,
      
      // Business Contact
      businessName: src.businessName || src.business_name || src.name || src.businessTitle,
      businessEmail: src.businessEmail || src.business_email || src.email,
      businessPhone: src.businessPhone || src.business_phone || src.phone || src.mobile,
      businessEmailVerified: src.businessEmailVerified ?? src.business_email_verified ?? false,
      businessPhoneVerified: src.businessPhoneVerified ?? src.business_phone_verified ?? false,
      
      // Business Details
      businessType: src.businessType || src.business_type || src.type,
      businessRegistrationNumber: src.businessRegistrationNumber || src.registrationNumber || src.registration_number || src.bizRegNumber,
      taxId: src.taxId || src.tax_id || src.gst || src.pan,
      description: src.description || src.about || src.bio,
      establishedYear: src.establishedYear || src.established_year || src.yearEstablished,
      country: src.country || (src.businessAddress && src.businessAddress.country) || (src.addresses && src.addresses[0] && src.addresses[0].country),
      cuisinesOffered: pickArray(src.cuisinesOffered || src.cuisines || src.cuisine),
      specialties: pickArray(src.specialties || src.speciality || src.specializations),
      
      // Address
      businessAddress: addressFromSrc(),
      
      // Owner Info
      ownerInfo: ownerFromSrc(),
      
      // Service Areas
      serviceAreas: src.serviceAreas || src.service_areas || [],
      
      // Capacity & Pricing
      capacity: src.capacity || src.capabilities || {},
      pricing: src.pricing || src.price || {},
      
      // Ratings & Statistics
      ratings: src.ratings || {},
      stats: src.stats || {},
      
      // Status & Verification
      status: src.status,
      approvalStatus: src.approvalStatus || src.approval_status,
      verified: src.verified ?? false,
      featured: src.featured ?? false,
      
      // Documents
      documents: src.documents || src.docs || src.licenses || [],
      
      // Timestamps
      createdAt: src.createdAt || src.created_at,
      
      // Location Tracking
      profileUrl: src.profileUrl || src.profile_url || src.avatar || src.logoUrl || src.logo,
      isOnline: src.isOnline,
      lastSeenAt: src.lastSeenAt || src.last_seen_at,
      latitude: src.latitude || (src.businessAddress && src.businessAddress.latitude),
      longitude: src.longitude || (src.businessAddress && src.businessAddress.longitude),
      currentAddress: src.currentAddress || src.current_address,
      lastLocationUpdatedAt: src.lastLocationUpdatedAt || src.last_location_updated_at,
      
      // Legacy compatibility
      isEmailVerified: src.isEmailVerified ?? src.is_email_verified ?? src.businessEmailVerified ?? src.business_email_verified ?? false,
      isPhoneVerified: src.isPhoneVerified ?? src.is_phone_verified ?? src.businessPhoneVerified ?? src.business_phone_verified ?? false,
    } as VendorProfile;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use the new /api/v1/vendors/me endpoint
      const profileRaw = await api.getVendorMe();
      console.log("Profile.fetchData - getVendorMe raw response:", profileRaw);
      const normalized = normalizeVendor(profileRaw);
      console.log("Profile.fetchData - normalized vendor:", normalized);
      setVendorProfile(normalized);
      setFormData(normalized);
    } catch (err: any) {
      console.error("Profile.fetchData error:", err?.response?.status, err?.response?.data || err?.message || err);
      setError(err?.message || "Failed to load vendor profile");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const accessToken =
        localStorage.getItem("accessToken") ||
        localStorage.getItem("token") ||
        localStorage.getItem("authToken");

      if (accessToken) {
        try {
          const res = await fetch("http://localhost:8080/api/v1/auth/logout", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({}),
          });

          let payload: any = {};
          try {
            payload = await res.json();
          } catch (e) {
            // ignore parse errors
          }

          if (res.ok) {
            toast({
              title: "Logged out",
              description: payload?.message || "Logged out successfully",
            });
          } else {
            toast({
              title: "Logout failed",
              description: payload?.message || res.statusText || "Failed to logout",
              variant: "destructive",
            });
          }
        } catch (err: any) {
          toast({
            title: "Logout error",
            description: err?.message || "Failed to logout",
            variant: "destructive",
          });
        }
      }
    } finally {
      try {
        localStorage.clear();
      } catch (e) {}
      try {
        navigate("/", { replace: true });
        setTimeout(() => {
          if (window.location.pathname !== "/") window.location.href = "/";
        }, 150);
      } catch (e) {
        window.location.href = "/";
      }
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => prev ? { ...prev, [field]: value } : null);
  };

  const handleNestedChange = (parent: string, field: string, value: any) => {
    setFormData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        [parent]: { ...(prev[parent as keyof VendorProfile] as any || {}), [field]: value }
      };
    });
  };

  const handleArrayChange = (field: string, value: string) => {
    setFormData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        [field]: value.split(",").map(s => s.trim()).filter(Boolean)
      };
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const vendorId = formData?.id || localStorage.getItem("vendorId") || localStorage.getItem("id");
      
      if (!vendorId || !formData) {
        toast({
          title: "Error",
          description: "Vendor ID not found",
          variant: "destructive",
        });
        return;
      }

      // Prepare vendor update payload matching the backend structure
      const payload = {
        businessName: formData.businessName,
        businessEmail: formData.businessEmail,
        businessPhone: formData.businessPhone,
        businessType: formData.businessType,
        businessRegistrationNumber: formData.businessRegistrationNumber,
        taxId: formData.taxId,
        description: formData.description,
        establishedYear: formData.establishedYear,
        country: formData.country,
        cuisinesOffered: formData.cuisinesOffered || [],
        specialties: formData.specialties || [],
        businessAddress: formData.businessAddress,
        ownerInfo: formData.ownerInfo,
        serviceAreas: formData.serviceAreas || [],
        capacity: formData.capacity,
        pricing: formData.pricing,
        documents: formData.documents || [],
      };

      // Update vendor profile using v1 endpoint
      await api.updateVendorProfile(vendorId, payload);

      toast({
        title: "Success",
        description: "Your business profile has been successfully updated.",
      });
      setIsEditing(false);
      await fetchData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to save profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Send OTP for Email
  const handleSendEmailOtp = async () => {
    try {
      setSendingOtp(true);
      setVerificationType("business");
      const email = formData?.businessEmail;
      if (!email) {
        toast({
          title: "Error",
          description: "Business email not found",
          variant: "destructive",
        });
        return;
      }

      await api.sendOtp({ identifier: email, type: "EMAIL" });
      setShowEmailOtpDialog(true);
      toast({
        title: "Success",
        description: "OTP sent to your email address",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to send OTP",
        variant: "destructive",
      });
    } finally {
      setSendingOtp(false);
    }
  };

  // Send OTP for Registered Email
  const handleSendRegisteredEmailOtp = async () => {
    try {
      setSendingOtp(true);
      setVerificationType("registered");
      const email = formData?.registeredEmail;
      if (!email) {
        toast({
          title: "Error",
          description: "Registered email not found",
          variant: "destructive",
        });
        return;
      }

      await api.sendOtp({ identifier: email, type: "EMAIL" });
      setShowEmailOtpDialog(true);
      toast({
        title: "Success",
        description: "OTP sent to your registered email address",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to send OTP",
        variant: "destructive",
      });
    } finally {
      setSendingOtp(false);
    }
  };

  // Verify Email OTP
  const handleVerifyEmailOtp = async () => {
    try {
      setVerifyingOtp(true);
      const email = verificationType === "business" ? formData?.businessEmail : formData?.registeredEmail;
      if (!email || !emailOtp) {
        toast({
          title: "Error",
          description: "Please enter the OTP",
          variant: "destructive",
        });
        return;
      }

      await api.verifyOtp({ identifier: email, otp: emailOtp, type: "EMAIL" });
      toast({
        title: "Success",
        description: `${verificationType === "business" ? "Business" : "Registered"} email verified successfully`,
      });
      setShowEmailOtpDialog(false);
      setEmailOtp("");
      await fetchData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Invalid OTP",
        variant: "destructive",
      });
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Show Phone Channel Selection
  const handleInitiatePhoneVerification = () => {
    setVerificationType("business");
    const phone = formData?.businessPhone;
    if (!phone) {
      toast({
        title: "Error",
        description: "Business phone not found",
        variant: "destructive",
      });
      return;
    }
    setShowPhoneChannelDialog(true);
  };

  // Show Phone Channel Selection for Registered Phone
  const handleInitiateRegisteredPhoneVerification = () => {
    setVerificationType("registered");
    const phone = formData?.registeredPhone;
    if (!phone) {
      toast({
        title: "Error",
        description: "Registered phone not found",
        variant: "destructive",
      });
      return;
    }
    setShowPhoneChannelDialog(true);
  };

  // Send OTP for Phone
  const handleSendPhoneOtp = async () => {
    try {
      setSendingOtp(true);
      const phone = verificationType === "business" ? formData?.businessPhone : formData?.registeredPhone;
      if (!phone) {
        toast({
          title: "Error",
          description: `${verificationType === "business" ? "Business" : "Registered"} phone not found`,
          variant: "destructive",
        });
        return;
      }

      await api.sendOtp({ 
        identifier: phone, 
        type: "PHONE",
        channel: selectedPhoneChannel 
      });
      setShowPhoneChannelDialog(false);
      setShowPhoneOtpDialog(true);
      toast({
        title: "Success",
        description: `OTP sent via ${selectedPhoneChannel}`,
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to send OTP",
        variant: "destructive",
      });
    } finally {
      setSendingOtp(false);
    }
  };

  // Verify Phone OTP
  const handleVerifyPhoneOtp = async () => {
    try {
      setVerifyingOtp(true);
      const phone = verificationType === "business" ? formData?.businessPhone : formData?.registeredPhone;
      if (!phone || !phoneOtp) {
        toast({
          title: "Error",
          description: "Please enter the OTP",
          variant: "destructive",
        });
        return;
      }

      await api.verifyOtp({ identifier: phone, otp: phoneOtp, type: "PHONE" });
      toast({
        title: "Success",
        description: `${verificationType === "business" ? "Business" : "Registered"} phone verified successfully`,
      });
      setShowPhoneOtpDialog(false);
      setPhoneOtp("");
      await fetchData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Invalid OTP",
        variant: "destructive",
      });
    } finally {
      setVerifyingOtp(false);
    }
  };

  if (loading) {
    return (
      <div className="container px-3 sm:px-4 md:px-6 py-4 sm:py-6 flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm sm:text-base">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !formData) {
    return (
      <div className="container px-3 sm:px-4 md:px-6 py-4 sm:py-6">
        <div className="text-center">
          <p className="text-red-500 mb-4 text-sm sm:text-base">{error || "No profile data available"}</p>
          <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  const primaryAddress = formData?.businessAddress || {};
  const businessName = formData?.businessName || "Your Business";
  const ownerName = formData?.ownerInfo ? `${formData.ownerInfo.firstName || ""} ${formData.ownerInfo.lastName || ""}`.trim() : "Owner";
  const businessEmail = formData?.businessEmail || "";
  const businessPhone = formData?.businessPhone || "";
  const description = formData?.description || "";
  const establishedYear = formData?.establishedYear || "";
  const profileUrl = vendorProfile?.profileUrl || localStorage.getItem("profileUrl") || undefined;

  const cuisinesOffered = formData?.cuisinesOffered?.join(", ") || "";
  const specialties = formData?.specialties?.join(", ") || "";
  const minGuests = formData?.capacity?.minGuests || "";
  const maxGuests = formData?.capacity?.maxGuests || "";
  const startingPrice = formData?.pricing?.startingPricePerPlate || "";
  const avgPrice = formData?.pricing?.averagePricePerPlate || "";

  return (
    <div className="container px-3 sm:px-4 md:px-6 py-4 sm:py-6">
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">Business Profile</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Manage your catering business information</p>
        </div>
        {!isEditing ? (
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <Button onClick={() => setIsEditing(true)} className="flex-1 sm:flex-none h-10 sm:h-11">Edit Profile</Button>
            <Button variant="ghost" onClick={handleLogout} className="flex-1 sm:flex-none h-10 sm:h-11">Logout</Button>
          </div>
        ) : (
          <div className="flex gap-2 flex-wrap w-full sm:w-auto">
            <Button variant="outline" onClick={() => { setIsEditing(false); setFormData(vendorProfile); }} className="flex-1 sm:flex-none h-10 sm:h-11">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1 sm:flex-none h-10 sm:h-11">
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : "Save Changes"}
            </Button>
            <Button variant="ghost" onClick={handleLogout} className="h-10 sm:h-11 w-full sm:w-auto">Logout</Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Profile Picture & Basic Info */}
        <Card className="lg:col-span-1">
          <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
            <div className="flex flex-col items-center space-y-3 sm:space-y-4">
              <div className="relative">
                <Avatar className="h-24 w-24 sm:h-32 sm:w-32">
                  <AvatarImage src={profileUrl} />
                  <AvatarFallback className="text-lg sm:text-2xl">{businessName.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                {isEditing && (
                  <Button
                    size="icon"
                    className="absolute bottom-0 right-0 h-7 w-7 sm:h-8 sm:w-8 rounded-full"
                  >
                    <Camera className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                )}
              </div>
              <div className="text-center">
                <h3 className="text-lg sm:text-xl font-bold">{businessName}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Premium Catering Provider</p>
                <div className="mt-2 flex justify-center gap-0.5 sm:gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className="text-yellow-400 text-base sm:text-lg">
                      ★
                    </span>
                  ))}
                  <span className="ml-1 text-xs sm:text-sm text-muted-foreground">(4.8)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Details */}
        <Card className="lg:col-span-2">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
            <CardTitle className="text-lg sm:text-xl">Business Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">Business Name</Label>
                <Input
                  value={formData?.businessName || ""}
                  onChange={(e) => handleChange("businessName", e.target.value)}
                  disabled={!isEditing}
                  className="h-10 sm:h-11"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">Business Type</Label>
                <Input 
                  value={formData?.businessType || ""} 
                  onChange={(e) => handleChange("businessType", e.target.value)}
                  disabled={!isEditing}
                  className="h-10 sm:h-11"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Business Phone
                  {formData?.isPhoneVerified ? (
                    <Badge variant="default" className="ml-2 bg-green-500 hover:bg-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="ml-2">
                      <XCircle className="h-3 w-3 mr-1" />
                      Not Verified
                    </Badge>
                  )}
                </Label>
                <div className="flex gap-2">
                  <Input 
                    value={formData?.businessPhone || ""} 
                    onChange={(e) => handleChange("businessPhone", e.target.value)}
                    disabled={!isEditing}
                    className="h-10 sm:h-11 flex-1"
                  />
                  {!formData?.isPhoneVerified && formData?.businessPhone && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleInitiatePhoneVerification}
                      disabled={isEditing}
                      className="h-10 sm:h-11 whitespace-nowrap"
                    >
                      <Shield className="h-4 w-4 mr-1" />
                      Verify
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Business Email
                  {formData?.isEmailVerified ? (
                    <Badge variant="default" className="ml-2 bg-green-500 hover:bg-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="ml-2">
                      <XCircle className="h-3 w-3 mr-1" />
                      Not Verified
                    </Badge>
                  )}
                </Label>
                <div className="flex gap-2">
                  <Input 
                    value={formData?.businessEmail || ""} 
                    onChange={(e) => handleChange("businessEmail", e.target.value)}
                    disabled={!isEditing}
                    className="h-10 sm:h-11 flex-1"
                  />
                  {!formData?.isEmailVerified && formData?.businessEmail && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSendEmailOtp}
                      disabled={sendingOtp || isEditing}
                      className="h-10 sm:h-11 whitespace-nowrap"
                    >
                      {sendingOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4 mr-1" />}
                      Verify
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">Registration Number</Label>
                <Input 
                  value={formData?.businessRegistrationNumber || ""} 
                  onChange={(e) => handleChange("businessRegistrationNumber", e.target.value)}
                  disabled={!isEditing}
                  className="h-10 sm:h-11"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">Tax ID</Label>
                <Input 
                  value={formData?.taxId || ""} 
                  onChange={(e) => handleChange("taxId", e.target.value)}
                  disabled={!isEditing}
                  className="h-10 sm:h-11"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">Established Year</Label>
                <Input 
                  type="number"
                  value={formData?.establishedYear || ""} 
                  onChange={(e) => handleChange("establishedYear", parseInt(e.target.value) || 0)}
                  disabled={!isEditing}
                  className="h-10 sm:h-11"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">Country</Label>
                <Input 
                  value={formData?.country || ""} 
                  onChange={(e) => handleChange("country", e.target.value)}
                  disabled={!isEditing}
                  className="h-10 sm:h-11"
                />
              </div>
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-sm sm:text-base">
                <MapPin className="mr-1.5 sm:mr-2 inline h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Street Address
              </Label>
              <Input
                value={primaryAddress?.streetAddress || ""}
                onChange={(e) => handleNestedChange("businessAddress", "streetAddress", e.target.value)}
                disabled={!isEditing}
                className="h-10 sm:h-11"
              />
            </div>
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">City</Label>
                <Input
                  value={primaryAddress?.city || ""}
                  onChange={(e) => handleNestedChange("businessAddress", "city", e.target.value)}
                  disabled={!isEditing}
                  className="h-10 sm:h-11"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">State</Label>
                <Input
                  value={primaryAddress?.state || ""}
                  onChange={(e) => handleNestedChange("businessAddress", "state", e.target.value)}
                  disabled={!isEditing}
                  className="h-10 sm:h-11"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">Postal Code</Label>
                <Input
                  value={primaryAddress?.postalCode || ""}
                  onChange={(e) => handleNestedChange("businessAddress", "postalCode", e.target.value)}
                  disabled={!isEditing}
                  className="h-10 sm:h-11"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">Address Country</Label>
                <Input
                  value={primaryAddress?.country || ""}
                  onChange={(e) => handleNestedChange("businessAddress", "country", e.target.value)}
                  disabled={!isEditing}
                  className="h-10 sm:h-11"
                />
              </div>
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-sm sm:text-base">Business Description</Label>
              <Textarea
                value={formData?.description || ""}
                onChange={(e) => handleChange("description", e.target.value)}
                disabled={!isEditing}
                rows={4}
                className="min-h-[100px] sm:min-h-[120px] text-sm sm:text-base"
              />
            </div>
          </CardContent>
        </Card>

        {/* Registration Information */}
        <Card className="lg:col-span-3">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
            <CardTitle className="text-lg sm:text-xl">Account & Registration Information</CardTitle>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Original contact details and account verification status (read-only)</p>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">Account Created</Label>
                <Input
                  value={formData?.createdAt ? new Date(formData.createdAt).toLocaleDateString() : "N/A"}
                  disabled
                  className="h-10 sm:h-11 bg-muted"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base flex items-center gap-2">
                  Registered Email
                  {formData?.registeredEmailVerified ? (
                    <Badge variant="default" className="text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Verified</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs"><XCircle className="h-3 w-3 mr-1" />Not Verified</Badge>
                  )}
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={formData?.registeredEmail || "N/A"}
                    disabled
                    className="h-10 sm:h-11 bg-muted flex-1"
                  />
                  {!formData?.registeredEmailVerified && formData?.registeredEmail && formData.registeredEmail !== "N/A" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendRegisteredEmailOtp()}
                      disabled={sendingOtp}
                      className="h-10 sm:h-11 whitespace-nowrap"
                    >
                      {sendingOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4 mr-1" />}
                      Verify
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base flex items-center gap-2">
                  Registered Phone
                  {formData?.registeredPhoneVerified ? (
                    <Badge variant="default" className="text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Verified</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs"><XCircle className="h-3 w-3 mr-1" />Not Verified</Badge>
                  )}
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={formData?.registeredPhone || "N/A"}
                    disabled
                    className="h-10 sm:h-11 bg-muted flex-1"
                  />
                  {!formData?.registeredPhoneVerified && formData?.registeredPhone && formData.registeredPhone !== "N/A" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleInitiateRegisteredPhoneVerification()}
                      disabled={sendingOtp}
                      className="h-10 sm:h-11 whitespace-nowrap"
                    >
                      {sendingOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4 mr-1" />}
                      Verify
                    </Button>
                  )}
                </div>
              </div>
              <div className="sm:col-span-3 flex gap-3 items-center flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Registered Email Verified:</span>
                  {formData?.registeredEmailVerified ? (
                    <Badge variant="default" className="text-sm flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" /> Yes
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-sm flex items-center gap-1">
                      <XCircle className="h-4 w-4" /> No
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Registered Phone Verified:</span>
                  {formData?.registeredPhoneVerified ? (
                    <Badge variant="default" className="text-sm flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" /> Yes
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-sm flex items-center gap-1">
                      <XCircle className="h-4 w-4" /> No
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Owner Information */}
        <Card className="lg:col-span-3">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
            <CardTitle className="text-lg sm:text-xl">Owner Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">Owner First Name</Label>
                <Input
                  value={formData?.ownerInfo?.firstName || ""}
                  onChange={(e) => handleNestedChange("ownerInfo", "firstName", e.target.value)}
                  disabled={!isEditing}
                  className="h-10 sm:h-11"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">Owner Last Name</Label>
                <Input
                  value={formData?.ownerInfo?.lastName || ""}
                  onChange={(e) => handleNestedChange("ownerInfo", "lastName", e.target.value)}
                  disabled={!isEditing}
                  className="h-10 sm:h-11"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">Owner Phone</Label>
                <Input
                  value={formData?.ownerInfo?.phone || ""}
                  onChange={(e) => handleNestedChange("ownerInfo", "phone", e.target.value)}
                  disabled={!isEditing}
                  className="h-10 sm:h-11"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">Owner Email</Label>
                <Input
                  value={formData?.ownerInfo?.email || ""}
                  onChange={(e) => handleNestedChange("ownerInfo", "email", e.target.value)}
                  disabled={!isEditing}
                  className="h-10 sm:h-11"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">ID Proof Type</Label>
                <Input
                  value={formData?.ownerInfo?.idProofType || ""}
                  onChange={(e) => handleNestedChange("ownerInfo", "idProofType", e.target.value)}
                  disabled={!isEditing}
                  className="h-10 sm:h-11"
                  placeholder="DRIVING_LICENSE, AADHAAR, etc."
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">ID Proof Number</Label>
                <Input
                  value={formData?.ownerInfo?.idProofNumber || ""}
                  onChange={(e) => handleNestedChange("ownerInfo", "idProofNumber", e.target.value)}
                  disabled={!isEditing}
                  className="h-10 sm:h-11"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Service Details */}
        <Card className="lg:col-span-3">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
            <CardTitle className="text-lg sm:text-xl">Service & Pricing Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">Cuisines Offered (comma-separated)</Label>
                <Input
                  value={cuisinesOffered}
                  onChange={(e) => handleArrayChange("cuisinesOffered", e.target.value)}
                  disabled={!isEditing}
                  className="h-10 sm:h-11"
                  placeholder="American, Italian, BBQ"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">Specialties (comma-separated)</Label>
                <Input
                  value={specialties}
                  onChange={(e) => handleArrayChange("specialties", e.target.value)}
                  disabled={!isEditing}
                  className="h-10 sm:h-11"
                  placeholder="Weddings, Corporate Events"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">Minimum Guests</Label>
                <Input 
                  type="number"
                  value={minGuests} 
                  onChange={(e) => handleNestedChange("capacity", "minGuests", parseInt(e.target.value) || 0)}
                  disabled={!isEditing}
                  className="h-10 sm:h-11"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">Maximum Guests</Label>
                <Input 
                  type="number"
                  value={maxGuests} 
                  onChange={(e) => handleNestedChange("capacity", "maxGuests", parseInt(e.target.value) || 0)}
                  disabled={!isEditing}
                  className="h-10 sm:h-11"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">Starting Price (per plate)</Label>
                <Input 
                  type="number"
                  step="0.01"
                  value={startingPrice} 
                  onChange={(e) => handleNestedChange("pricing", "startingPricePerPlate", parseFloat(e.target.value) || 0)}
                  disabled={!isEditing}
                  className="h-10 sm:h-11"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">Average Price (per plate)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={avgPrice}
                  onChange={(e) => handleNestedChange("pricing", "averagePricePerPlate", parseFloat(e.target.value) || 0)}
                  disabled={!isEditing}
                  className="h-10 sm:h-11"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">Currency</Label>
                <Input
                  value={formData?.pricing?.currency || ""}
                  onChange={(e) => handleNestedChange("pricing", "currency", e.target.value)}
                  disabled={!isEditing}
                  className="h-10 sm:h-11"
                  placeholder="USD, INR, etc."
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">Concurrent Events</Label>
                <Input
                  type="number"
                  value={formData?.capacity?.concurrentEvents || ""}
                  onChange={(e) => handleNestedChange("capacity", "concurrentEvents", parseInt(e.target.value) || 0)}
                  disabled={!isEditing}
                  className="h-10 sm:h-11"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status & Verification */}
        <Card className="lg:col-span-3">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
            <CardTitle className="text-lg sm:text-xl">Status & Verification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">Account Status</Label>
                <div className="flex items-center gap-2 h-10 sm:h-11">
                  <Badge variant={formData?.status === "ACTIVE" ? "default" : "secondary"} className="text-sm">
                    {formData?.status || "N/A"}
                  </Badge>
                </div>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">Approval Status</Label>
                <div className="flex items-center gap-2 h-10 sm:h-11">
                  <Badge 
                    variant={
                      formData?.approvalStatus === "APPROVED" ? "default" : 
                      formData?.approvalStatus === "PENDING" ? "secondary" : 
                      "destructive"
                    } 
                    className="text-sm"
                  >
                    {formData?.approvalStatus || "N/A"}
                  </Badge>
                </div>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">Verified</Label>
                <div className="flex items-center gap-2 h-10 sm:h-11">
                  {formData?.verified ? (
                    <Badge variant="default" className="text-sm flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Verified
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-sm flex items-center gap-1">
                      <XCircle className="h-3 w-3" /> Not Verified
                    </Badge>
                  )}
                </div>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">Featured</Label>
                <div className="flex items-center gap-2 h-10 sm:h-11">
                  <Badge variant={formData?.featured ? "default" : "secondary"} className="text-sm">
                    {formData?.featured ? "Yes" : "No"}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ratings & Statistics */}
        <Card className="lg:col-span-3">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
            <CardTitle className="text-lg sm:text-xl">Ratings & Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">Average Rating</Label>
                <Input
                  value={formData?.ratings?.averageRating?.toFixed(1) || "0.0"}
                  disabled
                  className="h-10 sm:h-11 bg-muted"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">Total Reviews</Label>
                <Input
                  value={formData?.ratings?.totalReviews || "0"}
                  disabled
                  className="h-10 sm:h-11 bg-muted"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">Total Orders</Label>
                <Input
                  value={formData?.stats?.totalOrders || "0"}
                  disabled
                  className="h-10 sm:h-11 bg-muted"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">Completed Orders</Label>
                <Input
                  value={formData?.stats?.completedOrders || "0"}
                  disabled
                  className="h-10 sm:h-11 bg-muted"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service Areas */}
      <Card className="mt-4 sm:mt-6">
        <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
          <CardTitle className="text-lg sm:text-xl">Service Areas</CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          {formData?.serviceAreas && formData.serviceAreas.length > 0 ? (
            <div className="space-y-3">
              {formData.serviceAreas.map((area, idx) => (
                <div key={idx} className="p-3 border rounded-lg bg-gray-50">
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="font-semibold">City:</span> {area.city || "N/A"}
                    </div>
                    <div>
                      <span className="font-semibold">State:</span> {area.state || "N/A"}
                    </div>
                    <div>
                      <span className="font-semibold">Radius:</span> {area.radiusKm || 0} km
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No service areas defined</p>
          )}
        </CardContent>
      </Card>

      {/* Documents */}
      <Card className="mt-4 sm:mt-6">
        <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
          <CardTitle className="text-lg sm:text-xl">Documents</CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
          {formData?.documents && formData.documents.length > 0 ? (
            <div className="space-y-3">
              {formData.documents.map((doc, idx) => (
                <div key={doc.documentId || idx} className="p-4 border rounded-lg bg-gray-50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="font-semibold">Type:</span> {doc.documentType || "N/A"}
                    </div>
                    <div>
                      <span className="font-semibold">Name:</span> {doc.documentName || "N/A"}
                    </div>
                    <div>
                      <span className="font-semibold">Number:</span> {doc.documentNumber || "N/A"}
                    </div>
                    <div>
                      <span className="font-semibold">Issue Date:</span> {doc.issueDate ? new Date(doc.issueDate).toLocaleDateString() : "N/A"}
                    </div>
                    {doc.expiryDate && (
                      <div>
                        <span className="font-semibold">Expiry Date:</span> {new Date(doc.expiryDate).toLocaleDateString()}
                      </div>
                    )}
                    {doc.verificationStatus && (
                      <div>
                        <span className="font-semibold">Status:</span>{" "}
                        <Badge 
                          variant={
                            doc.verificationStatus === "VERIFIED" ? "default" : 
                            doc.verificationStatus === "PENDING" ? "secondary" : 
                            "destructive"
                          }
                          className="text-xs"
                        >
                          {doc.verificationStatus}
                        </Badge>
                      </div>
                    )}
                    {doc.uploadedAt && (
                      <div>
                        <span className="font-semibold">Uploaded:</span> {new Date(doc.uploadedAt).toLocaleDateString()}
                      </div>
                    )}
                    {doc.documentUrl && (
                      <div className="lg:col-span-3">
                        <a href={doc.documentUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                          View Document →
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No documents uploaded</p>
          )}
        </CardContent>
      </Card>

      {/* Location Tracking Section */}
      <div className="mt-4 sm:mt-6">
        <LocationTracker 
          vendorId={vendorProfile?.id || localStorage.getItem("vendorId") || null}
          currentLatitude={vendorProfile?.latitude}
          currentLongitude={vendorProfile?.longitude}
          currentAddress={vendorProfile?.currentAddress}
          lastUpdated={vendorProfile?.lastLocationUpdatedAt}
          onLocationUpdated={fetchData}
        />
      </div>

      {/* Email OTP Verification Dialog */}
      <Dialog open={showEmailOtpDialog} onOpenChange={setShowEmailOtpDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Verify Email Address
            </DialogTitle>
            <DialogDescription>
              Enter the OTP sent to {formData?.businessEmail}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="emailOtp">OTP Code</Label>
              <Input
                id="emailOtp"
                value={emailOtp}
                onChange={(e) => setEmailOtp(e.target.value)}
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                className="text-center text-lg tracking-widest"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowEmailOtpDialog(false);
                setEmailOtp("");
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleVerifyEmailOtp}
              disabled={verifyingOtp || emailOtp.length !== 6}
              className="w-full sm:w-auto"
            >
              {verifyingOtp ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify Email"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Phone Channel Selection Dialog */}
      <Dialog open={showPhoneChannelDialog} onOpenChange={setShowPhoneChannelDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Select Verification Method
            </DialogTitle>
            <DialogDescription>
              How would you like to receive the OTP for {formData?.businessPhone}?
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <Button
              variant={selectedPhoneChannel === "WHATSAPP" ? "default" : "outline"}
              onClick={() => setSelectedPhoneChannel("WHATSAPP")}
              className="h-24 flex flex-col gap-2"
            >
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              WhatsApp
            </Button>
            <Button
              variant={selectedPhoneChannel === "SMS" ? "default" : "outline"}
              onClick={() => setSelectedPhoneChannel("SMS")}
              className="h-24 flex flex-col gap-2"
            >
              <Phone className="h-8 w-8" />
              SMS
            </Button>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPhoneChannelDialog(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendPhoneOtp}
              disabled={sendingOtp}
              className="w-full sm:w-auto"
            >
              {sendingOtp ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send OTP"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Phone OTP Verification Dialog */}
      <Dialog open={showPhoneOtpDialog} onOpenChange={setShowPhoneOtpDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Verify Phone Number
            </DialogTitle>
            <DialogDescription>
              Enter the OTP sent to {formData?.businessPhone} via {selectedPhoneChannel}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="phoneOtp">OTP Code</Label>
              <Input
                id="phoneOtp"
                value={phoneOtp}
                onChange={(e) => setPhoneOtp(e.target.value)}
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                className="text-center text-lg tracking-widest"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowPhoneOtpDialog(false);
                setPhoneOtp("");
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleVerifyPhoneOtp}
              disabled={verifyingOtp || phoneOtp.length !== 6}
              className="w-full sm:w-auto"
            >
              {verifyingOtp ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify Phone"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
