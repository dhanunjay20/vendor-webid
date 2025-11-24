import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, Users, MapPin, Clock, DollarSign, Package, Utensils } from "lucide-react";

interface Order {
  id: string;
  client: string;
  event: string;
  date: string;
  guests: number;
  status: string;
  amount: string;
  bidId: string;
}

interface OrderDetailModalProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusConfig = {
  confirmed: {
    label: "Confirmed",
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  preparing: {
    label: "Preparing",
    className: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  },
  "in-transit": {
    label: "In Transit",
    className: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  },
  delivered: {
    label: "Delivered",
    className: "bg-green-500/10 text-green-600 border-green-500/20",
  },
};

const mockMenuItems = [
  { name: "Grilled Chicken Breast", quantity: 150, price: "$1,200" },
  { name: "Caesar Salad", quantity: 150, price: "$750" },
  { name: "Roasted Vegetables", quantity: 150, price: "$600" },
  { name: "Dinner Rolls", quantity: 200, price: "$200" },
  { name: "Chocolate Cake", quantity: 150, price: "$900" },
];

export default function OrderDetailModal({ order, open, onOpenChange }: OrderDetailModalProps) {
  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl">{order.event}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">Order ID: {order.id}</p>
            </div>
            <Badge className={statusConfig[order.status as keyof typeof statusConfig].className}>
              {statusConfig[order.status as keyof typeof statusConfig].label}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Client Information */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Client Information
            </h3>
            <div className="grid gap-2 bg-muted/50 p-4 rounded-lg">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium">{order.client}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium">{order.client.toLowerCase().replace(' ', '.')}@email.com</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone:</span>
                <span className="font-medium">+1 (555) 123-4567</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Event Details */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Event Details
            </h3>
            <div className="grid gap-3 bg-muted/50 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{order.date}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Time</p>
                  <p className="font-medium">6:00 PM - 10:00 PM</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Venue</p>
                  <p className="font-medium">Grand Ballroom, Hilton Hotel</p>
                  <p className="text-sm text-muted-foreground">123 Main Street, City, State 12345</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Guest Count</p>
                  <p className="font-medium">{order.guests} guests</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Menu Items */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Utensils className="h-4 w-4" />
              Menu Items
            </h3>
            <div className="space-y-2">
              {mockMenuItems.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                  </div>
                  <p className="font-semibold text-primary">{item.price}</p>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Special Requirements */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Special Requirements
            </h3>
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <p className="text-sm">• Vegetarian options required for 15 guests</p>
              <p className="text-sm">• Gluten-free dessert for 5 guests</p>
              <p className="text-sm">• Setup required by 5:00 PM</p>
              <p className="text-sm">• Tables, linens, and serving staff included</p>
            </div>
          </div>

          <Separator />

          {/* Timeline */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Order Timeline
            </h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <div className="h-full w-0.5 bg-border" />
                </div>
                <div className="pb-3 flex-1">
                  <p className="font-medium">Bid Accepted</p>
                  <p className="text-sm text-muted-foreground">March 10, 2024 at 2:30 PM</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <div className="h-full w-0.5 bg-border" />
                </div>
                <div className="pb-3 flex-1">
                  <p className="font-medium">Order Confirmed</p>
                  <p className="text-sm text-muted-foreground">March 10, 2024 at 3:15 PM</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Scheduled Delivery</p>
                  <p className="text-sm text-muted-foreground">{order.date} at 5:00 PM</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Payment Information */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Payment Information
            </h3>
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">$5,650</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service Fee:</span>
                <span className="font-medium">$350</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax (8%):</span>
                <span className="font-medium">$200</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between text-lg">
                <span className="font-semibold">Total Amount:</span>
                <span className="font-bold text-primary">{order.amount}</span>
              </div>
              <div className="pt-2">
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                  Deposit Paid: $2,000
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
