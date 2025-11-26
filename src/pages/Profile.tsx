import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, MapPin, Phone, Mail, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    try {
      // Clear authentication-related storage
      localStorage.removeItem("authToken");
      localStorage.removeItem("tokenType");
      localStorage.removeItem("vendorOrganizationId");
      localStorage.removeItem("vendorId");
      localStorage.removeItem("userType");
      localStorage.removeItem("userId");
      localStorage.removeItem("id");
      localStorage.removeItem("profileUrl");
    } catch (e) {
      console.warn("Failed to clear auth storage", e);
    }
    try {
      navigate("/login", { replace: true });
      setTimeout(() => {
        if (window.location.pathname !== "/login") window.location.href = "/login";
      }, 150);
    } catch (e) {
      window.location.href = "/login";
    }
  };

  const handleSave = () => {
    toast({
      title: "Profile Updated",
      description: "Your business profile has been successfully updated.",
    });
    setIsEditing(false);
  };

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
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
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
                  <AvatarImage src={localStorage.getItem("profileUrl") || undefined} />
                  <AvatarFallback>WC</AvatarFallback>
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
                <h3 className="text-xl font-bold">WEBID Catering Services</h3>
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
                  defaultValue="WEBID Catering Services"
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Person</Label>
                <Input defaultValue="John Doe" disabled={!isEditing} />
              </div>
              <div className="space-y-2">
                <Label>
                  <Phone className="mr-2 inline h-4 w-4" />
                  Phone Number
                </Label>
                <Input defaultValue="+1 234 567 8900" disabled={!isEditing} />
              </div>
              <div className="space-y-2">
                <Label>
                  <Mail className="mr-2 inline h-4 w-4" />
                  Email Address
                </Label>
                <Input defaultValue="contact@webidcatering.com" disabled={!isEditing} />
              </div>
              <div className="space-y-2">
                <Label>
                  <Globe className="mr-2 inline h-4 w-4" />
                  Website
                </Label>
                <Input defaultValue="www.webidcatering.com" disabled={!isEditing} />
              </div>
              <div className="space-y-2">
                <Label>Years in Business</Label>
                <Input defaultValue="12" disabled={!isEditing} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>
                <MapPin className="mr-2 inline h-4 w-4" />
                Business Address
              </Label>
              <Input
                defaultValue="123 Culinary Street, Food City, FC 12345"
                disabled={!isEditing}
              />
            </div>
            <div className="space-y-2">
              <Label>About Your Business</Label>
              <Textarea
                defaultValue="We are a premium catering service provider with over 12 years of experience in delivering exceptional culinary experiences for corporate events, weddings, and special occasions. Our team of expert chefs and event coordinators ensure every detail is perfect."
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
                <Label>Cuisine Specialties</Label>
                <Input
                  defaultValue="Italian, Asian, American"
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Service Types</Label>
                <Input
                  defaultValue="Buffet, Plated, Cocktail"
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label>Maximum Capacity</Label>
                <Input defaultValue="500 guests" disabled={!isEditing} />
              </div>
              <div className="space-y-2">
                <Label>Service Area</Label>
                <Input defaultValue="Within 50 miles" disabled={!isEditing} />
              </div>
              <div className="space-y-2">
                <Label>Starting Price (per person)</Label>
                <Input defaultValue="$35" disabled={!isEditing} />
              </div>
              <div className="space-y-2">
                <Label>Dietary Options</Label>
                <Input
                  defaultValue="Vegan, Gluten-Free, Halal"
                  disabled={!isEditing}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Special Services & Equipment</Label>
              <Textarea
                defaultValue="Full bar service, outdoor catering equipment, event staff, custom menu planning, dietary accommodations, rental coordination"
                disabled={!isEditing}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
