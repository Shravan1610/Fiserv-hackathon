"""Advisor agent — Financial Health Score.

Computes a single 0-100 score from four weighted components:
  budget_adherence (40%): are you on track vs your budget?
  category_diversity (30%): are you spending across categories or concentrated?
  anomaly_frequency  (20%): how many flagged anomalies in your history?
  streak_consistency (10%): are you logging receipts every day?

Output shape:
  {"score": int, "rating": str, "components": {...}}
"""

from __future__ import annotations

import calendar
from datetime import date, datetime
from typing import Iterable

CATEGORY_TOTAL = 8  # Food, Travel, Shopping, Entertainment, Healthcare, Utilities, Education, Other


def _parse_date(value) -> date | None:
    if value is None or value == "":
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    try:
        return datetime.strptime(str(value)[:10], "%Y-%m-%d").date()
    except ValueError:
        return None


def _budget_adherence(burn: dict) -> float:
    forecast = burn.get("monthly_forecast") or 0
    budget = burn.get("budget") or 0
    if forecast <= 0 or budget <= 0:
        return 100.0
    return max(0.0, min(100.0, 100.0 * budget / forecast))


def _category_diversity(expenses: Iterable[dict]) -> float:
    cats = {e.get("category") for e in expenses if e.get("category")}
    cats.discard(None)
    if not cats:
        return 100.0
    return min(100.0, 100.0 * len(cats) / CATEGORY_TOTAL)


def _anomaly_score(expenses: list[dict]) -> float:
    if not expenses:
        return 100.0
    flagged = sum(1 for e in expenses if e.get("is_anomaly"))
    return max(0.0, 100.0 * (1 - flagged / len(expenses)))


def _streak_consistency(expenses: list[dict], days_elapsed: int) -> float:
    if days_elapsed <= 0:
        return 100.0
    today = date.today()
    month_start = today.replace(day=1)
    distinct_days = set()
    for e in expenses:
        d = _parse_date(e.get("date"))
        if d and d >= month_start and d <= today:
            distinct_days.add(d)
    return min(100.0, 100.0 * len(distinct_days) / days_elapsed)


def _rating(score: int) -> str:
    if score >= 80:
        return "Excellent"
    if score >= 60:
        return "Good"
    if score >= 40:
        return "Watch"
    return "At risk"


def compute_health_score(expenses: list[dict], burn: dict) -> dict:
    days_elapsed = burn.get("days_elapsed") or 1

    budget = _budget_adherence(burn)
    diversity = _category_diversity(expenses)
    anomaly = _anomaly_score(expenses)
    streak = _streak_consistency(expenses, days_elapsed)

    total = round(0.40 * budget + 0.30 * diversity + 0.20 * anomaly + 0.10 * streak)
    total = max(0, min(100, int(total)))

    return {
        "score": total,
        "rating": _rating(total),
        "components": {
            "budget_adherence": round(budget),
            "category_diversity": round(diversity),
            "anomaly_frequency": round(anomaly),
            "streak_consistency": round(streak),
        },
    }


def compute_burn_rate(expenses: list[dict]) -> dict:
    """Current-month burn rate + forecast vs budget (prev-month total or 50k fallback)."""
    today = date.today()
    month_start = today.replace(day=1)
    days_in_month = calendar.monthrange(today.year, today.month)[1]
    days_elapsed = (today - month_start).days + 1

    if today.month == 1:
        prev_year, prev_month = today.year - 1, 12
    else:
        prev_year, prev_month = today.year, today.month - 1
    prev_start = date(prev_year, prev_month, 1)
    prev_end_day = calendar.monthrange(prev_year, prev_month)[1]
    prev_end = date(prev_year, prev_month, prev_end_day)

    month_total = 0.0
    prev_total = 0.0
    for e in expenses:
        d = _parse_date(e.get("date"))
        amt = e.get("amount") or 0
        if d is None:
            continue
        if d >= month_start and d <= today:
            month_total += amt
        elif prev_start <= d <= prev_end:
            prev_total += amt

    daily_burn = month_total / days_elapsed if days_elapsed else 0.0
    forecast = daily_burn * days_in_month
    budget = prev_total if prev_total > 0 else 50000.0
    overspend = max(0.0, forecast - budget)

    return {
        "daily_burn": round(daily_burn, 2),
        "monthly_forecast": round(forecast, 2),
        "budget": round(budget, 2),
        "overspend": round(overspend, 2),
        "days_elapsed": days_elapsed,
        "days_in_month": days_in_month,
        "month_total": round(month_total, 2),
    }
