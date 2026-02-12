import { useState, useEffect } from "react";
import { Search, Calendar, Users, MapPin, DollarSign, Send, Edit2, Trash2, AlertCircle, Loader2, TrendingUp, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock, AlertCircle as AlertIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import * as api from "@/lib/api";
import { BidRequestStatus, BidStatus, getStatusBadgeClass, isRequestOpen, canWithdrawBid } from "@/lib/bid-enums";

interface BidRequest {
  bidRequestId: string;
  bidId?: string;
  userId: string;
  eventDetails: {
    eventType: string;
    eventName?: string;
    eventDate: string;
    eventStartTime?: string;
    eventEndTime?: string;
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
    masterItemId?: string | null;
    itemName: string;
    quantity?: number;
  }>;
  additionalRequirements?: {
    serviceStaffNeeded?: boolean;
    numberOfStaff?: number;
    decorationNeeded?: boolean;
    liveCounters?: string[];
    specialInstructions?: string;
  };
  budget: {
    currency: string;
    estimatedBudget: number;
    budgetRange?: string;
  };
  competitivePeriod?: {
    startTime?: string;
    endTime?: string;
    status?: string;
  };
  targetedVendors?: string[];
  status: string;
  totalBidsReceived: number;
  lowestBidAmount?: number;
  quotedPrice?: {
    subtotal: number;
    serviceCharge?: number;
    taxPercentage?: number;
    taxAmount?: number;
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

interface QuoteFormData {
  subtotal: number;
  serviceCharge: number;
  taxPercentage: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  validityPeriodHours: number;
  termsAndConditions: string;
  notes?: string;
  itemizedPricing?: Array<{
    vendorItemId?: string;
    itemName?: string;
    quantity?: number;
    pricePerPlate?: number;
    totalPrice?: number;
  }>;
  deliveryDetails?: {
    estimatedSetupTime?: string;
    foodReadyTime?: string;
    cleanupTime?: string;
  };
  staffProvided?: {
    chefs?: number;
    servers?: number;
    cleaners?: number;
  };
}

export default function BidsNew() {
  const [bidRequests, setBidRequests] = useState<BidRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"active" | "quoted">("active");
  const [selectedBidRequest, setSelectedBidRequest] = useState<BidRequest | null>(null);
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [quoteForm, setQuoteForm] = useState<QuoteFormData>({
    subtotal: 0,
    serviceCharge: 0,
    taxPercentage: 0,
    taxAmount: 0,
    totalAmount: 0,
    currency: "INR",
    validityPeriodHours: 48,
    termsAndConditions: "50% advance payment required. Balance to be paid 3 days before event date.",
    notes: "",
    itemizedPricing: [],
    deliveryDetails: {
      estimatedSetupTime: "",
      foodReadyTime: "",
      cleanupTime: "",
    },
    staffProvided: {
      chefs: 0,
      servers: 0,
      cleaners: 0,
    },
  });

  useEffect(() => {
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
    const total = quoteForm.subtotal + (quoteForm.taxAmount || 0) + (quoteForm.serviceCharge || 0);
    setQuoteForm(prev => ({ ...prev, totalAmount: total }));
  }, [quoteForm.subtotal, quoteForm.taxAmount, quoteForm.serviceCharge]);

  const loadBidRequests = async () => {
    try {
      setLoading(true);
      
      // Fetch received bid requests (invitations) and vendor's submitted bids in parallel
      const [receivedResponse, submittedResponse]: any = await Promise.all([
        api.getReceivedBidRequests(page, 20),
        api.getVendorSubmittedBids(page, 20),
      ]);
      
      // Parse received bid requests
      let receivedData: any[] = [];
      let totalPages = 1;
      
      if (receivedResponse && typeof receivedResponse === 'object') {
        if (Array.isArray(receivedResponse.data)) {
          receivedData = receivedResponse.data;
          totalPages = receivedResponse.pageInfo?.totalPages || 1;
        } else if (Array.isArray(receivedResponse)) {
          receivedData = receivedResponse;
        } else if (Array.isArray(receivedResponse.items) || Array.isArray(receivedResponse.results)) {
          receivedData = receivedResponse.items || receivedResponse.results;
          totalPages = receivedResponse.pageInfo?.totalPages || 1;
        }
      }
      
      // Parse submitted bids
      let submittedData: any[] = [];
      if (submittedResponse && typeof submittedResponse === 'object') {
        if (Array.isArray(submittedResponse.data)) {
          submittedData = submittedResponse.data;
        } else if (Array.isArray(submittedResponse)) {
          submittedData = submittedResponse;
        } else if (Array.isArray(submittedResponse.items) || Array.isArray(submittedResponse.results)) {
          submittedData = submittedResponse.items || submittedResponse.results;
        }
      }
      
      // Merge data: submitted bids already have quotedPrice, received requests may not
      const mergedData = [...receivedData];
      
      // Add submitted bids, updating existing requests with quote info
      submittedData.forEach((submittedBid: any) => {
        const existingIndex = mergedData.findIndex(
          (r) => r.bidRequestId === submittedBid.bidRequestId
        );
        
        if (existingIndex >= 0) {
          // Update existing request with quoted price and bid ID
          mergedData[existingIndex] = {
            ...mergedData[existingIndex],
            quotedPrice: submittedBid.quotedPrice,
            bidId: submittedBid.bidId,
            status: submittedBid.status,
            quotedAt: submittedBid.quotedAt,
          };
        } else {
          // Add as new entry if not in received list
          mergedData.push(submittedBid);
        }
      });
      
      if (mergedData && Array.isArray(mergedData)) {
        setBidRequests(mergedData);
        setTotalPages(totalPages);
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
      subtotal: bidRequest.budget.estimatedBudget * 0.85,
      serviceCharge: 0,
      taxPercentage: 5,
      taxAmount: (bidRequest.budget.estimatedBudget * 0.85) * 0.05,
      totalAmount: (bidRequest.budget.estimatedBudget * 0.85) * 1.05,
      currency: bidRequest.budget.currency,
      validityPeriodHours: 48,
      termsAndConditions: "50% advance payment required. Balance to be paid 3 days before event date.",
      notes: "",
      itemizedPricing: bidRequest.menuItems?.map(item => ({
        vendorItemId: item.vendorItemId,
        itemName: item.itemName,
        quantity: item.quantity || 1,
        pricePerPlate: 0,
        totalPrice: 0,
      })) || [],
      deliveryDetails: {
        estimatedSetupTime: "",
        foodReadyTime: "",
        cleanupTime: "",
      },
      staffProvided: {
        chefs: 0,
        servers: 0,
        cleaners: 0,
      },
    });
    setShowQuoteDialog(true);
  };

  const handleOpenEditDialog = (bidRequest: BidRequest) => {
    setSelectedBidRequest(bidRequest);
    setQuoteForm({
      subtotal: bidRequest.quotedPrice?.subtotal || 0,
      serviceCharge: bidRequest.quotedPrice?.serviceCharge || 0,
      taxPercentage: bidRequest.quotedPrice?.taxPercentage || 0,
      taxAmount: bidRequest.quotedPrice?.taxAmount || 0,
      totalAmount: bidRequest.quotedPrice?.totalAmount || 0,
      currency: bidRequest.quotedPrice?.currency || bidRequest.budget.currency,
      validityPeriodHours: 48,
      termsAndConditions: bidRequest.termsAndConditions || "50% advance payment required. Balance to be paid 3 days before event date.",
      notes: bidRequest.notes || "",
      itemizedPricing: bidRequest.menuItems?.map(item => ({
        vendorItemId: item.vendorItemId,
        itemName: item.itemName,
        quantity: item.quantity || 1,
        pricePerPlate: 0,
        totalPrice: 0,
      })) || [],
      deliveryDetails: {
        estimatedSetupTime: "",
        foodReadyTime: "",
        cleanupTime: "",
      },
      staffProvided: {
        chefs: 0,
        servers: 0,
        cleaners: 0,
      },
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
          currency: quoteForm.currency,
          subtotal: quoteForm.subtotal,
          serviceCharge: quoteForm.serviceCharge > 0 ? quoteForm.serviceCharge : undefined,
          taxPercentage: quoteForm.taxPercentage > 0 ? quoteForm.taxPercentage : undefined,
          taxAmount: quoteForm.taxAmount > 0 ? quoteForm.taxAmount : undefined,
          totalAmount: quoteForm.totalAmount,
        },
        itemizedPricing: quoteForm.itemizedPricing && quoteForm.itemizedPricing.length > 0 
          ? quoteForm.itemizedPricing.filter(item => item.itemName && item.quantity)
          : undefined,
        deliveryDetails: quoteForm.deliveryDetails && (
          quoteForm.deliveryDetails.estimatedSetupTime || 
          quoteForm.deliveryDetails.foodReadyTime || 
          quoteForm.deliveryDetails.cleanupTime
        ) ? quoteForm.deliveryDetails : undefined,
        staffProvided: quoteForm.staffProvided && (
          quoteForm.staffProvided.chefs > 0 || 
          quoteForm.staffProvided.servers > 0 || 
          quoteForm.staffProvided.cleaners > 0
        ) ? quoteForm.staffProvided : undefined,
        validityPeriodHours: quoteForm.validityPeriodHours,
        termsAndConditions: quoteForm.termsAndConditions || undefined,
      };

      const response = await api.submitBid(selectedBidRequest.bidRequestId, payload);

      if (response.success || response.data) {
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
          currency: quoteForm.currency,
          subtotal: quoteForm.subtotal,
          serviceCharge: quoteForm.serviceCharge > 0 ? quoteForm.serviceCharge : undefined,
          taxPercentage: quoteForm.taxPercentage > 0 ? quoteForm.taxPercentage : undefined,
          taxAmount: quoteForm.taxAmount > 0 ? quoteForm.taxAmount : undefined,
          totalAmount: quoteForm.totalAmount,
        },
        validityPeriodHours: quoteForm.validityPeriodHours,
        termsAndConditions: quoteForm.termsAndConditions || undefined,
        notes: quoteForm.notes || undefined,
      };

      const response = await api.reviseBid(selectedBidRequest.bidId, payload);

      if (response.success || response.data) {
        toast({
          title: "Success",
          description: "Quotation updated successfully",
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

  const handleWithdrawBid = async () => {
    if (!selectedBidRequest || !selectedBidRequest.bidId) return;

    try {
      setSubmitting(true);
      const response = await api.withdrawBid(selectedBidRequest.bidId);

      if (response.success || response.data) {
        toast({
          title: "Success",
          description: "Bid withdrawn successfully",
        });
        setShowWithdrawDialog(false);
        loadBidRequests();
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to withdraw bid",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to withdraw bid",
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
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    
    if (days > 0) {
      return `${days}d ${hours}h remaining`;
    }
    
    return `${hours}h ${minutes}m remaining`;
  };

  const activeBids = bidRequests.filter((r) => {
    const status = r.status?.toUpperCase() || "";
    const hasQuote = r.quotedPrice !== undefined && r.quotedPrice !== null;
    return (status === BidRequestStatus.ACTIVE || status === BidRequestStatus.COMPETITIVE) || !hasQuote;
  });
  
  const quotedBids = bidRequests.filter((r) => {
    const hasQuote = r.quotedPrice !== undefined && r.quotedPrice !== null;
    return hasQuote;
  });

  const filteredBids = (activeTab === "active" ? activeBids : quotedBids).filter((request) => {
    const matchesSearch =
      request.eventDetails.eventName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.eventDetails.eventType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.eventDetails.venueAddress.city.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            Bid Requests
          </h1>
          <p className="text-lg text-muted-foreground">
            Manage incoming business opportunities and submit your quotations
          </p>
        </div>

        {/* Search Bar */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search by event name, type, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-11 text-base shadow-sm"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900/50 rounded-t-lg">
          <div className="flex gap-2 p-2 sm:p-4">
            <button
              onClick={() => {
                setActiveTab("active");
                setPage(0);
              }}
              className={`px-4 sm:px-6 py-3 font-semibold text-sm sm:text-base rounded-lg transition-all ${
                activeTab === "active"
                  ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg"
                  : "text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                <span>Active Bids</span>
                <Badge className="ml-1 bg-orange-600 text-white">{activeBids.length}</Badge>
              </div>
            </button>
            <button
              onClick={() => {
                setActiveTab("quoted");
                setPage(0);
              }}
              className={`px-4 sm:px-6 py-3 font-semibold text-sm sm:text-base rounded-lg transition-all ${
                activeTab === "quoted"
                  ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg"
                  : "text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                <span>Your Quotes</span>
                <Badge className="ml-1 bg-blue-600 text-white">{quotedBids.length}</Badge>
              </div>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Total Requests", value: bidRequests.length, icon: Clock, color: "from-blue-500 to-blue-600" },
            { label: "Active", value: activeBids.length, icon: TrendingUp, color: "from-orange-500 to-red-600" },
            { label: "Your Quotes", value: quotedBids.length, icon: CheckCircle2, color: "from-green-500 to-emerald-600" },
          ].map((stat) => (
            <Card key={stat.label} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-4xl font-bold mt-2">{stat.value}</p>
                  </div>
                  <div className={`bg-gradient-to-br ${stat.color} p-4 rounded-lg`}>
                    <stat.icon className="h-8 w-8 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bid Requests List */}
        {loading ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-16 flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
              <p className="text-lg text-muted-foreground">Loading bid requests...</p>
            </CardContent>
          </Card>
        ) : filteredBids.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-16 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-lg text-muted-foreground">
                No {activeTab} bid requests found
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredBids.map((request) => (
              <Card key={request.bidRequestId} className="border-0 shadow-md hover:shadow-xl transition-all overflow-hidden hover:scale-[1.01]">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1 min-w-0">
                      <CardTitle className="text-lg">
                        {request.eventDetails.eventName || `${request.eventDetails.eventType} Event`}
                      </CardTitle>
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="text-xs text-muted-foreground font-mono">ID: {request.bidRequestId.slice(0, 16)}...</p>
                        {request.bidId && (
                          <p className="text-xs text-muted-foreground font-semibold">
                            Your Bid: <span className="font-mono text-sm">{request.bidId.slice(0, 12)}...</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge className={`flex-shrink-0 font-semibold text-sm ${
                      getStatusBadgeClass(request.status)
                    }`}>
                      {request.status || (request.quotedPrice ? "Quoted" : "Active")}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-4">
                  {/* Compact Event Details Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "Date", icon: Calendar, value: formatDate(request.eventDetails.eventDate) },
                      { label: "Guests", icon: Users, value: `${request.eventDetails.numberOfGuests}` },
                      { label: "Budget", icon: DollarSign, value: `${getCurrencySymbol(request.budget.currency)}${request.budget.estimatedBudget.toLocaleString()}` },
                      { label: "Location", icon: MapPin, value: request.eventDetails.venueAddress.city },
                    ].map((detail) => (
                      <div key={detail.label} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-slate-800">
                        <div className="p-1.5 rounded bg-orange-100 dark:bg-orange-900/30">
                          <detail.icon className="h-3.5 w-3.5 text-orange-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground font-medium">{detail.label}</p>
                          <p className="text-xs font-bold truncate">{detail.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Menu Items */}
                  {request.menuItems && request.menuItems.length > 0 && (
                    <div className="border-t pt-4">
                      <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <span>📋 Menu Items ({request.menuItems.length})</span>
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {request.menuItems.slice(0, 6).map((item) => (
                          <Badge key={item.vendorItemId} variant="outline" className="bg-white">
                            {item.itemName}
                            {item.quantity && ` × ${item.quantity}`}
                          </Badge>
                        ))}
                        {request.menuItems.length > 6 && (
                          <Badge variant="outline" className="bg-white">
                            +{request.menuItems.length - 6} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Quoted Price */}
                  {activeTab === "quoted" && request.quotedPrice && (
                    <div className="border-t pt-4">
                      <p className="text-sm font-semibold mb-3">💰 Your Quotation</p>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                          <p className="text-xs text-muted-foreground">Subtotal</p>
                          <p className="font-bold mt-1">{getCurrencySymbol(request.quotedPrice.currency || "INR")}{request.quotedPrice.subtotal.toLocaleString()}</p>
                        </div>
                        {request.quotedPrice.taxAmount !== undefined && request.quotedPrice.taxAmount > 0 && (
                          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                            <p className="text-xs text-muted-foreground">Tax</p>
                            <p className="font-bold mt-1">{getCurrencySymbol(request.quotedPrice.currency || "INR")}{request.quotedPrice.taxAmount.toLocaleString()}</p>
                          </div>
                        )}
                        {request.quotedPrice.serviceCharge !== undefined && request.quotedPrice.serviceCharge > 0 && (
                          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                            <p className="text-xs text-muted-foreground">Service</p>
                            <p className="font-bold mt-1">{getCurrencySymbol(request.quotedPrice.currency || "INR")}{request.quotedPrice.serviceCharge.toLocaleString()}</p>
                          </div>
                        )}
                        <div className="p-3 rounded-lg bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/50 dark:to-cyan-900/50 border-2 border-blue-300">
                          <p className="text-xs text-muted-foreground font-semibold">TOTAL</p>
                          <p className="font-bold mt-1 text-lg text-blue-600 dark:text-blue-300">{getCurrencySymbol(request.quotedPrice.currency || "INR")}{request.quotedPrice.totalAmount.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Cooling Period Info */}
                  {activeTab === "quoted" && request.validUntil && (
                    <div className={`p-4 rounded-lg border-2 flex items-start gap-3 ${
                      isValidUntilExpired(request.validUntil)
                        ? "bg-red-50 dark:bg-red-950/30 border-red-300"
                        : "bg-blue-50 dark:bg-blue-950/30 border-blue-300"
                    }`}>
                      <AlertCircle className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                        isValidUntilExpired(request.validUntil) ? "text-red-600" : "text-blue-600"
                      }`} />
                      <div className="text-sm">
                        <p className={`font-bold ${
                          isValidUntilExpired(request.validUntil) ? "text-red-700" : "text-blue-700"
                        }`}>
                          {isValidUntilExpired(request.validUntil) ? "🕐 Cooling Period Expired" : "✏️ Cooling Period Active"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Valid until: <strong>{formatDate(request.validUntil)} at {formatTime(request.validUntil)}</strong>
                        </p>
                        {!isValidUntilExpired(request.validUntil) && (
                          <p className="text-xs font-bold text-green-600 dark:text-green-400 mt-1">
                            ⏱️ {getTimeUntilExpiry(request.validUntil)}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                    <div className="flex gap-2 w-full sm:w-auto flex-wrap">
                      {activeTab === "active" ? (
                        <>
                          <Button
                            onClick={() => handleOpenQuoteDialog(request)}
                            className="flex-1 sm:flex-none bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold h-11"
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Submit Quote
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedBidRequest(request);
                              setShowDetailsModal(true);
                            }}
                            variant="outline"
                            className="flex-1 sm:flex-none h-11 border-2 border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 text-purple-600 hover:text-purple-700 font-semibold"
                          >
                            👁️ View Details
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            onClick={() => handleOpenEditDialog(request)}
                            disabled={!request.bidId || !canWithdrawBid(request.status)}
                            className="flex-1 sm:flex-none bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold h-11 disabled:opacity-50"
                          >
                            <Edit2 className="h-4 w-4 mr-2" />
                            Revise
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedBidRequest(request);
                              setShowWithdrawDialog(true);
                            }}
                            disabled={!canWithdrawBid(request.bidId ? request.status : "")}
                            variant="outline"
                            className="h-11 bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-black dark:hover:text-black border-red-300 disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            <span className="hidden sm:inline">Withdraw</span>
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedBidRequest(request);
                              setShowDetailsModal(true);
                            }}
                            variant="outline"
                            className="flex-1 sm:flex-none h-11 border-2 border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 text-purple-600 hover:text-purple-700 font-semibold"
                          >
                            👁️ View Details
                          </Button>
                        </>
                      )}
                    </div>

                    {request.totalBidsReceived > 0 && (
                      <Badge variant="secondary" className="flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                        <TrendingUp className="h-3 w-3" />
                        {request.totalBidsReceived} bid{request.totalBidsReceived > 1 ? "s" : ""} received
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Bid Details Modal */}
        <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
          <DialogContent className="max-w-3xl h-[90vh] flex flex-col rounded-2xl border-0 shadow-2xl p-0 gap-0">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 flex justify-between items-center rounded-t-2xl flex-shrink-0">
              <DialogTitle className="text-2xl font-bold text-white">
                {selectedBidRequest?.eventDetails.eventName || `${selectedBidRequest?.eventDetails.eventType} Event`} - Details
              </DialogTitle>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {selectedBidRequest && (
                <div className="space-y-6">
                  {/* Menu Items */}
                  {selectedBidRequest.menuItems && selectedBidRequest.menuItems.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-bold text-lg flex items-center gap-2">📋 Menu Items ({selectedBidRequest.menuItems.length})</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedBidRequest.menuItems.map((item) => (
                          <Badge key={item.vendorItemId} variant="outline" className="bg-white">
                            {item.itemName}
                            {item.quantity && ` × ${item.quantity}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Additional Requirements */}
                  {selectedBidRequest.additionalRequirements && (
                    <div className="space-y-3 border-t pt-4">
                      <h3 className="font-bold text-lg flex items-center gap-2">⚙️ Additional Requirements</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {selectedBidRequest.additionalRequirements.serviceStaffNeeded && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-300">
                            <p className="text-sm font-semibold">Service Staff</p>
                            <p className="text-xs text-muted-foreground">
                              {selectedBidRequest.additionalRequirements.numberOfStaff || 0} staff needed
                            </p>
                          </div>
                        )}
                        {selectedBidRequest.additionalRequirements.decorationNeeded && (
                          <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-300">
                            <p className="text-sm font-semibold">Decoration</p>
                            <p className="text-xs text-muted-foreground">Required</p>
                          </div>
                        )}
                      </div>

                      {selectedBidRequest.additionalRequirements.liveCounters && selectedBidRequest.additionalRequirements.liveCounters.length > 0 && (
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-300">
                          <p className="text-sm font-semibold">🔥 Live Counters</p>
                          <p className="text-xs text-muted-foreground">{selectedBidRequest.additionalRequirements.liveCounters.join(", ")}</p>
                        </div>
                      )}

                      {selectedBidRequest.additionalRequirements.specialInstructions && (
                        <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-300">
                          <p className="text-sm font-semibold">💬 Special Instructions</p>
                          <p className="text-xs">{selectedBidRequest.additionalRequirements.specialInstructions}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Competitive Period */}
                  {selectedBidRequest.competitivePeriod && (
                    <div className="space-y-3 border-t pt-4">
                      <h3 className="font-bold text-lg">⏰ Competitive Period</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <p className="text-xs text-muted-foreground">Status</p>
                          <p className="font-semibold mt-1">{selectedBidRequest.competitivePeriod.status || "ACTIVE"}</p>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <p className="text-xs text-muted-foreground">End Time</p>
                          <p className="font-semibold text-sm mt-1">{selectedBidRequest.competitivePeriod.endTime ? formatDate(selectedBidRequest.competitivePeriod.endTime) : "N/A"}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Budget Range */}
                  {selectedBidRequest.budget.budgetRange && (
                    <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-300">
                      <p className="text-sm font-semibold">💰 Budget Range</p>
                      <p className="text-sm mt-1">{selectedBidRequest.budget.budgetRange}</p>
                    </div>
                  )}

                  {/* Event Timings */}
                  {(selectedBidRequest.eventDetails.eventStartTime || selectedBidRequest.eventDetails.eventEndTime) && (
                    <div className="space-y-2 border-t pt-4">
                      <h3 className="font-bold">🕐 Event Timings</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {selectedBidRequest.eventDetails.eventStartTime && (
                          <div><p className="text-xs text-muted-foreground">Start</p><p className="font-semibold">{selectedBidRequest.eventDetails.eventStartTime}</p></div>
                        )}
                        {selectedBidRequest.eventDetails.eventEndTime && (
                          <div><p className="text-xs text-muted-foreground">End</p><p className="font-semibold">{selectedBidRequest.eventDetails.eventEndTime}</p></div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Venue Address */}
                  <div className="space-y-2 border-t pt-4">
                    <h3 className="font-bold">📍 Venue Address</h3>
                    <div className="text-sm p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <p>{selectedBidRequest.eventDetails.venueAddress.streetAddress}</p>
                      <p>{selectedBidRequest.eventDetails.venueAddress.city}, {selectedBidRequest.eventDetails.venueAddress.state} {selectedBidRequest.eventDetails.venueAddress.postalCode}</p>
                      <p>{selectedBidRequest.eventDetails.venueAddress.country}</p>
                    </div>
                  </div>

                  {/* Your Quotation (if quoted) */}
                  {activeTab === "quoted" && selectedBidRequest.quotedPrice && (
                    <div className="space-y-3 border-t pt-4">
                      <h3 className="font-bold text-lg">💰 Your Quotation</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                          <p className="text-xs text-muted-foreground">Subtotal</p>
                          <p className="font-bold mt-1">{getCurrencySymbol(selectedBidRequest.quotedPrice.currency || "INR")}{selectedBidRequest.quotedPrice.subtotal.toLocaleString()}</p>
                        </div>
                        {selectedBidRequest.quotedPrice.taxAmount !== undefined && selectedBidRequest.quotedPrice.taxAmount > 0 && (
                          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                            <p className="text-xs text-muted-foreground">Tax</p>
                            <p className="font-bold mt-1">{getCurrencySymbol(selectedBidRequest.quotedPrice.currency || "INR")}{selectedBidRequest.quotedPrice.taxAmount.toLocaleString()}</p>
                          </div>
                        )}
                        {selectedBidRequest.quotedPrice.serviceCharge !== undefined && selectedBidRequest.quotedPrice.serviceCharge > 0 && (
                          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                            <p className="text-xs text-muted-foreground">Service</p>
                            <p className="font-bold mt-1">{getCurrencySymbol(selectedBidRequest.quotedPrice.currency || "INR")}{selectedBidRequest.quotedPrice.serviceCharge.toLocaleString()}</p>
                          </div>
                        )}
                        <div className="p-3 rounded-lg bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/50 dark:to-cyan-900/50 border-2 border-blue-300">
                          <p className="text-xs text-muted-foreground font-semibold">TOTAL</p>
                          <p className="font-bold mt-1 text-lg text-blue-600 dark:text-blue-300">{getCurrencySymbol(selectedBidRequest.quotedPrice.currency || "INR")}{selectedBidRequest.quotedPrice.totalAmount.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t bg-slate-50 dark:bg-slate-800 p-4 flex justify-end rounded-b-2xl flex-shrink-0">
              <Button onClick={() => setShowDetailsModal(false)} className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold h-10">
                ✓ Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Quote Dialog */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-3 mt-8">
            <Button
              variant="outline"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              className="h-10"
            >
              ← Previous
            </Button>
            <span className="text-sm font-semibold px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
              className="h-10"
            >
              Next →
            </Button>
          </div>
        )}

        {/* Quote Dialog */}
        <Dialog open={showQuoteDialog} onOpenChange={setShowQuoteDialog}>
          <DialogContent className="max-w-4xl p-0 max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border-0 shadow-2xl [&>button]:hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white p-6 flex-shrink-0">
              <div>
                <h2 className="text-2xl font-bold">Submit Your Quotation</h2>
                <p className="text-orange-100 text-sm mt-1 flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Respond to bid request for {selectedBidRequest?.eventDetails.eventName || "Event"}
                </p>
              </div>
            </div>

            {/* Body */}
            {selectedBidRequest && (
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                {/* Requirements Summary */}
                <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 p-4 rounded-lg border-2 border-orange-200 dark:border-orange-800">
                  <h3 className="font-bold text-base mb-3 flex items-center gap-2">
                    👥 Customer Requirements
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground font-semibold">Event</p>
                      <p className="font-semibold mt-1">{selectedBidRequest.eventDetails.eventName || selectedBidRequest.eventDetails.eventType}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-semibold">Guests</p>
                      <p className="font-semibold mt-1">{selectedBidRequest.eventDetails.numberOfGuests}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-semibold">Budget</p>
                      <p className="font-semibold mt-1 text-orange-600">{getCurrencySymbol(selectedBidRequest.budget.currency)}{selectedBidRequest.budget.estimatedBudget.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-semibold">Date</p>
                      <p className="font-semibold mt-1">{formatDate(selectedBidRequest.eventDetails.eventDate)}</p>
                    </div>
                  </div>
                </div>

                {/* Quotation Form */}
                <div>
                  <h3 className="font-bold text-base mb-3">💰 Your Quotation</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="font-semibold text-sm block mb-2">Subtotal *</Label>
                      <Input
                        type="number"
                        value={quoteForm.subtotal}
                        onChange={(e) => setQuoteForm({ ...quoteForm, subtotal: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                        className="h-10 text-base"
                      />
                    </div>
                    <div>
                      <Label className="font-semibold text-sm block mb-2">Service Charge</Label>
                      <Input
                        type="number"
                        value={quoteForm.serviceCharge}
                        onChange={(e) => setQuoteForm({ ...quoteForm, serviceCharge: parseFloat(e.target.value) || 0 })}
                        placeholder="0"
                        className="h-10 text-base"
                      />
                    </div>
                    <div>
                      <Label className="font-semibold text-sm block mb-2">Tax %</Label>
                      <Input
                        type="number"
                        value={quoteForm.taxPercentage}
                        onChange={(e) => {
                          const taxPct = parseFloat(e.target.value) || 0;
                          const taxAmt = (quoteForm.subtotal + quoteForm.serviceCharge) * (taxPct / 100);
                          setQuoteForm({ ...quoteForm, taxPercentage: taxPct, taxAmount: taxAmt });
                        }}
                        placeholder="0"
                        className="h-10 text-base"
                      />
                    </div>
                  </div>
                </div>

                {/* Total Display */}
                <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/50 dark:to-red-950/50 p-6 rounded-lg border-3 border-orange-300 dark:border-orange-700">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-bold">TOTAL AMOUNT</span>
                    <span className="text-5xl font-bold text-orange-600">{getCurrencySymbol(quoteForm.currency)}{quoteForm.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="space-y-2 border-t border-orange-300 dark:border-orange-700 pt-4">
                    {quoteForm.totalAmount < selectedBidRequest.budget.estimatedBudget ? (
                      <p className="text-sm font-bold text-green-600 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        💚 {getCurrencySymbol(quoteForm.currency)}{(selectedBidRequest.budget.estimatedBudget - quoteForm.totalAmount).toLocaleString()} BELOW BUDGET
                      </p>
                    ) : quoteForm.totalAmount > selectedBidRequest.budget.estimatedBudget ? (
                      <p className="text-sm font-bold text-amber-600 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Above budget by {getCurrencySymbol(quoteForm.currency)}{(quoteForm.totalAmount - selectedBidRequest.budget.estimatedBudget).toLocaleString()}
                      </p>
                    ) : (
                      <p className="text-sm font-bold text-blue-600">Matches customer budget exactly</p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Itemized Pricing */}
                <div>
                  <h3 className="font-bold text-base mb-3">📋 Itemized Pricing (Optional)</h3>
                  <div className="space-y-3">
                    {quoteForm.itemizedPricing?.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-2 md:grid-cols-5 gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700">
                        <Input
                          placeholder="Item name"
                          value={item.itemName || ""}
                          onChange={(e) => {
                            const updated = [...(quoteForm.itemizedPricing || [])];
                            updated[idx].itemName = e.target.value;
                            setQuoteForm({ ...quoteForm, itemizedPricing: updated });
                          }}
                          className="h-9 text-sm"
                        />
                        <Input
                          type="number"
                          placeholder="Qty"
                          value={item.quantity || ""}
                          onChange={(e) => {
                            const updated = [...(quoteForm.itemizedPricing || [])];
                            updated[idx].quantity = parseInt(e.target.value) || 0;
                            setQuoteForm({ ...quoteForm, itemizedPricing: updated });
                          }}
                          className="h-9 text-sm"
                        />
                        <Input
                          type="number"
                          placeholder="Price/unit"
                          value={item.pricePerPlate || ""}
                          onChange={(e) => {
                            const updated = [...(quoteForm.itemizedPricing || [])];
                            updated[idx].pricePerPlate = parseFloat(e.target.value) || 0;
                            updated[idx].totalPrice = (updated[idx].quantity || 0) * (parseFloat(e.target.value) || 0);
                            setQuoteForm({ ...quoteForm, itemizedPricing: updated });
                          }}
                          className="h-9 text-sm"
                        />
                        <div className="text-sm font-semibold p-2 bg-white dark:bg-slate-700 rounded text-center">
                          {getCurrencySymbol(quoteForm.currency)}{((item.quantity || 0) * (item.pricePerPlate || 0)).toLocaleString()}
                        </div>
                        <Button
                          onClick={() => {
                            const updated = quoteForm.itemizedPricing?.filter((_, i) => i !== idx) || [];
                            setQuoteForm({ ...quoteForm, itemizedPricing: updated });
                          }}
                          variant="outline"
                          className="h-9 text-xs"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button
                      onClick={() => {
                        setQuoteForm({
                          ...quoteForm,
                          itemizedPricing: [...(quoteForm.itemizedPricing || []), { itemName: "", quantity: 0, pricePerPlate: 0, totalPrice: 0 }],
                        });
                      }}
                      variant="outline"
                      className="w-full text-sm"
                    >
                      + Add Item
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Delivery Details */}
                <div>
                  <h3 className="font-bold text-base mb-3">🚚 Delivery Details (Optional)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="font-semibold text-sm block mb-2">Setup Time</Label>
                      <Input
                        placeholder="e.g., 1 hour"
                        value={quoteForm.deliveryDetails?.estimatedSetupTime || ""}
                        onChange={(e) => setQuoteForm({
                          ...quoteForm,
                          deliveryDetails: { ...quoteForm.deliveryDetails, estimatedSetupTime: e.target.value },
                        })}
                        className="h-10 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="font-semibold text-sm block mb-2">Food Ready Time</Label>
                      <Input
                        placeholder="e.g., 12:30 PM"
                        value={quoteForm.deliveryDetails?.foodReadyTime || ""}
                        onChange={(e) => setQuoteForm({
                          ...quoteForm,
                          deliveryDetails: { ...quoteForm.deliveryDetails, foodReadyTime: e.target.value },
                        })}
                        className="h-10 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="font-semibold text-sm block mb-2">Cleanup Time</Label>
                      <Input
                        placeholder="e.g., 4:00 PM"
                        value={quoteForm.deliveryDetails?.cleanupTime || ""}
                        onChange={(e) => setQuoteForm({
                          ...quoteForm,
                          deliveryDetails: { ...quoteForm.deliveryDetails, cleanupTime: e.target.value },
                        })}
                        className="h-10 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Staff Provided */}
                <div>
                  <h3 className="font-bold text-base mb-3">👥 Staff Provided (Optional)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="font-semibold text-sm block mb-2">Chefs</Label>
                      <Input
                        type="number"
                        min="0"
                        value={quoteForm.staffProvided?.chefs || 0}
                        onChange={(e) => setQuoteForm({
                          ...quoteForm,
                          staffProvided: { ...quoteForm.staffProvided, chefs: parseInt(e.target.value) || 0 },
                        })}
                        className="h-10 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="font-semibold text-sm block mb-2">Servers</Label>
                      <Input
                        type="number"
                        min="0"
                        value={quoteForm.staffProvided?.servers || 0}
                        onChange={(e) => setQuoteForm({
                          ...quoteForm,
                          staffProvided: { ...quoteForm.staffProvided, servers: parseInt(e.target.value) || 0 },
                        })}
                        className="h-10 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="font-semibold text-sm block mb-2">Cleaners</Label>
                      <Input
                        type="number"
                        min="0"
                        value={quoteForm.staffProvided?.cleaners || 0}
                        onChange={(e) => setQuoteForm({
                          ...quoteForm,
                          staffProvided: { ...quoteForm.staffProvided, cleaners: parseInt(e.target.value) || 0 },
                        })}
                        className="h-10 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Terms */}
                <div>
                  <h3 className="font-bold text-base mb-3">⏰ Validity & Terms</h3>
                  <div className="space-y-4">
                    <div>
                      <Label className="font-semibold text-sm block mb-2">Valid for (hours) *</Label>
                      <Input
                        type="number"
                        value={quoteForm.validityPeriodHours}
                        onChange={(e) => setQuoteForm({ ...quoteForm, validityPeriodHours: parseInt(e.target.value) || 48 })}
                        placeholder="48"
                        className="h-10"
                      />
                      <p className="text-xs text-muted-foreground mt-1">📌 Customer can request revisions within this period</p>
                    </div>

                    <div>
                      <Label className="font-semibold text-sm block mb-2">Terms & Conditions</Label>
                      <Textarea
                        value={quoteForm.termsAndConditions}
                        onChange={(e) => setQuoteForm({ ...quoteForm, termsAndConditions: e.target.value })}
                        rows={3}
                        className="text-sm resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="border-t bg-slate-50 dark:bg-slate-800 p-6 flex gap-3 justify-end rounded-b-2xl">
              <Button onClick={() => setShowQuoteDialog(false)} variant="outline" className="h-11">
                Cancel
              </Button>
              <Button
                onClick={handleSubmitQuote}
                disabled={submitting || quoteForm.totalAmount <= 0}
                className="h-11 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold min-w-[140px]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Quote
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Similar Edit and Withdraw dialogs... (similar structure) */}
        {/* I'll keep them simplified for now */}

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-4xl p-0 max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border-0 shadow-2xl [&>button]:hidden">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-6 flex-shrink-0">
              <div>
                <h2 className="text-2xl font-bold">Revise Your Quotation</h2>
                <p className="text-blue-100 text-sm mt-1">Update your bid during the cooling period</p>
              </div>
            </div>

            {selectedBidRequest && (
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border-2 border-blue-300">
                  <h3 className="font-bold text-base mb-3">📊 Current Quote</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Subtotal</p>
                      <p className="font-bold mt-1">{getCurrencySymbol(quoteForm.currency)}{selectedBidRequest.quotedPrice?.subtotal.toLocaleString() || "0"}</p>
                    </div>
                    {selectedBidRequest.quotedPrice?.taxAmount !== undefined && selectedBidRequest.quotedPrice.taxAmount > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground">Tax</p>
                        <p className="font-bold mt-1">{getCurrencySymbol(quoteForm.currency)}{selectedBidRequest.quotedPrice.taxAmount.toLocaleString()}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">TOTAL</p>
                      <p className="font-bold mt-1 text-blue-600">{getCurrencySymbol(quoteForm.currency)}{selectedBidRequest.quotedPrice?.totalAmount.toLocaleString() || "0"}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-base mb-3">💰 New Quotation</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="font-semibold text-sm block mb-2">Subtotal *</Label>
                      <Input
                        type="number"
                        value={quoteForm.subtotal}
                        onChange={(e) => setQuoteForm({ ...quoteForm, subtotal: parseFloat(e.target.value) || 0 })}
                        className="h-10"
                      />
                    </div>
                    <div>
                      <Label className="font-semibold text-sm block mb-2">Service Charge</Label>
                      <Input
                        type="number"
                        value={quoteForm.serviceCharge}
                        onChange={(e) => setQuoteForm({ ...quoteForm, serviceCharge: parseFloat(e.target.value) || 0 })}
                        className="h-10"
                      />
                    </div>
                    <div>
                      <Label className="font-semibold text-sm block mb-2">Tax %</Label>
                      <Input
                        type="number"
                        value={quoteForm.taxPercentage}
                        onChange={(e) => {
                          const taxPct = parseFloat(e.target.value) || 0;
                          const taxAmt = (quoteForm.subtotal + quoteForm.serviceCharge) * (taxPct / 100);
                          setQuoteForm({ ...quoteForm, taxPercentage: taxPct, taxAmount: taxAmt });
                        }}
                        className="h-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50 p-6 rounded-lg border-3 border-blue-300 dark:border-blue-700">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold">NEW TOTAL</span>
                    <span className="text-4xl font-bold text-blue-600">{getCurrencySymbol(quoteForm.currency)}{quoteForm.totalAmount.toLocaleString()}</span>
                  </div>
                </div>

                <div>
                  <Label className="font-semibold text-sm block mb-2">Terms & Conditions</Label>
                  <Textarea
                    value={quoteForm.termsAndConditions}
                    onChange={(e) => setQuoteForm({ ...quoteForm, termsAndConditions: e.target.value })}
                    rows={3}
                    className="text-sm"
                  />
                </div>
              </div>
            )}

            <div className="border-t bg-slate-50 dark:bg-slate-800 p-6 flex gap-3 justify-end rounded-b-2xl">
              <Button onClick={() => setShowEditDialog(false)} variant="outline" className="h-11">
                Cancel
              </Button>
              <Button
                onClick={handleUpdateQuote}
                disabled={submitting}
                className="h-11 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold min-w-[140px]"
              >
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Edit2 className="h-4 w-4 mr-2" />}
                {submitting ? "Revising..." : "Revise Quote"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Withdraw Dialog */}
        <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
          <DialogContent className="max-w-md rounded-2xl overflow-hidden border-0 shadow-2xl [&>button]:hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                Withdraw Bid
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Are you sure you want to withdraw your bid for <strong>{selectedBidRequest?.eventDetails.eventName}</strong>?
              </p>
              <p className="text-sm text-amber-600 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                This action cannot be undone. You'll need to submit a new bid if you change your mind.
              </p>
            </div>
            <div className="border-t bg-slate-50 dark:bg-slate-800 p-6 flex gap-3 justify-end rounded-b-2xl mt-6">
              <Button onClick={() => setShowWithdrawDialog(false)} variant="outline">
                Cancel
              </Button>
              <Button
                onClick={handleWithdrawBid}
                disabled={submitting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                {submitting ? "Withdrawing..." : "Withdraw Bid"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
