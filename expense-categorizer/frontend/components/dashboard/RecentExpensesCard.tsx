import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Expense } from "@/types/expense"

const CATEGORY_COLORS: Record<string, string> = {
  Food: "bg-orange-100 text-orange-800",
  Travel: "bg-blue-100 text-blue-800",
  Shopping: "bg-purple-100 text-purple-800",
  Entertainment: "bg-pink-100 text-pink-800",
  Healthcare: "bg-green-100 text-green-800",
  Utilities: "bg-yellow-100 text-yellow-800",
  Education: "bg-indigo-100 text-indigo-800",
  Other: "bg-gray-100 text-gray-700",
}

interface RecentExpensesCardProps {
  expenses: Expense[]
}

export function RecentExpensesCard({ expenses }: RecentExpensesCardProps) {
  return (
    <Card className="flex h-full flex-col rounded-2xl border-white/70 bg-white/78 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <CardHeader className="space-y-2 px-5 pb-4 pt-5">
        <CardTitle className="text-[0.95rem] font-semibold">Recent activity</CardTitle>
        <p className="text-sm text-muted-foreground">
          The latest receipts entering the ledger, ordered by receipt date.
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col px-5 pb-5 pt-0">
        {expenses.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-border/75 bg-muted/30 px-6 py-10 text-center text-sm leading-6 text-muted-foreground">
            Upload your first receipt to see recent activity here.
          </div>
        ) : (
          <div className="divide-y divide-border/70 rounded-2xl border border-border/70 bg-background/80">
            {expenses.map((expense) => (
              <div
                key={expense.id}
                className={`flex items-center justify-between gap-4 px-4 py-3.5 ${
                  expense.is_anomaly ? "bg-red-50/60" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">
                      {expense.merchant || "Unknown merchant"}
                    </p>
                    <Badge
                      className={CATEGORY_COLORS[expense.category] ?? CATEGORY_COLORS.Other}
                    >
                      {expense.category}
                    </Badge>
                    {expense.is_anomaly ? (
                      <Badge className="bg-red-100 text-red-800">Anomaly</Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground/80">
                    Receipt date
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {expense.date}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[0.72rem] uppercase tracking-[0.12em] text-muted-foreground/75">
                    Amount
                  </p>
                  <span className="text-sm font-semibold text-foreground">
                    Rs. {expense.amount.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
