import google.generativeai as genai
import os

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-1.5-flash")

def generate_insight(latest: dict, all_expenses: dict) -> str:
    summary = all_expenses.get("summary", {})
    by_category = summary.get("by_category", {})

    if by_category:
        top_cat = max(by_category, key=by_category.get)
        top_amt = by_category[top_cat]
        return f"Biggest spend this session: {top_cat} ₹{top_amt:,.0f}"
    return f"Added ₹{latest.get('amount', 0):,.0f} to {latest.get('category', 'expenses')}."
