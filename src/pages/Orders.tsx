import { useState, useEffect } from "react";
import { Eye, Search, Clock, CheckCircle, Package, Truck, AlertCircle, Loader2, ChevronLeft, ChevronRight, X, Calendar, Users, MapPin, DollarSign, CreditCard, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useModernToast } from "@/components/ModernToastProvider";
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
  contactInfo?: {
    primaryContactName: string;
    primaryContactPhone: string;
    primaryContactEmail: string;
  };
  specialInstructions?: string;
  status: string;
  cancellation: Cancellation;
  createdAt: string;
  confirmedAt: string;
  deliveredAt?: string;
  completedAt?: string;
}

const statusConfig: Record<string, { label: string; icon: any; color: string; bgColor: string }> = {
  ACCEPTED: {
    label: "Accepted",
    icon: CheckCircle,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/30 border-blue-300",
  },
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
  DISPATCHED: {
    label: "Dispatched",
    icon: Truck,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-300",
  },
  SETUP_IN_PROGRESS: {
    label: "Setting Up",
    icon: Package,
    color: "text-amber-600",
    bgColor: "bg-amber-50 dark:bg-amber-950/30 border-amber-300",
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
  const { showToast } = useModernToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  // Detail modal states
  const [selectedOrder, setSelectedOrder] = useState<OrderResponse | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  
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
      showToast({
        title: "Error",
        description: error.message || "Failed to load orders",
        variant: "error",
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
      showToast({
        title: "Success",
        description: "Order cancelled successfully",
        variant: "success",
      });
      setShowCancelDialog(false);
      setCancelReason("");
      loadOrders();
      setShowDetailsModal(false);
    } catch (error: any) {
      showToast({
        title: "Error",
        description: error.message || "Failed to cancel order",
        variant: "error",
      });
    } finally {
      setCancelling(false);
    }
  };

  const handleUpdateVendorStatus = async (newStatus: string) => {
    if (!selectedOrder) return;

    try {
      setUpdatingStatus(true);
      await api.updateOrderStatusNew(selectedOrder.orderId, newStatus);
      showToast({
        title: "Success",
        description: `Order status updated to ${newStatus.replace(/_/g, " ")}`,
        variant: "success",
      });
      loadOrders();
      // Update local state
      setSelectedOrder(prev => prev ? {
        ...prev,
        vendorOrders: prev.vendorOrders?.map(vo => ({ ...vo, vendorStatus: newStatus }))
      } : null);
    } catch (error: any) {
      showToast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "error",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getNextVendorStatus = (currentStatus: string): string | null => {
    const flow: Record<string, string> = {
      ACCEPTED: "IN_PREPARATION",
      IN_PREPARATION: "DISPATCHED",
      DISPATCHED: "SETUP_IN_PROGRESS",
      SETUP_IN_PROGRESS: "DELIVERED",
      DELIVERED: "COMPLETED",
    };
    return flow[currentStatus] || null;
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
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Orders Management</h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage your catering orders</p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by customer, event, or order ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
            />
          </div>

          <Select value={statusFilter} onValueChange={(val) => {
            setStatusFilter(val);
            setPage(0);
          }}>
            <SelectTrigger className="w-full sm:w-48 border-gray-300">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="CONFIRMED">Confirmed</SelectItem>
              <SelectItem value="ACCEPTED">Accepted</SelectItem>
              <SelectItem value="IN_PREPARATION">In Preparation</SelectItem>
              <SelectItem value="DISPATCHED">Dispatched</SelectItem>
              <SelectItem value="SETUP_IN_PROGRESS">Setting Up</SelectItem>
              <SelectItem value="DELIVERED">Delivered</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: "Total", count: orders.length, color: "text-gray-900" },
            { label: "Confirmed", count: orders.filter(o => o.status === "CONFIRMED").length, color: "text-blue-600" },
            { label: "Preparing", count: orders.filter(o => o.status === "IN_PREPARATION").length, color: "text-orange-600" },
            { label: "Delivered", count: orders.filter(o => o.status === "DELIVERED").length, color: "text-green-600" },
            { label: "Cancelled", count: orders.filter(o => o.status === "CANCELLED").length, color: "text-red-600" },
          ].map((s) => (
            <Card key={s.label} className="border border-orange-100 shadow-sm bg-white">
              <CardContent className="p-3 sm:p-4">
                <p className={`text-xl sm:text-2xl font-bold ${s.color}`}>{s.count}</p>
                <p className="text-xs sm:text-sm text-gray-500">{s.label}</p>
              </CardContent>
            </Card>
          ))}
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
                <Card key={order.orderId} className="border border-orange-100 shadow-sm hover:shadow-md transition-all overflow-hidden bg-white">
                  <CardHeader className="bg-gray-50 border-b border-orange-100 py-3 px-4">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base sm:text-lg text-gray-900 truncate">{eventDetails?.eventName}</CardTitle>
                        <p className="text-xs text-gray-500 truncate">ID: {order.orderId.slice(0, 16)}...</p>
                      </div>
                      <Badge className={`${config.bgColor} border flex-shrink-0 text-xs font-semibold`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {config.label}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 space-y-3">
                    {/* Event Details Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-50">
                        <Calendar className="h-4 w-4 text-orange-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500">Date</p>
                          <p className="text-xs font-semibold text-gray-900">{formatDate(eventDetails?.eventDate || "")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-50">
                        <Users className="h-4 w-4 text-orange-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500">Guests</p>
                          <p className="text-xs font-semibold text-gray-900">{eventDetails?.numberOfGuests}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-50">
                        <MapPin className="h-4 w-4 text-orange-600 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-500">Location</p>
                          <p className="text-xs font-semibold text-gray-900 truncate">{eventDetails?.venueAddress?.city}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-50">
                        <DollarSign className="h-4 w-4 text-orange-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-gray-500">Total</p>
                          <p className="text-xs font-semibold text-gray-900">{getCurrencySymbol(order.pricing?.currency || "INR")}{order.pricing?.totalAmount?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) || "0"}</p>
                        </div>
                      </div>
                    </div>

                    {/* Payment Info */}
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-xs font-semibold text-green-700 mb-2">Payment: {order.paymentDetails?.paymentStatus}</p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-gray-500">Advance</p>
                          <p className="font-bold text-green-600">{getCurrencySymbol(order.pricing?.currency || "INR")}{order.paymentDetails?.tokenAmount?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) || "0"}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Paid</p>
                          <p className="font-bold text-green-600">{getCurrencySymbol(order.pricing?.currency || "INR")}{order.paymentDetails?.totalPaid?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) || "0"}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Balance</p>
                          <p className={`font-bold ${order.paymentDetails?.balanceDue === 0 ? "text-green-600" : "text-orange-600"}`}>{getCurrencySymbol(order.pricing?.currency || "INR")}{order.paymentDetails?.balanceDue?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) || "0"}</p>
                        </div>
                      </div>
                    </div>

                    {/* Vendor Info */}
                    {firstVendor && (
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-xs font-semibold text-blue-700 mb-2">Vendor: {firstVendor.vendorName}</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-gray-500">Vendor Status</p>
                            <p className="font-semibold text-gray-800">{firstVendor.vendorStatus}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Delivery Status</p>
                            <p className="font-semibold text-gray-800">{firstVendor.deliveryStatus}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <Separator />

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
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
          <div className="flex justify-center items-center gap-3 mt-6">
            <Button
              variant="outline"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              className="h-9 px-4 border-orange-300 text-orange-600 hover:bg-orange-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold px-4 py-2 rounded-lg bg-orange-50 text-orange-700">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
              className="h-9 px-4 border-orange-300 text-orange-600 hover:bg-orange-50"
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
          <div className="border-t bg-slate-50 dark:bg-slate-800 p-3 sm:p-4 flex flex-col sm:flex-row gap-2 sm:gap-3 justify-between items-stretch sm:items-center rounded-b-lg sm:rounded-b-2xl flex-shrink-0">
            {selectedOrder && selectedOrder.vendorOrders?.[0] && (() => {
              const currentVendorStatus = selectedOrder.vendorOrders[0].vendorStatus;
              const nextStatus = getNextVendorStatus(currentVendorStatus);
              return nextStatus ? (
                <Button
                  onClick={() => handleUpdateVendorStatus(nextStatus)}
                  disabled={updatingStatus}
                  className="h-9 sm:h-10 text-sm sm:text-base bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold"
                >
                  {updatingStatus ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  Move to: {nextStatus.replace(/_/g, " ")}
                </Button>
              ) : <div />;
            })()}
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
