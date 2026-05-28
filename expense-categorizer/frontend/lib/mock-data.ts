import { ExpensesResponse, UploadResponse } from "@/types/expense"

export const MOCK_EXPENSES: ExpensesResponse = {
  expenses: [
    { id: "1", merchant: "Domino's Pizza", amount: 540, date: "2026-01-28", category: "Food", confidence: 0.99 },
    { id: "2", merchant: "Uber", amount: 220, date: "2026-01-27", category: "Travel", confidence: 0.99 },
    { id: "3", merchant: "Netflix", amount: 199, date: "2026-01-26", category: "Entertainment", confidence: 0.99 },
    { id: "4", merchant: "Apollo Pharmacy", amount: 340, date: "2026-01-25", category: "Healthcare", confidence: 0.95 },
    { id: "5", merchant: "Blinkit", amount: 670, date: "2026-01-24", category: "Shopping", confidence: 0.97 },
  ],
  summary: {
    total: 1969,
    by_category: { Food: 540, Travel: 220, Entertainment: 199, Healthcare: 340, Shopping: 670, Utilities: 0, Education: 0, Other: 0 },
    insight: "Biggest spend this session: Shopping Rs. 670",
  },
}

export const MOCK_UPLOAD: UploadResponse = {
  id: "6", merchant: "Swiggy", amount: 380, date: "2026-05-28",
  category: "Food", confidence: 0.98, insight: "You've spent Rs. 920 on Food this week."
}
