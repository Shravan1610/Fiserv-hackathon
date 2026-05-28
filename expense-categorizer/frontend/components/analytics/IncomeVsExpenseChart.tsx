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
  Legend,
  XAxis,
  YAxis,
} from "recharts"

import { MonthlyPoint } from "@/types/expense"

interface Props {
  data: MonthlyPoint[]
}

export function IncomeVsExpenseChart({ data }: Props) {
  return (
    <Card className="flex h-full flex-col rounded-2xl border-white/70 bg-white/78 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <CardHeader className="space-y-2 px-5 pb-4 pt-5">
        <CardTitle className="text-[0.95rem] font-semibold">Income vs expense</CardTitle>
        <p className="text-sm text-muted-foreground">
          Side-by-side monthly comparison of money in and money out.
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 items-center px-5 pb-5 pt-0">
        {data.length === 0 ? (
          <div className="flex h-[280px] w-full items-center justify-center rounded-2xl border border-dashed border-border/75 bg-muted/30 px-6 text-center text-sm leading-6 text-muted-foreground">
            Add at least one expense and one income to see the comparison.
          </div>
        ) : (
          <ChartContainer
            config={{
              income: { label: "Income", color: "#10b981" },
              expense: { label: "Expense", color: "#ef4444" },
            }}
            className="h-[300px] w-full"
          >
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.22)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={(v) => `Rs. ${Number(v).toLocaleString("en-IN")}`}
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={80}
              />
              <ChartTooltip
                content={<ChartTooltipContent formatter={(v) => `Rs. ${Number(v).toLocaleString("en-IN")}`} />}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="income" name="Income" fill="var(--color-income)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expense" name="Expense" fill="var(--color-expense)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
