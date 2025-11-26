import { useState, useMemo, useEffect } from "react";
import { Plus, Search, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import * as api from "@/lib/api";

interface Bid {
  id: string;
  orderId: string;
  vendorOrganizationId: string;
  proposedMessage: string;
  proposedTotalPrice: number;
  status: string;
  submittedAt: string;
  updatedAt: string;
}

const statusConfig = {
  requested: { label: "Requested", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  quoted: { label: "Quoted", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  accepted: { label: "Accepted", className: "bg-green-500/10 text-green-600 border-green-500/20" },
  rejected: { label: "Rejected", className: "bg-red-500/10 text-red-600 border-red-500/20" },
};

export default function Bids() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [bidData, setBidData] = useState({
    orderId: "",
    proposedMessage: "",
    proposedTotalPrice: 0,
  });

  // Get vendorOrgId from localStorage (set during login)
  const vendorOrgId = localStorage.getItem("vendorOrganizationId") || "";

  useEffect(() => {
    loadBids();
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
      setBids(data || []);
    } catch (err: any) {
      toast({
        title: "Failed to load bids",
        description: err?.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitBid = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vendorOrgId) {
      toast({
        title: "Error",
        description: "Vendor organization ID not found",
        variant: "destructive",
      });
      return;
    }

    // This form is for submitting quotes on existing bid requests
    // In real scenario, bidId would come from selecting a bid request
    toast({
      title: "Feature Coming Soon",
      description: "Quote submission will be available once backend integration is complete.",
    });
    setIsDialogOpen(false);
  };

  const handleAcceptOrder = async (bidId: string) => {
    if (!vendorOrgId) return;

    try {
      await api.acceptBid(vendorOrgId, bidId);
      toast({
        title: "Order Accepted",
        description: `You have accepted the order for ${bidId}`,
      });
      loadBids(); // Refresh the list
    } catch (err: any) {
      toast({
        title: "Failed to accept order",
        description: err?.message || "Please try again",
        variant: "destructive",
      });
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
            <form onSubmit={handleSubmitBid} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Client Name</Label>
                  <Input placeholder="Enter client name" required />
                </div>
                <div className="space-y-2">
                  <Label>Event Type</Label>
                  <Select required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wedding">Wedding</SelectItem>
                      <SelectItem value="corporate">Corporate Event</SelectItem>
                      <SelectItem value="birthday">Birthday Party</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Number of Guests</Label>
                  <Input type="number" placeholder="Enter guest count" required />
                </div>
                <div className="space-y-2">
                  <Label>Event Date</Label>
                  <Input type="date" required />
                </div>
                <div className="space-y-2">
                  <Label>Your Bid Amount ($)</Label>
                  <Input type="number" placeholder="Enter your bid" required />
                </div>
                <div className="space-y-2">
                  <Label>Service Package</Label>
                  <Select required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select package" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Proposal Details</Label>
                <Textarea
                  placeholder="Describe your catering proposal, menu options, and any special offerings..."
                  rows={4}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Special Requirements/Notes</Label>
                <Textarea placeholder="Any dietary restrictions, setup requirements, etc." rows={3} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Submit Bid</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
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
                    <CardTitle className="mb-2">Bid #{bid.id}</CardTitle>
                    <p className="text-sm text-muted-foreground">Order: {bid.orderId}</p>
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
                  <div className="flex items-end gap-2">
                    {bid.status === "accepted" && (
                      <Button onClick={() => handleAcceptOrder(bid.id)} className="w-full">
                        Confirm Order
                      </Button>
                    )}
                    {bid.status === "requested" && (
                      <Button variant="outline" className="w-full">
                        Submit Quote
                      </Button>
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
