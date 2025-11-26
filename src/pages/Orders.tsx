import { useState, useMemo, useEffect } from "react";
import { Eye, MessageSquare, CheckCircle, Clock, Package, Truck, CheckCheck, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import OrderDetailModal from "@/components/OrderDetailModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [activeTab, setActiveTab] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const vendorOrgId = localStorage.getItem("vendorOrganizationId") || "";

  useEffect(() => {
    loadOrders();
  }, []);

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
      
      const matchesTab = activeTab === "all" || order.status === activeTab;
      
      return matchesSearch && matchesTab;
    });
  }, [orders, searchQuery, activeTab]);

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Order Management</h1>
        <p className="text-muted-foreground">Track and manage your accepted catering orders</p>
      </div>

      <div className="mb-6">
        <div className="relative">
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
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Orders</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center py-8 text-muted-foreground">Loading orders...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Guests</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No orders found matching your criteria
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredOrders.map((order) => {
                      const StatusIcon = statusConfig[order.status as keyof typeof statusConfig]?.icon || Clock;
                      return (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.id}</TableCell>
                          <TableCell>{order.customerId}</TableCell>
                          <TableCell>{order.eventName}</TableCell>
                          <TableCell>{new Date(order.eventDate).toLocaleDateString()}</TableCell>
                          <TableCell>{order.guestCount}</TableCell>
                          <TableCell>
                            <Badge
                              className={statusConfig[order.status as keyof typeof statusConfig]?.className || ""}
                            >
                              <StatusIcon className="mr-1 h-3 w-3" />
                              {statusConfig[order.status as keyof typeof statusConfig]?.label || order.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-primary">${order.totalPrice.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => setSelectedOrder(order)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon">
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {Object.keys(statusConfig).map((status) => (
          <TabsContent key={status} value={status}>
            <Card>
              <CardHeader>
                <CardTitle>
                  {statusConfig[status as keyof typeof statusConfig].label} Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-center py-8 text-muted-foreground">Loading orders...</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Guests</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.filter(o => o.status === status).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            No {statusConfig[status as keyof typeof statusConfig].label.toLowerCase()} orders
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredOrders.filter(o => o.status === status).map((order) => {
                          const StatusIcon = statusConfig[order.status as keyof typeof statusConfig]?.icon || Clock;
                          return (
                            <TableRow key={order.id}>
                              <TableCell className="font-medium">{order.id}</TableCell>
                              <TableCell>{order.customerId}</TableCell>
                              <TableCell>{order.eventName}</TableCell>
                              <TableCell>{new Date(order.eventDate).toLocaleDateString()}</TableCell>
                              <TableCell>{order.guestCount}</TableCell>
                              <TableCell>
                                <Badge className={statusConfig[order.status as keyof typeof statusConfig]?.className || ""}>
                                  <StatusIcon className="mr-1 h-3 w-3" />
                                  {statusConfig[order.status as keyof typeof statusConfig]?.label || order.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-semibold text-primary">${order.totalPrice.toFixed(2)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => setSelectedOrder(order)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon">
                                    <MessageSquare className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

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
