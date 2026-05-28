"use client"

import { useMemo, useState } from "react"
import { Loader2Icon } from "lucide-react"

import { CategoryDonut } from "@/components/analytics/CategoryDonut"
import { IncomeVsExpenseChart } from "@/components/analytics/IncomeVsExpenseChart"
import { MonthlyTrendChart } from "@/components/analytics/MonthlyTrendChart"
import { SummaryPanel } from "@/components/analytics/SummaryPanel"
import { TopMerchantsChart } from "@/components/analytics/TopMerchantsChart"
import { DashboardShell } from "@/components/dashboard/DashboardShell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAnalyticsData } from "@/hooks/use-analytics-data"

export default function AnalyticsPage() {
  const [from, setFrom] = useState<string>("")
  const [to, setTo] = useState<string>("")
  const [appliedRange, setAppliedRange] = useState<{ from?: string; to?: string }>({})

  const { data, isLoading, error, refresh } = useAnalyticsData(appliedRange)

  const totals = data?.totals
  const savingsPct = useMemo(() => {
    if (!totals?.savings_rate && totals?.savings_rate !== 0) return null
    return Math.round((totals.savings_rate ?? 0) * 100)
  }, [totals?.savings_rate])

  const hasData = (data?.expenses.length ?? 0) + (data?.income.length ?? 0) > 0

  function applyRange() {
    setAppliedRange({ from: from || undefined, to: to || undefined })
  }

  function clearRange() {
    setFrom("")
    setTo("")
    setAppliedRange({})
  }

  return (
    <DashboardShell
      title="Analytics"
      description="Income, expense, and the gap between them — across every chart that's actually useful."
      action={
        <Button variant="outline" className="rounded-xl" onClick={refresh} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2Icon className="mr-2 size-4 animate-spin" />
              Refreshing
            </>
          ) : (
            "Refresh"
          )}
        </Button>
      }
    >
      <Card className="rounded-2xl border-white/70 bg-white/78 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <CardContent className="flex flex-wrap items-end gap-3 p-5">
          <div className="space-y-1.5">
            <p className="text-[0.7rem] uppercase tracking-[0.14em] text-muted-foreground/80">From</p>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[160px]" />
          </div>
          <div className="space-y-1.5">
            <p className="text-[0.7rem] uppercase tracking-[0.14em] text-muted-foreground/80">To</p>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[160px]" />
          </div>
          <Button onClick={applyRange} className="rounded-xl">Apply range</Button>
          <Button variant="outline" onClick={clearRange} className="rounded-xl">All-time</Button>
        </CardContent>
      </Card>

      {error ? (
        <Card className="rounded-2xl border-destructive/20 bg-destructive/5 shadow-sm">
          <CardContent className="p-5 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl border-white/70 bg-white/78 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <CardContent className="p-5">
            <p className="text-[0.78rem] uppercase tracking-[0.12em] text-muted-foreground/75">Income</p>
            <p className="mt-2 text-[1.7rem] font-semibold tracking-tight text-emerald-700">
              Rs. {(totals?.income ?? 0).toLocaleString("en-IN")}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-white/70 bg-white/78 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <CardContent className="p-5">
            <p className="text-[0.78rem] uppercase tracking-[0.12em] text-muted-foreground/75">Expense</p>
            <p className="mt-2 text-[1.7rem] font-semibold tracking-tight text-rose-700">
              Rs. {(totals?.expense ?? 0).toLocaleString("en-IN")}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-white/70 bg-white/78 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <CardContent className="p-5">
            <p className="text-[0.78rem] uppercase tracking-[0.12em] text-muted-foreground/75">Net cashflow</p>
            <p
              className={`mt-2 text-[1.7rem] font-semibold tracking-tight ${
                (totals?.net ?? 0) >= 0 ? "text-emerald-700" : "text-rose-700"
              }`}
            >
              Rs. {(totals?.net ?? 0).toLocaleString("en-IN")}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-white/70 bg-white/78 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <CardContent className="p-5">
            <p className="text-[0.78rem] uppercase tracking-[0.12em] text-muted-foreground/75">Savings rate</p>
            <p className="mt-2 text-[1.7rem] font-semibold tracking-tight">
              {savingsPct == null ? "—" : `${savingsPct}%`}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <IncomeVsExpenseChart data={data?.monthly_series ?? []} />
        <MonthlyTrendChart data={data?.monthly_series ?? []} />
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <CategoryDonut
          byCategory={data?.by_expense_category ?? {}}
          title="Expense by category"
          description="Where the cash actually went."
        />
        <CategoryDonut
          byCategory={data?.by_income_category ?? {}}
          title="Income by category"
          description="What types of inflow you have."
        />
        <TopMerchantsChart data={data?.top_merchants ?? []} />
      </div>

      <SummaryPanel range={appliedRange} hasData={hasData} />
    </DashboardShell>
  )
}
