import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const menuData = [
  { item: "Grilled Chicken", orders: 145, revenue: 12325 },
  { item: "Caesar Salad", orders: 132, revenue: 6600 },
  { item: "Pasta Alfredo", orders: 118, revenue: 9440 },
  { item: "Chocolate Cake", orders: 108, revenue: 6480 },
  { item: "Roast Beef", orders: 95, revenue: 11400 },
  { item: "Vegetarian Platter", orders: 87, revenue: 6090 },
];

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--muted))",
];

export default function PopularMenuChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Popular Menu Items</CardTitle>
        <p className="text-sm text-muted-foreground">Top performers by order count</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={menuData} layout="vertical">
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
                return [value, name];
              }}
            />
            <Bar 
              dataKey="orders" 
              radius={[0, 8, 8, 0]}
            >
              {menuData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 space-y-2">
          {menuData.slice(0, 3).map((item, index) => (
            <div key={item.item} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div 
                  className="h-3 w-3 rounded-full" 
                  style={{ backgroundColor: COLORS[index] }}
                />
                <span className="text-muted-foreground">{item.item}</span>
              </div>
              <span className="font-semibold text-primary">${item.revenue.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
