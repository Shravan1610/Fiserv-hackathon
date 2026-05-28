"use client"
import { useEffect, useState } from "react"
import { HealthScore } from "@/types/expense"
import { Card, CardContent } from "@/components/ui/card"

const SIZE = 160
const STROKE = 14
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function ringColor(score: number): string {
  if (score >= 80) return "#10b981" // emerald-500
  if (score >= 60) return "#f59e0b" // amber-500
  return "#ef4444"                   // red-500
}

interface HealthScoreRingProps {
  health: HealthScore
}

const COMPONENT_LABELS: Record<keyof HealthScore["components"], string> = {
  budget_adherence: "Budget",
  category_diversity: "Diversity",
  anomaly_frequency: "Anomalies",
  streak_consistency: "Streak",
}

export function HealthScoreRing({ health }: HealthScoreRingProps) {
  const [animated, setAnimated] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setAnimated(health.score), 50)
    return () => clearTimeout(t)
  }, [health.score])

  const dashOffset = CIRCUMFERENCE * (1 - animated / 100)
  const color = ringColor(health.score)

  return (
    <Card className="h-full">
      <CardContent className="flex flex-col items-center justify-center py-6 gap-4">
        <div className="relative" style={{ width: SIZE, height: SIZE }}>
          <svg width={SIZE} height={SIZE} className="-rotate-90">
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth={STROKE}
              className="text-muted opacity-30"
            />
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={color}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Health</p>
            <p className="text-4xl font-bold leading-none mt-1" style={{ color }}>
              {health.score}
            </p>
            <p className="text-sm font-medium mt-1" style={{ color }}>
              {health.rating}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 w-full text-xs">
          {(Object.keys(COMPONENT_LABELS) as (keyof HealthScore["components"])[]).map((k) => {
            const v = health.components[k]
            return (
              <div key={k} className="flex items-center gap-2">
                <span className="text-muted-foreground w-16 shrink-0">{COMPONENT_LABELS[k]}</span>
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${v}%`, backgroundColor: ringColor(v) }}
                  />
                </div>
                <span className="font-medium w-7 text-right">{v}</span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
