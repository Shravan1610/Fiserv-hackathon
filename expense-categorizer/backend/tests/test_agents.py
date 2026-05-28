"""Smoke tests for agents. Run via: python -m tests.test_agents

Network-dependent agent tests (extraction, LLM categorization fallback) are
gated behind GEMINI_API_KEY presence so the suite passes offline as well.
"""

import os
import sys
import tempfile
import uuid
from datetime import date, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.agents.advisor_agent import compute_burn_rate, compute_health_score
from app.agents.categorization_agent import categorize, detect_anomaly
from app.agents.extraction_agent import extract_fields, verify_fields
from app.agents.insights_agent import generate_insight
from app.agents import summary_agent


def test_categorization_rule_match():
    result = categorize({"merchant": "Domino's Pizza", "amount": 540})
    assert result["category"] == "Food"
    assert 0 <= result["confidence"] <= 1
    print(f"OK rule-match: {result}")


def test_categorization_unknown_merchant():
    result = categorize({"merchant": "XYZ Mart 123", "amount": 100})
    assert result["category"] in {
        "Food", "Travel", "Shopping", "Entertainment",
        "Healthcare", "Utilities", "Education", "Other",
    }
    print(f"OK unknown-merchant: {result}")


def test_insights_with_summary():
    insight = generate_insight(
        {"category": "Food", "amount": 540},
        {"summary": {"total": 1200, "by_category": {"Food": 1200}}},
    )
    assert isinstance(insight, str) and "Food" in insight
    print(f"OK insight (with summary): {insight}")


def test_insights_no_summary():
    insight = generate_insight(
        {"category": "Travel", "amount": 220},
        {"summary": {}},
    )
    assert isinstance(insight, str) and len(insight) > 0
    print(f"OK insight (empty summary): {insight}")


def test_anomaly_flags_outlier():
    history = [
        {"id": "1", "merchant": "Swiggy", "amount": 500},
        {"id": "2", "merchant": "Swiggy", "amount": 600},
        {"id": "3", "merchant": "Swiggy", "amount": 550},
    ]
    result = detect_anomaly({"merchant": "Swiggy", "amount": 1500}, history)
    assert result["is_anomaly"] is True
    assert "above" in (result["anomaly_reason"] or "")
    print(f"OK anomaly flagged: {result}")


def test_anomaly_within_normal_range():
    history = [
        {"id": "1", "merchant": "Swiggy", "amount": 500},
        {"id": "2", "merchant": "Swiggy", "amount": 600},
    ]
    result = detect_anomaly({"merchant": "Swiggy", "amount": 580}, history)
    assert result["is_anomaly"] is False
    print(f"OK anomaly not flagged: {result}")


def test_anomaly_insufficient_history():
    history = [{"id": "1", "merchant": "Swiggy", "amount": 500}]
    result = detect_anomaly({"merchant": "Swiggy", "amount": 9999}, history)
    assert result["is_anomaly"] is False  # need 2 priors
    print(f"OK anomaly skipped (no history): {result}")


def test_burn_rate_basic():
    today = date.today()
    expenses = [
        {"merchant": "A", "amount": 100, "date": today.isoformat()},
        {"merchant": "B", "amount": 200, "date": today.isoformat()},
    ]
    burn = compute_burn_rate(expenses)
    assert burn["month_total"] == 300.0
    assert burn["daily_burn"] >= 0
    assert burn["monthly_forecast"] >= burn["month_total"]
    print(f"OK burn rate: {burn}")


def test_burn_rate_handles_empty():
    burn = compute_burn_rate([])
    assert burn["daily_burn"] == 0.0
    assert burn["monthly_forecast"] == 0.0
    print(f"OK burn rate (empty): {burn}")


def test_health_score_shape():
    today = date.today()
    expenses = [
        {"merchant": "A", "amount": 100, "date": today.isoformat(), "category": "Food"},
        {"merchant": "B", "amount": 50, "date": today.isoformat(), "category": "Travel"},
    ]
    burn = compute_burn_rate(expenses)
    health = compute_health_score(expenses, burn)
    assert 0 <= health["score"] <= 100
    assert health["rating"] in {"Excellent", "Good", "Watch", "At risk"}
    assert set(health["components"].keys()) == {
        "budget_adherence", "category_diversity",
        "anomaly_frequency", "streak_consistency",
    }
    print(f"OK health score: {health}")


def test_health_score_anomaly_drag():
    today = date.today()
    clean = [{"merchant": "A", "amount": 100, "date": today.isoformat(), "category": "Food"}]
    flagged = [{**clean[0], "is_anomaly": True}]
    burn = compute_burn_rate(clean)
    s_clean = compute_health_score(clean, burn)["score"]
    s_flagged = compute_health_score(flagged, burn)["score"]
    assert s_flagged < s_clean, f"flagged {s_flagged} should be < clean {s_clean}"
    print(f"OK anomaly drag: clean={s_clean}, flagged={s_flagged}")


def test_extraction_smoke():
    if not os.getenv("GEMINI_API_KEY"):
        print("SKIP extraction (no GEMINI_API_KEY)")
        return
    raw = "Domino's Pizza\nAmt: 540.00\nDate: 28-Jan-26"
    result = extract_fields(raw)
    assert "merchant" in result
    print(f"OK extraction: {result}")


def test_verify_fields_falls_back_on_error(monkeypatch=None):
    """verify_fields should not raise even if Gemini fails — returns original."""
    import app.agents.extraction_agent as ea

    original_generate = ea.generate_text

    def boom(_prompt: str) -> str:
        raise RuntimeError("simulated network failure")

    ea.generate_text = boom
    try:
        result = verify_fields(
            "raw text",
            {"merchant": "Domino's", "amount": 540, "date": "2026-01-28"},
        )
    finally:
        ea.generate_text = original_generate

    assert result["merchant"] == "Domino's"
    assert result["corrections_made"] is False
    assert result.get("verification_error")
    print(f"OK verify_fields fallback: {result}")


def test_verify_fields_smoke():
    if not os.getenv("GEMINI_API_KEY"):
        print("SKIP verify_fields (no GEMINI_API_KEY)")
        return
    raw = "Domino's Pizza\nGrand Total: 540.00\nDate: 2026-01-28"
    extracted = {"merchant": "Domino's Pizza", "amount": 540.0, "date": "2026-01-28"}
    result = verify_fields(raw, extracted)
    assert "corrections_made" in result
    assert "merchant" in result
    print(f"OK verify_fields: corrections_made={result['corrections_made']}")


def test_summary_agent_smoke():
    if not os.getenv("GEMINI_API_KEY"):
        print("SKIP summary_agent (no GEMINI_API_KEY)")
        return
    expenses = [
        {"merchant": "Swiggy", "amount": 540, "date": "2026-05-28", "category": "Food"},
        {"merchant": "Uber", "amount": 220, "date": "2026-05-27", "category": "Travel"},
    ]
    income = [{"source": "Acme Corp", "amount": 60000, "date": "2026-05-01", "category": "Salary"}]
    result = summary_agent.generate_summary(expenses, income)
    assert isinstance(result["summary"], str) and len(result["summary"]) > 50
    assert result["generated_at"]
    print(f"OK summary_agent ({len(result['summary'])} chars)")


def test_income_crud_sqlite():
    """Smoke test the income CRUD path against an isolated SQLite DB."""
    tmp_dir = tempfile.mkdtemp(prefix="income_test_")
    os.environ["USE_SQLITE"] = "true"

    # Force a fresh import so SQLITE_PATH points at the temp dir
    import importlib
    import app.services.db_service as db_service
    db_service = importlib.reload(db_service)
    db_service.SQLITE_PATH = (
        __import__("pathlib").Path(tmp_dir) / "test_expenses.db"
    )

    record_id = str(uuid.uuid4())
    db_service.save_income({
        "id": record_id,
        "source": "Acme Corp",
        "amount": 60000,
        "date": "2026-05-01",
        "category": "Salary",
        "notes": "May payroll",
    })

    listed = db_service.get_all_income()
    assert listed["summary"]["total"] == 60000
    assert listed["income"][0]["source"] == "Acme Corp"

    update = db_service.update_income(record_id, {"amount": 65000})
    assert update["updated"] is True
    listed_after = db_service.get_all_income()
    assert listed_after["summary"]["total"] == 65000

    delete = db_service.delete_income(record_id)
    assert delete["deleted"] is True
    final = db_service.get_all_income()
    assert final["summary"]["total"] == 0
    print("OK income CRUD")


if __name__ == "__main__":
    test_categorization_rule_match()
    test_categorization_unknown_merchant()
    test_insights_with_summary()
    test_insights_no_summary()
    test_anomaly_flags_outlier()
    test_anomaly_within_normal_range()
    test_anomaly_insufficient_history()
    test_burn_rate_basic()
    test_burn_rate_handles_empty()
    test_health_score_shape()
    test_health_score_anomaly_drag()
    test_extraction_smoke()
    test_verify_fields_falls_back_on_error()
    test_verify_fields_smoke()
    test_summary_agent_smoke()
    test_income_crud_sqlite()
    print("\nAll agent tests passed.")
