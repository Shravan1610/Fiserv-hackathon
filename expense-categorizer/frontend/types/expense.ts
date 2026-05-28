export interface Expense {
  id: string
  merchant: string
  amount: number
  date: string
  category: Category
  confidence: number
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

export interface ExpenseSummary {
  total: number
  by_category: Record<Category, number>
  insight: string
}

export interface UploadResponse extends Expense {
  insight: string
}

export interface ExpensesResponse {
  expenses: Expense[]
  summary: ExpenseSummary
}
