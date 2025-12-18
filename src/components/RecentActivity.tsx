import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { RecentActivityDto } from "@/lib/analyticsApi";

const typeColors = {
  order: "bg-primary/10 text-primary",
  bid: "bg-accent/10 text-accent",
  review: "bg-warning/10 text-warning",
  message: "bg-secondary/10 text-secondary",
};

interface RecentActivityProps {
  data?: RecentActivityDto[];
}

export default function RecentActivity({ data = [] }: RecentActivityProps) {
  console.log('⚡ RecentActivity received data:', data);
  
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            No recent activity
          </div>
        ) : (
          data.map((activity) => (
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
                  <Badge variant="secondary" className={typeColors[activity.type]}>
                    {activity.type}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{activity.time}</p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
