import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

const activities = [
  {
    id: 1,
    user: "Sarah Johnson",
    action: "submitted a new order request",
    time: "5 minutes ago",
    type: "order",
  },
  {
    id: 2,
    user: "Tech Corp Inc.",
    action: "accepted your bid",
    time: "1 hour ago",
    type: "bid",
  },
  {
    id: 3,
    user: "Michael Chen",
    action: "left a 5-star review",
    time: "3 hours ago",
    type: "review",
  },
  {
    id: 4,
    user: "Elite Events",
    action: "requested a quote modification",
    time: "5 hours ago",
    type: "message",
  },
];

const typeColors = {
  order: "bg-primary/10 text-primary",
  bid: "bg-accent/10 text-accent",
  review: "bg-warning/10 text-warning",
  message: "bg-secondary/10 text-secondary",
};

export default function RecentActivity() {
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={undefined} />
              <AvatarFallback>{activity.user.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-sm">
                  <span className="font-medium">{activity.user}</span>{" "}
                  <span className="text-muted-foreground">{activity.action}</span>
                </p>
                <Badge variant="secondary" className={typeColors[activity.type as keyof typeof typeColors]}>
                  {activity.type}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{activity.time}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
