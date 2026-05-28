"use client"

import { useCallback, useEffect, useState } from "react"

import { fetchIncome, getApiErrorMessage } from "@/lib/api"
import { IncomeResponse } from "@/types/expense"

export function useIncomeData() {
  const [data, setData] = useState<IncomeResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const next = await fetchIncome()
      setData(next)
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load income right now."))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { data, isLoading, error, refresh }
}
