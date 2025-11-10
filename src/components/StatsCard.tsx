import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: string;
  change: string;
  icon: LucideIcon;
  trend: "up" | "down" | "neutral";
}

export default function StatsCard({ title, value, change, icon: Icon, trend }: StatsCardProps) {
  const trendColor = {
    up: "text-success",
    down: "text-destructive",
    neutral: "text-muted-foreground",
  }[trend];

  return (
    <Card className="overflow-hidden border-border bg-gradient-card shadow-card transition-smooth hover:shadow-card-hover">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold text-foreground">{value}</p>
            <p className={`text-sm font-medium ${trendColor}`}>{change}</p>
          </div>
          <div className="rounded-lg bg-primary/10 p-3">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
