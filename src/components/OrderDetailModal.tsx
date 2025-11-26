import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar, Users, MapPin, Clock, DollarSign, Package, Utensils, ChefHat, Flame, Tag } from "lucide-react";

// The backend may return menu items in a different shape (no prices/quantities).
// Be defensive in the UI and support both shapes.
interface MenuItem {
  // possible fields from older UI
  itemName?: string;
  quantity?: number;
  pricePerUnit?: number;
  totalPrice?: number;

  // fields from OrderMenuItemResponseDto
  menuItemId?: string;
  name?: string;
  description?: string;
  images?: string[];
  category?: string;
  subCategory?: string;
  ingredients?: string[];
  spiceLevels?: string[];
  specialRequest?: string;
  available?: boolean;
}

interface Order {
  id: string;
  customerId: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  vendorOrganizationId?: string;
  eventName?: string;
  eventDate?: string;
  eventLocation?: string;
  guestCount?: number;
  menuItems?: MenuItem[];
  status?: string;
  totalPrice?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface OrderDetailModalProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusConfig = {
  pending: {
    label: "Pending",
    className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  },
  confirmed: {
    label: "Confirmed",
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  },
  completed: {
    label: "Completed",
    className: "bg-green-500/10 text-green-600 border-green-500/20",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-500/10 text-red-600 border-red-500/20",
  },
};

export default function OrderDetailModal({ order, open, onOpenChange }: OrderDetailModalProps) {
  if (!order) return null;
  const statusCfg = statusConfig[order.status as keyof typeof statusConfig] || { label: order.status || "Unknown", className: "" };
  const totalPrice = typeof order.totalPrice === "number" ? order.totalPrice : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[85vh] p-0 rounded-lg overflow-hidden border">
        {/* Sticky Header */}
        <DialogHeader className="sticky top-0 z-50 bg-background border-b px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <DialogTitle className="text-2xl font-semibold">{order.eventName}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">Order ID: {order.id}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={statusCfg.className}>{statusCfg.label}</Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Client Information */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Client Information
            </h3>
            <Card className="p-4 bg-gradient-to-br from-green-50/50 to-teal-50/50 border-green-100">
              <div className="grid gap-3">
                {order.userName && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Name:</span>
                    <span className="font-semibold text-sm">{order.userName}</span>
                  </div>
                )}
                {order.userEmail && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Email:</span>
                    <span className="font-semibold text-sm">{order.userEmail}</span>
                  </div>
                )}
                {order.userPhone && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Phone:</span>
                    <span className="font-semibold text-sm">{order.userPhone}</span>
                  </div>
                )}
                {!order.userName && !order.userEmail && !order.userPhone && (
                  <div className="text-center">
                    <span className="text-sm text-muted-foreground">Customer ID: {order.customerId}</span>
                  </div>
                )}
              </div>
            </Card>
          </div>

          <Separator />

          {/* Event Details */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Event Details
            </h3>
            <Card className="p-4 bg-gradient-to-br from-blue-50/50 to-purple-50/50 border-blue-100">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Calendar className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Event Date</p>
                    <p className="font-semibold">{new Date(order.eventDate || "").toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Users className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Guest Count</p>
                    <p className="font-semibold">{order.guestCount} guests</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 sm:col-span-2">
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <MapPin className="h-4 w-4 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Venue</p>
                    <p className="font-semibold">{order.eventLocation}</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <Separator />

          {/* Menu Items */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ChefHat className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold">Menu Items</h3>
              {order.menuItems && order.menuItems.length > 0 && (
                <Badge variant="outline" className="ml-auto">{order.menuItems.length} items</Badge>
              )}
            </div>
            <div className="grid gap-4">
              {order.menuItems && order.menuItems.length > 0 ? (
                order.menuItems.map((item, index) => {
                  // Support two shapes:
                  // 1) legacy: item has name/description/quantity/totalPrice
                  // 2) wrapped: item has { menuItemId, specialRequest, menuItem: { name, description, images, ... } }
                  const wrapper = item as any;
                  const payload = wrapper.menuItem || wrapper;
                  const name = payload.name || payload.itemName || "Item";
                  const description = payload.description || "";
                  const specialRequest = wrapper.specialRequest || "";
                  const images = payload.images || [];
                  const category = payload.category || "";
                  const subCategory = payload.subCategory || "";
                  const ingredients = payload.ingredients || [];
                  const spiceLevels = payload.spiceLevels || [];
                  const available = payload.available !== false;

                  return (
                    <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="flex flex-col sm:flex-row gap-4 p-4">
                        {/* Image */}
                        <div className="w-full sm:w-32 h-32 rounded-lg overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5 shrink-0 relative">
                          {images.length > 0 ? (
                            <img
                              src={images[0]}
                              alt={name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = 'https://via.placeholder.com/128x128?text=No+Image';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Utensils className="h-10 w-10 text-muted-foreground" />
                            </div>
                          )}
                          {!available && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <Badge variant="destructive" className="text-xs">Unavailable</Badge>
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 space-y-3">
                          <div>
                            <h4 className="text-lg font-bold text-foreground">{name}</h4>
                            {description && (
                              <p className="text-sm text-muted-foreground mt-1">{description}</p>
                            )}
                          </div>

                          {/* Category & Subcategory */}
                          {(category || subCategory) && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <Tag className="h-3.5 w-3.5 text-primary" />
                              {category && (
                                <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 text-xs">
                                  {category}
                                </Badge>
                              )}
                              {subCategory && (
                                <Badge variant="outline" className="text-xs">{subCategory}</Badge>
                              )}
                            </div>
                          )}

                          {/* Ingredients */}
                          {ingredients.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1.5">Ingredients:</p>
                              <div className="flex flex-wrap gap-1.5">
                                {ingredients.map((ingredient: string, i: number) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {ingredient}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Spice Levels */}
                          {spiceLevels.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <Flame className="h-3.5 w-3.5 text-orange-500" />
                              <span className="text-xs font-medium text-muted-foreground">Spice:</span>
                              {spiceLevels.map((level: string, i: number) => (
                                <Badge key={i} variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
                                  {level}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {/* Special Request */}
                          {specialRequest && (
                            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-md">
                              <p className="text-xs font-semibold text-amber-900 mb-0.5">Special Request:</p>
                              <p className="text-xs text-amber-800">{specialRequest}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })
              ) : (
                <Card className="p-8">
                  <p className="text-center text-sm text-muted-foreground">No menu items available</p>
                </Card>
              )}
            </div>
          </div>

          <Separator />



          {/* Timeline */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Order Timeline
            </h3>
            <Card className="p-4">
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                    <div className="h-full w-0.5 bg-gradient-to-b from-green-500 to-blue-500" />
                  </div>
                  <div className="pb-2 flex-1">
                    <p className="font-semibold text-sm">Order Created</p>
                    <p className="text-xs text-muted-foreground">{new Date(order.createdAt || "").toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                    <div className="h-full w-0.5 bg-gradient-to-b from-blue-500 to-purple-500" />
                  </div>
                  <div className="pb-2 flex-1">
                    <p className="font-semibold text-sm">Last Updated</p>
                    <p className="text-xs text-muted-foreground">{new Date(order.updatedAt || "").toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="h-2.5 w-2.5 rounded-full bg-purple-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Scheduled Event</p>
                    <p className="text-xs text-muted-foreground">{new Date(order.eventDate || "").toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 z-50 bg-background/95 backdrop-blur-sm border-t px-6 py-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Order Status: <Badge className={statusCfg.className}>{statusCfg.label}</Badge>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
              <Button onClick={() => window.print()} className="bg-primary">Print Order</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
