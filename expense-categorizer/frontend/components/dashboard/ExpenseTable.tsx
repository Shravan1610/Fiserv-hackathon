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

export function ExpenseTable({ expenses: initial }: { expenses: Expense[] }) {
  const [expenses, setExpenses] = useState(initial)
  const [editing, setEditing] = useState<string | null>(null)

  useEffect(() => {
    setExpenses(initial)
  }, [initial])

  async function handleCategoryChange(id: string, category: string) {
    await patchCategory(id, category)
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, category: category as Category } : e))
    setEditing(null)
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Merchant</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Confidence</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {expenses.map(e => (
          <TableRow key={e.id}>
            <TableCell className="font-medium">{e.merchant ?? "-"}</TableCell>
            <TableCell>Rs. {e.amount?.toLocaleString("en-IN")}</TableCell>
            <TableCell className="text-muted-foreground">{e.date}</TableCell>
            <TableCell>
              {editing === e.id
                ? <Select defaultValue={e.category} onValueChange={v => handleCategoryChange(e.id, v)}>
                    <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{ALL_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                : <Badge className={`text-xs ${CATEGORY_COLORS[e.category]}`}>{e.category}</Badge>}
            </TableCell>
            <TableCell className="text-muted-foreground text-xs">{((e.confidence ?? 0) * 100).toFixed(0)}%</TableCell>
            <TableCell>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setEditing(e.id === editing ? null : e.id)}>
                {editing === e.id ? "Cancel" : "Edit"}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
