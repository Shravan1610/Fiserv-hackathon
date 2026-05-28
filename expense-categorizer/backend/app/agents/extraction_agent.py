import json
import re

from ..gemini_config import generate_text

SYSTEM_PROMPT = """
You are a receipt data extraction specialist.
Given raw OCR text from a receipt, extract:
- merchant: the store or service name (string)
- amount: the total amount paid in INR (float, no currency symbol)
- date: the transaction date in YYYY-MM-DD format

Respond ONLY with valid JSON. No explanation. No markdown.
Example: {"merchant": "Domino's Pizza", "amount": 540.00, "date": "2026-01-28"}
If a field cannot be found, use null.
"""

def extract_fields(raw_text: str) -> dict:
    prompt = f"{SYSTEM_PROMPT}\n\nOCR Text:\n{raw_text}"
    try:
        text = generate_text(prompt).strip()
        text = re.sub(r"```json|```", "", text).strip()
        return json.loads(text)
    except Exception as e:
        return {"merchant": None, "amount": None, "date": None, "error": str(e)}
