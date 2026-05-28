import json
import uuid
from typing import Tuple

from flask import Blueprint, Response, jsonify, request

from .agents.advisor_agent import compute_burn_rate, compute_health_score
from .agents.categorization_agent import categorize, detect_anomaly
from .agents.extraction_agent import extract_fields, verify_fields
from .agents.insights_agent import generate_insight
from .agents.summary_agent import generate_summary
from .gemini_config import generate_text
from .services.db_service import (
    delete_income,
    get_all_expenses,
    get_all_income,
    save_expense,
    save_income,
    update_category,
    update_income,
)
from .services.ocr_service import run_ocr

main = Blueprint("main", __name__)

ALLOWED_UPLOAD_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}

INCOME_CATEGORIES = {
    "Salary", "Freelance", "Investment", "Business", "Gift", "Refund", "Other",
}


def _json_error(message: str, status: int) -> Tuple[Response, int]:
    return jsonify({"error": message}), status


def _has_allowed_ext(filename: str) -> bool:
    name = (filename or "").lower()
    return any(name.endswith(ext) for ext in ALLOWED_UPLOAD_EXTS)


def _normalize_extraction(structured: dict) -> dict:
    out = {k: v for k, v in structured.items() if k != "error"}
    if out.get("amount") is not None:
        try:
            out["amount"] = float(out["amount"])
        except (TypeError, ValueError):
            out["amount"] = None
    return out


def _safe_categorize(structured: dict) -> dict:
    result = categorize(structured)
    return {
        "category": result.get("category") or "Other",
        "confidence": float(result.get("confidence") or 0.5),
    }


def _enrich_summary(data: dict, income_total: float = 0.0) -> dict:
    expenses = data.get("expenses") or []
    burn = compute_burn_rate(expenses)
    health = compute_health_score(expenses, burn)
    summary = data.setdefault("summary", {})
    summary["burn_rate"] = burn
    summary["health_score"] = health
    summary["income_total"] = round(income_total, 2)
    expense_total = float(summary.get("total") or 0)
    summary["net_cashflow"] = round(income_total - expense_total, 2)
    return data


def _coerce_amount(value) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


@main.route("/api/extract", methods=["POST"])
def extract() -> Tuple[Response, int]:
    """Step 1 of two-step upload: OCR + Gemini extract + Gemini verify + categorize.

    No DB write. Returns parsed fields for the user to review before saving.
    """
    file = request.files.get("receipt")
    if not file or not file.filename:
        return _json_error("No file uploaded", 400)
    if not _has_allowed_ext(file.filename):
        return _json_error("Unsupported file type (use JPG, PNG, WEBP, or PDF)", 415)

    try:
        raw_text = run_ocr(file)
    except RuntimeError as exc:
        return _json_error(str(exc), 400)
    except Exception:
        return _json_error("OCR processing failed", 500)

    if not (raw_text or "").strip():
        return _json_error("Could not read text from receipt", 422)

    extracted = extract_fields(raw_text)  # AI #1
    if extracted.get("error"):
        return _json_error(extracted.get("error") or "Extraction failed", 422)
    extracted = _normalize_extraction(extracted)

    verified = verify_fields(raw_text, extracted)  # AI #1b — always runs

    structured = {
        "merchant": verified.get("merchant"),
        "amount": _coerce_amount(verified.get("amount")),
        "date": verified.get("date"),
    }
    if structured["amount"] is None and not structured["merchant"]:
        return _json_error("Could not extract receipt data", 422)

    category = _safe_categorize(structured)  # AI #2 (rule-map first, Gemini fallback)
    structured["category"] = category["category"]
    structured["confidence"] = category["confidence"]
    structured["temp_id"] = str(uuid.uuid4())
    structured["verification"] = {
        "corrections_made": bool(verified.get("corrections_made")),
        "notes": verified.get("notes") or "",
        "original": verified.get("original") or {},
        "verification_error": verified.get("verification_error"),
    }

    return jsonify(structured), 200


@main.route("/api/expenses", methods=["POST"])
def create_expense() -> Tuple[Response, int]:
    """Step 2 of two-step upload: persist user-confirmed fields."""
    body = request.get_json(silent=True) or {}

    merchant = (body.get("merchant") or "").strip()
    amount = _coerce_amount(body.get("amount"))
    date_str = (body.get("date") or "").strip() or None
    category = (body.get("category") or "Other").strip() or "Other"

    if not merchant:
        return _json_error("merchant is required", 400)
    if amount is None or amount <= 0:
        return _json_error("amount must be a positive number", 400)

    structured = {
        "id": str(uuid.uuid4()),
        "merchant": merchant,
        "amount": amount,
        "date": date_str,
        "category": category,
        "confidence": float(body.get("confidence") or 0.9),
    }

    try:
        history = get_all_expenses().get("expenses", [])
    except Exception:
        history = []
    anomaly = detect_anomaly(structured, history)
    structured["is_anomaly"] = anomaly["is_anomaly"]
    structured["anomaly_reason"] = anomaly["anomaly_reason"]

    try:
        save_expense(structured)
        all_expenses = get_all_expenses()
    except Exception:
        return _json_error("Failed to save expense", 500)

    insight = generate_insight(structured, all_expenses)
    structured["insight"] = insight
    return jsonify(structured), 200


@main.route("/api/expenses", methods=["GET"])
def expenses() -> Tuple[Response, int]:
    try:
        data = get_all_expenses()
    except Exception:
        return _json_error("Failed to load expenses", 500)

    summary = data.setdefault("summary", {})
    if not summary.get("insight"):
        latest = (data.get("expenses") or [{}])[0]
        summary["insight"] = generate_insight(latest, data)

    income_total = 0.0
    try:
        income_total = float(get_all_income().get("summary", {}).get("total") or 0)
    except Exception:
        pass

    _enrich_summary(data, income_total=income_total)
    return jsonify(data), 200


@main.route("/api/expenses/<expense_id>", methods=["PATCH"])
def patch_expense(expense_id: str) -> Tuple[Response, int]:
    body = request.get_json(silent=True)
    if not body or not body.get("category"):
        return _json_error("Missing category in request body", 400)

    try:
        result = update_category(expense_id, body["category"])
    except Exception:
        return _json_error("Failed to update expense", 500)

    if not result.get("updated"):
        return _json_error("Expense not found", 404)

    return jsonify(result), 200


@main.route("/api/income", methods=["GET"])
def list_income() -> Tuple[Response, int]:
    try:
        data = get_all_income()
    except Exception:
        return _json_error("Failed to load income", 500)
    return jsonify(data), 200


@main.route("/api/income", methods=["POST"])
def create_income() -> Tuple[Response, int]:
    body = request.get_json(silent=True) or {}
    source = (body.get("source") or "").strip()
    amount = _coerce_amount(body.get("amount"))
    date_str = (body.get("date") or "").strip() or None
    category = (body.get("category") or "Other").strip() or "Other"
    notes = body.get("notes") or None

    if not source:
        return _json_error("source is required", 400)
    if amount is None or amount <= 0:
        return _json_error("amount must be a positive number", 400)
    if category not in INCOME_CATEGORIES:
        category = "Other"

    record = {
        "id": str(uuid.uuid4()),
        "source": source,
        "amount": amount,
        "date": date_str,
        "category": category,
        "notes": notes,
    }

    try:
        save_income(record)
    except Exception:
        return _json_error("Failed to save income", 500)

    return jsonify(record), 200


@main.route("/api/income/<income_id>", methods=["PATCH"])
def patch_income(income_id: str) -> Tuple[Response, int]:
    body = request.get_json(silent=True) or {}
    fields = {}
    for key in ("source", "amount", "date", "category", "notes"):
        if key in body:
            fields[key] = body[key]

    if "amount" in fields:
        fields["amount"] = _coerce_amount(fields["amount"])
        if fields["amount"] is None:
            return _json_error("amount must be numeric", 400)
    if "category" in fields and fields["category"] not in INCOME_CATEGORIES:
        fields["category"] = "Other"

    if not fields:
        return _json_error("No editable fields supplied", 400)

    try:
        result = update_income(income_id, fields)
    except Exception:
        return _json_error("Failed to update income", 500)

    if not result.get("updated"):
        return _json_error("Income record not found", 404)

    return jsonify(result), 200


@main.route("/api/income/<income_id>", methods=["DELETE"])
def remove_income(income_id: str) -> Tuple[Response, int]:
    try:
        result = delete_income(income_id)
    except Exception:
        return _json_error("Failed to delete income", 500)
    if not result.get("deleted"):
        return _json_error("Income record not found", 404)
    return jsonify(result), 200


def _filter_by_range(items: list, key: str, frm: str | None, to: str | None) -> list:
    if not frm and not to:
        return items
    out = []
    for item in items:
        d = item.get(key)
        if not d:
            continue
        if frm and d < frm:
            continue
        if to and d > to:
            continue
        out.append(item)
    return out


def _monthly_buckets(items: list, amount_key: str = "amount") -> dict:
    buckets: dict = {}
    for item in items:
        date_str = item.get("date") or ""
        if len(date_str) < 7:
            continue
        bucket = date_str[:7]  # YYYY-MM
        buckets[bucket] = buckets.get(bucket, 0.0) + float(item.get(amount_key) or 0)
    return {k: round(v, 2) for k, v in buckets.items()}


@main.route("/api/analytics", methods=["GET"])
def analytics() -> Tuple[Response, int]:
    frm = request.args.get("from") or None
    to = request.args.get("to") or None

    try:
        expense_data = get_all_expenses()
        income_data = get_all_income()
    except Exception:
        return _json_error("Failed to load analytics data", 500)

    all_expenses = expense_data.get("expenses") or []
    all_income = income_data.get("income") or []

    expenses_in_range = _filter_by_range(all_expenses, "date", frm, to)
    income_in_range = _filter_by_range(all_income, "date", frm, to)

    expense_total = round(sum(float(e.get("amount") or 0) for e in expenses_in_range), 2)
    income_total = round(sum(float(i.get("amount") or 0) for i in income_in_range), 2)

    by_expense_category: dict = {}
    for e in expenses_in_range:
        cat = e.get("category") or "Other"
        by_expense_category[cat] = by_expense_category.get(cat, 0.0) + float(e.get("amount") or 0)

    by_income_category: dict = {}
    for i in income_in_range:
        cat = i.get("category") or "Other"
        by_income_category[cat] = by_income_category.get(cat, 0.0) + float(i.get("amount") or 0)

    by_merchant: dict = {}
    for e in expenses_in_range:
        m = (e.get("merchant") or "Unknown").strip() or "Unknown"
        by_merchant[m] = by_merchant.get(m, 0.0) + float(e.get("amount") or 0)
    top_merchants = sorted(
        ({"merchant": k, "amount": round(v, 2)} for k, v in by_merchant.items()),
        key=lambda r: r["amount"],
        reverse=True,
    )[:5]

    monthly_expense = _monthly_buckets(expenses_in_range)
    monthly_income = _monthly_buckets(income_in_range)
    months = sorted(set(monthly_expense) | set(monthly_income))
    monthly_series = [
        {
            "month": m,
            "expense": round(monthly_expense.get(m, 0.0), 2),
            "income": round(monthly_income.get(m, 0.0), 2),
            "net": round(monthly_income.get(m, 0.0) - monthly_expense.get(m, 0.0), 2),
        }
        for m in months
    ]

    burn = compute_burn_rate(expenses_in_range)
    health = compute_health_score(expenses_in_range, burn)

    savings_rate = None
    if income_total > 0:
        savings_rate = round((income_total - expense_total) / income_total, 4)

    return jsonify({
        "range": {"from": frm, "to": to},
        "totals": {
            "expense": expense_total,
            "income": income_total,
            "net": round(income_total - expense_total, 2),
            "savings_rate": savings_rate,
        },
        "expenses": expenses_in_range,
        "income": income_in_range,
        "by_expense_category": {k: round(v, 2) for k, v in by_expense_category.items()},
        "by_income_category": {k: round(v, 2) for k, v in by_income_category.items()},
        "top_merchants": top_merchants,
        "monthly_series": monthly_series,
        "burn_rate": burn,
        "health_score": health,
    }), 200


@main.route("/api/summary", methods=["POST"])
def summary_endpoint() -> Tuple[Response, int]:
    body = request.get_json(silent=True) or {}
    frm = body.get("from") or None
    to = body.get("to") or None

    try:
        all_expenses = get_all_expenses().get("expenses", [])
        all_income = get_all_income().get("income", [])
    except Exception:
        return _json_error("Failed to load data for summary", 500)

    expenses_in_range = _filter_by_range(all_expenses, "date", frm, to)
    income_in_range = _filter_by_range(all_income, "date", frm, to)

    if not expenses_in_range and not income_in_range:
        return _json_error("No data to summarize for this range", 422)

    try:
        result = generate_summary(
            expenses_in_range,
            income_in_range,
            date_range={"from": frm, "to": to},
        )
    except Exception as exc:
        return _json_error(f"Summary AI unavailable: {exc}", 503)

    return jsonify(result), 200


ASK_SYSTEM_PROMPT = (
    "You are a personal finance assistant. Answer the user's question using ONLY the "
    "expense and income data provided below. Use 'Rs.' for currency and round to whole "
    "rupees. Multi-paragraph answers are fine when the question warrants it; keep "
    "single-fact questions to one or two sentences. If the answer cannot be derived "
    "from the data, say so plainly. Do not invent transactions."
)


@main.route("/api/ask", methods=["POST"])
def ask() -> Tuple[Response, int]:
    body = request.get_json(silent=True) or {}
    question = (body.get("question") or "").strip()
    if not question:
        return _json_error("question is required", 400)
    if len(question) > 500:
        return _json_error("question too long (max 500 chars)", 400)

    try:
        all_expenses = get_all_expenses().get("expenses", [])
        all_income = get_all_income().get("income", [])
    except Exception:
        return _json_error("Failed to load data", 500)

    expenses_ctx = json.dumps(
        [
            {
                "merchant": e.get("merchant"),
                "amount": e.get("amount"),
                "date": e.get("date"),
                "category": e.get("category"),
            }
            for e in all_expenses
        ],
        default=str,
    )
    income_ctx = json.dumps(
        [
            {
                "source": i.get("source"),
                "amount": i.get("amount"),
                "date": i.get("date"),
                "category": i.get("category"),
            }
            for i in all_income
        ],
        default=str,
    )

    prompt = (
        f"{ASK_SYSTEM_PROMPT}\n\n"
        f"Expenses (JSON): {expenses_ctx}\n\n"
        f"Income (JSON): {income_ctx}\n\n"
        f"Question: {question}\n\nAnswer:"
    )

    try:
        answer = (generate_text(prompt) or "").strip()
    except Exception as exc:
        return _json_error(f"AI service unavailable: {exc}", 503)

    if not answer:
        return _json_error("Empty response from AI", 502)

    return jsonify({"answer": answer, "question": question}), 200
