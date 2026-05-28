"use client"

import * as React from "react"
import {
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
} from "recharts"

import { cn } from "@/lib/utils"

type ChartConfig = Record<string, { color?: string; label?: string }>
type ChartStyle = React.CSSProperties & Record<`--color-${string}`, string>
type NameType = string | number
type ValueType = string | number | Array<string | number>

export function ChartContainer({
  children,
  className,
  config,
}: {
  children: React.ReactElement
  className?: string
  config: ChartConfig
}) {
  const style = Object.entries(config).reduce<ChartStyle>((acc, [key, item]) => {
    if (item.color) {
      acc[`--color-${key}`] = item.color
    }
    return acc
  }, {})

  return (
    <div className={cn("w-full", className)} style={style}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  )
}

export const ChartTooltip = Tooltip

interface ChartTooltipContentProps
  extends TooltipProps<ValueType, NameType> {
  formatter?: (value: ValueType, name?: NameType) => React.ReactNode
}

export function ChartTooltipContent({
  active,
  formatter,
  payload,
}: ChartTooltipContentProps) {
  if (!active || !payload?.length) {
    return null
  }

  return (
    <div className="rounded-md border bg-card px-3 py-2 text-sm shadow-sm">
      {payload.map((item, index) => (
        <div key={`${item.name}-${index}`} className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-muted-foreground">{item.name}</span>
          <span className="font-medium">
            {formatter && item.value !== undefined
              ? formatter(item.value, item.name)
              : item.value}
          </span>
        </div>
      ))}
    </div>
  )
}
