import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, MapPin, Phone, Mail, Globe, Loader2 } from "lucide-react";
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
  contactName?: string;
  email?: string;
  mobile?: string;
  addresses?: Array<{
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  }>;
  website?: string;
  yearsInBusiness?: number;
  aboutBusiness?: string;
  profileUrl?: string;
  isOnline?: boolean;
  lastSeenAt?: string;
  latitude?: number;
  longitude?: number;
  currentAddress?: string;
  lastLocationUpdatedAt?: string;
}

interface ServiceDetails {
  id?: string;
  vendorId?: string;
  cuisineSpecialties?: string[];
  dietaryOptions?: string[];
  serviceTypes?: string[];
  maximumCapacity?: number;
  serviceArea?: string[];
  startingPricePerPerson?: number;
  specialServices?: string[];
}

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vendorProfile, setVendorProfile] = useState<VendorProfile | null>(null);
  const [serviceDetails, setServiceDetails] = useState<ServiceDetails | null>(null);
  const [formData, setFormData] = useState<VendorProfile | null>(null);
  const [serviceFormData, setServiceFormData] = useState<ServiceDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch vendor profile on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const vendorOrgId = localStorage.getItem("vendorOrganizationId");
      const vendorId = localStorage.getItem("vendorId") || localStorage.getItem("id");
      
      if (!vendorOrgId) {
        setError("No vendor organization ID found");
        setLoading(false);
        return;
      }
      const profile = await api.getVendorProfile(vendorOrgId);
      setVendorProfile(profile);
      setFormData(profile);
      
      // Fetch service details if vendorId is available
      if (vendorId) {
        try {
          const details = await api.getServiceDetailsByVendorId(vendorId);
          setServiceDetails(details);
          setServiceFormData(details);
        } catch (err: any) {
          // Service details are optional - if not found (404), just continue
          if (err?.status === 404) {
            // Service details not found - vendor may be new; initialize defaults
            // Initialize empty service details
            setServiceDetails(null);
            setServiceFormData({
              cuisineSpecialties: [],
              dietaryOptions: [],
              serviceTypes: [],
              maximumCapacity: 0,
              serviceArea: [],
              startingPricePerPerson: 0,
              specialServices: [],
            });
          } else {
          }
        }
      }
    } catch (err: any) {
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

  const handleServiceChange = (field: string, value: any) => {
    setServiceFormData((prev) => prev ? { ...prev, [field]: value } : null);
  };

  const handleAddressChange = (index: number, field: string, value: string) => {
    if (!formData) return;
    const newAddresses = [...(formData.addresses || [])];
    if (!newAddresses[index]) {
      newAddresses[index] = {};
    }
    newAddresses[index] = { ...newAddresses[index], [field]: value };
    setFormData({ ...formData, addresses: newAddresses });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const vendorId = localStorage.getItem("vendorId") || localStorage.getItem("id");
      const vendorOrgId = localStorage.getItem("vendorOrganizationId");
      
      if (!vendorId || !formData) {
        toast({
          title: "Error",
          description: "Vendor ID not found",
          variant: "destructive",
        });
        return;
      }
      // Prepare vendor update payload
      const vendorPayload = {
        businessName: formData.businessName,
        contactName: formData.contactName,
        email: formData.email,
        mobile: formData.mobile,
        addresses: formData.addresses || [],
        website: formData.website,
        yearsInBusiness: formData.yearsInBusiness,
        aboutBusiness: formData.aboutBusiness,
      };
      // Update vendor profile
      await api.updateVendorProfile(vendorId, vendorPayload);
      // Update service details if available
      if (serviceFormData && (serviceFormData.cuisineSpecialties?.length || serviceFormData.serviceTypes?.length)) {
        try {
          const servicePayload = {
            vendorId,
            vendorOrganizationId: vendorOrgId,
            cuisineSpecialties: serviceFormData.cuisineSpecialties?.filter(Boolean) || [],
            dietaryOptions: serviceFormData.dietaryOptions?.filter(Boolean) || [],
            serviceTypes: serviceFormData.serviceTypes?.filter(Boolean) || [],
            maximumCapacity: serviceFormData.maximumCapacity || 0,
            serviceArea: serviceFormData.serviceArea?.filter(Boolean) || [],
            startingPricePerPerson: serviceFormData.startingPricePerPerson || 0,
            specialServices: serviceFormData.specialServices?.filter(Boolean) || [],
          };
          await api.createOrUpdateServiceDetails(vendorId, servicePayload);
        } catch (err: any) {
          // Service details update failure is non-critical
          // Profile was already updated successfully
        }
      } else {
      }

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

  const primaryAddress = formData?.addresses?.[0] || {};
  const businessName = formData?.businessName || "Your Business";
  const contactName = formData?.contactName || "Contact Person";
  const email = formData?.email || "";
  const mobile = formData?.mobile || "";
  const website = formData?.website || "";
  const aboutBusiness = formData?.aboutBusiness || "";
  const yearsInBusiness = formData?.yearsInBusiness || "";
  const profileUrl = vendorProfile?.profileUrl || localStorage.getItem("profileUrl") || undefined;

  const cuisineSpecialties = serviceFormData?.cuisineSpecialties?.join(", ") || "";
  const serviceTypes = serviceFormData?.serviceTypes?.join(", ") || "";
  const maxCapacity = serviceFormData?.maximumCapacity || "";
  const serviceArea = serviceFormData?.serviceArea?.join(", ") || "";
  const startingPrice = serviceFormData?.startingPricePerPerson || "";
  const dietaryOptions = serviceFormData?.dietaryOptions?.join(", ") || "";
  const specialServices = serviceFormData?.specialServices?.join(", ") || "";

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
            <Button variant="outline" onClick={() => { setIsEditing(false); setFormData(vendorProfile); setServiceFormData(serviceDetails); }} className="flex-1 sm:flex-none h-10 sm:h-11">
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
                <Label className="text-sm sm:text-base">Contact Person</Label>
                <Input 
                  value={formData?.contactName || ""} 
                  onChange={(e) => handleChange("contactName", e.target.value)}
                  disabled={!isEditing}
                  className="h-10 sm:h-11"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">
                  <Phone className="mr-1.5 sm:mr-2 inline h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Phone Number
                </Label>
                <Input 
                  value={formData?.mobile || ""} 
                  onChange={(e) => handleChange("mobile", e.target.value)}
                  disabled={!isEditing}
                  className="h-10 sm:h-11"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">
                  <Mail className="mr-1.5 sm:mr-2 inline h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Email Address
                </Label>
                <Input 
                  value={formData?.email || ""} 
                  onChange={(e) => handleChange("email", e.target.value)}
                  disabled={!isEditing}
                  className="h-10 sm:h-11"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">
                  <Globe className="mr-1.5 sm:mr-2 inline h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Website
                </Label>
                <Input 
                  value={formData?.website || ""} 
                  onChange={(e) => handleChange("website", e.target.value)}
                  disabled={!isEditing}
                  className="h-10 sm:h-11"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">Years in Business</Label>
                <Input 
                  type="number"
                  value={formData?.yearsInBusiness || ""} 
                  onChange={(e) => handleChange("yearsInBusiness", parseInt(e.target.value) || 0)}
                  disabled={!isEditing}
                  className="h-10 sm:h-11"
                />
              </div>
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-sm sm:text-base">
                <MapPin className="mr-1.5 sm:mr-2 inline h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Business Address Line 1
              </Label>
              <Input
                value={primaryAddress?.addressLine1 || ""}
                onChange={(e) => handleAddressChange(0, "addressLine1", e.target.value)}
                disabled={!isEditing}
                className="h-10 sm:h-11"
              />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-sm sm:text-base">Business Address Line 2</Label>
              <Input
                value={primaryAddress?.addressLine2 || ""}
                onChange={(e) => handleAddressChange(0, "addressLine2", e.target.value)}
                disabled={!isEditing}
                className="h-10 sm:h-11"
              />
            </div>
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">City</Label>
                <Input
                  value={primaryAddress?.city || ""}
                  onChange={(e) => handleAddressChange(0, "city", e.target.value)}
                  disabled={!isEditing}
                  className="h-10 sm:h-11"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">State</Label>
                <Input
                  value={primaryAddress?.state || ""}
                  onChange={(e) => handleAddressChange(0, "state", e.target.value)}
                  disabled={!isEditing}
                  className="h-10 sm:h-11"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">Country</Label>
                <Input
                  value={primaryAddress?.country || ""}
                  onChange={(e) => handleAddressChange(0, "country", e.target.value)}
                  disabled={!isEditing}
                  className="h-10 sm:h-11"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">ZIP Code</Label>
                <Input
                  value={primaryAddress?.zipCode || ""}
                  onChange={(e) => handleAddressChange(0, "zipCode", e.target.value)}
                  disabled={!isEditing}
                  className="h-10 sm:h-11"
                />
              </div>
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-sm sm:text-base">About Your Business</Label>
              <Textarea
                value={formData?.aboutBusiness || ""}
                onChange={(e) => handleChange("aboutBusiness", e.target.value)}
                disabled={!isEditing}
                rows={4}
                className="min-h-[100px] sm:min-h-[120px] text-sm sm:text-base"
              />
            </div>
          </CardContent>
        </Card>

        {/* Service Details */}
        <Card className="lg:col-span-3">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
            <CardTitle className="text-lg sm:text-xl">Service Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">Cuisine Specialties (comma-separated)</Label>
                <Input
                  value={cuisineSpecialties}
                  onChange={(e) => handleServiceChange("cuisineSpecialties", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                  disabled={!isEditing}
                  className="h-10 sm:h-11"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">Service Types (comma-separated)</Label>
                <Input
                  value={serviceTypes}
                  onChange={(e) => handleServiceChange("serviceTypes", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                  disabled={!isEditing}
                  className="h-10 sm:h-11"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">Maximum Capacity</Label>
                <Input 
                  type="number"
                  value={maxCapacity} 
                  onChange={(e) => handleServiceChange("maximumCapacity", parseInt(e.target.value) || 0)}
                  disabled={!isEditing}
                  className="h-10 sm:h-11"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">Service Area (comma-separated)</Label>
                <Input 
                  value={serviceArea} 
                  onChange={(e) => handleServiceChange("serviceArea", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                  disabled={!isEditing}
                  className="h-10 sm:h-11"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">Starting Price (per person)</Label>
                <Input 
                  type="number"
                  step="0.01"
                  value={startingPrice} 
                  onChange={(e) => handleServiceChange("startingPricePerPerson", parseFloat(e.target.value) || 0)}
                  disabled={!isEditing}
                  className="h-10 sm:h-11"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-sm sm:text-base">Dietary Options (comma-separated)</Label>
                <Input
                  value={dietaryOptions}
                  onChange={(e) => handleServiceChange("dietaryOptions", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                  disabled={!isEditing}
                  className="h-10 sm:h-11"
                />
              </div>
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-sm sm:text-base">Special Services & Equipment (comma-separated)</Label>
              <Textarea
                value={specialServices}
                onChange={(e) => handleServiceChange("specialServices", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                disabled={!isEditing}
                rows={3}
                className="min-h-[80px] sm:min-h-[90px] text-sm sm:text-base"
              />
            </div>
          </CardContent>
        </Card>
      </div>

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
