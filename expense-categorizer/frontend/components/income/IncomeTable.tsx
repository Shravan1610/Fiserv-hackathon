"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { deleteIncomeRecord, getApiErrorMessage } from "@/lib/api"
import { Income } from "@/types/expense"

const CATEGORY_COLORS: Record<string, string> = {
  Salary: "bg-emerald-100 text-emerald-800",
  Freelance: "bg-blue-100 text-blue-800",
  Investment: "bg-violet-100 text-violet-800",
  Business: "bg-amber-100 text-amber-800",
  Gift: "bg-pink-100 text-pink-800",
  Refund: "bg-cyan-100 text-cyan-800",
  Other: "bg-gray-100 text-gray-700",
}

interface Props {
  income: Income[]
  onDeleted: () => void
}

export function IncomeTable({ income, onDeleted }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setDeletingId(id)
    setError(null)
    try {
      await deleteIncomeRecord(id)
      onDeleted()
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not delete this entry."))
    } finally {
      setDeletingId(null)
    }
  }

  if (income.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/75 bg-muted/30 px-6 py-10 text-center text-sm leading-6 text-muted-foreground">
        No income recorded yet. Add an entry above to start the picture.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-2xl border border-border/70 bg-white/70">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/25 hover:bg-muted/25">
              <TableHead className="h-11 px-4 text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground/80">
                Source
              </TableHead>
              <TableHead className="text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground/80">
                Amount
              </TableHead>
              <TableHead className="text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground/80">
                Date
              </TableHead>
              <TableHead className="text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground/80">
                Category
              </TableHead>
              <TableHead className="text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground/80">
                Notes
              </TableHead>
              <TableHead className="text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground/80" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {income.map((entry) => (
              <TableRow key={entry.id} className="hover:bg-muted/20">
                <TableCell className="px-4 py-3.5 font-medium">{entry.source}</TableCell>
                <TableCell className="font-semibold text-emerald-700">
                  Rs. {entry.amount.toLocaleString("en-IN")}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {entry.date ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge className={`text-xs ${CATEGORY_COLORS[entry.category] ?? CATEGORY_COLORS.Other}`}>
                    {entry.category}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">
                  {entry.notes ?? "—"}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 rounded-xl text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    onClick={() => handleDelete(entry.id)}
                    disabled={deletingId === entry.id}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    {deletingId === entry.id ? "Removing" : "Delete"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
