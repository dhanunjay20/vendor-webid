import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, MessageSquare, CheckCircle, Clock, Package, Truck, CheckCheck, Search, X, Calendar, Users, MapPin, DollarSign, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import OrderDetailModal from "@/components/OrderDetailModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import * as api from "@/lib/api";
import { useNotifications } from "@/contexts/NotificationContext";

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
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  
  // Use notification context to listen for real-time order updates
  const { orderNotifications } = useNotifications();

  const vendorOrgId = localStorage.getItem("vendorOrganizationId") || "";

  useEffect(() => {
    loadOrders();
    
    // Set up polling for real-time updates every 30 seconds (as backup)
    const pollInterval = setInterval(() => {
      loadOrders();
    }, 30000);
    
    return () => clearInterval(pollInterval);
  }, []);
  
  // Listen for real-time order notifications and refresh the list
  useEffect(() => {
    if (orderNotifications.length > 0) {
      loadOrders();
    }
  }, [orderNotifications]);

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

  const handleOpenChat = (customerId: string, customerName?: string) => {
    // Navigate to messaging page with customer MongoDB _id as a query parameter
    // customerId should be the MongoDB ObjectId from the users collection
    navigate(`/dashboard/messaging?userId=${customerId}&userName=${encodeURIComponent(customerName || 'Customer')}`);
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
      setOrders(data || []);
    } catch (err: any) {
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
    <div className="container px-3 sm:px-4 md:px-6 py-4 sm:py-6">
      <div className="mb-4 sm:mb-6 md:mb-8 flex flex-col gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Order Management</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Track and manage your accepted catering orders</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-xs sm:text-sm">
            {orders.length} Total Orders
          </Badge>
          <Badge variant="outline" className="text-xs sm:text-sm bg-green-500/10 text-green-600 border-green-500/20">
            {orders.filter(o => o.status === "completed").length} Completed
          </Badge>
        </div>
      </div>

      <div className="mb-4 sm:mb-6 flex flex-col gap-3 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search by client, event, or order ID..." 
            className="pl-10 h-10 sm:h-11 text-sm sm:text-base" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-8 w-8 sm:h-9 sm:w-9 -translate-y-1/2"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px] h-10 sm:h-11 text-sm sm:text-base">
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
          <CardContent className="py-8 sm:py-12 text-center">
            <p className="text-sm sm:text-base text-muted-foreground">Loading orders...</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:gap-6">
          {filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="py-8 sm:py-12 text-center">
                <p className="text-sm sm:text-base text-muted-foreground">No orders found matching your criteria</p>
              </CardContent>
            </Card>
          ) : (
            filteredOrders.map((order) => {
              const StatusIcon = statusConfig[order.status as keyof typeof statusConfig]?.icon || Clock;

              // Determine allowed status options and whether the select should be enabled
              const allOptions = ["pending", "confirmed", "in_progress", "completed", "cancelled"];
              let allowedOptions: string[] = [];
              let canChange = false;

              if (order.status === "pending") {
                // When pending, do not allow changes until admin confirms
                allowedOptions = [order.status];
                canChange = false;
              } else {
                // For all other statuses (confirmed, in_progress, etc.), allow full status updates
                allowedOptions = allOptions;
                canChange = true;
              }

              return (
                <Card key={order.id} className="overflow-hidden transition-smooth hover:shadow-lg">
                  <CardHeader className="bg-gradient-card pb-3 sm:pb-4 px-4 sm:px-6">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base sm:text-lg md:text-xl mb-1 sm:mb-2 truncate">{order.eventName}</CardTitle>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">Order ID: {order.id}</p>
                        </div>
                        <Badge className={`${statusConfig[order.status as keyof typeof statusConfig]?.className || ""} shrink-0 text-xs sm:text-sm`}>
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {statusConfig[order.status as keyof typeof statusConfig]?.label || order.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
                    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-4 sm:mb-6">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg shrink-0">
                          <Calendar className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Event Date</p>
                          <p className="text-sm sm:text-base font-medium">{new Date(order.eventDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg shrink-0">
                          <Users className="h-4 w-4 text-purple-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Guest Count</p>
                          <p className="text-sm sm:text-base font-medium">{order.guestCount} guests</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-2 bg-orange-500/10 rounded-lg shrink-0">
                          <MapPin className="h-4 w-4 text-orange-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-muted-foreground">Location</p>
                          <p className="text-sm sm:text-base font-medium truncate" title={order.eventLocation}>
                            {order.eventLocation}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="p-2 bg-green-500/10 rounded-lg shrink-0">
                          <DollarSign className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">Total Amount</p>
                          <p className="text-base sm:text-lg font-bold text-primary">${order.totalPrice.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-3 sm:pt-4 border-t">
                      <Button 
                        onClick={() => handleViewOrder(order)}
                        disabled={loadingDetail}
                        className="flex-1 h-10 sm:h-11 text-sm sm:text-base"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        <span className="hidden sm:inline">View Details</span>
                        <span className="sm:hidden">Details</span>
                      </Button>
                      <Select value={order.status} onValueChange={(newStatus) => handleUpdateStatus(order.id, newStatus)} disabled={!canChange}>
                        <SelectTrigger className={`flex-1 h-10 sm:h-11 text-sm sm:text-base ${!canChange ? 'opacity-50 cursor-not-allowed' : ''}`}>
                          <SelectValue placeholder="Update Status" />
                        </SelectTrigger>
                        <SelectContent>
                          {allowedOptions.map((s) => (
                            <SelectItem key={s} value={s}>{statusConfig[s as keyof typeof statusConfig]?.label || s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button 
                        variant="outline" 
                        className="sm:w-auto w-full h-10 sm:h-11"
                        onClick={() => handleOpenChat(order.customerId, order.customerName || order.userName)}
                        title="Message Customer"
                      >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        <span className="sm:hidden">Message</span>
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
