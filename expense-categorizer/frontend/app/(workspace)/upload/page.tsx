"use client"

import Link from "next/link"
import { ArrowRightIcon, ReceiptTextIcon, WalletCardsIcon } from "lucide-react"

import { DashboardShell } from "@/components/dashboard/DashboardShell"
import { InsightsBanner } from "@/components/dashboard/InsightsBanner"
import { UploadCard } from "@/components/upload/UploadCard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useExpensesData } from "@/hooks/use-expenses-data"

export default function UploadPage() {
  const { data, error, refresh } = useExpensesData()
  const latestInsight = data?.summary.insight ?? ""

  async function handleUploadSuccess() {
    await refresh()
  }

  return (
    <DashboardShell
      title="Upload Receipt"
      description="Add receipts, extract details, and keep your expense ledger current."
      action={
        <Button asChild variant="outline" className="rounded-xl">
          <Link href="/expenses">
            View expenses
            <ArrowRightIcon className="size-4" />
          </Link>
        </Button>
      }
    >
      {latestInsight ? <InsightsBanner insight={latestInsight} /> : null}
      {error ? (
        <Card className="rounded-2xl border-destructive/20 bg-destructive/5 shadow-sm">
          <CardContent className="p-5 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_320px]">
        <UploadCard onUploadSuccess={handleUploadSuccess} />

        <div className="grid gap-5 auto-rows-min">
          <Card className="rounded-2xl border-white/70 bg-white/78 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
            <CardHeader className="px-5 pb-4 pt-5">
              <CardTitle className="text-[0.95rem] font-semibold">Ledger snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-5 pb-5 pt-0">
              <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-primary/[0.08] p-2 text-primary">
                    <ReceiptTextIcon className="size-4" />
                  </div>
                  <div>
                    <p className="text-[0.78rem] uppercase tracking-[0.12em] text-muted-foreground/75">
                      Receipts processed
                    </p>
                    <p className="mt-1 text-2xl font-semibold">
                      {data?.expenses.length?.toLocaleString("en-IN") ?? "0"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-primary/[0.08] p-2 text-primary">
                    <WalletCardsIcon className="size-4" />
                  </div>
                  <div>
                    <p className="text-[0.78rem] uppercase tracking-[0.12em] text-muted-foreground/75">
                      Current total spend
                    </p>
                    <p className="mt-1 text-2xl font-semibold">
                      Rs. {(data?.summary.total ?? 0).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-white/70 bg-white/78 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
            <CardHeader className="px-5 pb-4 pt-5">
              <CardTitle className="text-[0.95rem] font-semibold">Process flow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-5 pb-5 pt-0 text-sm leading-6 text-muted-foreground">
              <p>The file is sent through OCR, converted into structured fields, and added to the ledger.</p>
              <p>Use the expenses view to correct categories if confidence is low or flagged as an anomaly.</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-white/70 bg-primary/[0.045] shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
            <CardContent className="px-5 py-5">
              <p className="text-[0.78rem] uppercase tracking-[0.12em] text-primary/80">Best results</p>
              <p className="mt-2 text-sm leading-6 text-foreground/80">
                Use clear, well-lit receipt images so merchant names, totals, and dates extract cleanly on the first pass.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  )
}
