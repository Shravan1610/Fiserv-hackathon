"""AI #3 — generates a multi-paragraph narrative summary of expenses + income."""

import json
from datetime import datetime, timezone

from ..gemini_config import generate_text

SUMMARY_PROMPT = """
You are a personal finance analyst. Write a clear, friendly summary of this user's finances.

Cover, in 3-4 short paragraphs:
1. Overall picture: total spend, total income, net cashflow, savings rate (income - expense / income).
2. Spending patterns: top 2-3 categories, biggest single expense, any obvious anomalies.
3. Income picture: top sources, whether income is steady or lumpy.
4. One specific, actionable suggestion grounded in their numbers (not generic advice).

Use 'Rs.' for currency and round to whole rupees. Use plain prose with paragraph breaks (one blank line between paragraphs). Do NOT use markdown headers, bullet lists, or asterisks. Do NOT invent numbers. If income is empty, say so plainly and skip the savings-rate calculation.
"""


def _slim_expense(e: dict) -> dict:
    return {
        "merchant": e.get("merchant"),
        "amount": e.get("amount"),
        "date": e.get("date"),
        "category": e.get("category"),
        "is_anomaly": bool(e.get("is_anomaly")),
    }


def _slim_income(i: dict) -> dict:
    return {
        "source": i.get("source"),
        "amount": i.get("amount"),
        "date": i.get("date"),
        "category": i.get("category"),
    }


def generate_summary(expenses: list, income: list, date_range: dict | None = None) -> dict:
    """Return {summary, generated_at} or raise RuntimeError on AI failure."""
    expense_payload = [_slim_expense(e) for e in (expenses or [])]
    income_payload = [_slim_income(i) for i in (income or [])]

    range_line = ""
    if date_range and (date_range.get("from") or date_range.get("to")):
        range_line = (
            f"\nDate range: {date_range.get('from') or 'beginning'} "
            f"to {date_range.get('to') or 'today'}\n"
        )

    prompt = (
        f"{SUMMARY_PROMPT}{range_line}\n"
        f"Expenses (JSON): {json.dumps(expense_payload, default=str)}\n\n"
        f"Income (JSON): {json.dumps(income_payload, default=str)}\n"
    )

    text = (generate_text(prompt) or "").strip()
    if not text:
        raise RuntimeError("Empty summary from AI")

    return {
        "summary": text,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
