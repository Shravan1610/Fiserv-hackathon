import axios, { isAxiosError } from "axios"
import { ExpensesResponse, UploadResponse } from "@/types/expense"
import { MOCK_EXPENSES, MOCK_UPLOAD } from "./mock-data"

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true"
const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"
const UPLOAD_TIMEOUT_MS = 120_000

export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as { error?: string } | undefined
    if (data?.error) return data.error
  }
  return fallback
}

export async function uploadReceipt(file: File): Promise<UploadResponse> {
  if (USE_MOCK) return MOCK_UPLOAD
  const form = new FormData()
  form.append("receipt", file)
  const { data } = await axios.post<UploadResponse>(`${BASE}/api/upload`, form, {
    timeout: UPLOAD_TIMEOUT_MS,
  })
  return data
}

export async function fetchExpenses(): Promise<ExpensesResponse> {
  if (USE_MOCK) return MOCK_EXPENSES
  const { data } = await axios.get<ExpensesResponse>(`${BASE}/api/expenses`)
  return data
}

export async function patchCategory(id: string, category: string) {
  if (USE_MOCK) return { id, category, updated: true }
  const { data } = await axios.patch(`${BASE}/api/expenses/${id}`, { category })
  return data
}
