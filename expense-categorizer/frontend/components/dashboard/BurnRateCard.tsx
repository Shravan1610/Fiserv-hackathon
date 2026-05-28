"use client"
import { BurnRate } from "@/types/expense"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function formatINR(n: number): string {
  return `Rs. ${Math.round(n).toLocaleString("en-IN")}`
}

interface BurnRateCardProps {
  burn: BurnRate
}

export function BurnRateCard({ burn }: BurnRateCardProps) {
  const overspending = burn.overspend > 0
  const forecastPct = burn.budget > 0
    ? Math.min(150, (burn.monthly_forecast / burn.budget) * 100)
    : 0
  const fillWidth = Math.min(100, forecastPct)
  const dangerMarkerPct = forecastPct > 100 ? 100 / forecastPct * 100 : 100

  const fillColor = overspending
    ? "bg-red-500"
    : forecastPct > 85
    ? "bg-amber-500"
    : "bg-emerald-500"

  const headline = overspending
    ? `Will overspend by ${formatINR(burn.overspend)}`
    : `On track to spend ${formatINR(burn.monthly_forecast)}`

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-baseline justify-between">
          <CardTitle className="text-base">Burn Rate</CardTitle>
          <span className="text-xs text-muted-foreground">
            Day {burn.days_elapsed} of {burn.days_in_month}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className={`text-lg font-semibold ${overspending ? "text-red-600" : "text-foreground"}`}>
          {headline}
        </div>
        <div className="relative h-3 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full transition-all duration-700 ${fillColor}`}
            style={{ width: `${fillWidth}%` }}
          />
          {overspending && (
            <div
              className="absolute top-0 h-full w-0.5 bg-foreground/70"
              style={{ left: `${dangerMarkerPct}%` }}
              title="Budget"
            />
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground">Spent</p>
            <p className="font-medium">{formatINR(burn.month_total)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Daily burn</p>
            <p className="font-medium">{formatINR(burn.daily_burn)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Budget</p>
            <p className="font-medium">{formatINR(burn.budget)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
