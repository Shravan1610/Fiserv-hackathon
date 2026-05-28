"use client"

import Link from "next/link"
import { ArrowUpRightIcon, Loader2Icon } from "lucide-react"

import { AskWidget } from "@/components/dashboard/AskWidget"
import { BurnRateCard } from "@/components/dashboard/BurnRateCard"
import { CategoryPieChart } from "@/components/dashboard/CategoryPieChart"
import { DashboardShell } from "@/components/dashboard/DashboardShell"
import { HealthScoreRing } from "@/components/dashboard/HealthScoreRing"
import { InsightsBanner } from "@/components/dashboard/InsightsBanner"
import { RecentExpensesCard } from "@/components/dashboard/RecentExpensesCard"
import { SpendBarChart } from "@/components/dashboard/SpendBarChart"
import { SummaryCards } from "@/components/dashboard/SummaryCards"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useExpensesData } from "@/hooks/use-expenses-data"
import { Expense } from "@/types/expense"

function getRecentExpenses(expenses: Expense[]) {
  return [...expenses]
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, 5)
}

export default function DashboardPage() {
  const { data, error, isLoading } = useExpensesData()
  const expenses = data?.expenses ?? []
  const summary = data?.summary
  const recentExpenses = getRecentExpenses(expenses)
  const burnRate = summary?.burn_rate
  const healthScore = summary?.health_score

  return (
    <DashboardShell
      title="Dashboard"
      description="Health score, burn rate, anomalies, and the receipt ledger — at a glance."
      action={
        <Button asChild className="rounded-xl">
          <Link href="/upload">
            Upload receipt
            <ArrowUpRightIcon className="size-4" />
          </Link>
        </Button>
      }
    >
      {summary?.insight ? <InsightsBanner insight={summary.insight} /> : null}

      {error ? (
        <Card className="rounded-2xl border-destructive/20 bg-destructive/5 shadow-sm">
          <CardContent className="p-5 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      {isLoading && !data ? (
        <Card className="rounded-2xl border-white/70 bg-white/78 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            Loading dashboard analytics...
          </CardContent>
        </Card>
      ) : (
        <>
          {(healthScore || burnRate) ? (
            <div className="grid gap-5 lg:grid-cols-[minmax(300px,0.85fr)_minmax(0,1.3fr)]">
              {healthScore ? <HealthScoreRing health={healthScore} /> : <div />}
              {burnRate ? <BurnRateCard burn={burnRate} /> : <div />}
            </div>
          ) : null}

          <SummaryCards summary={summary} receiptCount={expenses.length} />

          <div className="grid gap-5 xl:grid-cols-12">
            <div className="grid gap-5 xl:col-span-8 lg:grid-cols-2">
              <CategoryPieChart byCategory={summary?.by_category ?? {}} />
              <SpendBarChart byCategory={summary?.by_category ?? {}} />
            </div>
            <div className="xl:col-span-4">
              <RecentExpensesCard expenses={recentExpenses} />
            </div>
          </div>

          <AskWidget />
        </>
      )}
    </DashboardShell>
  )
}
