"use client"
import * as React from "react"
import { Tooltip } from "recharts"
import { cn } from "@/lib/utils"

export type ChartConfig = Record<string, { label?: string; color?: string }>

interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  config: ChartConfig
}

function ChartContainer({ config, className, children, ...props }: ChartContainerProps) {
  const cssVars = Object.entries(config).reduce<Record<string, string>>((acc, [key, val]) => {
    if (val.color) acc[`--color-${key}`] = val.color
    return acc
  }, {})

  return (
    <div className={cn("w-full", className)} style={cssVars as React.CSSProperties} {...props}>
      {children}
    </div>
  )
}

interface ChartTooltipContentProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; color?: string }>
  label?: string
  formatter?: (value: number, name: string) => React.ReactNode
}

function ChartTooltipContent({ active, payload, label, formatter }: ChartTooltipContentProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-background p-2 shadow-sm text-xs">
      {label && <p className="font-medium mb-1">{label}</p>}
      {payload.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          {item.color && <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />}
          <span className="text-muted-foreground">{item.name}:</span>
          <span className="font-medium">{formatter ? formatter(item.value, item.name) : item.value}</span>
        </div>
      ))}
    </div>
  )
}

const ChartTooltip = Tooltip

export { ChartContainer, ChartTooltip, ChartTooltipContent }
