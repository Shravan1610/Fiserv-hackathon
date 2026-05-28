"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts"

import { MonthlyPoint } from "@/types/expense"

interface Props {
  data: MonthlyPoint[]
}

export function MonthlyTrendChart({ data }: Props) {
  return (
    <Card className="flex h-full flex-col rounded-2xl border-white/70 bg-white/78 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <CardHeader className="space-y-2 px-5 pb-4 pt-5">
        <CardTitle className="text-[0.95rem] font-semibold">Net cashflow trend</CardTitle>
        <p className="text-sm text-muted-foreground">
          Income minus expense across time. Below the line means a deficit.
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 items-center px-5 pb-5 pt-0">
        {data.length === 0 ? (
          <div className="flex h-[280px] w-full items-center justify-center rounded-2xl border border-dashed border-border/75 bg-muted/30 px-6 text-center text-sm leading-6 text-muted-foreground">
            Net cashflow appears once at least one month has data.
          </div>
        ) : (
          <ChartContainer
            config={{
              net: { label: "Net", color: "#2f7f8e" },
            }}
            className="h-[300px] w-full"
          >
            <AreaChart data={data}>
              <defs>
                <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2f7f8e" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#2f7f8e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.22)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={(v) => `Rs. ${Number(v).toLocaleString("en-IN")}`}
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={80}
              />
              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
              <ChartTooltip
                content={<ChartTooltipContent formatter={(v) => `Rs. ${Number(v).toLocaleString("en-IN")}`} />}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area
                dataKey="net"
                name="Net"
                type="monotone"
                stroke="#2f7f8e"
                strokeWidth={2}
                fill="url(#netGradient)"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
