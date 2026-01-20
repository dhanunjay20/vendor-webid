import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, Building2, FileText, CheckCircle2 } from "lucide-react";
import * as api from "@/lib/api";

interface DocumentField {
  documentType: string;
  documentName: string;
  documentUrl: string;
}

const VendorProfileSetup: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showUnauthorizedModal, setShowUnauthorizedModal] = useState(false);
  const [unauthorizedMessage, setUnauthorizedMessage] = useState("");

  // Get registration response from location state or localStorage
  const registrationData = location.state?.registrationData || JSON.parse(localStorage.getItem("registrationData") || "{}");
  const country = registrationData?.user?.country || registrationData?.country || localStorage.getItem("country") || "USA";
  const accessToken = registrationData?.accessToken || localStorage.getItem("authToken") || "";
  const userId = registrationData?.user?.userId || localStorage.getItem("userId") || "";

  const [formData, setFormData] = useState({
    businessName: "",
    businessEmail: "",
    businessPhone: "",
    businessType: "CATERING",
    country: country,
    streetAddress: "",
    city: "",
    state: "",
    postalCode: "",
    firstName: registrationData?.user?.firstName || localStorage.getItem("firstName") || "",
    lastName: registrationData?.user?.lastName || localStorage.getItem("lastName") || "",
    // Document fields
    doc1Type: country === "USA" ? "EIN" : "GST",
    doc1Name: "",
    doc1Url: "",
    doc2Type: country === "USA" ? "BUSINESS_LICENSE" : "PAN",
    doc2Name: "",
    doc2Url: "",
    doc3Type: country === "USA" ? "INSURANCE" : "FSSAI",
    doc3Name: "",
    doc3Url: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // If no registration data, redirect to auth
    if (!accessToken || !country) {
      toast({ title: "Please complete registration first", variant: "destructive" });
      navigate("/auth");
    }
  }, [accessToken, country, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.businessName) newErrors.businessName = "Business name is required";
    if (!formData.businessEmail) newErrors.businessEmail = "Business email is required";
    if (!formData.businessPhone) newErrors.businessPhone = "Business phone is required";
    if (!formData.streetAddress) newErrors.streetAddress = "Street address is required";
    if (!formData.city) newErrors.city = "City is required";
    if (!formData.state) newErrors.state = "State is required";
    if (!formData.postalCode) newErrors.postalCode = "Postal code is required";
    if (!formData.doc1Name || !formData.doc1Url) newErrors.doc1 = `${formData.doc1Type} document is required`;
    if (!formData.doc2Name || !formData.doc2Url) newErrors.doc2 = `${formData.doc2Type} document is required`;
    if (!formData.doc3Name || !formData.doc3Url) newErrors.doc3 = `${formData.doc3Type} document is required`;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = {
        businessName: formData.businessName,
        businessEmail: formData.businessEmail,
        businessPhone: formData.businessPhone,
        businessType: formData.businessType,
        country: formData.country,
        businessAddress: {
          streetAddress: formData.streetAddress,
          city: formData.city,
          state: formData.state,
          postalCode: formData.postalCode,
          country: formData.country,
        },
        ownerInfo: {
          firstName: formData.firstName,
          lastName: formData.lastName,
        },
        documents: [
          {
            documentType: formData.doc1Type,
            documentName: formData.doc1Name,
            documentUrl: formData.doc1Url,
          },
          {
            documentType: formData.doc2Type,
            documentName: formData.doc2Name,
            documentUrl: formData.doc2Url,
          },
          {
            documentType: formData.doc3Type,
            documentName: formData.doc3Name,
            documentUrl: formData.doc3Url,
          },
        ],
      };

      await api.createVendorProfile(payload);
      
      // Clear registration data from localStorage
      localStorage.removeItem("registrationData");
      // Show success modal instead of navigating
      setShowSuccessModal(true);
    } catch (err: any) {
      // If backend returns an UnauthorizedException with a specific message, show it in a modal
      const serverMsg = err?.response?.data?.message || err?.message || err?.response?.data || "Failed to create vendor profile";
      if (typeof serverMsg === "string" && serverMsg.toLowerCase().includes("your vendor account is currently")) {
        setUnauthorizedMessage(serverMsg);
        setShowUnauthorizedModal(true);
      } else {
        toast({ title: "Failed to create vendor profile", description: serverMsg, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    // Clear auth tokens and user data
    localStorage.clear();
    navigate("/");
  };

  const handleCloseUnauthorizedModal = () => {
    setShowUnauthorizedModal(false);
    // Clear registration/auth data and navigate home
    localStorage.clear();
    navigate("/");
  };

  // Document labels based on country
  const docLabels = country === "USA" 
    ? { doc1: "EIN Document", doc2: "Business License", doc3: "Insurance Certificate" }
    : { doc1: "GST Certificate", doc2: "PAN Card", doc3: "FSSAI License" };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-4xl"
      >
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              Complete Your Vendor Profile
            </CardTitle>
            <CardDescription>
              Provide your business details to get started ({country})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Business Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Business Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Business Name *</Label>
                    <Input
                      id="businessName"
                      name="businessName"
                      value={formData.businessName}
                      onChange={handleChange}
                      placeholder="Enter business name"
                      className={errors.businessName ? "border-red-500" : ""}
                    />
                    {errors.businessName && <p className="text-sm text-red-500">{errors.businessName}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessEmail">Business Email *</Label>
                    <Input
                      id="businessEmail"
                      name="businessEmail"
                      type="email"
                      value={formData.businessEmail}
                      onChange={handleChange}
                      placeholder="business@example.com"
                      className={errors.businessEmail ? "border-red-500" : ""}
                    />
                    {errors.businessEmail && <p className="text-sm text-red-500">{errors.businessEmail}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessPhone">Business Phone *</Label>
                    <Input
                      id="businessPhone"
                      name="businessPhone"
                      value={formData.businessPhone}
                      onChange={handleChange}
                      placeholder={country === "USA" ? "+1 555 0199 888" : "+91 98765 43210"}
                      className={errors.businessPhone ? "border-red-500" : ""}
                    />
                    {errors.businessPhone && <p className="text-sm text-red-500">{errors.businessPhone}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessType">Business Type *</Label>
                    <Select value={formData.businessType} onValueChange={(v) => handleSelectChange("businessType", v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CATERING">Catering</SelectItem>
                        <SelectItem value="RESTAURANT">Restaurant</SelectItem>
                        <SelectItem value="FOOD_TRUCK">Food Truck</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Business Address */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Business Address</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="streetAddress">Street Address *</Label>
                    <Input
                      id="streetAddress"
                      name="streetAddress"
                      value={formData.streetAddress}
                      onChange={handleChange}
                      placeholder={country === "USA" ? "123 Broadway" : "45 MG Road"}
                      className={errors.streetAddress ? "border-red-500" : ""}
                    />
                    {errors.streetAddress && <p className="text-sm text-red-500">{errors.streetAddress}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder={country === "USA" ? "New York" : "Bengaluru"}
                      className={errors.city ? "border-red-500" : ""}
                    />
                    {errors.city && <p className="text-sm text-red-500">{errors.city}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">{country === "USA" ? "State" : "State/Province"} *</Label>
                    <Input
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      placeholder={country === "USA" ? "NY" : "Karnataka"}
                      className={errors.state ? "border-red-500" : ""}
                    />
                    {errors.state && <p className="text-sm text-red-500">{errors.state}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="postalCode">{country === "USA" ? "ZIP Code" : "Postal Code"} *</Label>
                    <Input
                      id="postalCode"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleChange}
                      placeholder={country === "USA" ? "10001" : "560038"}
                      className={errors.postalCode ? "border-red-500" : ""}
                    />
                    {errors.postalCode && <p className="text-sm text-red-500">{errors.postalCode}</p>}
                  </div>
                </div>
              </div>

              {/* Owner Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Owner Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="First name"
                      readOnly
                      className="bg-gray-100"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Last name"
                      readOnly
                      className="bg-gray-100"
                    />
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Required Documents
                </h3>

                {/* Document 1 */}
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-medium">{docLabels.doc1}</h4>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="doc1Name">Document Name *</Label>
                      <Input
                        id="doc1Name"
                        name="doc1Name"
                        value={formData.doc1Name}
                        onChange={handleChange}
                        placeholder={`${formData.doc1Type} Document`}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="doc1Url">Document URL *</Label>
                      <Input
                        id="doc1Url"
                        name="doc1Url"
                        value={formData.doc1Url}
                        onChange={handleChange}
                        placeholder="http://example.com/doc.pdf"
                      />
                    </div>
                  </div>
                  {errors.doc1 && <p className="text-sm text-red-500">{errors.doc1}</p>}
                </div>

                {/* Document 2 */}
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-medium">{docLabels.doc2}</h4>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="doc2Name">Document Name *</Label>
                      <Input
                        id="doc2Name"
                        name="doc2Name"
                        value={formData.doc2Name}
                        onChange={handleChange}
                        placeholder={`${formData.doc2Type} Document`}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="doc2Url">Document URL *</Label>
                      <Input
                        id="doc2Url"
                        name="doc2Url"
                        value={formData.doc2Url}
                        onChange={handleChange}
                        placeholder="http://example.com/doc.pdf"
                      />
                    </div>
                  </div>
                  {errors.doc2 && <p className="text-sm text-red-500">{errors.doc2}</p>}
                </div>

                {/* Document 3 */}
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-medium">{docLabels.doc3}</h4>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="doc3Name">Document Name *</Label>
                      <Input
                        id="doc3Name"
                        name="doc3Name"
                        value={formData.doc3Name}
                        onChange={handleChange}
                        placeholder={`${formData.doc3Type} Document`}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="doc3Url">Document URL *</Label>
                      <Input
                        id="doc3Url"
                        name="doc3Url"
                        value={formData.doc3Url}
                        onChange={handleChange}
                        placeholder="http://example.com/doc.pdf"
                      />
                    </div>
                  </div>
                  {errors.doc3 && <p className="text-sm text-red-500">{errors.doc3}</p>}
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full h-12">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating Profile...
                  </>
                ) : (
                  "Complete Setup"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Success Modal */}
      <AlertDialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <AlertDialogTitle className="text-center text-2xl">Profile Submitted Successfully!</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-base leading-relaxed pt-2">
              Your profile creation request has been submitted successfully. Our team will review your profile and approve it shortly. 
              <br /><br />
              You will be notified about the approval status via email or text message.
              <br /><br />
              Thank you for your patience!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <Button onClick={handleCloseSuccessModal} className="w-full sm:w-auto px-8">
              Back to Home
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unauthorized modal for vendor statuses like PENDING/REJECTED */}
      <AlertDialog open={showUnauthorizedModal} onOpenChange={setShowUnauthorizedModal}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-yellow-100 p-3">
                <CheckCircle2 className="h-12 w-12 text-yellow-600" />
              </div>
            </div>
            <AlertDialogTitle className="text-center text-2xl">Account Pending Approval</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-base leading-relaxed pt-2">
              {unauthorizedMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <Button onClick={handleCloseUnauthorizedModal} className="w-full sm:w-auto px-8">
              Back to Home
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default VendorProfileSetup;
