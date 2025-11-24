import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const monthlyData = [
  { month: "Jan", thisYear: 28400, lastYear: 24200 },
  { month: "Feb", thisYear: 31200, lastYear: 26800 },
  { month: "Mar", thisYear: 35800, lastYear: 29500 },
  { month: "Apr", thisYear: 38900, lastYear: 32100 },
  { month: "May", thisYear: 42300, lastYear: 35400 },
  { month: "Jun", thisYear: 45231, lastYear: 38900 },
];

export default function MonthlyComparisonChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Comparison</CardTitle>
        <p className="text-sm text-muted-foreground">Year-over-year revenue comparison</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="month" 
              className="text-xs"
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis 
              className="text-xs"
              stroke="hsl(var(--muted-foreground))"
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
              }}
              formatter={(value: number) => [`$${value.toLocaleString()}`, ""]}
            />
            <Legend />
            <Bar 
              dataKey="thisYear" 
              fill="hsl(var(--primary))" 
              radius={[8, 8, 0, 0]}
              name="2024"
            />
            <Bar 
              dataKey="lastYear" 
              fill="hsl(var(--muted))" 
              radius={[8, 8, 0, 0]}
              name="2023"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
