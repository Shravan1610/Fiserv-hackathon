import { Lightbulb } from "lucide-react"

export function InsightsBanner({ insight }: { insight: string }) {
  if (!insight) return null
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-primary/[0.12] bg-primary/[0.06] px-4 py-3 text-sm shadow-[0_8px_20px_rgba(47,127,142,0.08)]">
      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span className="leading-6 text-foreground/85">{insight}</span>
    </div>
  )
}
