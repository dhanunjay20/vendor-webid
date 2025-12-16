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
      
      console.log("Fetching vendor profile for org ID:", vendorOrgId);
      const profile = await api.getVendorProfile(vendorOrgId);
      console.log("Vendor profile fetched:", profile);
      setVendorProfile(profile);
      setFormData(profile);
      
      // Fetch service details if vendorId is available
      if (vendorId) {
        try {
          console.log("Fetching service details for vendor ID:", vendorId);
          const details = await api.getServiceDetailsByVendorId(vendorId);
          console.log("Service details fetched:", details);
          setServiceDetails(details);
          setServiceFormData(details);
        } catch (err: any) {
          // Service details are optional - if not found (404), just continue
          if (err?.status === 404) {
            console.log("Service details not found (404) - this is OK, vendor is new or hasn't created service details yet");
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
            console.warn("Error fetching service details:", err);
          }
        }
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load vendor profile");
      console.error("Failed to fetch vendor profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    try {
      localStorage.clear();
    } catch (e) {
      console.warn("Failed to clear auth storage", e);
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

      console.log("Saving vendor profile...");
      console.log("Vendor ID:", vendorId);
      console.log("Vendor Org ID:", vendorOrgId);
      console.log("Form Data:", formData);

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

      console.log("Vendor Payload:", vendorPayload);

      // Update vendor profile
      await api.updateVendorProfile(vendorId, vendorPayload);
      console.log("Vendor profile updated successfully");

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
          
          console.log("Service Payload:", servicePayload);
          await api.createOrUpdateServiceDetails(vendorId, servicePayload);
          console.log("Service details updated successfully");
        } catch (err: any) {
          console.warn("Could not update service details:", err);
          // Service details update failure is non-critical
          // Profile was already updated successfully
        }
      } else {
        console.log("Service details form is empty - skipping service details update");
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
      console.error("Failed to save profile:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-8 flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !formData) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || "No profile data available"}</p>
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
    <div className="container py-8">
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Business Profile</h1>
          <p className="text-muted-foreground">Manage your catering business information</p>
        </div>
        {!isEditing ? (
          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
            <Button variant="ghost" onClick={handleLogout}>Logout</Button>
          </div>
        ) : (
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => { setIsEditing(false); setFormData(vendorProfile); setServiceFormData(serviceDetails); }}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : "Save Changes"}
            </Button>
            <Button variant="ghost" onClick={handleLogout}>Logout</Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Picture & Basic Info */}
        <Card className="lg:col-span-1">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="h-32 w-32">
                  <AvatarImage src={profileUrl} />
                  <AvatarFallback>{businessName.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                {isEditing && (
                  <Button
                    size="icon"
                    className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="text-center">
                <h3 className="text-xl font-bold">{businessName}</h3>
                <p className="text-sm text-muted-foreground">Premium Catering Provider</p>
                <div className="mt-2 flex justify-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className="text-yellow-400">
                      ★
                    </span>
                  ))}
                  <span className="ml-1 text-sm text-muted-foreground">(4.8)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Business Name</Label>
                <Input
                  value={formData?.businessName || ""}
                  onChange={(e) => handleChange("businessName", e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Person</Label>
                <Input 
                  value={formData?.contactName || ""} 
                  onChange={(e) => handleChange("contactName", e.target.value)}
                  disabled={!isEditing} 
                />
              </div>
              <div className="space-y-2">
                <Label>
                  <Phone className="mr-2 inline h-4 w-4" />
                  Phone Number
                </Label>
                <Input 
                  value={formData?.mobile || ""} 
                  onChange={(e) => handleChange("mobile", e.target.value)}
                  disabled={!isEditing} 
                />
              </div>
              <div className="space-y-2">
                <Label>
                  <Mail className="mr-2 inline h-4 w-4" />
                  Email Address
                </Label>
                <Input 
                  value={formData?.email || ""} 
                  onChange={(e) => handleChange("email", e.target.value)}
                  disabled={!isEditing} 
                />
              </div>
              <div className="space-y-2">
                <Label>
                  <Globe className="mr-2 inline h-4 w-4" />
                  Website
                </Label>
                <Input 
                  value={formData?.website || ""} 
                  onChange={(e) => handleChange("website", e.target.value)}
                  disabled={!isEditing} 
                />
              </div>
              <div className="space-y-2">
                <Label>Years in Business</Label>
                <Input 
                  type="number"
                  value={formData?.yearsInBusiness || ""} 
                  onChange={(e) => handleChange("yearsInBusiness", parseInt(e.target.value) || 0)}
                  disabled={!isEditing} 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>
                <MapPin className="mr-2 inline h-4 w-4" />
                Business Address Line 1
              </Label>
              <Input
                value={primaryAddress?.addressLine1 || ""}
                onChange={(e) => handleAddressChange(0, "addressLine1", e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label>Business Address Line 2</Label>
              <Input
                value={primaryAddress?.addressLine2 || ""}
                onChange={(e) => handleAddressChange(0, "addressLine2", e.target.value)}
                disabled={!isEditing}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={primaryAddress?.city || ""}
                  onChange={(e) => handleAddressChange(0, "city", e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input
                  value={primaryAddress?.state || ""}
                  onChange={(e) => handleAddressChange(0, "state", e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input
                  value={primaryAddress?.country || ""}
                  onChange={(e) => handleAddressChange(0, "country", e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>ZIP Code</Label>
                <Input
                  value={primaryAddress?.zipCode || ""}
                  onChange={(e) => handleAddressChange(0, "zipCode", e.target.value)}
                  disabled={!isEditing}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>About Your Business</Label>
              <Textarea
                value={formData?.aboutBusiness || ""}
                onChange={(e) => handleChange("aboutBusiness", e.target.value)}
                disabled={!isEditing}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Service Details */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Service Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Cuisine Specialties (comma-separated)</Label>
                <Input
                  value={cuisineSpecialties}
                  onChange={(e) => handleServiceChange("cuisineSpecialties", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Service Types (comma-separated)</Label>
                <Input
                  value={serviceTypes}
                  onChange={(e) => handleServiceChange("serviceTypes", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Maximum Capacity</Label>
                <Input 
                  type="number"
                  value={maxCapacity} 
                  onChange={(e) => handleServiceChange("maximumCapacity", parseInt(e.target.value) || 0)}
                  disabled={!isEditing} 
                />
              </div>
              <div className="space-y-2">
                <Label>Service Area (comma-separated)</Label>
                <Input 
                  value={serviceArea} 
                  onChange={(e) => handleServiceChange("serviceArea", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                  disabled={!isEditing} 
                />
              </div>
              <div className="space-y-2">
                <Label>Starting Price (per person)</Label>
                <Input 
                  type="number"
                  step="0.01"
                  value={startingPrice} 
                  onChange={(e) => handleServiceChange("startingPricePerPerson", parseFloat(e.target.value) || 0)}
                  disabled={!isEditing} 
                />
              </div>
              <div className="space-y-2">
                <Label>Dietary Options (comma-separated)</Label>
                <Input
                  value={dietaryOptions}
                  onChange={(e) => handleServiceChange("dietaryOptions", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                  disabled={!isEditing}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Special Services & Equipment (comma-separated)</Label>
              <Textarea
                value={specialServices}
                onChange={(e) => handleServiceChange("specialServices", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                disabled={!isEditing}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Location Tracking Section */}
      <div className="mt-6">
        <LocationTracker 
          vendorId={vendorProfile?.id || localStorage.getItem("vendorId") || null}
          currentLatitude={vendorProfile?.latitude}
          currentLongitude={vendorProfile?.longitude}
          lastUpdated={vendorProfile?.lastLocationUpdatedAt}
          onLocationUpdated={fetchData}
        />
      </div>
    </div>
  );
}
