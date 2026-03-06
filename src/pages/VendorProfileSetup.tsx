import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, FileText, Loader2, CheckCircle2, MapPin, Mail, Phone, User, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
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
  const [currentStep, setCurrentStep] = useState(1);

  // Get registration response from location state or localStorage
  const registrationData = location.state?.registrationData || JSON.parse(localStorage.getItem("registrationData") || "{}");
  const country = registrationData?.user?.country || registrationData?.country || localStorage.getItem("country") || "USA";
  const accessToken = registrationData?.accessToken || localStorage.getItem("authToken") || "";

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

  const validateStep = (step: number) => {
    const newErrors: Record<string, string> = {};
    
    if (step === 1) {
      if (!formData.businessName) newErrors.businessName = "Business name is required";
      if (!formData.businessEmail) newErrors.businessEmail = "Business email is required";
      if (!formData.businessPhone) newErrors.businessPhone = "Business phone is required";
    } else if (step === 2) {
      if (!formData.streetAddress) newErrors.streetAddress = "Street address is required";
      if (!formData.city) newErrors.city = "City is required";
      if (!formData.state) newErrors.state = "State is required";
      if (!formData.postalCode) newErrors.postalCode = "Postal code is required";
    } else if (step === 3) {
      if (!formData.doc1Name || !formData.doc1Url) newErrors.doc1 = `${formData.doc1Type} document is required`;
      if (!formData.doc2Name || !formData.doc2Url) newErrors.doc2 = `${formData.doc2Type} document is required`;
      if (!formData.doc3Name || !formData.doc3Url) newErrors.doc3 = `${formData.doc3Type} document is required`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(3)) return;

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
          phone: formData.businessPhone,
          email: formData.businessEmail,
        },
        documents: [
          { documentType: formData.doc1Type, documentName: formData.doc1Name, documentUrl: formData.doc1Url },
          { documentType: formData.doc2Type, documentName: formData.doc2Name, documentUrl: formData.doc2Url },
          { documentType: formData.doc3Type, documentName: formData.doc3Name, documentUrl: formData.doc3Url },
        ],
        cuisineTypes: [],
        serviceAreas: [],
      };

      await api.createVendorProfile(payload);
      localStorage.removeItem("registrationData");
      setShowSuccessModal(true);
    } catch (err: any) {
      const serverMsg = err?.response?.data?.message || err?.message || "Failed to create vendor profile";
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
    localStorage.clear();
    navigate("/");
  };

  const handleCloseUnauthorizedModal = () => {
    setShowUnauthorizedModal(false);
    localStorage.clear();
    navigate("/");
  };

  const docLabels = country === "USA" 
    ? { doc1: "EIN Document", doc2: "Business License", doc3: "Insurance Certificate" }
    : { doc1: "GST Certificate", doc2: "PAN Card", doc3: "FSSAI License" };

  const steps = [
    { number: 1, title: "Business Info", icon: Building2 },
    { number: 2, title: "Address", icon: MapPin },
    { number: 3, title: "Documents", icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 md:p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-4xl">
        
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {steps.map((step, index) => (
              <React.Fragment key={step.number}>
                <div className="flex flex-col items-center relative">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: currentStep >= step.number ? 1 : 0.8, opacity: 1 }}
                    className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center font-bold text-lg transition-all ${
                      currentStep >= step.number ? "bg-primary text-white shadow-lg shadow-primary/30" : "bg-gray-200 text-gray-400"
                    }`}
                  >
                    {currentStep > step.number ? <CheckCircle2 className="h-6 w-6" /> : <step.icon className="h-6 w-6" />}
                  </motion.div>
                  <span className={`mt-2 text-xs md:text-sm font-medium ${currentStep >= step.number ? "text-primary" : "text-gray-400"}`}>{step.title}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className="flex-1 h-1 mx-2 md:mx-4 rounded-full bg-gray-200 overflow-hidden">
                    <motion.div initial={{ width: "0%" }} animate={{ width: currentStep > step.number ? "100%" : "0%" }} transition={{ duration: 0.3 }} className="h-full bg-primary" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Main Card */}
        <Card className="shadow-2xl border-0 overflow-hidden">
          <div className="bg-orange-50 p-6 md:p-8 border-b border-orange-100">
            <CardHeader className="p-0">
              <CardTitle className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-xl"><Building2 className="h-7 w-7 text-orange-600" /></div>
                <div>
                  <div>Complete Your Vendor Profile</div>
                  <CardDescription className="mt-1 text-sm md:text-base">Step {currentStep} of 3 - Provide your business details ({country})</CardDescription>
                </div>
              </CardTitle>
            </CardHeader>
          </div>

          <CardContent className="p-6 md:p-8">
            <form onSubmit={handleSubmit}>
              {/* Step 1: Business Information */}
              {currentStep === 1 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="businessName" className="flex items-center gap-2 text-sm font-semibold"><Building2 className="h-4 w-4 text-primary" />Business Name <span className="text-red-500">*</span></Label>
                      <Input id="businessName" name="businessName" value={formData.businessName} onChange={handleChange} placeholder="Enter your business name" className={`h-11 ${errors.businessName ? "border-red-500" : ""}`} />
                      {errors.businessName && <p className="text-sm text-red-500">{errors.businessName}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="businessType" className="flex items-center gap-2 text-sm font-semibold"><Building2 className="h-4 w-4 text-primary" />Business Type <span className="text-red-500">*</span></Label>
                      <Select value={formData.businessType} onValueChange={(v) => handleSelectChange("businessType", v)}>
                        <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CATERING">Catering</SelectItem>
                          <SelectItem value="RESTAURANT">Restaurant</SelectItem>
                          <SelectItem value="FOOD_TRUCK">Food Truck</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="businessEmail" className="flex items-center gap-2 text-sm font-semibold"><Mail className="h-4 w-4 text-primary" />Business Email <span className="text-red-500">*</span></Label>
                      <Input id="businessEmail" name="businessEmail" type="email" value={formData.businessEmail} onChange={handleChange} placeholder="business@example.com" className={`h-11 ${errors.businessEmail ? "border-red-500" : ""}`} />
                      {errors.businessEmail && <p className="text-sm text-red-500">{errors.businessEmail}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="businessPhone" className="flex items-center gap-2 text-sm font-semibold"><Phone className="h-4 w-4 text-primary" />Business Phone <span className="text-red-500">*</span></Label>
                      <Input id="businessPhone" name="businessPhone" value={formData.businessPhone} onChange={handleChange} placeholder={country === "USA" ? "+1 555 0199 888" : "+91 98765 43210"} className={`h-11 ${errors.businessPhone ? "border-red-500" : ""}`} />
                      {errors.businessPhone && <p className="text-sm text-red-500">{errors.businessPhone}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="flex items-center gap-2 text-sm font-semibold"><User className="h-4 w-4 text-primary" />Owner First Name <span className="text-red-500">*</span></Label>
                      <Input id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} readOnly className="bg-gray-50 h-11" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="flex items-center gap-2 text-sm font-semibold"><User className="h-4 w-4 text-primary" />Owner Last Name</Label>
                      <Input id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} readOnly className="bg-gray-50 h-11" />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Business Address */}
              {currentStep === 2 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="streetAddress" className="flex items-center gap-2 text-sm font-semibold"><MapPin className="h-4 w-4 text-primary" />Street Address <span className="text-red-500">*</span></Label>
                      <Input id="streetAddress" name="streetAddress" value={formData.streetAddress} onChange={handleChange} placeholder={country === "USA" ? "123 Broadway" : "45 MG Road"} className={`h-11 ${errors.streetAddress ? "border-red-500" : ""}`} />
                      {errors.streetAddress && <p className="text-sm text-red-500">{errors.streetAddress}</p>}
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city" className="text-sm font-semibold">City <span className="text-red-500">*</span></Label>
                        <Input id="city" name="city" value={formData.city} onChange={handleChange} placeholder={country === "USA" ? "New York" : "Bengaluru"} className={`h-11 ${errors.city ? "border-red-500" : ""}`} />
                        {errors.city && <p className="text-sm text-red-500">{errors.city}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="state" className="text-sm font-semibold">{country === "USA" ? "State" : "State/Province"} <span className="text-red-500">*</span></Label>
                        <Input id="state" name="state" value={formData.state} onChange={handleChange} placeholder={country === "USA" ? "NY" : "Karnataka"} className={`h-11 ${errors.state ? "border-red-500" : ""}`} />
                        {errors.state && <p className="text-sm text-red-500">{errors.state}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="postalCode" className="text-sm font-semibold">{country === "USA" ? "ZIP Code" : "Postal Code"} <span className="text-red-500">*</span></Label>
                        <Input id="postalCode" name="postalCode" value={formData.postalCode} onChange={handleChange} placeholder={country === "USA" ? "10001" : "560038"} className={`h-11 ${errors.postalCode ? "border-red-500" : ""}`} />
                        {errors.postalCode && <p className="text-sm text-red-500">{errors.postalCode}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Country</Label>
                        <Input value={formData.country} readOnly className="bg-gray-50 h-11" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Documents */}
              {currentStep === 3 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                    <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-semibold">Required Documents</p>
                      <p className="mt-1">Please provide valid document URLs for verification purposes.</p>
                    </div>
                  </div>

                  {[1, 2, 3].map((num) => (
                    <div key={num} className="border-2 border-dashed rounded-xl p-6 hover:border-primary transition-colors bg-gradient-to-br from-gray-50 to-white">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-primary/10 rounded-lg"><FileText className="h-5 w-5 text-primary" /></div>
                        <h4 className="font-semibold text-lg">{docLabels[`doc${num}` as keyof typeof docLabels]}</h4>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`doc${num}Name`} className="text-sm font-medium">Document Name <span className="text-red-500">*</span></Label>
                          <Input id={`doc${num}Name`} name={`doc${num}Name`} value={formData[`doc${num}Name` as keyof typeof formData]} onChange={handleChange} placeholder={`${formData[`doc${num}Type` as keyof typeof formData]} Document`} className="h-11" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`doc${num}Url`} className="text-sm font-medium">Document URL <span className="text-red-500">*</span></Label>
                          <Input id={`doc${num}Url`} name={`doc${num}Url`} value={formData[`doc${num}Url` as keyof typeof formData]} onChange={handleChange} placeholder="https://example.com/doc.pdf" className="h-11" />
                        </div>
                      </div>
                      {errors[`doc${num}`] && <p className="text-sm text-red-500 mt-2">{errors[`doc${num}`]}</p>}
                    </div>
                  ))}
                </motion.div>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-4 mt-8 pt-6 border-t">
                {currentStep > 1 && <Button type="button" variant="outline" onClick={handleBack} className="flex-1 h-12">Back</Button>}
                {currentStep < 3 ? (
                  <Button type="button" onClick={handleNext} className="flex-1 h-12 bg-primary hover:bg-primary/90">Next <ChevronRight className="ml-2 h-4 w-4" /></Button>
                ) : (
                  <Button type="submit" disabled={loading} className="flex-1 h-12 bg-primary hover:bg-primary/90">
                    {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating Profile...</> : <>Complete Setup <CheckCircle2 className="ml-2 h-4 w-4" /></>}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Success Modal */}
      <AlertDialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex justify-center mb-4">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 15 }} className="rounded-full bg-green-100 p-4">
                <CheckCircle2 className="h-16 w-16 text-green-600" />
              </motion.div>
            </div>
            <AlertDialogTitle className="text-center text-2xl font-bold">Profile Submitted Successfully!</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-base leading-relaxed pt-2 space-y-3">
              <div className="font-semibold text-foreground">🎉 Congratulations!</div>
              <div>Your vendor profile has been submitted successfully.</div>
              <div>Our team will review your profile and approve it shortly. You will be notified via email or text message.</div>
              <div className="text-sm text-muted-foreground">Thank you for your patience!</div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <Button onClick={handleCloseSuccessModal} className="w-full sm:w-auto px-8 h-11">Back to Home</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unauthorized Modal */}
      <AlertDialog open={showUnauthorizedModal} onOpenChange={setShowUnauthorizedModal}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-yellow-100 p-4"><FileText className="h-16 w-16 text-yellow-600" /></div>
            </div>
            <AlertDialogTitle className="text-center text-2xl font-bold">Account Pending Approval</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-base leading-relaxed pt-2">{unauthorizedMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center">
            <Button onClick={handleCloseUnauthorizedModal} className="w-full sm:w-auto px-8 h-11">Back to Home</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default VendorProfileSetup;
