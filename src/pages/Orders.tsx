import { useState, useMemo, useEffect } from "react";
import { Eye, MessageSquare, CheckCircle, Clock, Package, Truck, CheckCheck, Search, X, Calendar, Users, MapPin, DollarSign, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import OrderDetailModal from "@/components/OrderDetailModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import * as api from "@/lib/api";

interface MenuItem {
  itemName: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
}

interface Order {
  id: string;
  customerId: string;
  vendorOrganizationId: string;
  eventName: string;
  eventDate: string;
  eventLocation: string;
  guestCount: number;
  menuItems: MenuItem[];
  status: string;
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
  userName?: string;
  customerName?: string;
  userPhone?: string;
  customerPhone?: string;
}

const statusConfig = {
  pending: {
    label: "Pending",
    icon: Clock,
    className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  },
  confirmed: {
    label: "Confirmed",
    icon: CheckCircle,
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  in_progress: {
    label: "In Progress",
    icon: Package,
    className: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  },
  completed: {
    label: "Completed",
    icon: CheckCheck,
    className: "bg-green-500/10 text-green-600 border-green-500/20",
  },
  cancelled: {
    label: "Cancelled",
    icon: X,
    className: "bg-red-500/10 text-red-600 border-red-500/20",
  },
};

export default function Orders() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const vendorOrgId = localStorage.getItem("vendorOrganizationId") || "";

  useEffect(() => {
    loadOrders();
  }, []);

  const handleViewOrder = async (order: Order) => {
    try {
      setLoadingDetail(true);
      const fullOrder = await api.getOrderById(vendorOrgId, order.id);
      setSelectedOrder(fullOrder);
    } catch (err: any) {
      toast({
        title: "Failed to load order details",
        description: err?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoadingDetail(false);
    }
  };

  const loadOrders = async () => {
    if (!vendorOrgId) {
      toast({
        title: "Error",
        description: "Vendor organization ID not found. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const data = await api.getOrdersByVendor(vendorOrgId);
      console.log("Orders API response:", data);
      setOrders(data || []);
    } catch (err: any) {
      console.error("Orders API error:", err);
      toast({
        title: "Failed to load orders",
        description: err?.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    if (!vendorOrgId) return;

    try {
      await api.updateOrderStatus(vendorOrgId, orderId, newStatus);
      toast({
        title: "Status Updated",
        description: `Order ${orderId} status updated to ${newStatus}`,
      });
      loadOrders(); // Refresh the list
    } catch (err: any) {
      toast({
        title: "Failed to update status",
        description: err?.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch = 
        order.customerId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  return (
    <div className="container px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Order Management</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Track and manage your accepted catering orders</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-sm">
            {orders.length} Total Orders
          </Badge>
          <Badge variant="outline" className="text-sm bg-green-500/10 text-green-600 border-green-500/20">
            {orders.filter(o => o.status === "completed").length} Completed
          </Badge>
        </div>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search by client, event, or order ID..." 
            className="pl-10" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <SelectValue placeholder="Filter by status" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Loading orders...</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No orders found matching your criteria</p>
              </CardContent>
            </Card>
          ) : (
            filteredOrders.map((order) => {
              const StatusIcon = statusConfig[order.status as keyof typeof statusConfig]?.icon || Clock;

              // Determine allowed status options and whether the select should be enabled
              const allOptions = ["pending", "confirmed", "in_progress", "completed", "cancelled"];
              let allowedOptions: string[] = [];
              let canChange = false;

              if (order.status === "confirmed") {
                // When confirmed, allow full status updates
                allowedOptions = allOptions;
                canChange = true;
              } else {
                // For pending or any other status, do not allow changes until it's confirmed
                allowedOptions = [order.status];
                canChange = false;
              }

              return (
                <Card key={order.id} className="overflow-hidden transition-smooth hover:shadow-lg">
                  <CardHeader className="bg-gradient-card pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">{order.eventName}</CardTitle>
                        <p className="text-sm text-muted-foreground">Order ID: {order.id}</p>
                      </div>
                      <Badge className={statusConfig[order.status as keyof typeof statusConfig]?.className || ""}>
                        <StatusIcon className="mr-1 h-3 w-3" />
                        {statusConfig[order.status as keyof typeof statusConfig]?.label || order.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                          <Calendar className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Event Date</p>
                          <p className="font-medium">{new Date(order.eventDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                          <Users className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Guest Count</p>
                          <p className="font-medium">{order.guestCount} guests</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500/10 rounded-lg">
                          <MapPin className="h-4 w-4 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Location</p>
                          <p className="font-medium truncate" title={order.eventLocation}>
                            {order.eventLocation}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/10 rounded-lg">
                          <DollarSign className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Total Amount</p>
                          <p className="text-lg font-bold text-primary">${order.totalPrice.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                      <Button 
                        onClick={() => handleViewOrder(order)}
                        disabled={loadingDetail}
                        className="flex-1"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </Button>
                      <Select value={order.status} onValueChange={(newStatus) => handleUpdateStatus(order.id, newStatus)} disabled={!canChange}>
                        <SelectTrigger className={`flex-1 ${!canChange ? 'opacity-50 cursor-not-allowed' : ''}`}>
                          <SelectValue placeholder="Update Status" />
                        </SelectTrigger>
                        <SelectContent>
                          {allowedOptions.map((s) => (
                            <SelectItem key={s} value={s}>{statusConfig[s as keyof typeof statusConfig]?.label || s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="icon">
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {selectedOrder && (
        <OrderDetailModal 
          order={selectedOrder}
          open={!!selectedOrder}
          onOpenChange={(open) => !open && setSelectedOrder(null)}
        />
      )}
    </div>
  );
}
