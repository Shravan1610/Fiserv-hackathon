import { Lightbulb } from "lucide-react"

export function InsightsBanner({ insight }: { insight: string }) {
  if (!insight) return null
  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800 dark:bg-amber-950">
      <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
      <span className="text-amber-800 dark:text-amber-200">{insight}</span>
    </div>
  )
}
