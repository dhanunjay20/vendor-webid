import { useState, useEffect } from "react";
import { Search, Calendar, Users, MapPin, DollarSign, Clock, Send, Edit2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import * as api from "@/lib/api";

interface BidRequest {
  bidRequestId: string;
  bidId?: string; // Present if already quoted
  userId: string;
  eventDetails: {
    eventType: string;
    eventName?: string;
    eventDate: string;
    numberOfGuests: number;
    venueAddress: {
      streetAddress?: string;
      city: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
  };
  menuItems?: Array<{
    vendorItemId: string;
    itemName: string;
    quantity?: number;
  }>;
  budget: {
    currency: string;
    estimatedBudget: number;
  };
  status: string;
  totalBidsReceived: number;
  lowestBidAmount?: number;
  quotedPrice?: {
    subtotal: number;
    taxAmount?: number;
    deliveryCharge?: number;
    totalAmount: number;
    currency?: string;
  };
  validUntil?: string;
  termsAndConditions?: string;
  notes?: string;
  quotedAt?: string;
  createdAt: string;
  expiresAt: string;
}

interface BidRequestsResponse {
  success: boolean;
  status: number;
  message: string;
  data: BidRequest[];
  pageInfo: {
    pageNumber: number;
    pageSize: number;
    totalElements: number;
    totalPages: number;
    last: boolean;
  };
}

const statusConfig = {
  ACTIVE: { label: "Active", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  QUOTED: { label: "Quoted", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  ACCEPTED: { label: "Accepted", className: "bg-green-500/10 text-green-600 border-green-500/20" },
  EXPIRED: { label: "Expired", className: "bg-red-500/10 text-red-600 border-red-500/20" },
  CANCELLED: { label: "Cancelled", className: "bg-gray-500/10 text-gray-600 border-gray-500/20" },
};

export default function BidsNew() {
  const [bidRequests, setBidRequests] = useState<BidRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"active" | "quoted">("active");
  const [selectedBidRequest, setSelectedBidRequest] = useState<BidRequest | null>(null);
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Quote form state
  const [quoteForm, setQuoteForm] = useState({
    subtotal: 0,
    taxAmount: 0,
    deliveryCharge: 0,
    totalAmount: 0,
    currency: "INR",
    validUntil: "",
    termsAndConditions: "50% advance payment required. Balance to be paid before event date.",
    notes: "",
  });

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem("authToken");
    if (!token) {
      toast({
        title: "Not Authenticated",
        description: "Please log in to view bid requests",
        variant: "destructive",
      });
      return;
    }
    loadBidRequests();
  }, [page]);

  useEffect(() => {
    // Auto-calculate total amount
    const total = quoteForm.subtotal + quoteForm.taxAmount + quoteForm.deliveryCharge;
    setQuoteForm(prev => ({ ...prev, totalAmount: total }));
  }, [quoteForm.subtotal, quoteForm.taxAmount, quoteForm.deliveryCharge]);

  const loadBidRequests = async () => {
    try {
      setLoading(true);
      const response: any = await api.getReceivedBidRequests(page, 20);
      
      // Handle different response structures
      let data = null;
      let totalPages = 1;
      
      // Check if response has data property (wrapped response)
      if (response && typeof response === 'object') {
        // If response.data is an array, use it directly
        if (Array.isArray(response.data)) {
          data = response.data;
          totalPages = response.pageInfo?.totalPages || 1;
        }
        // If response itself is an array, use it
        else if (Array.isArray(response)) {
          data = response;
        }
        // If response has success flag but no data, check alternative structures
        else if (response.success === false) {
          toast({
            title: "Error",
            description: response.message || "Failed to load bid requests",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        // If response is an object with items or results property
        else if (Array.isArray(response.items)) {
          data = response.items;
          totalPages = response.pageInfo?.totalPages || 1;
        }
        else if (Array.isArray(response.results)) {
          data = response.results;
          totalPages = response.pageInfo?.totalPages || 1;
        }
        // Last resort: check if the response object has properties that look like bid data
        else {
          const keys = Object.keys(response);
          
          // Try to find array-like properties
          for (const key of keys) {
            if (Array.isArray(response[key]) && response[key].length > 0) {
              if (response[key][0]?.bidRequestId || response[key][0]?.eventDetails) {
                data = response[key];
                break;
              }
            }
          }
        }
      }
      
      // Set the bid requests
      if (data && Array.isArray(data) && data.length > 0) {
        setBidRequests(data);
        setTotalPages(totalPages);
      } else if (data && Array.isArray(data) && data.length === 0) {
        setBidRequests([]);
        setTotalPages(1);
      } else {
        setBidRequests([]);
        setTotalPages(1);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load bid requests",
        variant: "destructive",
      });
      setBidRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenQuoteDialog = (bidRequest: BidRequest) => {
    setSelectedBidRequest(bidRequest);
    setQuoteForm({
      subtotal: bidRequest.budget.estimatedBudget * 0.9,
      taxAmount: 0,
      deliveryCharge: 0,
      totalAmount: bidRequest.budget.estimatedBudget * 0.9,
      currency: bidRequest.budget.currency,
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      termsAndConditions: "50% advance payment required. Balance to be paid before event date.",
      notes: "",
    });
    setShowQuoteDialog(true);
  };

  const handleOpenEditDialog = (bidRequest: BidRequest) => {
    setSelectedBidRequest(bidRequest);
    setQuoteForm({
      subtotal: bidRequest.quotedPrice?.subtotal || 0,
      taxAmount: bidRequest.quotedPrice?.taxAmount || 0,
      deliveryCharge: bidRequest.quotedPrice?.deliveryCharge || 0,
      totalAmount: bidRequest.quotedPrice?.totalAmount || 0,
      currency: bidRequest.quotedPrice?.currency || bidRequest.budget.currency,
      validUntil: bidRequest.validUntil ? new Date(bidRequest.validUntil).toISOString().split('T')[0] : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      termsAndConditions: bidRequest.termsAndConditions || "50% advance payment required. Balance to be paid before event date.",
      notes: bidRequest.notes || "",
    });
    setShowEditDialog(true);
  };

  const handleSubmitQuote = async () => {
    if (!selectedBidRequest) return;

    if (quoteForm.totalAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid quotation amount",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        quotedPrice: {
          subtotal: quoteForm.subtotal,
          taxAmount: quoteForm.taxAmount > 0 ? quoteForm.taxAmount : undefined,
          deliveryCharge: quoteForm.deliveryCharge > 0 ? quoteForm.deliveryCharge : undefined,
          totalAmount: quoteForm.totalAmount,
          currency: quoteForm.currency,
        },
        validUntil: quoteForm.validUntil ? new Date(quoteForm.validUntil).toISOString() : undefined,
        termsAndConditions: quoteForm.termsAndConditions || undefined,
        notes: quoteForm.notes || undefined,
      };

      const response = await api.submitBidQuotation(selectedBidRequest.bidRequestId, payload);

      if (response.success) {
        toast({
          title: "Success",
          description: "Quotation submitted successfully",
        });
        setShowQuoteDialog(false);
        loadBidRequests();
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to submit quotation",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit quotation",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateQuote = async () => {
    if (!selectedBidRequest || !selectedBidRequest.bidId) return;

    if (quoteForm.totalAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid quotation amount",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        quotedPrice: {
          subtotal: quoteForm.subtotal,
          taxAmount: quoteForm.taxAmount > 0 ? quoteForm.taxAmount : undefined,
          deliveryCharge: quoteForm.deliveryCharge > 0 ? quoteForm.deliveryCharge : undefined,
          totalAmount: quoteForm.totalAmount,
          currency: quoteForm.currency,
        },
        validUntil: quoteForm.validUntil ? new Date(quoteForm.validUntil).toISOString() : undefined,
        termsAndConditions: quoteForm.termsAndConditions || undefined,
        notes: quoteForm.notes || undefined,
      };

      const response = await api.updateBidQuotation(selectedBidRequest.bidId, payload);

      if (response.success) {
        toast({
          title: "Success",
          description: "Quotation updated and re-submitted successfully",
        });
        setShowEditDialog(false);
        loadBidRequests();
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to update quotation",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update quotation",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

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

  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = {
      INR: "₹",
      USD: "$",
      GBP: "£",
      CAD: "C$",
      AUD: "A$",
      SGD: "S$",
      AED: "د.إ",
    };
    return symbols[currency] || currency;
  };

  const isValidUntilExpired = (validUntil?: string): boolean => {
    if (!validUntil) return false;
    return new Date(validUntil) < new Date();
  };

  const isInCoolingPeriod = (validUntil?: string): boolean => {
    if (!validUntil) return false;
    const now = new Date();
    const valid = new Date(validUntil);
    return valid > now;
  };

  const getTimeUntilExpiry = (validUntil?: string): string => {
    if (!validUntil) return "";
    const now = new Date();
    const valid = new Date(validUntil);
    const diff = valid.getTime() - now.getTime();
    
    if (diff <= 0) return "Expired";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d remaining`;
    }
    
    return `${hours}h ${minutes}m remaining`;
  };

  const activeBids = bidRequests.filter((r) => {
    // All bids where status is ACTIVE or no quotation submitted yet
    const status = r.status?.toUpperCase() || "";
    const hasQuote = r.quotedPrice !== undefined && r.quotedPrice !== null;
    
    // Show in active if: explicitly ACTIVE OR no quotation yet
    return status === "ACTIVE" || status === "OPEN" || status === "PENDING" || !hasQuote;
  });
  
  const quotedBids = bidRequests.filter((r) => {
    // Only show bids where quotation has been submitted
    const status = r.status?.toUpperCase() || "";
    const hasQuote = r.quotedPrice !== undefined && r.quotedPrice !== null;
    
    // Show in quoted if: explicitly QUOTED OR has quotation
    return status === "QUOTED" || status === "REPLIED" || hasQuote;
  });

  const filteredBids = (activeTab === "active" ? activeBids : quotedBids).filter((request) => {
    const matchesSearch =
      request.eventDetails.eventName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.eventDetails.eventType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.eventDetails.venueAddress.city.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Bid Requests</h1>
        <p className="text-muted-foreground">Incoming business opportunities from customers</p>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by event name, type, or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => {
            setActiveTab("active");
            setPage(0); // Reset pagination when switching tabs
          }}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === "active"
              ? "border-orange-500 text-orange-600"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Active Bids ({activeBids.length})
        </button>
        <button
          onClick={() => {
            setActiveTab("quoted");
            setPage(0); // Reset pagination when switching tabs
          }}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === "quoted"
              ? "border-orange-500 text-orange-600"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Your Quotations ({quotedBids.length})
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bidRequests.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeBids.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Quoted</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quotedBids.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Bid Requests List */}
      {loading ? (
        <div className="text-center py-12">Loading bid requests...</div>
      ) : filteredBids.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No {activeTab} bid requests found
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredBids.map((request) => (
            <Card key={request.bidRequestId} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">
                      {request.eventDetails.eventName || `${request.eventDetails.eventType} Event`}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      ID: {request.bidRequestId.slice(0, 16)}...
                    </p>
                  </div>
                  <Badge className={(statusConfig as any)[request.status]?.className || ""}>
                    {(statusConfig as any)[request.status]?.label || request.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Event Details Grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Event Date</p>
                      <p className="text-sm font-medium">{formatDate(request.eventDetails.eventDate)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Guests</p>
                      <p className="text-sm font-medium">{request.eventDetails.numberOfGuests}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Budget</p>
                      <p className="text-sm font-medium">
                        {getCurrencySymbol(request.budget.currency)}
                        {request.budget.estimatedBudget.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p className="text-sm font-medium">{request.eventDetails.venueAddress.city}</p>
                    </div>
                  </div>
                  {request.lowestBidAmount && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-xs text-muted-foreground">Lowest Bid</p>
                        <p className="text-sm font-bold text-green-600">
                          {getCurrencySymbol(request.budget.currency)}
                          {typeof request.lowestBidAmount === 'string' ? parseInt(request.lowestBidAmount).toLocaleString() : request.lowestBidAmount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Menu Items */}
                {request.menuItems && request.menuItems.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold mb-2">
                      Menu Items ({request.menuItems.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {request.menuItems.slice(0, 5).map((item) => (
                        <Badge key={item.vendorItemId} variant="outline" className="text-xs">
                          {item.itemName}
                          {item.quantity && ` (${item.quantity})`}
                        </Badge>
                      ))}
                      {request.menuItems.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{request.menuItems.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Quoted Price (if already quoted) */}
                {activeTab === "quoted" && request.quotedPrice && (
                  <div className="bg-orange-50 dark:bg-orange-950/20 p-3 rounded-lg border border-orange-200">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Subtotal</p>
                        <p className="font-semibold">
                          {getCurrencySymbol(request.quotedPrice.currency || "INR")}
                          {request.quotedPrice.subtotal.toLocaleString()}
                        </p>
                      </div>
                      {request.quotedPrice.taxAmount !== undefined && request.quotedPrice.taxAmount > 0 && (
                        <div>
                          <p className="text-muted-foreground text-xs">Tax</p>
                          <p className="font-semibold">
                            {getCurrencySymbol(request.quotedPrice.currency || "INR")}
                            {request.quotedPrice.taxAmount.toLocaleString()}
                          </p>
                        </div>
                      )}
                      {request.quotedPrice.deliveryCharge !== undefined && request.quotedPrice.deliveryCharge > 0 && (
                        <div>
                          <p className="text-muted-foreground text-xs">Delivery</p>
                          <p className="font-semibold">
                            {getCurrencySymbol(request.quotedPrice.currency || "INR")}
                            {request.quotedPrice.deliveryCharge.toLocaleString()}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-muted-foreground text-xs">Total</p>
                        <p className="font-bold text-orange-600">
                          {getCurrencySymbol(request.quotedPrice.currency || "INR")}
                          {request.quotedPrice.totalAmount.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cooling Period Info */}
                {activeTab === "quoted" && request.validUntil && (
                  <div className={`p-3 rounded-lg border ${
                    isValidUntilExpired(request.validUntil)
                      ? "bg-red-50 dark:bg-red-950/20 border-red-200"
                      : "bg-blue-50 dark:bg-blue-950/20 border-blue-200"
                  }`}>
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-semibold">
                          {isValidUntilExpired(request.validUntil) ? "Cooling Period Expired" : "Cooling Period Active"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Valid until: {formatDate(request.validUntil)} at {formatTime(request.validUntil)}
                        </p>
                        {!isValidUntilExpired(request.validUntil) && (
                          <p className="text-xs font-medium mt-1">
                            ⏱️ {getTimeUntilExpiry(request.validUntil)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {activeTab === "active" ? (
                    <Button
                      onClick={() => handleOpenQuoteDialog(request)}
                      className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Submit Quote
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleOpenEditDialog(request)}
                      disabled={!isInCoolingPeriod(request.validUntil)}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      {isInCoolingPeriod(request.validUntil) ? "Update Quote" : "Cooling Period Expired"}
                    </Button>
                  )}
                  {request.totalBidsReceived > 0 && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      {request.totalBidsReceived} bid{request.totalBidsReceived > 1 ? "s" : ""} received
                    </Badge>
                  )}
                </div>

                {/* Expiry Warning */}
                {new Date(request.expiresAt) < new Date(Date.now() + 24 * 60 * 60 * 1000) && (
                  <div className="text-xs text-red-600">
                    ⚠️ Bid request expires: {formatDate(request.expiresAt)}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="px-4 py-2">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Submit Quote Dialog */}
      <Dialog open={showQuoteDialog} onOpenChange={setShowQuoteDialog}>
        <DialogContent className="max-w-3xl p-0 max-h-[95vh] flex flex-col">
          {/* Dialog Header */}
          <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6 flex-shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-2xl font-bold">Submit Your Quotation</h2>
                <p className="text-orange-100 text-sm mt-1">
                  Respond to bid request for {selectedBidRequest?.eventDetails.eventName || "Event"}
                </p>
              </div>
              <button
                onClick={() => setShowQuoteDialog(false)}
                className="text-white hover:text-orange-100 text-3xl leading-none flex-shrink-0"
              >
                ×
              </button>
            </div>
          </div>

          {/* Dialog Body */}
          {selectedBidRequest && (
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {/* Customer Request Summary */}
              <div>
                <h3 className="font-bold text-base mb-3 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-orange-500" />
                  Customer Requirements
                </h3>
                <Card className="bg-orange-50 dark:bg-orange-950/20 border-orange-200">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">Event</p>
                        <p className="font-semibold text-base mt-2">
                          {selectedBidRequest.eventDetails.eventName || selectedBidRequest.eventDetails.eventType}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">Guests</p>
                        <p className="font-semibold text-base mt-2">{selectedBidRequest.eventDetails.numberOfGuests} people</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">Customer Budget</p>
                        <p className="font-semibold text-base mt-2">
                          {getCurrencySymbol(selectedBidRequest.budget.currency)}
                          {selectedBidRequest.budget.estimatedBudget.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">Event Date</p>
                        <p className="font-semibold text-base mt-2">{formatDate(selectedBidRequest.eventDetails.eventDate)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Your Quotation Form */}
              <div>
                <h3 className="font-bold text-base mb-3 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-orange-500" />
                  Your Quotation
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="font-semibold text-sm block mb-2">Subtotal *</Label>
                      <Input
                        type="number"
                        value={quoteForm.subtotal}
                        onChange={(e) => setQuoteForm({ ...quoteForm, subtotal: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                        className="w-full text-base h-10"
                      />
                    </div>
                    <div>
                      <Label className="font-semibold text-sm block mb-2">Tax/GST (optional)</Label>
                      <Input
                        type="number"
                        value={quoteForm.taxAmount}
                        onChange={(e) => setQuoteForm({ ...quoteForm, taxAmount: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                        className="w-full text-base h-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="font-semibold text-sm block mb-2">Delivery & Setup Charge (optional)</Label>
                    <Input
                      type="number"
                      value={quoteForm.deliveryCharge}
                      onChange={(e) => setQuoteForm({ ...quoteForm, deliveryCharge: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="w-full text-base h-10"
                    />
                  </div>

                  {/* Total Amount Highlight */}
                  <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 p-5 rounded-lg border-2 border-orange-200 mt-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <span className="text-lg font-bold text-gray-700">Total Amount</span>
                      <span className="text-4xl font-bold text-orange-600">
                        {getCurrencySymbol(quoteForm.currency)}
                        {quoteForm.totalAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {quoteForm.totalAmount < selectedBidRequest.budget.estimatedBudget && (
                        <div className="text-sm text-green-600 font-semibold flex items-center gap-2">
                          <span className="text-lg">✓</span>
                          <span>
                            {getCurrencySymbol(quoteForm.currency)}
                            {(selectedBidRequest.budget.estimatedBudget - quoteForm.totalAmount).toLocaleString()} SAVINGS
                          </span>
                        </div>
                      )}
                      {quoteForm.totalAmount > selectedBidRequest.budget.estimatedBudget && (
                        <div className="text-sm text-amber-600 font-semibold flex items-center gap-2">
                          <span>⚠</span>
                          <span>
                            Above budget by {getCurrencySymbol(quoteForm.currency)}
                            {(quoteForm.totalAmount - selectedBidRequest.budget.estimatedBudget).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Terms & Conditions */}
              <div>
                <h3 className="font-bold text-base mb-3">Cooling Period & Terms</h3>
                <div className="space-y-4">
                  <div>
                    <Label className="font-semibold text-sm block mb-2">Valid Until * (Cooling Period)</Label>
                    <Input
                      type="date"
                      value={quoteForm.validUntil}
                      onChange={(e) => setQuoteForm({ ...quoteForm, validUntil: e.target.value })}
                      className="w-full h-10"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      📌 Customer can update your quote before this date. After this, your quote is final.
                    </p>
                  </div>

                  <div>
                    <Label className="font-semibold text-sm block mb-2">Terms & Conditions</Label>
                    <Textarea
                      value={quoteForm.termsAndConditions}
                      onChange={(e) => setQuoteForm({ ...quoteForm, termsAndConditions: e.target.value })}
                      rows={3}
                      placeholder="E.g., 50% advance, balance before event, cancellation policy..."
                      className="w-full text-sm"
                    />
                  </div>

                  <div>
                    <Label className="font-semibold text-sm block mb-2">Additional Notes (optional)</Label>
                    <Textarea
                      value={quoteForm.notes}
                      onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })}
                      rows={2}
                      placeholder="Special requests, menu recommendations, or service details..."
                      className="w-full text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Dialog Footer */}
          <div className="border-t bg-white dark:bg-slate-950 p-6 flex gap-3 justify-end flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => setShowQuoteDialog(false)}
              className="min-w-[120px]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitQuote}
              disabled={submitting || quoteForm.totalAmount <= 0}
              className="min-w-[180px] bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold"
            >
              {submitting ? "Submitting..." : "Submit Quotation"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Quote Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-3xl p-0 max-h-[95vh] flex flex-col">
          {/* Dialog Header */}
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-6 flex-shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-2xl font-bold">Update Your Quotation</h2>
                <p className="text-blue-100 text-sm mt-1">
                  Revise pricing for {selectedBidRequest?.eventDetails.eventName || "Event"} during cooling period
                </p>
              </div>
              <button
                onClick={() => setShowEditDialog(false)}
                className="text-white hover:text-blue-100 text-3xl leading-none flex-shrink-0"
              >
                ×
              </button>
            </div>
          </div>

          {/* Dialog Body */}
          {selectedBidRequest && (
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {/* Cooling Period Alert */}
              {selectedBidRequest.validUntil && (
                <div className={`p-4 rounded-lg border-2 flex items-start gap-3 ${
                  isValidUntilExpired(selectedBidRequest.validUntil)
                    ? "bg-red-50 dark:bg-red-950/30 border-red-300"
                    : "bg-blue-50 dark:bg-blue-950/30 border-blue-300"
                }`}>
                  <AlertCircle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                    isValidUntilExpired(selectedBidRequest.validUntil) ? "text-red-600" : "text-blue-600"
                  }`} />
                  <div className="flex-1">
                    <p className={`font-bold text-sm ${
                      isValidUntilExpired(selectedBidRequest.validUntil) ? "text-red-700" : "text-blue-700"
                    }`}>
                      {isValidUntilExpired(selectedBidRequest.validUntil) ? "⏰ Cooling Period Ended" : "🕐 Cooling Period Active"}
                    </p>
                    <p className="text-sm text-gray-700 mt-2">
                      Valid until: <strong>{formatDate(selectedBidRequest.validUntil)} at {formatTime(selectedBidRequest.validUntil)}</strong>
                    </p>
                    {!isValidUntilExpired(selectedBidRequest.validUntil) && (
                      <p className="text-sm font-semibold text-green-600 mt-2">
                        ✓ {getTimeUntilExpiry(selectedBidRequest.validUntil)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Customer Request Summary */}
              <div>
                <h3 className="font-bold text-base mb-3 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  Customer Requirements
                </h3>
                <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">Event</p>
                        <p className="font-semibold text-base mt-2">
                          {selectedBidRequest.eventDetails.eventName || selectedBidRequest.eventDetails.eventType}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">Guests</p>
                        <p className="font-semibold text-base mt-2">{selectedBidRequest.eventDetails.numberOfGuests} people</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">Customer Budget</p>
                        <p className="font-semibold text-base mt-2">
                          {getCurrencySymbol(selectedBidRequest.budget.currency)}
                          {selectedBidRequest.budget.estimatedBudget.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">Event Date</p>
                        <p className="font-semibold text-base mt-2">{formatDate(selectedBidRequest.eventDetails.eventDate)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Current Quote Display */}
              {selectedBidRequest.quotedPrice && (
                <div>
                  <h3 className="font-bold text-base mb-3">Your Current Quote</h3>
                  <Card className="bg-gray-50 dark:bg-gray-950/20 border-gray-200">
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">Subtotal</p>
                          <p className="font-bold text-base mt-2">
                            {getCurrencySymbol(selectedBidRequest.quotedPrice.currency || "INR")}
                            {selectedBidRequest.quotedPrice.subtotal.toLocaleString()}
                          </p>
                        </div>
                        {selectedBidRequest.quotedPrice.taxAmount !== undefined && selectedBidRequest.quotedPrice.taxAmount > 0 && (
                          <div>
                            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">Tax</p>
                            <p className="font-bold text-base mt-2">
                              {getCurrencySymbol(selectedBidRequest.quotedPrice.currency || "INR")}
                              {selectedBidRequest.quotedPrice.taxAmount.toLocaleString()}
                            </p>
                          </div>
                        )}
                        {selectedBidRequest.quotedPrice.deliveryCharge !== undefined && selectedBidRequest.quotedPrice.deliveryCharge > 0 && (
                          <div>
                            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">Delivery</p>
                            <p className="font-bold text-base mt-2">
                              {getCurrencySymbol(selectedBidRequest.quotedPrice.currency || "INR")}
                              {selectedBidRequest.quotedPrice.deliveryCharge.toLocaleString()}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">Total</p>
                          <p className="font-bold text-base mt-2 text-blue-600">
                            {getCurrencySymbol(selectedBidRequest.quotedPrice.currency || "INR")}
                            {selectedBidRequest.quotedPrice.totalAmount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Updated Quotation Form */}
              <div>
                <h3 className="font-bold text-base mb-3 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-blue-500" />
                  New Quotation
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="font-semibold text-sm block mb-2">Subtotal *</Label>
                      <Input
                        type="number"
                        value={quoteForm.subtotal}
                        onChange={(e) => setQuoteForm({ ...quoteForm, subtotal: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                        className="w-full text-base h-10"
                      />
                    </div>
                    <div>
                      <Label className="font-semibold text-sm block mb-2">Tax/GST (optional)</Label>
                      <Input
                        type="number"
                        value={quoteForm.taxAmount}
                        onChange={(e) => setQuoteForm({ ...quoteForm, taxAmount: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                        className="w-full text-base h-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="font-semibold text-sm block mb-2">Delivery & Setup Charge (optional)</Label>
                    <Input
                      type="number"
                      value={quoteForm.deliveryCharge}
                      onChange={(e) => setQuoteForm({ ...quoteForm, deliveryCharge: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="w-full text-base h-10"
                    />
                  </div>

                  {/* Total Amount Highlight */}
                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 p-5 rounded-lg border-2 border-blue-200 mt-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
                      <span className="text-lg font-bold text-gray-700">New Total Amount</span>
                      <span className="text-4xl font-bold text-blue-600">
                        {getCurrencySymbol(quoteForm.currency)}
                        {quoteForm.totalAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="border-t border-blue-300 pt-3 space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Previous Amount:</span>
                        <span className="font-semibold">{getCurrencySymbol(quoteForm.currency)}{selectedBidRequest.quotedPrice?.totalAmount.toLocaleString() || "N/A"}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Change:</span>
                        <span className={quoteForm.totalAmount < (selectedBidRequest.quotedPrice?.totalAmount || 0) ? "text-green-600 font-semibold" : "text-amber-600 font-semibold"}>
                          {quoteForm.totalAmount < (selectedBidRequest.quotedPrice?.totalAmount || 0) ? "↓ Decreased" : quoteForm.totalAmount > (selectedBidRequest.quotedPrice?.totalAmount || 0) ? "↑ Increased" : "— No change"}
                        </span>
                      </div>
                    </div>
                    {quoteForm.totalAmount < selectedBidRequest.budget.estimatedBudget && (
                      <div className="mt-3 text-sm text-green-600 font-semibold flex items-center gap-2">
                        <span className="text-lg">✓</span>
                        <span>
                          {getCurrencySymbol(quoteForm.currency)}
                          {(selectedBidRequest.budget.estimatedBudget - quoteForm.totalAmount).toLocaleString()} SAVINGS
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Update Terms */}
              <div>
                <h3 className="font-bold text-base mb-3">Update Terms & Notes</h3>
                <div className="space-y-4">
                  <div>
                    <Label className="font-semibold text-sm block mb-2">Valid Until</Label>
                    <Input
                      type="date"
                      value={quoteForm.validUntil}
                      onChange={(e) => setQuoteForm({ ...quoteForm, validUntil: e.target.value })}
                      className="w-full h-10"
                    />
                  </div>

                  <div>
                    <Label className="font-semibold text-sm block mb-2">Terms & Conditions</Label>
                    <Textarea
                      value={quoteForm.termsAndConditions}
                      onChange={(e) => setQuoteForm({ ...quoteForm, termsAndConditions: e.target.value })}
                      rows={3}
                      placeholder="E.g., 50% advance, balance before event, cancellation policy..."
                      className="w-full text-sm"
                    />
                  </div>

                  <div>
                    <Label className="font-semibold text-sm block mb-2">Additional Notes (optional)</Label>
                    <Textarea
                      value={quoteForm.notes}
                      onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })}
                      rows={2}
                      placeholder="Special requests, menu recommendations, or service details..."
                      className="w-full text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Dialog Footer */}
          <div className="border-t bg-white dark:bg-slate-950 p-6 flex gap-3 justify-end flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              className="min-w-[120px]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateQuote}
              disabled={submitting || quoteForm.totalAmount <= 0 || !isInCoolingPeriod(selectedBidRequest?.validUntil)}
              className="min-w-[200px] bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold"
            >
              {submitting ? "Updating..." : "Update & Re-submit Quote"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
