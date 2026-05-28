"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"

interface Props {
  data: { merchant: string; amount: number }[]
}

export function TopMerchantsChart({ data }: Props) {
  return (
    <Card className="flex h-full flex-col rounded-2xl border-white/70 bg-white/78 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <CardHeader className="space-y-2 px-5 pb-4 pt-5">
        <CardTitle className="text-[0.95rem] font-semibold">Top merchants</CardTitle>
        <p className="text-sm text-muted-foreground">
          Where the most rupees actually went.
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 items-center px-5 pb-5 pt-0">
        {data.length === 0 ? (
          <div className="flex h-[280px] w-full items-center justify-center rounded-2xl border border-dashed border-border/75 bg-muted/30 px-6 text-center text-sm leading-6 text-muted-foreground">
            Add some receipts to surface your top merchants.
          </div>
        ) : (
          <ChartContainer
            config={{ amount: { label: "Spend", color: "#f97316" } }}
            className="h-[300px] w-full"
          >
            <BarChart data={data} layout="vertical" margin={{ left: 12 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(148, 163, 184, 0.22)" />
              <XAxis
                type="number"
                tickFormatter={(v) => `Rs. ${Number(v).toLocaleString("en-IN")}`}
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="merchant"
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={130}
              />
              <ChartTooltip
                content={<ChartTooltipContent formatter={(v) => `Rs. ${Number(v).toLocaleString("en-IN")}`} />}
              />
              <Bar dataKey="amount" name="Spend" fill="var(--color-amount)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
