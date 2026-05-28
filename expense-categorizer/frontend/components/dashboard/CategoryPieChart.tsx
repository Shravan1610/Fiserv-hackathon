"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { PieChart, Pie, Cell } from "recharts"

const COLORS = ["#2f7f8e", "#4d9dae", "#77b9c2", "#8dc8b1", "#5d88b8", "#bfdcc6", "#a8d0d6", "#d4e5dd"]

interface Props { byCategory: Record<string, number> }

export function CategoryPieChart({ byCategory }: Props) {
  const data = Object.entries(byCategory)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }))

  return (
    <Card className="flex h-full flex-col rounded-2xl border-white/70 bg-white/78 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <CardHeader className="space-y-2 px-5 pb-4 pt-5">
        <CardTitle className="text-[0.95rem] font-semibold">Spend by category</CardTitle>
        <p className="text-sm text-muted-foreground">
          Share of total spend across your current receipt categories.
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 items-center px-5 pb-5 pt-0">
        {data.length === 0 ? (
          <div className="flex h-[250px] w-full items-center justify-center rounded-2xl border border-dashed border-border/75 bg-muted/30 px-6 text-center text-sm leading-6 text-muted-foreground">
            No categorized spend yet. Upload receipts to see where cash is going.
          </div>
        ) : (
          <ChartContainer config={{}} className="h-[250px] w-full">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={54}
                outerRadius={84}
                paddingAngle={3}
                stroke="rgba(255,255,255,0.8)"
                strokeWidth={2}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
                style={{ fontSize: "11px", fill: "var(--muted-foreground)" }}
              >
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent formatter={(v) => `Rs. ${Number(v).toLocaleString("en-IN")}`} />} />
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
