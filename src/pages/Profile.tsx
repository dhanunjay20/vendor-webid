import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, MapPin, Phone, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LocationTracker } from "@/components/LocationTracker";
import { toast } from "@/hooks/use-toast";
import * as api from "@/lib/api";

interface VendorProfile {
  id?: string;
  vendorOrganizationId?: string;
  businessName?: string;
  businessEmail?: string;
  businessPhone?: string;
  businessType?: string;
  businessRegistrationNumber?: string;
  taxId?: string;
  description?: string;
  establishedYear?: number;
  country?: string;
  cuisinesOffered?: string[];
  specialties?: string[];
  businessAddress?: {
    streetAddress?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  };
  ownerInfo?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    idProofType?: string;
    idProofNumber?: string;
  };
  serviceAreas?: Array<{
    city?: string;
    state?: string;
    radiusKm?: number;
  }>;
  capacity?: {
    minGuests?: number;
    maxGuests?: number;
    concurrentEvents?: number;
  };
  pricing?: {
    currency?: string;
    startingPricePerPlate?: number;
    averagePricePerPlate?: number;
  };
  documents?: Array<{
    documentType?: string;
    documentName?: string;
    documentUrl?: string;
    documentNumber?: string;
    issueDate?: string;
    expiryDate?: string;
  }>;
  profileUrl?: string;
  isOnline?: boolean;
  lastSeenAt?: string;
  latitude?: number;
  longitude?: number;
  currentAddress?: string;
  lastLocationUpdatedAt?: string;
}

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vendorProfile, setVendorProfile] = useState<VendorProfile | null>(null);
  const [formData, setFormData] = useState<VendorProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      id: src.id || src.vendorId || src.vendor_id,
      vendorOrganizationId: src.vendorOrganizationId || src.vendor_organization_id || src.vendorOrgId,
      businessName: src.businessName || src.business_name || src.name || src.businessTitle,
      businessEmail: src.businessEmail || src.business_email || src.email,
      businessPhone: src.businessPhone || src.business_phone || src.phone || src.mobile,
      businessType: src.businessType || src.business_type || src.type,
      businessRegistrationNumber: src.businessRegistrationNumber || src.registrationNumber || src.registration_number || src.bizRegNumber,
      taxId: src.taxId || src.tax_id || src.gst || src.pan,
      description: src.description || src.about || src.bio,
      establishedYear: src.establishedYear || src.established_year || src.yearEstablished,
      country: src.country || (src.businessAddress && src.businessAddress.country) || (src.addresses && src.addresses[0] && src.addresses[0].country),
      cuisinesOffered: pickArray(src.cuisinesOffered || src.cuisines || src.cuisine),
      specialties: pickArray(src.specialties || src.speciality || src.specializations),
      businessAddress: addressFromSrc(),
      ownerInfo: ownerFromSrc(),
      serviceAreas: src.serviceAreas || src.service_areas || [],
      capacity: src.capacity || src.capabilities || {},
      pricing: src.pricing || src.price || {},
      documents: src.documents || src.docs || src.licenses || [],
      profileUrl: src.profileUrl || src.profile_url || src.avatar || src.logoUrl || src.logo,
      isOnline: src.isOnline,
      lastSeenAt: src.lastSeenAt || src.last_seen_at,
      latitude: src.latitude || (src.businessAddress && src.businessAddress.latitude),
      longitude: src.longitude || (src.businessAddress && src.businessAddress.longitude),
      currentAddress: src.currentAddress || src.current_address,
      lastLocationUpdatedAt: src.lastLocationUpdatedAt || src.last_location_updated_at,
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

  const handleLogout = () => {
    try {
      localStorage.clear();
    } catch (e) {
    }
    try {
      navigate("/", { replace: true });
      setTimeout(() => {
        if (window.location.pathname !== "/") window.location.href = "/";
      }, 150);
    } catch (e) {
      window.location.href = "/";
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
                <Label className="text-sm sm:text-base">
                  <Phone className="mr-1.5 sm:mr-2 inline h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Business Phone
                </Label>
                <Input 
                  value={formData?.businessPhone || ""} 
                  onChange={(e) => handleChange("businessPhone", e.target.value)}
                  disabled={!isEditing}
                  className="h-10 sm:h-11"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">
                  <Mail className="mr-1.5 sm:mr-2 inline h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Business Email
                </Label>
                <Input 
                  value={formData?.businessEmail || ""} 
                  onChange={(e) => handleChange("businessEmail", e.target.value)}
                  disabled={!isEditing}
                  className="h-10 sm:h-11"
                />
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
                <div key={idx} className="p-4 border rounded-lg bg-gray-50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
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
                    {doc.documentUrl && (
                      <div className="sm:col-span-2">
                        <a href={doc.documentUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
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
    </div>
  );
}
