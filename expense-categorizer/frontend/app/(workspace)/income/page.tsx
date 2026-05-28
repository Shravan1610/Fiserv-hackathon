"use client"

import { Loader2Icon } from "lucide-react"

import { DashboardShell } from "@/components/dashboard/DashboardShell"
import { IncomeForm } from "@/components/income/IncomeForm"
import { IncomeTable } from "@/components/income/IncomeTable"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useIncomeData } from "@/hooks/use-income-data"

export default function IncomePage() {
  const { data, error, isLoading, refresh } = useIncomeData()
  const income = data?.income ?? []
  const total = data?.summary.total ?? 0
  const sources = new Set(income.map((i) => i.source)).size

  return (
    <DashboardShell
      title="Income"
      description="Track salary, freelance payouts, and other money coming in."
    >
      <div className="grid gap-3 md:grid-cols-3">
        <Card className="rounded-2xl border-white/70 bg-white/78 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <CardContent className="p-5">
            <p className="text-[0.78rem] uppercase tracking-[0.12em] text-muted-foreground/75">
              Total income
            </p>
            <p className="mt-2 text-[1.7rem] font-semibold tracking-tight text-emerald-700">
              Rs. {total.toLocaleString("en-IN")}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-white/70 bg-white/78 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <CardContent className="p-5">
            <p className="text-[0.78rem] uppercase tracking-[0.12em] text-muted-foreground/75">
              Entries
            </p>
            <p className="mt-2 text-[1.7rem] font-semibold tracking-tight">
              {income.length.toLocaleString("en-IN")}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-white/70 bg-white/78 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <CardContent className="p-5">
            <p className="text-[0.78rem] uppercase tracking-[0.12em] text-muted-foreground/75">
              Distinct sources
            </p>
            <p className="mt-2 text-[1.7rem] font-semibold tracking-tight">{sources}</p>
          </CardContent>
        </Card>
      </div>

      <IncomeForm onSaved={refresh} />

      <Card className="rounded-2xl border-white/70 bg-white/78 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <CardHeader className="px-5 pb-4 pt-5">
          <CardTitle className="text-[0.95rem] font-semibold">Income ledger</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 pt-0">
          {error ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : isLoading && !data ? (
            <div className="flex items-center gap-3 rounded-2xl px-2 py-8 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              Loading income…
            </div>
          ) : (
            <IncomeTable income={income} onDeleted={refresh} />
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  )
}
