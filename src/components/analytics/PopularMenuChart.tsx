import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { PopularMenuItemDto } from "@/lib/analyticsApi";

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--muted))",
];

interface PopularMenuChartProps {
  data?: PopularMenuItemDto[];
}

export default function PopularMenuChart({ data = [] }: PopularMenuChartProps) {
  console.log('🎯 PopularMenuChart received data:', data);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Popular Menu Items</CardTitle>
        <p className="text-sm text-muted-foreground">Top performers by order count</p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                type="number"
                className="text-xs"
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis 
                type="category"
                dataKey="item" 
                className="text-xs"
                stroke="hsl(var(--muted-foreground))"
                width={120}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
                formatter={(value: number, name: string) => {
                  if (name === "orders") return [`${value} orders`, "Orders"];
                  if (name === "revenue") return [`$${value.toLocaleString()}`, "Revenue"];
                  return [value, name];
                }}
              />
              <Bar 
                dataKey="orders" 
                radius={[0, 8, 8, 0]}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}