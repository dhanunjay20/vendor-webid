import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, MessageSquare } from "lucide-react";
import { OrderTableDto } from "@/lib/analyticsApi";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

const statusConfig: Record<string, { label: string; className: string }> = {
  confirmed: { label: "Confirmed", className: "bg-success/10 text-success hover:bg-success/20" },
  in_preparation: { label: "In Preparation", className: "bg-warning/10 text-warning hover:bg-warning/20" },
  ready_for_delivery: { label: "Ready for Delivery", className: "bg-info/10 text-info hover:bg-info/20" },
  delivering: { label: "Delivering", className: "bg-sky-100 text-sky-700 hover:bg-sky-200" },
  delivered: { label: "Delivered", className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" },
  completed: { label: "Completed", className: "bg-accent/10 text-accent hover:bg-accent/20" },
  cancelled: { label: "Cancelled", className: "bg-destructive/10 text-destructive hover:bg-destructive/20" },
};

interface OrdersTableProps {
  data?: OrderTableDto[];
}

export default function OrdersTable({ data = [] }: OrdersTableProps) {
  const navigate = useNavigate();

  const handleViewOrder = (orderId: string) => {
    navigate(`/orders`);
    toast({
      title: "Order Details",
      description: `Opening details for order ${orderId}`,
    });
  };

  const handleMessageCustomer = (orderId: string, client: string) => {
    navigate(`/messaging`);
    toast({
      title: "Open Messages",
      description: `Opening chat with ${client}`,
    });
  };
  
  return (
    <div className="rounded-lg border bg-card shadow-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-muted/50">
            <TableHead className="font-semibold">Order ID</TableHead>
            <TableHead className="font-semibold">Client</TableHead>
            <TableHead className="font-semibold">Event</TableHead>
            <TableHead className="font-semibold">Date</TableHead>
            <TableHead className="font-semibold text-center">Guests</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold text-right">Amount</TableHead>
            <TableHead className="font-semibold text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                No orders found
              </TableCell>
            </TableRow>
          ) : (
            data.map((order) => {
              const statusKey = (order.status || "").toLowerCase();
              const statusInfo = statusConfig[statusKey] || statusConfig.confirmed;
              return (
                <TableRow key={order.id} className="transition-smooth hover:bg-muted/50">
                  <TableCell className="font-medium">{order.id}</TableCell>
                  <TableCell>{order.client}</TableCell>
                  <TableCell>{order.event}</TableCell>
                  <TableCell>{order.date}</TableCell>
                  <TableCell className="text-center">{order.guests}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusInfo.className}>
                      {statusInfo.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{order.amount}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleViewOrder(order.id)}
                        title="View order details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleMessageCustomer(order.id, order.client)}
                        title="Message customer"
                      >
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
    </div>
  );
}
