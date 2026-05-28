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
    <Card className="flex h-full flex-col rounded-2xl border-white/70 bg-white/78 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <CardHeader className="space-y-2 px-5 pb-4 pt-5">
        <CardTitle className="text-[0.95rem] font-semibold">Category totals</CardTitle>
        <p className="text-sm text-muted-foreground">
          Ranked spend amounts so heavier categories are obvious at a glance.
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 items-center px-5 pb-5 pt-0">
        {data.length === 0 ? (
          <div className="flex h-[250px] w-full items-center justify-center rounded-2xl border border-dashed border-border/75 bg-muted/30 px-6 text-center text-sm leading-6 text-muted-foreground">
            Category totals will appear after your first upload.
          </div>
        ) : (
          <ChartContainer config={{ value: { label: "Amount", color: "#2f7f8e" } }} className="h-[250px] w-full">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.22)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={(v) => `Rs. ${v}`}
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={56}
              />
              <ChartTooltip content={<ChartTooltipContent formatter={(v) => `Rs. ${Number(v).toLocaleString("en-IN")}`} />} />
              <Bar dataKey="value" fill="var(--color-value)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
