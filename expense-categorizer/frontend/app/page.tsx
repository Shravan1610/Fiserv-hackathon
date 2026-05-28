"use client"
import { useState, useEffect, useCallback } from "react"
import { UploadCard } from "@/components/upload/UploadCard"
import { CategoryPieChart } from "@/components/dashboard/CategoryPieChart"
import { SpendBarChart } from "@/components/dashboard/SpendBarChart"
import { ExpenseTable } from "@/components/dashboard/ExpenseTable"
import { InsightsBanner } from "@/components/dashboard/InsightsBanner"
import { fetchExpenses } from "@/lib/api"
import { ExpensesResponse, UploadResponse } from "@/types/expense"

export default function Home() {
  const [data, setData] = useState<ExpensesResponse | null>(null)
  const [insight, setInsight] = useState("")

  const refresh = useCallback(async () => {
    const d = await fetchExpenses()
    setData(d)
    setInsight(d.summary.insight)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  function handleUpload(result: UploadResponse) {
    setInsight(result.insight)
    refresh()
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="border-b px-6 py-4">
        <h1 className="text-xl font-semibold">Expense Categorizer</h1>
        <p className="text-sm text-muted-foreground">Upload receipts · auto-categorize · track spend</p>
      </div>
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {insight && <InsightsBanner insight={insight} />}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1"><UploadCard onUploadSuccess={handleUpload} /></div>
          {data && (
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-lg border bg-card p-4 text-center">
                <p className="text-xs text-muted-foreground">Total Spend</p>
                <p className="text-3xl font-semibold mt-1">₹{data.summary.total.toLocaleString("en-IN")}</p>
              </div>
              <div className="rounded-lg border bg-card p-4 text-center">
                <p className="text-xs text-muted-foreground">Receipts</p>
                <p className="text-3xl font-semibold mt-1">{data.expenses.length}</p>
              </div>
            </div>
          )}
        </div>
        {data && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CategoryPieChart byCategory={data.summary.by_category} />
              <SpendBarChart byCategory={data.summary.by_category} />
            </div>
            <div className="rounded-lg border bg-card">
              <div className="px-6 py-4 border-b">
                <h2 className="text-base font-medium">All Expenses</h2>
              </div>
              <div className="px-6 py-4">
                <ExpenseTable expenses={data.expenses} />
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
