import { useState, useMemo, useEffect } from "react";
import { Plus, Search, Filter, X, CheckCircle2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import * as api from "@/lib/api";
import BidQuoteDialog from "@/components/BidQuoteDialog.tsx";

interface Bid {
  id: string;
  orderId: string;
  vendorOrganizationId: string;
  proposedMessage: string;
  proposedTotalPrice: number;
  status: string;
  submittedAt: string;
  updatedAt: string;
  // Optional UI fields populated from joined/order data
  eventName?: string;
  customerName?: string;
}

interface OrderDetail {
  id: string;
  customerId: string;
  eventName: string;
  eventDate: string;
  eventLocation: string;
  guestCount: number;
  menuItems: any[];
  status: string;
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
}

const statusConfig = {
  requested: { label: "Requested", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  quoted: { label: "Quoted", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  accepted: { label: "Accepted", className: "bg-green-500/10 text-green-600 border-green-500/20" },
  confirmed: { label: "Confirmed", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  rejected: { label: "Rejected", className: "bg-red-500/10 text-red-600 border-red-500/20" },
};

export default function Bids() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isQuoteDialogOpen, setIsQuoteDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBid, setSelectedBid] = useState<Bid | null>(null);
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [quoteData, setQuoteData] = useState({
    proposedMessage: "",
    proposedTotalPrice: 0,
  });
  const [acceptingBidId, setAcceptingBidId] = useState<string | null>(null);
  const [confirmedBids, setConfirmedBids] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  // Get vendorOrgId from localStorage (set during login)
  const vendorOrgId = localStorage.getItem("vendorOrganizationId") || "";

  useEffect(() => {
    loadBids();
    
    // Set up polling for real-time updates every 30 seconds
    const pollInterval = setInterval(() => {
      loadBids();
    }, 30000);
    
    return () => clearInterval(pollInterval);
  }, []);

  const loadBids = async () => {
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
      const data = await api.getBidsByVendor(vendorOrgId);
      console.log("Bids API response:", data);
      setBids(data || []);
    } catch (err: any) {
      console.error("Bids API error:", err);
      toast({
        title: "Failed to load bids",
        description: err?.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewBidDetails = async (bid: Bid) => {
    try {
      setSelectedBid(bid);
      // Fetch order details from vendor-specific endpoint
      const order = await api.getOrderById(vendorOrgId, bid.orderId);
      setOrderDetail(order);
      setQuoteData({
        proposedMessage: bid.proposedMessage || "",
        proposedTotalPrice: bid.proposedTotalPrice || 0,
      });
      setIsQuoteDialogOpen(true);
    } catch (err: any) {
      toast({
        title: "Failed to load order details",
        description: err?.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vendorOrgId || !selectedBid) {
      toast({
        title: "Error",
        description: "Missing required information",
        variant: "destructive",
      });
      return;
    }

    try {
      await api.submitBidQuote(vendorOrgId, selectedBid.id, {
        orderId: selectedBid.orderId,
        proposedMessage: quoteData.proposedMessage,
        proposedTotalPrice: quoteData.proposedTotalPrice,
      });
      toast({
        title: "Quote Submitted",
        description: "Your quote has been sent to the customer.",
      });
      setIsQuoteDialogOpen(false);
      setSelectedBid(null);
      setOrderDetail(null);
      loadBids();
    } catch (err: any) {
      toast({
        title: "Failed to submit quote",
        description: err?.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleAcceptOrder = async (bidId: string) => {
    if (!vendorOrgId) {
      toast({ title: "Error", description: "Missing vendor ID", variant: "destructive" });
      return;
    }

    setAcceptingBidId(bidId);
    try {
      const updated = await api.acceptBid(vendorOrgId, bidId);
      toast({
        title: "Order Confirmed",
        description: "You have successfully confirmed this order!",
      });
      // Mark bid as confirmed locally
      setConfirmedBids((prev) => new Set(prev).add(bidId));
      // Update local state with returned bid (if backend returns the updated bid)
      if (updated && updated.id) {
        setBids((prev) => prev.map((b) => (b.id === bidId ? { ...b, ...updated, status: "confirmed" } : b)));
      } else {
        // Update status locally
        setBids((prev) => prev.map((b) => (b.id === bidId ? { ...b, status: "confirmed" } : b)));
      }
    } catch (err: any) {
      toast({
        title: "Failed to accept order",
        description: err?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setAcceptingBidId(null);
    }
  };

  const filteredBids = useMemo(() => {
    return bids.filter((bid) => {
      const matchesSearch = 
        bid.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bid.orderId.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || bid.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [bids, searchQuery, statusFilter]);

  return (
    <div className="container py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Bid Management</h1>
          <p className="text-muted-foreground">Create and track your catering bids</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create New Bid
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Submit New Bid</DialogTitle>
            </DialogHeader>
            <div className="p-4">
              <p className="text-sm text-muted-foreground">
                This feature is coming soon. You can view and respond to bid requests below.
              </p>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Quote Submission Dialog */}
        <BidQuoteDialog
          open={isQuoteDialogOpen}
          onOpenChange={setIsQuoteDialogOpen}
          selectedBid={selectedBid}
          orderDetail={orderDetail}
          quoteData={quoteData}
          onQuoteDataChange={setQuoteData}
          onSubmit={handleSubmitQuote}
        />
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search by client, event, or ID..." 
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
            <SelectItem value="requested">Requested</SelectItem>
            <SelectItem value="quoted">Quoted</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Loading bids...</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {filteredBids.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No bids found matching your criteria</p>
              </CardContent>
            </Card>
          ) : (
            filteredBids.map((bid) => (
            <Card key={bid.id} className="overflow-hidden transition-smooth hover:shadow-card-hover">
              <CardHeader className="bg-gradient-card">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="mb-2">{bid.eventName || `Bid #${bid.id}`}</CardTitle>
                    <p className="text-sm text-muted-foreground">Client: { (bid as any).customerName || bid.orderId }</p>
                    <p className="text-xs text-muted-foreground">Bid ID: {bid.id}</p>
                  </div>
                  <Badge className={statusConfig[bid.status as keyof typeof statusConfig]?.className || ""}>
                    {statusConfig[bid.status as keyof typeof statusConfig]?.label || bid.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Submitted</p>
                    <p className="font-medium">{new Date(bid.submittedAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Updated</p>
                    <p className="font-medium">{new Date(bid.updatedAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Your Bid Amount</p>
                    <p className="text-lg font-bold text-primary">${bid.proposedTotalPrice.toFixed(2)}</p>
                  </div>
                  <div className="md:col-span-3">
                    <p className="text-sm text-muted-foreground">Proposal Message</p>
                    <p className="font-medium">{bid.proposedMessage || "No message provided"}</p>
                  </div>
                  <div className="flex items-end gap-2 md:col-span-3">
                    <Button 
                      variant="outline" 
                      onClick={() => handleViewBidDetails(bid)} 
                      className="flex-1"
                    >
                      View Details
                    </Button>
                    {bid.status === "requested" && (
                      <Button 
                        onClick={() => handleViewBidDetails(bid)}
                        className="flex-1"
                      >
                        Submit Quote
                      </Button>
                    )}
                    {(bid.status === "confirmed" || bid.status === "accepted" || confirmedBids.has(bid.id)) && (
                      <div className="flex-1 flex items-center gap-3">
                        <div className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-emerald-500/10 text-emerald-600 rounded-md border border-emerald-500/20">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="font-medium">Order Confirmed</span>
                        </div>
                        <Button 
                          onClick={() => navigate("/dashboard/orders")} 
                          variant="outline"
                          className="flex-1"
                        >
                          View in Orders
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
