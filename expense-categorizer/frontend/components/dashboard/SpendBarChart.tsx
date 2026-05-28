"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"

interface Props { byCategory: Record<string, number> }

export function SpendBarChart({ byCategory }: Props) {
  const data = Object.entries(byCategory)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  return (
    <Card>
      <CardHeader><CardTitle className="text-base font-medium">Amount by Category</CardTitle></CardHeader>
      <CardContent>
        <ChartContainer config={{ value: { label: "Amount", color: "#f97316" } }} className="h-[260px]">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={v => `₹${v}`} tick={{ fontSize: 12 }} />
            <ChartTooltip content={<ChartTooltipContent formatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`} />} />
            <Bar dataKey="value" fill="var(--color-value)" radius={[4,4,0,0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
