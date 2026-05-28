import google.generativeai as genai
import json, os, re

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-1.5-flash")

CATEGORIES = ["Food", "Travel", "Shopping", "Entertainment", "Healthcare", "Utilities", "Education", "Other"]

MERCHANT_MAP = {
    "domino": "Food", "swiggy": "Food", "zomato": "Food", "mcdonald": "Food",
    "starbucks": "Food", "blinkit": "Shopping", "bigbasket": "Shopping",
    "uber": "Travel", "ola": "Travel", "rapido": "Travel", "irctc": "Travel",
    "netflix": "Entertainment", "hotstar": "Entertainment", "spotify": "Entertainment",
    "apollo": "Healthcare", "medplus": "Healthcare", "1mg": "Healthcare",
    "airtel": "Utilities", "jio": "Utilities", "bsnl": "Utilities",
}

SYSTEM_PROMPT = f"""
You are a financial expense categorizer.
Given a merchant name, map it to exactly one of these categories:
{", ".join(CATEGORIES)}

Respond ONLY with valid JSON: {{"category": "Food", "confidence": 0.95}}
No explanation. No markdown. Confidence is a float between 0 and 1.
"""

def categorize(structured: dict) -> dict:
    merchant = (structured.get("merchant") or "").lower()

    for keyword, cat in MERCHANT_MAP.items():
        if keyword in merchant:
            return {"category": cat, "confidence": 0.99}

    try:
        prompt = f"{SYSTEM_PROMPT}\n\nMerchant: {merchant}"
        response = model.generate_content(prompt)
        text = re.sub(r"```json|```", "", response.text.strip()).strip()
        return json.loads(text)
    except Exception:
        return {"category": "Other", "confidence": 0.5}
