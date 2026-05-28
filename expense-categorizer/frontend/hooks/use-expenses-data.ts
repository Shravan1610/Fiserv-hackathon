"use client"

import { useCallback, useEffect, useState } from "react"

import { fetchExpenses, getApiErrorMessage } from "@/lib/api"
import { ExpensesResponse } from "@/types/expense"

export function useExpensesData() {
  const [data, setData] = useState<ExpensesResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const nextData = await fetchExpenses()
      setData(nextData)
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load expenses right now."))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    data,
    isLoading,
    error,
    refresh,
  }
}
