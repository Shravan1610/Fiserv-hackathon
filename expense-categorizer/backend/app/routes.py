import uuid
from typing import Tuple

from flask import Blueprint, Response, jsonify, request

from .agents.categorization_agent import categorize
from .agents.extraction_agent import extract_fields
from .agents.insights_agent import generate_insight
from .services.db_service import get_all_expenses, save_expense, update_category
from .services.ocr_service import run_ocr

main = Blueprint("main", __name__)


def _json_error(message: str, status: int) -> Tuple[Response, int]:
    return jsonify({"error": message}), status


def _normalize_extraction(structured: dict) -> dict:
    """Strip agent error key; coerce amount for downstream agents."""
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


@main.route("/api/upload", methods=["POST"])
def upload() -> Tuple[Response, int]:
    file = request.files.get("receipt")
    if not file or not file.filename:
        return _json_error("No file uploaded", 400)

    try:
        raw_text = run_ocr(file)
    except RuntimeError as exc:
        return _json_error(str(exc), 400)
    except Exception:
        return _json_error("OCR processing failed", 500)

    if not (raw_text or "").strip():
        return _json_error("Could not read text from receipt", 422)

    structured = extract_fields(raw_text)  # Agent 1
    if structured.get("error"):
        return _json_error(
            structured.get("error") or "Extraction failed", 422
        )
    structured = _normalize_extraction(structured)
    if structured.get("amount") is None and not structured.get("merchant"):
        return _json_error("Could not extract receipt data", 422)

    category = _safe_categorize(structured)  # Agent 2
    structured["category"] = category["category"]
    structured["confidence"] = category["confidence"]
    structured["id"] = str(uuid.uuid4())

    try:
        save_expense(structured)
        all_expenses = get_all_expenses()
    except Exception:
        return _json_error("Failed to save expense", 500)

    insight = generate_insight(structured, all_expenses)  # Agent 3
    structured["insight"] = insight
    return jsonify(structured), 200


@main.route("/api/expenses", methods=["GET"])
def expenses() -> Tuple[Response, int]:
    try:
        data = get_all_expenses()
        if not data.get("summary", {}).get("insight"):
            latest = data["expenses"][0] if data.get("expenses") else {}
            data["summary"]["insight"] = generate_insight(latest, data)
        return jsonify(data), 200
    except Exception:
        return _json_error("Failed to load expenses", 500)


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
