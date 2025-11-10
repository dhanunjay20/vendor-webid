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

const orders = [
  {
    id: "ORD-001",
    client: "Sarah Johnson",
    event: "Wedding Reception",
    date: "2024-03-15",
    guests: 150,
    status: "confirmed",
    amount: "$4,500",
  },
  {
    id: "ORD-002",
    client: "Tech Corp Inc.",
    event: "Corporate Lunch",
    date: "2024-03-12",
    guests: 80,
    status: "pending",
    amount: "$2,800",
  },
  {
    id: "ORD-003",
    client: "Michael Chen",
    event: "Birthday Party",
    date: "2024-03-20",
    guests: 50,
    status: "completed",
    amount: "$1,200",
  },
  {
    id: "ORD-004",
    client: "Elite Events",
    event: "Charity Gala",
    date: "2024-03-25",
    guests: 200,
    status: "confirmed",
    amount: "$8,900",
  },
];

const statusConfig = {
  confirmed: { label: "Confirmed", className: "bg-success/10 text-success hover:bg-success/20" },
  pending: { label: "Pending", className: "bg-warning/10 text-warning hover:bg-warning/20" },
  completed: { label: "Completed", className: "bg-accent/10 text-accent hover:bg-accent/20" },
};

export default function OrdersTable() {
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
          {orders.map((order) => (
            <TableRow key={order.id} className="transition-smooth hover:bg-muted/50">
              <TableCell className="font-medium">{order.id}</TableCell>
              <TableCell>{order.client}</TableCell>
              <TableCell>{order.event}</TableCell>
              <TableCell>{order.date}</TableCell>
              <TableCell className="text-center">{order.guests}</TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={statusConfig[order.status as keyof typeof statusConfig].className}
                >
                  {statusConfig[order.status as keyof typeof statusConfig].label}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-semibold">{order.amount}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
