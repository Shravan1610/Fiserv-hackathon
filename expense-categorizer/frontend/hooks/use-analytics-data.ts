"use client"

import { useCallback, useEffect, useState } from "react"

import { fetchAnalytics, getApiErrorMessage } from "@/lib/api"
import { AnalyticsResponse } from "@/types/expense"

export function useAnalyticsData(range?: { from?: string; to?: string }) {
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const next = await fetchAnalytics(range)
      setData(next)
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load analytics right now."))
    } finally {
      setIsLoading(false)
    }
  }, [range?.from, range?.to])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { data, isLoading, error, refresh }
}
