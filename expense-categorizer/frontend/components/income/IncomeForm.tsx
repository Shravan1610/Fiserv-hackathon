"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createIncome, getApiErrorMessage } from "@/lib/api"
import { INCOME_CATEGORIES, IncomeCategory } from "@/types/expense"

interface Props {
  onSaved: () => void
}

export function IncomeForm({ onSaved }: Props) {
  const today = new Date().toISOString().slice(0, 10)
  const [source, setSource] = useState("")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(today)
  const [category, setCategory] = useState<IncomeCategory>("Salary")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState<string | null>(null)

  function reset() {
    setSource("")
    setAmount("")
    setDate(today)
    setCategory("Salary")
    setNotes("")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const numericAmount = Number.parseFloat(amount)
    if (!source.trim()) {
      setError("Source is required.")
      return
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Amount must be a positive number.")
      return
    }
    setError(null)
    setSaving(true)
    try {
      await createIncome({
        source: source.trim(),
        amount: numericAmount,
        date: date || null,
        category,
        notes: notes.trim() || null,
      })
      setSavedFlash(`Logged Rs. ${numericAmount.toLocaleString("en-IN")} from ${source.trim()}.`)
      reset()
      onSaved()
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not save this income."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="rounded-2xl border-white/70 bg-white/82 shadow-[0_12px_34px_rgba(15,23,42,0.06)]">
      <CardHeader className="px-6 pb-4 pt-6">
        <CardTitle className="text-lg font-semibold">Log income</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">
          Record salary, freelance payouts, refunds, anything that came in. Used by Analytics and the Ask widget.
        </p>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-0">
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <p className="text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground/80">
              Source
            </p>
            <Input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g. Acme Corp salary, Freelance — landing page"
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground/80">
              Amount (Rs.)
            </p>
            <Input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground/80">
              Date received
            </p>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground/80">
              Category
            </p>
            <Select value={category} onValueChange={(v) => setCategory(v as IncomeCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INCOME_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <p className="text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground/80">
              Notes (optional)
            </p>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="invoice #, payer, etc."
            />
          </div>
          <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="text-xs text-muted-foreground">
              {savedFlash ? <span className="text-emerald-600">{savedFlash}</span> : "Income posts immediately to the database."}
            </p>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" className="rounded-xl" onClick={reset} disabled={saving}>
                Reset
              </Button>
              <Button type="submit" className="rounded-xl" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving
                  </>
                ) : (
                  "Add income"
                )}
              </Button>
            </div>
          </div>
          {error && (
            <p className="sm:col-span-2 text-sm text-destructive">{error}</p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
