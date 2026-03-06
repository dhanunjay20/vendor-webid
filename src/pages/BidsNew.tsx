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
import { useModernToast } from "@/components/ModernToastProvider";
import * as api from "@/lib/api";
import { BidRequestStatus, BidStatus, getStatusBadgeClass, isRequestOpen, canWithdrawBid } from "@/lib/bid-enums";

interface BidRequest {
  bidRequestId: string;
  bidId?: string;
  userId: string;
  vendorId?: string;
  vendorName?: string;
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
  validUntil?: string;
  termsAndConditions?: string;
  notes?: string;
  advancePercentage?: number;
  requiredAdvanceAmount?: number;
  quotedAt?: string;
  submittedAt?: string;
  revisionCount?: number;
  isLowest?: boolean;
  rank?: number;
  validityPeriodHours?: number;
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
  advancePercentage: number;
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
  const [activeTab, setActiveTab] = useState<"active" | "quoted" | "accepted" | "revised" | "withdrawn">("active");
  const [selectedBidRequest, setSelectedBidRequest] = useState<BidRequest | null>(null);
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showQuotedDetailsModal, setShowQuotedDetailsModal] = useState(false);
  const { showToast } = useModernToast();

  const [quoteForm, setQuoteForm] = useState<QuoteFormData>({
    subtotal: 0,
    serviceCharge: 0,
    taxPercentage: 0,
    taxAmount: 0,
    totalAmount: 0,
    currency: "INR",
    advancePercentage: 20,
    validityPeriodHours: 48,
    termsAndConditions: "20% advance payment required. Balance to be paid 3 days before event date.",
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
      showToast({
        title: "Not Authenticated",
        description: "Please log in to view bid requests",
        variant: "error",
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
          // Update existing request with all submitted bid details
          mergedData[existingIndex] = {
            ...mergedData[existingIndex],
            ...submittedBid,
            // Ensure all submitted bid fields are present
            quotedPrice: submittedBid.quotedPrice,
            bidId: submittedBid.bidId,
            status: submittedBid.status,
            quotedAt: submittedBid.quotedAt,
            submittedAt: submittedBid.submittedAt,
            itemizedPricing: submittedBid.itemizedPricing,
            deliveryDetails: submittedBid.deliveryDetails,
            staffProvided: submittedBid.staffProvided,
            validityPeriodHours: submittedBid.validityPeriodHours,
            termsAndConditions: submittedBid.termsAndConditions,
            revisionCount: submittedBid.revisionCount,
            isLowest: submittedBid.isLowest,
            rank: submittedBid.rank,
            vendorName: submittedBid.vendorName,
            vendorId: submittedBid.vendorId,
            expiresAt: submittedBid.expiresAt,
            advancePercentage: submittedBid.advancePercentage,
            requiredAdvanceAmount: submittedBid.requiredAdvanceAmount,
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
      showToast({
        title: "Error",
        description: error.message || "Failed to load bid requests",
        variant: "error",
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
      advancePercentage: 20,
      validityPeriodHours: 48,
      termsAndConditions: "20% advance payment required. Balance to be paid 3 days before event date.",
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
      advancePercentage: bidRequest.advancePercentage || 20,
      validityPeriodHours: bidRequest.validityPeriodHours || 48,
      termsAndConditions: bidRequest.termsAndConditions || "20% advance payment required. Balance to be paid 3 days before event date.",
      notes: bidRequest.notes || "",
      itemizedPricing: bidRequest.menuItems?.map(item => ({
        vendorItemId: item.vendorItemId,
        itemName: item.itemName,
        quantity: item.quantity || 1,
        pricePerPlate: 0,
        totalPrice: 0,
      })) || [],
      deliveryDetails: {
        estimatedSetupTime: bidRequest.deliveryDetails?.estimatedSetupTime || "",
        foodReadyTime: bidRequest.deliveryDetails?.foodReadyTime || "",
        cleanupTime: bidRequest.deliveryDetails?.cleanupTime || "",
      },
      staffProvided: {
        chefs: bidRequest.staffProvided?.chefs || 0,
        servers: bidRequest.staffProvided?.servers || 0,
        cleaners: bidRequest.staffProvided?.cleaners || 0,
      },
    });
    setShowEditDialog(true);
  };

  const handleSubmitQuote = async () => {
    if (!selectedBidRequest) return;

    if (quoteForm.totalAmount <= 0) {
      showToast({
        title: "Invalid Amount",
        description: "Please enter a valid quotation amount",
        variant: "error",
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
        advancePercentage: quoteForm.advancePercentage > 0 ? quoteForm.advancePercentage : undefined,
        requiredAdvanceAmount: quoteForm.advancePercentage > 0 
          ? Math.round(quoteForm.totalAmount * quoteForm.advancePercentage / 100 * 100) / 100 
          : undefined,
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
        showToast({
          title: "Success",
          description: "Quotation submitted successfully",
        });
        setShowQuoteDialog(false);
        loadBidRequests();
      } else {
        showToast({
          title: "Error",
          description: response.message || "Failed to submit quotation",
          variant: "error",
        });
      }
    } catch (error: any) {
      showToast({
        title: "Error",
        description: error.message || "Failed to submit quotation",
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateQuote = async () => {
    if (!selectedBidRequest || !selectedBidRequest.bidId) return;

    if (quoteForm.totalAmount <= 0) {
      showToast({
        title: "Invalid Amount",
        description: "Please enter a valid quotation amount",
        variant: "error",
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
        advancePercentage: quoteForm.advancePercentage > 0 ? quoteForm.advancePercentage : undefined,
        requiredAdvanceAmount: quoteForm.advancePercentage > 0 
          ? Math.round(quoteForm.totalAmount * quoteForm.advancePercentage / 100 * 100) / 100 
          : undefined,
        validityPeriodHours: quoteForm.validityPeriodHours,
        termsAndConditions: quoteForm.termsAndConditions || undefined,
        notes: quoteForm.notes || undefined,
      };

      const response = await api.reviseBid(selectedBidRequest.bidId, payload);

      if (response.success || response.data) {
        showToast({
          title: "Success",
          description: "Quotation updated successfully",
        });
        setShowEditDialog(false);
        loadBidRequests();
      } else {
        showToast({
          title: "Error",
          description: response.message || "Failed to update quotation",
          variant: "error",
        });
      }
    } catch (error: any) {
      showToast({
        title: "Error",
        description: error.message || "Failed to update quotation",
        variant: "error",
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
        showToast({
          title: "Success",
          description: "Bid withdrawn successfully",
        });
        setShowWithdrawDialog(false);
        loadBidRequests();
      } else {
        showToast({
          title: "Error",
          description: response.message || "Failed to withdraw bid",
          variant: "error",
        });
      }
    } catch (error: any) {
      showToast({
        title: "Error",
        description: error.message || "Failed to withdraw bid",
        variant: "error",
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

  const acceptedBids = bidRequests.filter((r) => {
    const status = r.status?.toUpperCase() || "";
    return status === "ACCEPTED";
  });

  const revisedBids = bidRequests.filter((r) => {
    return r.revisionCount && r.revisionCount > 0;
  });

  const withdrawnBids = bidRequests.filter((r) => {
    const status = r.status?.toUpperCase() || "";
    return status === "WITHDRAWN";
  });

  const filteredBids = (
    activeTab === "active" ? activeBids :
    activeTab === "quoted" ? quotedBids :
    activeTab === "accepted" ? acceptedBids :
    activeTab === "revised" ? revisedBids :
    withdrawnBids
  ).filter((request) => {
    // Safe search with optional chaining - handle missing eventDetails
    const matchesSearch =
      request?.eventDetails?.eventName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request?.eventDetails?.eventType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request?.eventDetails?.venueAddress?.city?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Show all items if no search query, or filter by search
    return !searchQuery || matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto">
        {/* Header Section */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Bid Requests</h1>
          <p className="text-sm text-gray-500 mt-1">Manage incoming business opportunities and submit your quotations</p>
        </div>

        {/* Search Bar */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by event name, type, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border border-orange-100 rounded-lg">
          <div className="flex gap-2 p-2 sm:p-3 overflow-x-auto">
            <button
              onClick={() => {
                setActiveTab("active");
                setPage(0);
              }}
              className={`flex-shrink-0 px-4 py-2.5 font-semibold text-sm rounded-lg transition-all ${
                activeTab === "active"
                  ? "bg-orange-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-orange-600 hover:bg-orange-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Active Bids</span>
                <Badge className="ml-1 bg-orange-100 text-orange-700 border-0 text-xs">{activeBids.length}</Badge>
              </div>
            </button>
            <button
              onClick={() => {
                setActiveTab("quoted");
                setPage(0);
              }}
              className={`flex-shrink-0 px-4 py-2.5 font-semibold text-sm rounded-lg transition-all ${
                activeTab === "quoted"
                  ? "bg-orange-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-orange-600 hover:bg-orange-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>Your Quotes</span>
                <Badge className="ml-1 bg-blue-600 text-white">{quotedBids.length}</Badge>
              </div>
            </button>
            <button
              onClick={() => {
                setActiveTab("accepted");
                setPage(0);
              }}
              className={`flex-shrink-0 px-4 py-2.5 font-semibold text-sm rounded-lg transition-all ${
                activeTab === "accepted"
                  ? "bg-orange-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-orange-600 hover:bg-orange-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>Accepted</span>
                <Badge className="ml-1 bg-orange-100 text-orange-700 border-0 text-xs">{acceptedBids.length}</Badge>
              </div>
            </button>
            <button
              onClick={() => {
                setActiveTab("revised");
                setPage(0);
              }}
              className={`flex-shrink-0 px-4 py-2.5 font-semibold text-sm rounded-lg transition-all ${
                activeTab === "revised"
                  ? "bg-orange-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-orange-600 hover:bg-orange-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <Edit2 className="h-4 w-4" />
                <span>Revised</span>
                <Badge className="ml-1 bg-orange-100 text-orange-700 border-0 text-xs">{revisedBids.length}</Badge>
              </div>
            </button>
            <button
              onClick={() => {
                setActiveTab("withdrawn");
                setPage(0);
              }}
              className={`flex-shrink-0 px-4 py-2.5 font-semibold text-sm rounded-lg transition-all ${
                activeTab === "withdrawn"
                  ? "bg-orange-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-orange-600 hover:bg-orange-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                <span>Withdrawn</span>
                <Badge className="ml-1 bg-orange-100 text-orange-700 border-0 text-xs">{withdrawnBids.length}</Badge>
              </div>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total", value: bidRequests.length, icon: Clock, color: "bg-gray-100 text-gray-700" },
            { label: "Active", value: activeBids.length, icon: TrendingUp, color: "bg-orange-100 text-orange-700" },
            { label: "Quotes", value: quotedBids.length, icon: CheckCircle2, color: "bg-green-100 text-green-700" },
            { label: "Accepted", value: acceptedBids.length, icon: CheckCircle2, color: "bg-blue-100 text-blue-700" },
            { label: "Revised", value: revisedBids.length, icon: Edit2, color: "bg-yellow-100 text-yellow-700" },
            { label: "Withdrawn", value: withdrawnBids.length, icon: Trash2, color: "bg-red-100 text-red-700" },
          ].map((stat) => (
            <Card key={stat.label} className="border border-orange-100 shadow-sm bg-white hover:shadow-md transition-all">
              <CardContent className="p-3">
                <div className="flex flex-col items-center text-center">
                  <div className={`${stat.color} p-2 rounded-lg mb-2`}>
                    <stat.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-xs font-medium text-gray-500">{stat.label}</p>
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
              <Card key={request.bidRequestId} className="border border-orange-100 shadow-sm hover:shadow-md transition-all overflow-hidden bg-white">
                <CardHeader className="bg-gray-50 border-b border-orange-100 py-3 px-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <CardTitle className="text-lg">
                          {request.eventDetails?.eventName || `${request.eventDetails?.eventType || "Event"} Event`}
                        </CardTitle>
                        {request.isLowest && (
                          <Badge className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white font-semibold text-xs">
                            ⭐ Lowest Bid
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="text-xs text-muted-foreground font-mono">ID: {request.bidRequestId.slice(0, 16)}...</p>
                        {request.vendorName && (
                          <p className="text-xs text-muted-foreground font-semibold">
                            📍 {request.vendorName}
                          </p>
                        )}
                        {request.bidId && (
                          <p className="text-xs text-muted-foreground font-semibold">
                            Your Bid: <span className="font-mono text-sm">{request.bidId.slice(0, 12)}...</span>
                          </p>
                        )}
                        {request.revisionCount !== undefined && (
                          <p className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                            Revisions: {request.revisionCount}
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
                      { label: "Date", icon: Calendar, value: formatDate(request.eventDetails?.eventDate || "") },
                      { label: "Guests", icon: Users, value: `${request.eventDetails?.numberOfGuests || 0}` },
                      { label: "Budget", icon: DollarSign, value: `${getCurrencySymbol(request.budget?.currency || "INR")}${(request.budget?.estimatedBudget || 0).toLocaleString()}` },
                      { label: "Location", icon: MapPin, value: request.eventDetails?.venueAddress?.city || "N/A" },
                    ].map((detail) => (
                      <div key={detail.label} className="flex items-center gap-2 p-2 rounded-lg bg-orange-50">
                        <div className="p-1.5 rounded bg-orange-100">
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
                        <div className="p-3 rounded-lg bg-gray-50">
                          <p className="text-xs text-gray-500">Subtotal</p>
                          <p className="font-bold mt-1 text-gray-900">{getCurrencySymbol(request.quotedPrice.currency || "INR")}{request.quotedPrice.subtotal.toLocaleString()}</p>
                        </div>
                        {request.quotedPrice.taxAmount !== undefined && request.quotedPrice.taxAmount > 0 && (
                          <div className="p-3 rounded-lg bg-gray-50">
                            <p className="text-xs text-gray-500">Tax</p>
                            <p className="font-bold mt-1 text-gray-900">{getCurrencySymbol(request.quotedPrice.currency || "INR")}{request.quotedPrice.taxAmount.toLocaleString()}</p>
                          </div>
                        )}
                        {request.quotedPrice.serviceCharge !== undefined && request.quotedPrice.serviceCharge > 0 && (
                          <div className="p-3 rounded-lg bg-gray-50">
                            <p className="text-xs text-gray-500">Service</p>
                            <p className="font-bold mt-1 text-gray-900">{getCurrencySymbol(request.quotedPrice.currency || "INR")}{request.quotedPrice.serviceCharge.toLocaleString()}</p>
                          </div>
                        )}
                        <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                          <p className="text-xs text-gray-500 font-semibold">TOTAL</p>
                          <p className="font-bold mt-1 text-lg text-orange-600">{getCurrencySymbol(request.quotedPrice.currency || "INR")}{request.quotedPrice.totalAmount.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Cooling Period Info */}
                  {activeTab === "quoted" && request.validUntil && (
                    <div className={`p-4 rounded-lg border flex items-start gap-3 ${
                      isValidUntilExpired(request.validUntil)
                        ? "bg-red-50 border-red-200"
                        : "bg-orange-50 border-orange-200"
                    }`}>
                      <AlertCircle className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                        isValidUntilExpired(request.validUntil) ? "text-red-600" : "text-blue-600"
                      }`} />
                      <div className="text-sm">
                          <p className={`font-bold ${
                          isValidUntilExpired(request.validUntil) ? "text-red-700" : "text-orange-700"
                        }`}>
                          {isValidUntilExpired(request.validUntil) ? "🕐 Cooling Period Expired" : "✏️ Cooling Period Active"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Valid until: <strong>{formatDate(request.validUntil)} at {formatTime(request.validUntil)}</strong>
                        </p>
                        {!isValidUntilExpired(request.validUntil) && (
                          <p className="text-xs font-bold text-green-600 mt-1">
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
                            className="flex-1 sm:flex-none bg-orange-600 hover:bg-orange-700 text-white font-semibold h-11"
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
                            className="flex-1 sm:flex-none h-11 border-orange-300 hover:bg-orange-50 text-orange-600 hover:text-orange-700 font-semibold"
                          >
                            👁️ User Req Details
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            onClick={() => handleOpenEditDialog(request)}
                            disabled={!request.bidId || !canWithdrawBid(request.status)}
                            className="flex-1 sm:flex-none bg-orange-600 hover:bg-orange-700 text-white font-semibold h-11 disabled:opacity-50"
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
                            className="h-11 bg-red-50 text-red-600 hover:bg-red-100 border-red-300 disabled:opacity-50"
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
                            className="flex-1 sm:flex-none h-11 border-orange-300 hover:bg-orange-50 text-orange-600 hover:text-orange-700 font-semibold"
                          >
                            👁️ View User Req Details
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedBidRequest(request);
                              setShowQuotedDetailsModal(true);
                            }}
                            variant="outline"
                            className="flex-1 sm:flex-none h-11 border-green-300 hover:bg-green-50 text-green-600 hover:text-green-700 font-semibold"
                          >
                            💚 Your Quoted Details
                          </Button>
                        </>
                      )}
                    </div>

                    {request.totalBidsReceived > 0 && (
                      <Badge variant="secondary" className="flex items-center gap-1 bg-green-100 text-green-700">
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
                {selectedBidRequest?.eventDetails?.eventName || `${selectedBidRequest?.eventDetails?.eventType || "Request"} Event`} - Details
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

                  {/* Itemized Pricing with Details */}
                  {selectedBidRequest.itemizedPricing && selectedBidRequest.itemizedPricing.length > 0 && (
                    <div className="space-y-3 border-t pt-4">
                      <h3 className="font-bold text-lg">💵 Itemized Pricing</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-300 dark:border-gray-700">
                              <th className="text-left p-2 font-semibold">Item</th>
                              <th className="text-center p-2 font-semibold">Qty</th>
                              <th className="text-right p-2 font-semibold">Price/Unit</th>
                              <th className="text-right p-2 font-semibold">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedBidRequest.itemizedPricing.map((item, idx) => (
                              <tr key={idx} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                                <td className="p-2">{item.itemName || "-"}</td>
                                <td className="text-center p-2">{item.quantity || "-"}</td>
                                <td className="text-right p-2">{item.pricePerPlate ? `${getCurrencySymbol("INR")}${item.pricePerPlate.toLocaleString()}` : "-"}</td>
                                <td className="text-right p-2 font-semibold">{item.totalPrice ? `${getCurrencySymbol("INR")}${item.totalPrice.toLocaleString()}` : "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
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
                  {selectedBidRequest?.budget?.budgetRange && (
                    <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-300">
                      <p className="text-sm font-semibold">💰 Budget Range</p>
                      <p className="text-sm mt-1">{selectedBidRequest.budget.budgetRange}</p>
                    </div>
                  )}

                  {/* Event Timings */}
                  {(selectedBidRequest?.eventDetails?.eventStartTime || selectedBidRequest?.eventDetails?.eventEndTime) && (
                    <div className="space-y-2 border-t pt-4">
                      <h3 className="font-bold">🕐 Event Timings</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {selectedBidRequest?.eventDetails?.eventStartTime && (
                          <div><p className="text-xs text-muted-foreground">Start</p><p className="font-semibold">{selectedBidRequest.eventDetails.eventStartTime}</p></div>
                        )}
                        {selectedBidRequest?.eventDetails?.eventEndTime && (
                          <div><p className="text-xs text-muted-foreground">End</p><p className="font-semibold">{selectedBidRequest.eventDetails.eventEndTime}</p></div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Venue Address */}
                  <div className="space-y-2 border-t pt-4">
                    <h3 className="font-bold">📍 Venue Address</h3>
                    <div className="text-sm p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <p>{selectedBidRequest?.eventDetails?.venueAddress?.streetAddress || "N/A"}</p>
                      <p>{selectedBidRequest?.eventDetails?.venueAddress?.city}, {selectedBidRequest?.eventDetails?.venueAddress?.state} {selectedBidRequest?.eventDetails?.venueAddress?.postalCode}</p>
                      <p>{selectedBidRequest?.eventDetails?.venueAddress?.country || ""}</p>
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

                  {/* Delivery Details (from submitted bid) */}
                  {selectedBidRequest.deliveryDetails && (
                    <div className="space-y-3 border-t pt-4">
                      <h3 className="font-bold text-lg">🚚 Delivery Details</h3>
                      <div className="grid grid-cols-3 gap-3">
                        {selectedBidRequest.deliveryDetails.estimatedSetupTime && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-300">
                            <p className="text-xs text-muted-foreground">Setup Time</p>
                            <p className="font-semibold mt-1">{selectedBidRequest.deliveryDetails.estimatedSetupTime}</p>
                          </div>
                        )}
                        {selectedBidRequest.deliveryDetails.foodReadyTime && (
                          <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-300">
                            <p className="text-xs text-muted-foreground">Food Ready Time</p>
                            <p className="font-semibold mt-1">{selectedBidRequest.deliveryDetails.foodReadyTime}</p>
                          </div>
                        )}
                        {selectedBidRequest.deliveryDetails.cleanupTime && (
                          <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-300">
                            <p className="text-xs text-muted-foreground">Cleanup Time</p>
                            <p className="font-semibold mt-1">{selectedBidRequest.deliveryDetails.cleanupTime}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Staff Provided (from submitted bid) */}
                  {selectedBidRequest.staffProvided && (selectedBidRequest.staffProvided.chefs || selectedBidRequest.staffProvided.servers || selectedBidRequest.staffProvided.cleaners) && (
                    <div className="space-y-3 border-t pt-4">
                      <h3 className="font-bold text-lg">👥 Staff Provided</h3>
                      <div className="grid grid-cols-3 gap-3">
                        {selectedBidRequest.staffProvided.chefs !== undefined && selectedBidRequest.staffProvided.chefs > 0 && (
                          <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-300">
                            <p className="text-xs text-muted-foreground">Chefs</p>
                            <p className="text-2xl font-bold text-orange-600 mt-1">{selectedBidRequest.staffProvided.chefs}</p>
                          </div>
                        )}
                        {selectedBidRequest.staffProvided.servers !== undefined && selectedBidRequest.staffProvided.servers > 0 && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-300">
                            <p className="text-xs text-muted-foreground">Servers</p>
                            <p className="text-2xl font-bold text-blue-600 mt-1">{selectedBidRequest.staffProvided.servers}</p>
                          </div>
                        )}
                        {selectedBidRequest.staffProvided.cleaners !== undefined && selectedBidRequest.staffProvided.cleaners > 0 && (
                          <div className="p-3 bg-cyan-50 dark:bg-cyan-950/30 rounded-lg border border-cyan-300">
                            <p className="text-xs text-muted-foreground">Cleaners</p>
                            <p className="text-2xl font-bold text-cyan-600 mt-1">{selectedBidRequest.staffProvided.cleaners}</p>
                          </div>
                        )}
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

        {/* Your Quoted Details Modal */}
        <Dialog open={showQuotedDetailsModal} onOpenChange={setShowQuotedDetailsModal}>
          <DialogContent className="max-w-3xl h-[90vh] flex flex-col rounded-2xl border-0 shadow-2xl p-0 gap-0">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-6 rounded-t-2xl flex-shrink-0">
              <div className="space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <DialogTitle className="text-2xl font-bold text-white">
                    💚 Your Quoted Details
                  </DialogTitle>
                  {selectedBidRequest?.isLowest && (
                    <Badge className="bg-yellow-300 text-yellow-900 font-semibold">⭐ Lowest Bid</Badge>
                  )}
                </div>
                <p className="text-sm text-green-100">
                  {selectedBidRequest?.eventDetails?.eventName || `${selectedBidRequest?.eventDetails?.eventType || "Request"} Event`}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs text-green-100 pt-2">
                  {selectedBidRequest?.bidId && (
                    <div>
                      <p className="font-semibold">Bid ID</p>
                      <p className="font-mono text-green-50 truncate">{selectedBidRequest.bidId.slice(0, 12)}...</p>
                    </div>
                  )}
                  {selectedBidRequest?.vendorName && (
                    <div>
                      <p className="font-semibold">Vendor</p>
                      <p className="text-green-50">{selectedBidRequest.vendorName}</p>
                    </div>
                  )}
                  {selectedBidRequest?.status && (
                    <div>
                      <p className="font-semibold">Status</p>
                      <p className="text-green-50 font-semibold">{selectedBidRequest.status}</p>
                    </div>
                  )}
                  {selectedBidRequest?.rank !== undefined && (
                    <div>
                      <p className="font-semibold">Rank</p>
                      <p className="text-green-50 font-bold">#{selectedBidRequest.rank}</p>
                    </div>
                  )}
                  {selectedBidRequest?.quotedPrice?.totalAmount && (
                    <div>
                      <p className="font-semibold">Total Quote</p>
                      <p className="text-green-50 font-bold">{getCurrencySymbol(selectedBidRequest.quotedPrice.currency || "INR")}{selectedBidRequest.quotedPrice.totalAmount.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {selectedBidRequest && (
                <div className="space-y-6">
                  {/* Your Quotation Price */}
                  {selectedBidRequest.quotedPrice && (
                    <div className="space-y-3">
                      <h3 className="font-bold text-lg">💰 Your Quotation</h3>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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
                        <div className="p-3 rounded-lg bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/50 border-2 border-green-300">
                          <p className="text-xs text-muted-foreground font-semibold">TOTAL</p>
                          <p className="font-bold mt-1 text-lg text-green-600 dark:text-green-300">{getCurrencySymbol(selectedBidRequest.quotedPrice.currency || "INR")}{selectedBidRequest.quotedPrice.totalAmount.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Advance Payment Required */}
                  {selectedBidRequest.advancePercentage !== undefined && selectedBidRequest.advancePercentage > 0 && (
                    <div className="space-y-3 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 p-4 rounded-lg border-2 border-orange-300 dark:border-orange-700">
                      <h3 className="font-bold text-lg">💳 Advance Payment Required</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-white dark:bg-slate-800 rounded-lg">
                          <p className="text-xs text-muted-foreground">Advance Percentage</p>
                          <p className="font-bold text-lg mt-1 text-orange-600">{selectedBidRequest.advancePercentage}%</p>
                        </div>
                        <div className="p-3 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/50 dark:to-amber-900/50 rounded-lg border border-orange-300">
                          <p className="text-xs text-muted-foreground font-semibold">Amount Required</p>
                          <p className="font-bold text-lg mt-1 text-orange-600">{getCurrencySymbol(selectedBidRequest.quotedPrice?.currency || "INR")}{selectedBidRequest.requiredAdvanceAmount?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) || ((selectedBidRequest.quotedPrice?.totalAmount || 0) * (selectedBidRequest.advancePercentage || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Itemized Pricing */}
                  {selectedBidRequest.itemizedPricing && selectedBidRequest.itemizedPricing.length > 0 && (
                    <div className="space-y-3 border-t pt-6">
                      <h3 className="font-bold text-lg">📋 Itemized Pricing</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-300 dark:border-gray-700">
                              <th className="text-left p-2 font-semibold">Item</th>
                              <th className="text-center p-2 font-semibold">Qty</th>
                              <th className="text-right p-2 font-semibold">Price/Unit</th>
                              <th className="text-right p-2 font-semibold">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedBidRequest.itemizedPricing.map((item, idx) => (
                              <tr key={idx} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                                <td className="p-2">{item.itemName || "-"}</td>
                                <td className="text-center p-2">{item.quantity || "-"}</td>
                                <td className="text-right p-2">{item.pricePerPlate ? `${getCurrencySymbol("INR")}${item.pricePerPlate.toLocaleString()}` : "-"}</td>
                                <td className="text-right p-2 font-semibold">{item.totalPrice ? `${getCurrencySymbol("INR")}${item.totalPrice.toLocaleString()}` : "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Delivery Details */}
                  {selectedBidRequest.deliveryDetails && (
                    <div className="space-y-3 border-t pt-6">
                      <h3 className="font-bold text-lg">🚚 Delivery Details</h3>
                      <div className="grid grid-cols-3 gap-3">
                        {selectedBidRequest.deliveryDetails.estimatedSetupTime && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-300">
                            <p className="text-xs text-muted-foreground">Setup Time</p>
                            <p className="font-semibold mt-1">{selectedBidRequest.deliveryDetails.estimatedSetupTime}</p>
                          </div>
                        )}
                        {selectedBidRequest.deliveryDetails.foodReadyTime && (
                          <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-300">
                            <p className="text-xs text-muted-foreground">Food Ready Time</p>
                            <p className="font-semibold mt-1">{selectedBidRequest.deliveryDetails.foodReadyTime}</p>
                          </div>
                        )}
                        {selectedBidRequest.deliveryDetails.cleanupTime && (
                          <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-300">
                            <p className="text-xs text-muted-foreground">Cleanup Time</p>
                            <p className="font-semibold mt-1">{selectedBidRequest.deliveryDetails.cleanupTime}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Staff Provided */}
                  {selectedBidRequest.staffProvided && (selectedBidRequest.staffProvided.chefs || selectedBidRequest.staffProvided.servers || selectedBidRequest.staffProvided.cleaners) && (
                    <div className="space-y-3 border-t pt-6">
                      <h3 className="font-bold text-lg">👥 Staff Provided</h3>
                      <div className="grid grid-cols-3 gap-3">
                        {selectedBidRequest.staffProvided.chefs !== undefined && selectedBidRequest.staffProvided.chefs > 0 && (
                          <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-300">
                            <p className="text-xs text-muted-foreground">Chefs</p>
                            <p className="text-2xl font-bold text-orange-600 mt-1">{selectedBidRequest.staffProvided.chefs}</p>
                          </div>
                        )}
                        {selectedBidRequest.staffProvided.servers !== undefined && selectedBidRequest.staffProvided.servers > 0 && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-300">
                            <p className="text-xs text-muted-foreground">Servers</p>
                            <p className="text-2xl font-bold text-blue-600 mt-1">{selectedBidRequest.staffProvided.servers}</p>
                          </div>
                        )}
                        {selectedBidRequest.staffProvided.cleaners !== undefined && selectedBidRequest.staffProvided.cleaners > 0 && (
                          <div className="p-3 bg-cyan-50 dark:bg-cyan-950/30 rounded-lg border border-cyan-300">
                            <p className="text-xs text-muted-foreground">Cleaners</p>
                            <p className="text-2xl font-bold text-cyan-600 mt-1">{selectedBidRequest.staffProvided.cleaners}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Terms & Conditions */}
                  {selectedBidRequest.termsAndConditions && (
                    <div className="space-y-3 border-t pt-6">
                      <h3 className="font-bold text-lg">📋 Terms & Conditions</h3>
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-300">
                        <p className="text-sm">{selectedBidRequest.termsAndConditions}</p>
                      </div>
                    </div>
                  )}

                  {/* Bid Timeline & Status Info */}
                  <div className="space-y-4 border-t pt-6">
                    {/* Status Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-gray-300 dark:border-gray-700">
                        <p className="text-xs text-muted-foreground">Status</p>
                        <p className="font-semibold mt-1">{selectedBidRequest.status || "SUBMITTED"}</p>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-gray-300 dark:border-gray-700">
                        <p className="text-xs text-muted-foreground">Valid For</p>
                        <p className="font-semibold mt-1">{selectedBidRequest.validityPeriodHours || 48}h</p>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-gray-300 dark:border-gray-700">
                        <p className="text-xs text-muted-foreground">Revisions</p>
                        <p className="font-semibold mt-1">{selectedBidRequest.revisionCount || 0}</p>
                      </div>
                      {selectedBidRequest.isLowest && (
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border-2 border-yellow-400">
                          <p className="text-xs text-muted-foreground font-semibold">Rank</p>
                          <p className="font-bold mt-1 text-yellow-600 dark:text-yellow-300 text-lg">⭐ #{selectedBidRequest.rank || "N/A"}</p>
                        </div>
                      )}
                    </div>

                    {/* Important Dates */}
                    {(selectedBidRequest.submittedAt || selectedBidRequest.expiresAt || selectedBidRequest.quotedAt) && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {selectedBidRequest.submittedAt && (
                          <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-300">
                            <p className="text-xs text-muted-foreground font-semibold">Submitted</p>
                            <p className="font-semibold text-sm mt-1">{formatDate(selectedBidRequest.submittedAt)}</p>
                            <p className="text-xs">{formatTime(selectedBidRequest.submittedAt)}</p>
                          </div>
                        )}
                        {selectedBidRequest.expiresAt && (
                          <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-300">
                            <p className="text-xs text-muted-foreground font-semibold">Expires</p>
                            <p className="font-semibold text-sm mt-1">{formatDate(selectedBidRequest.expiresAt)}</p>
                            <p className="text-xs">{formatTime(selectedBidRequest.expiresAt)}</p>
                          </div>
                        )}
                        {selectedBidRequest.quotedAt && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-300">
                            <p className="text-xs text-muted-foreground font-semibold">Last Quoted</p>
                            <p className="font-semibold text-sm mt-1">{formatDate(selectedBidRequest.quotedAt)}</p>
                            <p className="text-xs">{formatTime(selectedBidRequest.quotedAt)}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* IDs Section */}
                    {(selectedBidRequest.bidId || selectedBidRequest.bidRequestId || selectedBidRequest.vendorId) && (
                      <div className="grid gap-3">
                        <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-300">
                          <p className="text-xs text-muted-foreground font-semibold">Bid ID</p>
                          <p className="font-mono text-xs mt-1 break-all">{selectedBidRequest.bidId || "N/A"}</p>
                        </div>
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg border border-indigo-300">
                          <p className="text-xs text-muted-foreground font-semibold">Bid Request ID</p>
                          <p className="font-mono text-xs mt-1 break-all">{selectedBidRequest.bidRequestId || "N/A"}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t bg-slate-50 dark:bg-slate-800 p-4 flex justify-end rounded-b-2xl flex-shrink-0">
              <Button onClick={() => setShowQuotedDetailsModal(false)} className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold h-10">
                ✓ Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
                  Respond to bid request for {selectedBidRequest?.eventDetails?.eventName || "Event"}
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
                      <p className="font-semibold mt-1">{selectedBidRequest?.eventDetails?.eventName || selectedBidRequest?.eventDetails?.eventType || "Event"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-semibold">Guests</p>
                      <p className="font-semibold mt-1">{selectedBidRequest?.eventDetails?.numberOfGuests || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-semibold">Budget</p>
                      <p className="font-semibold mt-1 text-orange-600">{getCurrencySymbol(selectedBidRequest?.budget?.currency || "INR")}{(selectedBidRequest?.budget?.estimatedBudget || 0).toLocaleString()}</p>
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
                    {selectedBidRequest?.budget?.estimatedBudget && quoteForm.totalAmount < selectedBidRequest.budget.estimatedBudget ? (
                      <p className="text-sm font-bold text-green-600 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        💚 {getCurrencySymbol(quoteForm.currency)}{(selectedBidRequest.budget.estimatedBudget - quoteForm.totalAmount).toLocaleString()} BELOW BUDGET
                      </p>
                    ) : selectedBidRequest?.budget?.estimatedBudget && quoteForm.totalAmount > selectedBidRequest.budget.estimatedBudget ? (
                      <p className="text-sm font-bold text-amber-600 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Above budget by {getCurrencySymbol(quoteForm.currency)}{(quoteForm.totalAmount - selectedBidRequest.budget.estimatedBudget).toLocaleString()}
                      </p>
                    ) : selectedBidRequest?.budget?.estimatedBudget ? (
                      <p className="text-sm font-bold text-blue-600">Matches customer budget exactly</p>
                    ) : null}
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

                {/* Advance Payment */}
                <div>
                  <h3 className="font-bold text-base mb-3">💳 Advance Payment Required</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="font-semibold text-sm block mb-2">Advance % *</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={quoteForm.advancePercentage}
                          onChange={(e) => setQuoteForm({
                            ...quoteForm,
                            advancePercentage: parseFloat(e.target.value) || 0,
                          })}
                          className="h-10 text-sm flex-1"
                        />
                        <div className="px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded font-bold text-sm flex items-center">%</div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">How much % advance payment do you need?</p>
                    </div>
                    <div>
                      <Label className="font-semibold text-sm block mb-2">Required Amount</Label>
                      <div className="px-4 py-2 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded border-2 border-green-300 dark:border-green-700 h-10 flex items-center">
                        <span className="font-bold text-lg text-green-600">{getCurrencySymbol(quoteForm.currency)}{((quoteForm.totalAmount * quoteForm.advancePercentage) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Amount customer must pay upfront</p>
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
                  <h3 className="font-bold text-base mb-3">💳 Advance Payment Required</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="font-semibold text-sm block mb-2">Advance % *</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={quoteForm.advancePercentage}
                          onChange={(e) => setQuoteForm({
                            ...quoteForm,
                            advancePercentage: parseFloat(e.target.value) || 0,
                          })}
                          className="h-10 text-sm flex-1"
                        />
                        <div className="px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded font-bold text-sm flex items-center">%</div>
                      </div>
                    </div>
                    <div>
                      <Label className="font-semibold text-sm block mb-2">Required Amount</Label>
                      <div className="px-4 py-2 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded border-2 border-blue-300 dark:border-blue-700 h-10 flex items-center">
                        <span className="font-bold text-lg text-blue-600">{getCurrencySymbol(quoteForm.currency)}{((quoteForm.totalAmount * quoteForm.advancePercentage) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
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
                Are you sure you want to withdraw your bid for <strong>{selectedBidRequest?.eventDetails?.eventName || "this request"}</strong>?
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
