"use client"

import Link from "next/link"
import { ArrowRightIcon, Loader2Icon } from "lucide-react"

import { DashboardShell } from "@/components/dashboard/DashboardShell"
import { ExpenseTable } from "@/components/dashboard/ExpenseTable"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useExpensesData } from "@/hooks/use-expenses-data"

export default function ExpensesPage() {
  const { data, error, isLoading, refresh } = useExpensesData()
  const expenses = data?.expenses ?? []
  const categoryCount = new Set(expenses.map((expense) => expense.category)).size

  return (
    <DashboardShell
      title="All Expenses"
      description="Review the full ledger and correct categories when the model needs help."
      action={
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/upload">
            Upload more
            <ArrowRightIcon className="size-4" />
          </Link>
        </Button>
      }
    >
      <div className="grid gap-3 md:grid-cols-3">
        <Card className="rounded-2xl border-white/70 bg-white/78 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <CardContent className="p-5">
            <p className="text-[0.78rem] uppercase tracking-[0.12em] text-muted-foreground/75">Receipts logged</p>
            <p className="mt-2 text-[1.7rem] font-semibold tracking-tight">
              {expenses.length.toLocaleString("en-IN")}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-white/70 bg-white/78 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <CardContent className="p-5">
            <p className="text-[0.78rem] uppercase tracking-[0.12em] text-muted-foreground/75">Total spend</p>
            <p className="mt-2 text-[1.7rem] font-semibold tracking-tight">
              Rs. {(data?.summary.total ?? 0).toLocaleString("en-IN")}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-white/70 bg-white/78 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <CardContent className="p-5">
            <p className="text-[0.78rem] uppercase tracking-[0.12em] text-muted-foreground/75">Active categories</p>
            <p className="mt-2 text-[1.7rem] font-semibold tracking-tight">{categoryCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-white/70 bg-white/78 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <CardHeader className="px-5 pb-4 pt-5">
          <CardTitle className="text-[0.95rem] font-semibold">Expense ledger</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 pt-0">
          {error ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : isLoading && !data ? (
            <div className="flex items-center gap-3 rounded-2xl px-2 py-8 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              Loading expenses...
            </div>
          ) : (
            <ExpenseTable expenses={expenses} onCategoryChange={refresh} />
          )}
        </CardContent>
      </Card>
    </DashboardShell>
  )
}
