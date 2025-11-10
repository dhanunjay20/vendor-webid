import { Eye, MessageSquare, CheckCircle, Clock, Package, Truck, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
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

const orders = [
  {
    id: "ORD-1001",
    client: "Sarah Chen",
    event: "Corporate Gala",
    date: "2024-03-20",
    guests: 150,
    status: "confirmed",
    amount: "$6,200",
    bidId: "BID-002",
  },
  {
    id: "ORD-1002",
    client: "Mike Johnson",
    event: "Wedding Reception",
    date: "2024-04-10",
    guests: 200,
    status: "preparing",
    amount: "$9,500",
    bidId: "BID-005",
  },
  {
    id: "ORD-1003",
    client: "Lisa Martinez",
    event: "Birthday Celebration",
    date: "2024-03-18",
    guests: 80,
    status: "in-transit",
    amount: "$3,800",
    bidId: "BID-008",
  },
  {
    id: "ORD-1004",
    client: "David Lee",
    event: "Anniversary Dinner",
    date: "2024-03-15",
    guests: 120,
    status: "delivered",
    amount: "$5,400",
    bidId: "BID-011",
  },
];

const statusConfig = {
  confirmed: {
    label: "Confirmed",
    icon: CheckCircle,
    className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  preparing: {
    label: "Preparing",
    icon: Package,
    className: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  },
  "in-transit": {
    label: "In Transit",
    icon: Truck,
    className: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  },
  delivered: {
    label: "Delivered",
    icon: CheckCheck,
    className: "bg-green-500/10 text-green-600 border-green-500/20",
  },
};

export default function Orders() {
  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Order Management</h1>
        <p className="text-muted-foreground">Track and manage your accepted catering orders</p>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Orders</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
          <TabsTrigger value="preparing">Preparing</TabsTrigger>
          <TabsTrigger value="in-transit">In Transit</TabsTrigger>
          <TabsTrigger value="delivered">Delivered</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Guests</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const StatusIcon = statusConfig[order.status as keyof typeof statusConfig].icon;
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.id}</TableCell>
                        <TableCell>{order.client}</TableCell>
                        <TableCell>{order.event}</TableCell>
                        <TableCell>{order.date}</TableCell>
                        <TableCell>{order.guests}</TableCell>
                        <TableCell>
                          <Badge
                            className={statusConfig[order.status as keyof typeof statusConfig].className}
                          >
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {statusConfig[order.status as keyof typeof statusConfig].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-primary">{order.amount}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon">
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
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
                <div className="text-center py-8 text-muted-foreground">
                  Filter coming soon - showing filtered results
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
