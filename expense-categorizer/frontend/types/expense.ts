export interface Expense {
  id: string
  merchant: string
  amount: number
  date: string
  category: Category
  confidence: number
  is_anomaly?: boolean
  anomaly_reason?: string | null
}

export type Category =
  | "Food"
  | "Travel"
  | "Shopping"
  | "Entertainment"
  | "Healthcare"
  | "Utilities"
  | "Education"
  | "Other"

export type IncomeCategory =
  | "Salary"
  | "Freelance"
  | "Investment"
  | "Business"
  | "Gift"
  | "Refund"
  | "Other"

export const INCOME_CATEGORIES: IncomeCategory[] = [
  "Salary",
  "Freelance",
  "Investment",
  "Business",
  "Gift",
  "Refund",
  "Other",
]

export interface Income {
  id: string
  source: string
  amount: number
  date: string | null
  category: IncomeCategory
  notes?: string | null
}

export interface IncomeSummary {
  total: number
  by_category: Partial<Record<IncomeCategory, number>>
}

export interface IncomeResponse {
  income: Income[]
  summary: IncomeSummary
}

export interface BurnRate {
  daily_burn: number
  monthly_forecast: number
  budget: number
  overspend: number
  days_elapsed: number
  days_in_month: number
  month_total: number
}

export interface HealthScoreComponents {
  budget_adherence: number
  category_diversity: number
  anomaly_frequency: number
  streak_consistency: number
}

export interface HealthScore {
  score: number
  rating: "Excellent" | "Good" | "Watch" | "At risk"
  components: HealthScoreComponents
}

export interface ExpenseSummary {
  total: number
  by_category: Record<Category, number>
  insight: string
  burn_rate?: BurnRate
  health_score?: HealthScore
  income_total?: number
  net_cashflow?: number
}

export interface ExpensesResponse {
  expenses: Expense[]
  summary: ExpenseSummary
}

export interface ExtractVerification {
  corrections_made: boolean
  notes: string
  original: {
    merchant?: string | null
    amount?: number | null
    date?: string | null
  }
  verification_error?: string | null
}

export interface ExtractResponse {
  temp_id: string
  merchant: string | null
  amount: number | null
  date: string | null
  category: Category
  confidence: number
  verification: ExtractVerification
}

export interface SaveExpensePayload {
  merchant: string
  amount: number
  date: string | null
  category: Category
  confidence?: number
}

export interface MonthlyPoint {
  month: string
  expense: number
  income: number
  net: number
}

export interface AnalyticsResponse {
  range: { from: string | null; to: string | null }
  totals: {
    expense: number
    income: number
    net: number
    savings_rate: number | null
  }
  expenses: Expense[]
  income: Income[]
  by_expense_category: Record<string, number>
  by_income_category: Record<string, number>
  top_merchants: { merchant: string; amount: number }[]
  monthly_series: MonthlyPoint[]
  burn_rate: BurnRate
  health_score: HealthScore
}

export interface SummaryResponse {
  summary: string
  generated_at: string
}

export interface ChatResponse {
  answer: string
  question: string
}
