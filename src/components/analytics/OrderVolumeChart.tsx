import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const orderVolumeData = [
  { date: "Week 1", orders: 12, completed: 10 },
  { date: "Week 2", orders: 18, completed: 16 },
  { date: "Week 3", orders: 22, completed: 20 },
  { date: "Week 4", orders: 28, completed: 25 },
  { date: "Week 5", orders: 25, completed: 23 },
  { date: "Week 6", orders: 32, completed: 30 },
];

export default function OrderVolumeChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Volume Over Time</CardTitle>
        <p className="text-sm text-muted-foreground">Weekly order trends</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={orderVolumeData}>
            <defs>
              <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              className="text-xs"
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis 
              className="text-xs"
              stroke="hsl(var(--muted-foreground))"
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
              }}
            />
            <Area 
              type="monotone" 
              dataKey="orders" 
              stroke="hsl(var(--primary))" 
              fillOpacity={1} 
              fill="url(#colorOrders)"
              strokeWidth={2}
              name="Total Orders"
            />
            <Area 
              type="monotone" 
              dataKey="completed" 
              stroke="hsl(var(--accent))" 
              fillOpacity={1} 
              fill="url(#colorCompleted)"
              strokeWidth={2}
              name="Completed"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
