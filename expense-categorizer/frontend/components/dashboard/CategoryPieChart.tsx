"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { PieChart, Pie, Cell } from "recharts"

const COLORS = ["#f97316","#3b82f6","#a855f7","#ec4899","#22c55e","#eab308","#6366f1","#9ca3af"]

interface Props { byCategory: Record<string, number> }

export function CategoryPieChart({ byCategory }: Props) {
  const data = Object.entries(byCategory)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }))

  return (
    <Card>
      <CardHeader><CardTitle className="text-base font-medium">Spend by Category</CardTitle></CardHeader>
      <CardContent>
        <ChartContainer config={{}} className="h-[260px]">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent formatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`} />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
