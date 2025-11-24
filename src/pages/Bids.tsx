import { useState, useMemo } from "react";
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

const mockBids = [
  {
    id: "BID-001",
    clientName: "Sarah Chen",
    event: "Corporate Gala",
    requestDate: "2024-03-20",
    guests: 150,
    budget: "$5,000 - $7,000",
    status: "pending",
    bidAmount: "$6,200",
    submittedDate: "2024-03-15",
  },
  {
    id: "BID-002",
    clientName: "Mike Johnson",
    event: "Wedding Reception",
    requestDate: "2024-04-10",
    guests: 200,
    budget: "$8,000 - $10,000",
    status: "accepted",
    bidAmount: "$9,500",
    submittedDate: "2024-03-10",
  },
  {
    id: "BID-003",
    clientName: "Emma Wilson",
    event: "Birthday Party",
    requestDate: "2024-03-25",
    guests: 50,
    budget: "$1,500 - $2,000",
    status: "rejected",
    bidAmount: "$1,800",
    submittedDate: "2024-03-12",
  },
];

const statusConfig = {
  pending: { label: "Pending", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  accepted: { label: "Accepted", className: "bg-green-500/10 text-green-600 border-green-500/20" },
  rejected: { label: "Rejected", className: "bg-red-500/10 text-red-600 border-red-500/20" },
};

export default function Bids() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const handleSubmitBid = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Bid Submitted",
      description: "Your bid has been sent to the client for review.",
    });
    setIsDialogOpen(false);
  };

  const handleAcceptOrder = (bidId: string) => {
    toast({
      title: "Order Accepted",
      description: `You have accepted the order for ${bidId}`,
    });
  };

  const filteredBids = useMemo(() => {
    return mockBids.filter((bid) => {
      const matchesSearch = 
        bid.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bid.event.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bid.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || bid.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

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
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
                  <CardTitle className="mb-2">{bid.event}</CardTitle>
                  <p className="text-sm text-muted-foreground">Client: {bid.clientName}</p>
                  <p className="text-xs text-muted-foreground">Bid ID: {bid.id}</p>
                </div>
                <Badge className={statusConfig[bid.status as keyof typeof statusConfig].className}>
                  {statusConfig[bid.status as keyof typeof statusConfig].label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Event Date</p>
                  <p className="font-medium">{bid.requestDate}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Guests</p>
                  <p className="font-medium">{bid.guests} people</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Client Budget</p>
                  <p className="font-medium">{bid.budget}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Your Bid</p>
                  <p className="text-lg font-bold text-primary">{bid.bidAmount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Submitted</p>
                  <p className="font-medium">{bid.submittedDate}</p>
                </div>
                <div className="flex items-end gap-2">
                  {bid.status === "accepted" && (
                    <Button onClick={() => handleAcceptOrder(bid.id)} className="w-full">
                      Accept Order
                    </Button>
                  )}
                  {bid.status === "pending" && (
                    <Button variant="outline" className="w-full">
                      View Details
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          ))
        )}
      </div>
    </div>
  );
}
