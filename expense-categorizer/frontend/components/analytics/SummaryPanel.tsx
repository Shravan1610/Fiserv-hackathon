"use client"

import { useState } from "react"
import { Loader2, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { generateSummary, getApiErrorMessage } from "@/lib/api"
import { SummaryResponse } from "@/types/expense"

interface Props {
  range?: { from?: string; to?: string }
  hasData: boolean
}

export function SummaryPanel({ range, hasData }: Props) {
  const [summary, setSummary] = useState<SummaryResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    try {
      const res = await generateSummary(range)
      setSummary(res)
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not generate summary right now."))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="rounded-2xl border-white/70 bg-white/82 shadow-[0_12px_34px_rgba(15,23,42,0.06)]">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 px-6 pb-4 pt-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle className="text-lg font-semibold">AI summary of your finances</CardTitle>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            Gemini reads your expenses and income and writes a plain-language summary with one actionable suggestion.
          </p>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={loading || !hasData}
          className="rounded-xl"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating
            </>
          ) : summary ? (
            "Regenerate"
          ) : (
            "Generate summary"
          )}
        </Button>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-0">
        {!hasData ? (
          <div className="rounded-2xl border border-dashed border-border/75 bg-muted/30 px-6 py-8 text-center text-sm leading-6 text-muted-foreground">
            Add at least one expense or income entry, then come back here to generate a summary.
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : summary ? (
          <div className="space-y-3">
            <p className="whitespace-pre-line text-sm leading-7 text-foreground/85">
              {summary.summary}
            </p>
            <p className="text-[0.7rem] uppercase tracking-[0.14em] text-muted-foreground/70">
              Generated {new Date(summary.generated_at).toLocaleString()}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/75 bg-muted/20 px-6 py-8 text-center text-sm leading-6 text-muted-foreground">
            Click "Generate summary" to get a multi-paragraph narrative grounded in your numbers.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
