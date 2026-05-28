"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Loader2, AlertCircle, Sparkles } from "lucide-react"

import { Badge } from "@/components/ui/badge"
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
import { getApiErrorMessage, saveExpense } from "@/lib/api"
import { Category, ExtractResponse } from "@/types/expense"

const ALL_CATEGORIES: Category[] = [
  "Food",
  "Travel",
  "Shopping",
  "Entertainment",
  "Healthcare",
  "Utilities",
  "Education",
  "Other",
]

interface Props {
  draft: ExtractResponse
  onSaved: () => void
  onDiscard: () => void
}

export function ReviewCard({ draft, onSaved, onDiscard }: Props) {
  const [merchant, setMerchant] = useState(draft.merchant ?? "")
  const [amount, setAmount] = useState<string>(
    draft.amount != null ? String(draft.amount) : "",
  )
  const [date, setDate] = useState(draft.date ?? "")
  const [category, setCategory] = useState<Category>(draft.category)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMerchant(draft.merchant ?? "")
    setAmount(draft.amount != null ? String(draft.amount) : "")
    setDate(draft.date ?? "")
    setCategory(draft.category)
    setError(null)
    setSavedFlash(false)
  }, [draft])

  const corrections = draft.verification?.corrections_made

  async function handleSave() {
    const numericAmount = Number.parseFloat(amount)
    if (!merchant.trim()) {
      setError("Merchant is required.")
      return
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Amount must be a positive number.")
      return
    }
    setError(null)
    setSaving(true)
    try {
      await saveExpense({
        merchant: merchant.trim(),
        amount: numericAmount,
        date: date || null,
        category,
        confidence: draft.confidence,
      })
      setSavedFlash(true)
      onSaved()
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not save this receipt."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="w-full rounded-2xl border-white/70 bg-white/85 shadow-[0_12px_34px_rgba(15,23,42,0.06)]">
      <CardHeader className="space-y-2 px-6 pb-4 pt-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <CardTitle className="text-lg font-semibold">Review extracted details</CardTitle>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          Gemini double-checked the OCR. Edit anything that looks off, then save or discard.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 px-6 pb-6 pt-0">
        {corrections && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Gemini corrected the OCR output.</p>
              {draft.verification?.notes && (
                <p className="mt-0.5 text-xs leading-5 text-amber-800">
                  {draft.verification.notes}
                </p>
              )}
              {draft.verification?.original && (
                <p className="mt-1 text-xs text-amber-800">
                  Original: {draft.verification.original.merchant ?? "—"} ·
                  {" "}
                  Rs. {(draft.verification.original.amount ?? 0).toLocaleString("en-IN")} ·
                  {" "}
                  {draft.verification.original.date ?? "—"}
                </p>
              )}
            </div>
          </div>
        )}

        {draft.verification?.verification_error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-xs text-rose-800">
            Verification call failed; showing raw extraction. ({draft.verification.verification_error})
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <p className="text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground/80">
              Merchant
            </p>
            <Input
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="e.g. Swiggy"
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
              Date
            </p>
            <Input
              type="date"
              value={date ?? ""}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground/80">
              Category
            </p>
            <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[0.7rem] text-muted-foreground/80">
              Confidence: {(draft.confidence * 100).toFixed(0)}%
            </p>
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {savedFlash ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Saved.</span>
              </>
            ) : (
              <Badge className="rounded-full bg-muted text-xs text-muted-foreground">
                Draft — not yet saved
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={onDiscard}
              disabled={saving}
              className="rounded-xl"
            >
              Discard
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving
                </>
              ) : (
                "Save expense"
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
