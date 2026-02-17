import { useState, useEffect } from "react";
import { Eye, Search, Clock, CheckCircle, Package, Truck, AlertCircle, Loader2, ChevronLeft, ChevronRight, X, Calendar, Users, MapPin, DollarSign, CreditCard, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import * as api from "@/lib/api";

interface VendorOrderItem {
  vendorItemId: string;
  itemName: string;
  quantity: number;
  pricePerPlate: number;
  totalPrice: number;
}

interface VendorOrder {
  vendorOrderId: string;
  vendorId: string;
  vendorName: string;
  items: VendorOrderItem[];
  subtotal: number;
  serviceCharge: number | null;
  taxAmount: number;
  totalAmount: number;
  vendorStatus: string;
  deliveryStatus: string;
}

interface PaymentDetails {
  tokenAmount: number;
  tokenPaid: boolean;
  tokenPaidAt?: string;
  totalPaid: number;
  balanceDue: number;
  paymentStatus: string;
}

interface Cancellation {
  isCancelled: boolean;
  cancellationReason?: string;
  cancelledAt?: string;
  refundAmount?: number;
  refundStatus?: string;
}

interface Pricing {
  currency: string;
  subtotal: number;
  serviceCharges: number | null;
  taxAmount: number;
  platformFee: number;
  discountAmount: number;
  totalAmount: number;
}

interface EventDetails {
  eventType: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  numberOfGuests: number;
  venueAddress: {
    streetAddress: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

interface OrderResponse {
  orderId: string;
  userId: string;
  bidRequestId: string;
  eventDetails: EventDetails;
  vendorOrders: VendorOrder[];
  pricing: Pricing;
  paymentDetails: PaymentDetails;
  status: string;
  cancellation: Cancellation;
  createdAt: string;
  confirmedAt: string;
}

const statusConfig: Record<string, { label: string; icon: any; color: string; bgColor: string }> = {
  CONFIRMED: {
    label: "Confirmed",
    icon: CheckCircle,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/30 border-blue-300",
  },
  IN_PREPARATION: {
    label: "In Preparation",
    icon: Package,
    color: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-950/30 border-orange-300",
  },
  READY_FOR_DELIVERY: {
    label: "Ready for Delivery",
    icon: Truck,
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-950/30 border-purple-300",
  },
  DELIVERED: {
    label: "Delivered",
    icon: Truck,
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/30 border-green-300",
  },
  COMPLETED: {
    label: "Completed",
    icon: CheckCircle,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300",
  },
  CANCELLED: {
    label: "Cancelled",
    icon: X,
    color: "text-red-600",
    bgColor: "bg-red-50 dark:bg-red-950/30 border-red-300",
  },
};

export default function Orders() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  // Detail modal states
  const [selectedOrder, setSelectedOrder] = useState<OrderResponse | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  // Cancel dialog
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [page, statusFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await api.getVendorOrders(page, 20, statusFilter !== "all" ? statusFilter : undefined);
      setOrders(response.data || []);
      setTotalPages(response.pageInfo?.totalPages || 1);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load orders",
        variant: "destructive",
      });
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrder = (order: OrderResponse) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  };

  const handleCancelOrder = async () => {
    if (!selectedOrder) return;

    try {
      setCancelling(true);
      await api.cancelOrder(selectedOrder.orderId, cancelReason || undefined);
      toast({
        title: "Success",
        description: "Order cancelled successfully",
      });
      setShowCancelDialog(false);
      setCancelReason("");
      loadOrders();
      setShowDetailsModal(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel order",
        variant: "destructive",
      });
    } finally {
      setCancelling(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.eventDetails?.eventName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.orderId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.vendorOrders?.[0]?.vendorName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const canCancelOrder = (status: string) => {
    return ["CONFIRMED", "IN_PREPARATION"].includes(status);
  };

  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = {
      INR: "₹",
      USD: "$",
      GBP: "£",
      EUR: "€",
    };
    return symbols[currency] || currency;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="p-2 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="space-y-1 sm:space-y-2">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            Orders Management
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
            Track and manage your catering orders
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col gap-2 sm:gap-4">
          <div className="relative">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 sm:h-5 w-4 sm:w-5 text-muted-foreground flex-shrink-0" />
            <Input
              placeholder="Search by customer, event, or order ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 sm:pl-12 h-10 sm:h-11 text-sm sm:text-base shadow-sm"
            />
          </div>

          <Select value={statusFilter} onValueChange={(val) => {
            setStatusFilter(val);
            setPage(0);
          }}>
            <SelectTrigger className="h-10 sm:h-11 text-sm sm:text-base">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="CONFIRMED">Confirmed</SelectItem>
              <SelectItem value="IN_PREPARATION">In Preparation</SelectItem>
              <SelectItem value="READY_FOR_DELIVERY">Ready for Delivery</SelectItem>
              <SelectItem value="DELIVERED">Delivered</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-2 sm:p-3">
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">{orders.length}</p>
              <p className="text-lg sm:text-xl font-bold">Total Orders</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-2 sm:p-3">
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">{orders.filter(o => o.status === "CONFIRMED").length}</p>
              <p className="text-lg sm:text-xl font-bold text-blue-600">Confirmed</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-2 sm:p-3">
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">{orders.filter(o => o.status === "IN_PREPARATION").length}</p>
              <p className="text-lg sm:text-xl font-bold text-orange-600">Preparing</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-2 sm:p-3">
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">{orders.filter(o => o.status === "DELIVERED").length}</p>
              <p className="text-lg sm:text-xl font-bold text-green-600">Delivered</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-2 sm:p-3">
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">{orders.filter(o => o.status === "CANCELLED").length}</p>
              <p className="text-lg sm:text-xl font-bold text-red-600">Cancelled</p>
            </CardContent>
          </Card>
        </div>

        {/* Orders List */}
        {loading ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-12 sm:py-16 flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
              <p className="text-sm sm:text-base text-muted-foreground">Loading orders...</p>
            </CardContent>
          </Card>
        ) : filteredOrders.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-12 sm:py-16 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-sm sm:text-base text-muted-foreground">No orders found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:gap-4">
            {filteredOrders.map((order) => {
              const config = statusConfig[order.status] || statusConfig.CONFIRMED;
              const StatusIcon = config.icon;
              const eventDetails = order.eventDetails;
              const firstVendor = order.vendorOrders?.[0];

              return (
                <Card key={order.orderId} className="border-0 shadow-md hover:shadow-lg transition-all overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 pb-3 sm:pb-4">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-2 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base sm:text-lg truncate">{eventDetails?.eventName}</CardTitle>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">Order ID: {order.orderId.slice(0, 16)}...</p>
                      </div>
                      <Badge className={`${config.bgColor} border flex-shrink-0 text-xs sm:text-sm font-semibold`}>
                        <StatusIcon className="h-3 sm:h-4 w-3 sm:w-4 mr-1" />
                        {config.label}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-3 sm:p-6 space-y-3 sm:space-y-4">
                    {/* Event Details Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                      <div className="flex items-center gap-2 p-2 sm:p-3 rounded-lg bg-gray-50 dark:bg-slate-800">
                        <div className="p-1 sm:p-1.5 rounded bg-blue-100 dark:bg-blue-900/30 flex-shrink-0">
                          <Calendar className="h-3 sm:h-4 w-3 sm:w-4 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground font-medium">Date</p>
                          <p className="text-xs sm:text-sm font-bold">{formatDate(eventDetails?.eventDate || "")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2 sm:p-3 rounded-lg bg-gray-50 dark:bg-slate-800">
                        <div className="p-1 sm:p-1.5 rounded bg-purple-100 dark:bg-purple-900/30 flex-shrink-0">
                          <Users className="h-3 sm:h-4 w-3 sm:w-4 text-purple-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground font-medium">Guests</p>
                          <p className="text-xs sm:text-sm font-bold">{eventDetails?.numberOfGuests}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2 sm:p-3 rounded-lg bg-gray-50 dark:bg-slate-800">
                        <div className="p-1 sm:p-1.5 rounded bg-orange-100 dark:bg-orange-900/30 flex-shrink-0">
                          <MapPin className="h-3 sm:h-4 w-3 sm:w-4 text-orange-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-muted-foreground font-medium">Location</p>
                          <p className="text-xs sm:text-sm font-bold truncate">{eventDetails?.venueAddress?.city}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2 sm:p-3 rounded-lg bg-gray-50 dark:bg-slate-800">
                        <div className="p-1 sm:p-1.5 rounded bg-green-100 dark:bg-green-900/30 flex-shrink-0">
                          <DollarSign className="h-3 sm:h-4 w-3 sm:w-4 text-green-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground font-medium">Total</p>
                          <p className="text-xs sm:text-sm font-bold">{getCurrencySymbol(order.pricing?.currency || "INR")}{order.pricing?.totalAmount?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) || "0"}</p>
                        </div>
                      </div>
                    </div>

                    {/* Payment Info */}
                    <div className="p-3 sm:p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-300">
                      <p className="text-xs sm:text-sm font-semibold text-green-700 dark:text-green-300 mb-2">💳 Payment Status: {order.paymentDetails?.paymentStatus}</p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Advance</p>
                          <p className="font-bold text-green-600">{getCurrencySymbol(order.pricing?.currency || "INR")}{order.paymentDetails?.tokenAmount?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) || "0"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Paid</p>
                          <p className="font-bold text-green-600">{getCurrencySymbol(order.pricing?.currency || "INR")}{order.paymentDetails?.totalPaid?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) || "0"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Balance</p>
                          <p className={`font-bold ${order.paymentDetails?.balanceDue === 0 ? "text-green-600" : "text-orange-600"}`}>{getCurrencySymbol(order.pricing?.currency || "INR")}{order.paymentDetails?.balanceDue?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) || "0"}</p>
                        </div>
                      </div>
                    </div>

                    {/* Vendor Info */}
                    {firstVendor && (
                      <div className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-300">
                        <p className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2">👨‍🍳 Vendor: {firstVendor.vendorName}</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-muted-foreground">Vendor Status</p>
                            <p className="font-bold">{firstVendor.vendorStatus}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Delivery Status</p>
                            <p className="font-bold">{firstVendor.deliveryStatus}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <Separator />

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center">
                      <Button
                        onClick={() => handleViewOrder(order)}
                        className="flex-1 sm:flex-none h-10 sm:h-11 text-xs sm:text-sm bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold"
                      >
                        <Eye className="h-3 sm:h-4 w-3 sm:w-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">View Details</span>
                        <span className="sm:hidden">Details</span>
                      </Button>

                      {canCancelOrder(order.status) && (
                        <Button
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowCancelDialog(true);
                          }}
                          variant="outline"
                          className="h-10 sm:h-11 text-xs sm:text-sm px-3 sm:px-4 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 hover:text-red-700 font-semibold"
                        >
                          <Trash2 className="h-3 sm:h-4 w-3 sm:w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 sm:gap-3 mt-6 sm:mt-8">
            <Button
              variant="outline"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              className="h-10 sm:h-11 px-2 sm:px-4 text-sm sm:text-base"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
              className="h-10 sm:h-11 px-2 sm:px-4 text-sm sm:text-base"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-md sm:max-w-xl md:max-w-3xl h-[85vh] sm:h-[90vh] flex flex-col rounded-lg sm:rounded-2xl border-0 shadow-2xl p-0 gap-0 w-[95vw] sm:w-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-3 sm:p-6 flex justify-between items-center rounded-t-lg sm:rounded-t-2xl flex-shrink-0">
            <DialogTitle className="text-lg sm:text-2xl font-bold text-white truncate">
              {selectedOrder?.eventDetails?.eventName || "Order Details"}
            </DialogTitle>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
            {selectedOrder && (
              <>
                {/* Order Info */}
                <div className="space-y-3">
                  <h3 className="font-bold text-base sm:text-lg">📋 Order Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <p className="text-xs text-muted-foreground font-semibold">Order ID</p>
                      <p className="text-sm font-mono mt-1 break-all">{selectedOrder.orderId}</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <p className="text-xs text-muted-foreground font-semibold">Event Type</p>
                      <p className="text-sm font-semibold mt-1">{selectedOrder.eventDetails?.eventType || "N/A"}</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <p className="text-xs text-muted-foreground font-semibold">Event Date</p>
                      <p className="text-sm font-semibold mt-1">{formatDate(selectedOrder.eventDetails?.eventDate || "")}</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <p className="text-xs text-muted-foreground font-semibold">Created</p>
                      <p className="text-sm font-semibold mt-1">{formatDate(selectedOrder.createdAt)}</p>
                    </div>
                  </div>
                </div>

                {/* Event Details */}
                <div className="space-y-3 border-t pt-4">
                  <h3 className="font-bold text-base sm:text-lg">🎉 Event Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-300">
                      <p className="text-xs text-muted-foreground font-semibold">Guests</p>
                      <p className="text-sm font-bold mt-1">{selectedOrder.eventDetails?.numberOfGuests}</p>
                    </div>
                    <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-300">
                      <p className="text-xs text-muted-foreground font-semibold">Time</p>
                      <p className="text-sm font-bold mt-1">{selectedOrder.eventDetails?.eventTime}</p>
                    </div>
                    <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-300 sm:col-span-2">
                      <p className="text-xs text-muted-foreground font-semibold">📍 Venue</p>
                      <p className="text-sm font-semibold mt-1">
                        {selectedOrder.eventDetails?.venueAddress?.streetAddress}, {selectedOrder.eventDetails?.venueAddress?.city}, {selectedOrder.eventDetails?.venueAddress?.state}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Vendor Orders */}
                {selectedOrder.vendorOrders && selectedOrder.vendorOrders.length > 0 && (
                  <div className="space-y-3 border-t pt-4">
                    <h3 className="font-bold text-base sm:text-lg">👨‍🍳 Vendor Orders</h3>
                    {selectedOrder.vendorOrders.map((vendor, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-semibold">{vendor.vendorName}</p>
                            <p className="text-xs text-muted-foreground">Vendor Status: {vendor.vendorStatus}</p>
                          </div>
                          <Badge variant="secondary">{vendor.deliveryStatus}</Badge>
                        </div>
                        {vendor.items && vendor.items.length > 0 && (
                          <div className="space-y-2 text-xs">
                            {vendor.items.map((item, i) => (
                              <div key={i} className="flex justify-between">
                                <span>{item.itemName} x{item.quantity}</span>
                                <span className="font-semibold">{getCurrencySymbol("INR")}{item.totalPrice.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="mt-3 pt-3 border-t flex justify-between font-semibold text-sm">
                          <span>Vendor Total:</span>
                          <span>{getCurrencySymbol("INR")}{vendor.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Payment Details */}
                <div className="space-y-3 border-t pt-4">
                  <h3 className="font-bold text-base sm:text-lg">💳 Payment Details</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-300">
                      <p className="text-xs text-muted-foreground font-semibold">Advance</p>
                      <p className="text-sm font-bold mt-1">{getCurrencySymbol(selectedOrder.pricing?.currency || "INR")}{selectedOrder.paymentDetails?.tokenAmount?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-300">
                      <p className="text-xs text-muted-foreground font-semibold">Total Paid</p>
                      <p className="text-sm font-bold mt-1">{getCurrencySymbol(selectedOrder.pricing?.currency || "INR")}{selectedOrder.paymentDetails?.totalPaid?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                    </div>
                    <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-300">
                      <p className="text-xs text-muted-foreground font-semibold">Balance Due</p>
                      <p className="text-sm font-bold mt-1">{getCurrencySymbol(selectedOrder.pricing?.currency || "INR")}{selectedOrder.paymentDetails?.balanceDue?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <p className="text-xs text-muted-foreground font-semibold">Status</p>
                      <p className="text-sm font-bold mt-1">{selectedOrder.paymentDetails?.paymentStatus}</p>
                    </div>
                  </div>
                </div>

                {/* Pricing Breakdown */}
                <div className="space-y-3 border-t pt-4">
                  <h3 className="font-bold text-base sm:text-lg">💰 Pricing Breakdown</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded">
                      <span>Subtotal</span>
                      <span className="font-semibold">{getCurrencySymbol(selectedOrder.pricing?.currency || "INR")}{selectedOrder.pricing?.subtotal?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded">
                      <span>Tax ({selectedOrder.pricing?.taxAmount ? "GST" : ""})</span>
                      <span className="font-semibold">{getCurrencySymbol(selectedOrder.pricing?.currency || "INR")}{selectedOrder.pricing?.taxAmount?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded">
                      <span>Platform Fee</span>
                      <span className="font-semibold">{getCurrencySymbol(selectedOrder.pricing?.currency || "INR")}{selectedOrder.pricing?.platformFee?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    </div>
                    {selectedOrder.pricing?.discountAmount && selectedOrder.pricing.discountAmount > 0 && (
                      <div className="flex justify-between p-2 bg-green-50 dark:bg-green-950/30 rounded border border-green-300">
                        <span>Discount</span>
                        <span className="font-semibold text-green-600">-{getCurrencySymbol(selectedOrder.pricing?.currency || "INR")}{selectedOrder.pricing.discountAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="flex justify-between p-3 bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 rounded-lg border-2 border-orange-400 font-bold text-lg">
                      <span>Total Amount</span>
                      <span>{getCurrencySymbol(selectedOrder.pricing?.currency || "INR")}{selectedOrder.pricing?.totalAmount?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                {/* Cancellation Info */}
                {selectedOrder.cancellation?.isCancelled && (
                  <div className="space-y-3 border-t pt-4">
                    <h3 className="font-bold text-base sm:text-lg text-red-600">🚫 Cancellation Info</h3>
                    <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border-2 border-red-300">
                      <p className="text-sm"><strong>Reason:</strong> {selectedOrder.cancellation.cancellationReason}</p>
                      <p className="text-sm mt-2"><strong>Cancelled At:</strong> {formatDate(selectedOrder.cancellation.cancelledAt || "")}</p>
                      <p className="text-sm mt-2"><strong>Refund Amount:</strong> {getCurrencySymbol(selectedOrder.pricing?.currency || "INR")}{selectedOrder.cancellation.refundAmount?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                      <p className="text-sm mt-2"><strong>Refund Status:</strong> {selectedOrder.cancellation.refundStatus}</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="border-t bg-slate-50 dark:bg-slate-800 p-3 sm:p-4 flex justify-end rounded-b-lg sm:rounded-b-2xl flex-shrink-0">
            <Button onClick={() => setShowDetailsModal(false)} className="h-9 sm:h-10 text-sm sm:text-base bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold">
              ✓ Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Order Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="max-w-md rounded-2xl border-0 shadow-2xl [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Cancel Order
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to cancel the order for <strong>{selectedOrder?.eventDetails?.eventName}</strong>?
            </p>
            <textarea
              placeholder="Reason for cancellation (optional)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full h-20 p-3 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelDialog(false);
                setCancelReason("");
              }}
              className="h-10"
            >
              Keep Order
            </Button>
            <Button
              onClick={handleCancelOrder}
              disabled={cancelling}
              className="h-10 bg-red-600 hover:bg-red-700 text-white"
            >
              {cancelling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              {cancelling ? "Cancelling..." : "Cancel Order"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
