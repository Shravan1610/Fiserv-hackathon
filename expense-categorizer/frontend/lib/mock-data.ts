import {
  AnalyticsResponse,
  ChatResponse,
  ExpensesResponse,
  ExtractResponse,
  Income,
  IncomeResponse,
  SummaryResponse,
} from "@/types/expense"

export const MOCK_EXPENSES: ExpensesResponse = {
  expenses: [
    { id: "1", merchant: "Domino's Pizza", amount: 540, date: "2026-05-28", category: "Food", confidence: 0.99 },
    { id: "2", merchant: "Uber", amount: 220, date: "2026-05-27", category: "Travel", confidence: 0.99 },
    { id: "3", merchant: "Netflix", amount: 199, date: "2026-05-26", category: "Entertainment", confidence: 0.99 },
    { id: "4", merchant: "Apollo Pharmacy", amount: 340, date: "2026-05-25", category: "Healthcare", confidence: 0.95 },
    { id: "5", merchant: "Blinkit", amount: 670, date: "2026-05-24", category: "Shopping", confidence: 0.97 },
    { id: "6", merchant: "Swiggy", amount: 1850, date: "2026-05-23", category: "Food", confidence: 0.98, is_anomaly: true, anomaly_reason: "240% above your usual Rs. 545 at Swiggy" },
    { id: "7", merchant: "Swiggy", amount: 520, date: "2026-05-18", category: "Food", confidence: 0.98 },
    { id: "8", merchant: "Swiggy", amount: 570, date: "2026-05-12", category: "Food", confidence: 0.98 },
  ],
  summary: {
    total: 4909,
    by_category: { Food: 2960, Travel: 220, Entertainment: 199, Healthcare: 340, Shopping: 670, Utilities: 0, Education: 0, Other: 520 },
    insight: "Biggest spend this session: Food Rs. 2,960",
    income_total: 65000,
    net_cashflow: 60091,
    burn_rate: {
      daily_burn: 175.32,
      monthly_forecast: 5435,
      budget: 4500,
      overspend: 935,
      days_elapsed: 28,
      days_in_month: 31,
      month_total: 4909,
    },
    health_score: {
      score: 72,
      rating: "Good",
      components: {
        budget_adherence: 83,
        category_diversity: 75,
        anomaly_frequency: 88,
        streak_consistency: 60,
      },
    },
  },
}

export const MOCK_EXTRACT: ExtractResponse = {
  temp_id: "draft-1",
  merchant: "Swiggy",
  amount: 380,
  date: "2026-05-28",
  category: "Food",
  confidence: 0.98,
  verification: {
    corrections_made: true,
    notes: "Amount corrected from 38.00 to 380.00 (decimal misread)",
    original: { merchant: "Swiggy", amount: 38, date: "2026-05-28" },
  },
}

export const MOCK_INCOME: IncomeResponse = {
  income: [
    { id: "i1", source: "Acme Corp", amount: 60000, date: "2026-05-01", category: "Salary" },
    { id: "i2", source: "Freelance — landing page", amount: 5000, date: "2026-05-15", category: "Freelance" },
  ],
  summary: {
    total: 65000,
    by_category: { Salary: 60000, Freelance: 5000 },
  },
}

export function MOCK_ASK(question: string): ChatResponse {
  return {
    question,
    answer:
      "Based on your data, you brought in Rs. 65,000 this month and spent Rs. 4,909 — a savings rate of about 92%. Your biggest spend was Food at Rs. 2,960, with one Swiggy charge flagged as 240% above your usual.",
  }
}

export function MOCK_ANALYTICS(): AnalyticsResponse {
  return {
    range: { from: null, to: null },
    totals: { expense: 4909, income: 65000, net: 60091, savings_rate: 0.9245 },
    expenses: MOCK_EXPENSES.expenses,
    income: MOCK_INCOME.income,
    by_expense_category: MOCK_EXPENSES.summary.by_category,
    by_income_category: MOCK_INCOME.summary.by_category,
    top_merchants: [
      { merchant: "Swiggy", amount: 2940 },
      { merchant: "Blinkit", amount: 670 },
      { merchant: "Domino's Pizza", amount: 540 },
      { merchant: "Apollo Pharmacy", amount: 340 },
      { merchant: "Uber", amount: 220 },
    ],
    monthly_series: [
      { month: "2026-04", expense: 4200, income: 60000, net: 55800 },
      { month: "2026-05", expense: 4909, income: 65000, net: 60091 },
    ],
    burn_rate: MOCK_EXPENSES.summary.burn_rate!,
    health_score: MOCK_EXPENSES.summary.health_score!,
  }
}

export function MOCK_SUMMARY(): SummaryResponse {
  return {
    summary:
      "You earned Rs. 65,000 and spent Rs. 4,909 this period, leaving a net of Rs. 60,091 — a healthy savings rate near 92%.\n\nFood is your largest category at Rs. 2,960, and a single Rs. 1,850 Swiggy charge stood out as 240% above your usual order. Shopping (Rs. 670) and Healthcare (Rs. 340) round out the top three.\n\nIncome looks steady — Rs. 60,000 from Salary plus Rs. 5,000 of Freelance work. No lumpiness yet.\n\nOne move: cap Swiggy at Rs. 600 per order. The single anomaly explains 38% of your monthly Food spend on its own.",
    generated_at: new Date().toISOString(),
  }
}

export function MOCK_NEW_INCOME(payload: Omit<Income, "id">): Income {
  return { id: `i-${Date.now()}`, ...payload }
}
