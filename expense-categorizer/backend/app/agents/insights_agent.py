"""Insight agent — fast rule-based one-liner about latest spending."""

from typing import Any


def generate_insight(latest: dict[str, Any], all_expenses: dict[str, Any]) -> str:
    summary = (all_expenses or {}).get("summary") or {}
    by_category = summary.get("by_category") or {}

    if by_category:
        top_cat = max(by_category, key=by_category.get)
        top_amt = by_category[top_cat] or 0
        return f"Biggest spend this session: {top_cat} Rs. {top_amt:,.0f}"

    try:
        amount = float((latest or {}).get("amount") or 0)
    except (TypeError, ValueError):
        amount = 0.0
    category = (latest or {}).get("category") or "expenses"
    if amount > 0:
        return f"Added Rs. {amount:,.0f} to {category}."
    return "Upload a receipt to start tracking your spend."
