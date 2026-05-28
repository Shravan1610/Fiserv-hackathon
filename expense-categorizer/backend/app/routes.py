from flask import Blueprint, request, jsonify
from .services.ocr_service import run_ocr
from .services.db_service import save_expense, get_all_expenses, update_category
from .agents.extraction_agent import extract_fields
from .agents.categorization_agent import categorize
from .agents.insights_agent import generate_insight
import uuid

main = Blueprint("main", __name__)

@main.route("/api/upload", methods=["POST"])
def upload():
    file = request.files.get("receipt")
    if not file:
        return jsonify({"error": "No file uploaded"}), 400

    raw_text = run_ocr(file)
    structured = extract_fields(raw_text)
    category = categorize(structured)
    structured["category"] = category["category"]
    structured["confidence"] = category["confidence"]
    structured["id"] = str(uuid.uuid4())

    save_expense(structured)
    all_expenses = get_all_expenses()
    insight = generate_insight(structured, all_expenses)
    structured["insight"] = insight

    return jsonify(structured), 200

@main.route("/api/expenses", methods=["GET"])
def expenses():
    data = get_all_expenses()
    return jsonify(data), 200

@main.route("/api/expenses/<expense_id>", methods=["PATCH"])
def patch_expense(expense_id):
    body = request.json
    result = update_category(expense_id, body.get("category"))
    return jsonify(result), 200
