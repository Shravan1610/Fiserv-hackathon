import json
import re

from ..gemini_config import generate_text

EXTRACT_PROMPT = """
You are a receipt data extraction specialist.
Given raw OCR text from a receipt, extract:
- merchant: the store or service name (string)
- amount: the total amount paid in INR (float, no currency symbol)
- date: the transaction date in YYYY-MM-DD format

Respond ONLY with valid JSON. No explanation. No markdown.
Example: {"merchant": "Domino's Pizza", "amount": 540.00, "date": "2026-01-28"}
If a field cannot be found, use null.
"""

VERIFY_PROMPT = """
You are a receipt data verifier.
You will receive raw OCR text from a receipt and a JSON object that another model extracted from it.
Re-read the OCR text and decide if the extracted JSON is correct.

Rules:
- merchant should be the store or service name (string).
- amount should be the GRAND TOTAL paid (float, no currency symbol).
- date should be the transaction date in YYYY-MM-DD format.
- If a value is missing in the OCR, use null.

Return ONLY valid JSON with this exact shape:
{"merchant": "...", "amount": 0.00, "date": "YYYY-MM-DD", "corrections_made": false, "notes": "<short reason if corrections_made is true, else empty>"}

Set "corrections_made" to true ONLY if you actually changed at least one of merchant, amount, or date.
No markdown. No commentary outside the JSON.
"""


def _strip_code_fence(text: str) -> str:
    return re.sub(r"```json|```", "", (text or "").strip()).strip()


def _parse_json(text: str) -> dict:
    cleaned = _strip_code_fence(text)
    return json.loads(cleaned)


def extract_fields(raw_text: str) -> dict:
    prompt = f"{EXTRACT_PROMPT}\n\nOCR Text:\n{raw_text}"
    try:
        return _parse_json(generate_text(prompt))
    except Exception as e:
        return {"merchant": None, "amount": None, "date": None, "error": str(e)}


def verify_fields(raw_text: str, extracted: dict) -> dict:
    """Second-pass Gemini call: re-check extracted JSON against the raw OCR.

    Always runs after extract_fields. Returns the verified (possibly corrected)
    JSON, plus a corrections_made flag and the original extracted object so the
    UI can surface the diff.
    """
    safe_extracted = {
        "merchant": extracted.get("merchant"),
        "amount": extracted.get("amount"),
        "date": extracted.get("date"),
    }
    prompt = (
        f"{VERIFY_PROMPT}\n\n"
        f"OCR Text:\n{raw_text}\n\n"
        f"Extracted JSON:\n{json.dumps(safe_extracted)}"
    )
    try:
        verified = _parse_json(generate_text(prompt))
    except Exception as e:
        return {
            "merchant": safe_extracted.get("merchant"),
            "amount": safe_extracted.get("amount"),
            "date": safe_extracted.get("date"),
            "corrections_made": False,
            "notes": "",
            "original": safe_extracted,
            "verification_error": str(e),
        }

    return {
        "merchant": verified.get("merchant"),
        "amount": verified.get("amount"),
        "date": verified.get("date"),
        "corrections_made": bool(verified.get("corrections_made")),
        "notes": verified.get("notes") or "",
        "original": safe_extracted,
    }
