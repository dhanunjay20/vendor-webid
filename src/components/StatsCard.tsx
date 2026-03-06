import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
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
    up: "text-green-600",
    down: "text-red-600",
    neutral: "text-gray-500",
  }[trend];

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  return (
    <Card className="overflow-hidden border border-orange-100 bg-white shadow-sm hover:shadow-md transition-all">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">{title}</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">{value}</p>
            <div className={`flex items-center gap-1 text-xs sm:text-sm font-medium ${trendColor}`}>
              <TrendIcon className="h-3 w-3" />
              <span>{change}</span>
            </div>
          </div>
          <div className="rounded-lg bg-orange-100 p-2.5 sm:p-3 ml-3 flex-shrink-0">
            <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
