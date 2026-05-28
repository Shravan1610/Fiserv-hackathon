import { IndianRupeeIcon, Layers3Icon, ReceiptTextIcon, TrendingUpIcon } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ExpenseSummary } from "@/types/expense"

interface SummaryCardsProps {
  summary?: ExpenseSummary
  receiptCount: number
}

function getTopCategory(summary?: ExpenseSummary) {
  if (!summary) return "No data"

  const sorted = Object.entries(summary.by_category).sort((a, b) => b[1] - a[1])
  const [category, amount] = sorted[0] ?? []

  if (!category || !amount) return "No data"
  return category
}

export function SummaryCards({ summary, receiptCount }: SummaryCardsProps) {
  const total = summary?.total ?? 0
  const average = receiptCount > 0 ? Math.round(total / receiptCount) : 0
  const cards = [
    {
      title: "Total spend",
      value: `Rs. ${total.toLocaleString("en-IN")}`,
      hint: "Across all processed receipts",
      icon: IndianRupeeIcon,
    },
    {
      title: "Receipts",
      value: receiptCount.toString(),
      hint: "Captured in the current ledger",
      icon: ReceiptTextIcon,
    },
    {
      title: "Top category",
      value: getTopCategory(summary),
      hint: "Largest share of spend right now",
      icon: Layers3Icon,
    },
    {
      title: "Average receipt",
      value: `Rs. ${average.toLocaleString("en-IN")}`,
      hint: "Mean spend per upload",
      icon: TrendingUpIcon,
    },
  ]

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card
            key={card.title}
            className="overflow-hidden rounded-2xl border-white/70 bg-white/75 shadow-[0_10px_30px_rgba(15,23,42,0.05)]"
          >
            <CardHeader className="flex flex-row items-start justify-between space-y-0 px-5 pb-2 pt-5">
              <div className="space-y-1">
                <CardTitle className="text-[0.8rem] font-medium uppercase tracking-[0.12em] text-muted-foreground/85">
                  {card.title}
                </CardTitle>
                <div className="text-[1.65rem] font-semibold tracking-tight text-foreground">
                  {card.value}
                </div>
              </div>
              <div className="rounded-xl border border-primary/10 bg-primary/[0.08] p-2 text-primary">
                <Icon className="size-4" />
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5 pt-0">
              <p className="text-sm leading-6 text-muted-foreground">{card.hint}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
