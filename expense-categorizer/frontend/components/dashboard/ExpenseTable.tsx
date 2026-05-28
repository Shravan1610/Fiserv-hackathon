"use client"
import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { patchCategory } from "@/lib/api"
import { Expense, Category } from "@/types/expense"

const ALL_CATEGORIES: Category[] = ["Food","Travel","Shopping","Entertainment","Healthcare","Utilities","Education","Other"]
const CATEGORY_COLORS: Record<string, string> = {
  Food:"bg-orange-100 text-orange-800", Travel:"bg-blue-100 text-blue-800",
  Shopping:"bg-purple-100 text-purple-800", Entertainment:"bg-pink-100 text-pink-800",
  Healthcare:"bg-green-100 text-green-800", Utilities:"bg-yellow-100 text-yellow-800",
  Education:"bg-indigo-100 text-indigo-800", Other:"bg-gray-100 text-gray-700",
}

interface ExpenseTableProps {
  expenses: Expense[]
  onCategoryChange?: () => void
}

export function ExpenseTable({ expenses: initial, onCategoryChange }: ExpenseTableProps) {
  const [expenses, setExpenses] = useState(initial)
  const [editing, setEditing] = useState<string | null>(null)

  useEffect(() => {
    setExpenses(initial)
  }, [initial])

  async function handleCategoryChange(id: string, category: string) {
    await patchCategory(id, category)
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, category: category as Category } : e))
    setEditing(null)
    onCategoryChange?.()
  }

  if (expenses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/75 bg-muted/30 px-6 py-10 text-center text-sm leading-6 text-muted-foreground">
        No expenses yet. Upload a receipt to start building the ledger.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border/70 bg-white/70">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/25 hover:bg-muted/25">
            <TableHead className="h-11 px-4 text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground/80">Merchant</TableHead>
            <TableHead className="text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground/80">Amount</TableHead>
            <TableHead className="text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground/80">Date</TableHead>
            <TableHead className="text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground/80">Category</TableHead>
            <TableHead className="text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground/80">Confidence</TableHead>
            <TableHead className="text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground/80"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map(e => (
            <TableRow
              key={e.id}
              className={e.is_anomaly ? "border-l-2 border-l-red-400 bg-red-50/80 hover:bg-red-100/70" : "hover:bg-muted/20"}
            >
              <TableCell className="px-4 py-3.5 font-medium">
                {e.merchant ?? "-"}
                {e.is_anomaly && e.anomaly_reason && (
                  <p className="mt-0.5 text-[11px] font-normal text-red-600">
                    ⚠ {e.anomaly_reason}
                  </p>
                )}
              </TableCell>
              <TableCell className={e.is_anomaly ? "font-semibold text-red-700" : "font-medium"}>
                Rs. {e.amount?.toLocaleString("en-IN")}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{e.date}</TableCell>
              <TableCell>
                {editing === e.id
                  ? <Select defaultValue={e.category} onValueChange={v => handleCategoryChange(e.id, v)}>
                      <SelectTrigger className="h-8 w-36 rounded-xl border-border/80 bg-white text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{ALL_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  : <Badge className={`text-xs ${CATEGORY_COLORS[e.category]}`}>{e.category}</Badge>}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{((e.confidence ?? 0) * 100).toFixed(0)}%</TableCell>
              <TableCell>
                <Button variant="ghost" size="sm" className="h-8 rounded-xl text-xs" onClick={() => setEditing(e.id === editing ? null : e.id)}>
                  {editing === e.id ? "Cancel" : "Edit"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
