import axios, { isAxiosError } from "axios"
import {
  AnalyticsResponse,
  ChatResponse,
  Expense,
  ExpensesResponse,
  ExtractResponse,
  Income,
  IncomeResponse,
  SaveExpensePayload,
  SummaryResponse,
} from "@/types/expense"
import {
  MOCK_ANALYTICS,
  MOCK_ASK,
  MOCK_EXPENSES,
  MOCK_EXTRACT,
  MOCK_INCOME,
  MOCK_NEW_INCOME,
  MOCK_SUMMARY,
} from "./mock-data"

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true"
const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"
const UPLOAD_TIMEOUT_MS = 120_000
const ASK_TIMEOUT_MS = 30_000
const SUMMARY_TIMEOUT_MS = 45_000

export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as { error?: string } | undefined
    if (data?.error) return data.error
  }
  return fallback
}

export async function extractReceipt(file: File): Promise<ExtractResponse> {
  if (USE_MOCK) return MOCK_EXTRACT
  const form = new FormData()
  form.append("receipt", file)
  const { data } = await axios.post<ExtractResponse>(`${BASE}/api/extract`, form, {
    timeout: UPLOAD_TIMEOUT_MS,
  })
  return data
}

export async function saveExpense(payload: SaveExpensePayload): Promise<Expense & { insight?: string }> {
  if (USE_MOCK) {
    return {
      id: `mock-${Date.now()}`,
      merchant: payload.merchant,
      amount: payload.amount,
      date: payload.date ?? new Date().toISOString().slice(0, 10),
      category: payload.category,
      confidence: payload.confidence ?? 0.9,
      insight: "Mock insight: saved.",
    }
  }
  const { data } = await axios.post<Expense & { insight?: string }>(
    `${BASE}/api/expenses`,
    payload,
  )
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

export async function fetchIncome(): Promise<IncomeResponse> {
  if (USE_MOCK) return MOCK_INCOME
  const { data } = await axios.get<IncomeResponse>(`${BASE}/api/income`)
  return data
}

export async function createIncome(payload: Omit<Income, "id">): Promise<Income> {
  if (USE_MOCK) return MOCK_NEW_INCOME(payload)
  const { data } = await axios.post<Income>(`${BASE}/api/income`, payload)
  return data
}

export async function patchIncome(id: string, fields: Partial<Omit<Income, "id">>) {
  if (USE_MOCK) return { id, updated: true }
  const { data } = await axios.patch(`${BASE}/api/income/${id}`, fields)
  return data
}

export async function deleteIncomeRecord(id: string) {
  if (USE_MOCK) return { id, deleted: true }
  const { data } = await axios.delete(`${BASE}/api/income/${id}`)
  return data
}

export async function fetchAnalytics(range?: { from?: string; to?: string }): Promise<AnalyticsResponse> {
  if (USE_MOCK) return MOCK_ANALYTICS()
  const params = new URLSearchParams()
  if (range?.from) params.set("from", range.from)
  if (range?.to) params.set("to", range.to)
  const qs = params.toString()
  const { data } = await axios.get<AnalyticsResponse>(
    `${BASE}/api/analytics${qs ? `?${qs}` : ""}`,
  )
  return data
}

export async function generateSummary(range?: { from?: string; to?: string }): Promise<SummaryResponse> {
  if (USE_MOCK) return MOCK_SUMMARY()
  const { data } = await axios.post<SummaryResponse>(
    `${BASE}/api/summary`,
    { from: range?.from, to: range?.to },
    { timeout: SUMMARY_TIMEOUT_MS },
  )
  return data
}

export async function askExpenses(question: string): Promise<ChatResponse> {
  if (USE_MOCK) return MOCK_ASK(question)
  const { data } = await axios.post<ChatResponse>(
    `${BASE}/api/ask`,
    { question },
    { timeout: ASK_TIMEOUT_MS },
  )
  return data
}
