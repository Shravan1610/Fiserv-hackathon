import google.generativeai as genai
import json, os, re
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-1.5-flash")

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
        response = model.generate_content(prompt)
        text = response.text.strip()
        text = re.sub(r"```json|```", "", text).strip()
        return json.loads(text)
    except Exception as e:
        return {"merchant": None, "amount": None, "date": None, "error": str(e)}
