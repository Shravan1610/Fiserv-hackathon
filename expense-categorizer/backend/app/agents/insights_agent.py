import json
from typing import Any

# from ..gemini_config import generate_text  # optional LLM insights


def generate_insight(latest: dict[str, Any], all_expenses: dict[str, Any]) -> str:
    summary = all_expenses.get("summary") or {}
    by_category = summary.get("by_category") or {}
    total = summary.get("total", 0)

    # Fast rule-based insight (no LLM cost)
    if by_category:
        top_cat = max(by_category, key=by_category.get)
        top_amt = by_category[top_cat] or 0
        return f"Biggest spend this session: {top_cat} ₹{top_amt:,.0f}"
    amount = latest.get("amount") or 0
    category = latest.get("category") or "expenses"
    try:
        amount = float(amount)
    except (TypeError, ValueError):
        amount = 0
    return f"Added ₹{amount:,.0f} to {category}."

    # Optional: swap with LLM for richer insights
    # prompt = f"Given expenses: {json.dumps(summary)}, write a 1-line insight."
    # return model.generate_content(prompt).text.strip()
