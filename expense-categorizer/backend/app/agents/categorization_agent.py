"""Categorization agent.

Two-stage pipeline:
  1. Deterministic merchant-keyword map (fast, free, ~99% confidence).
  2. Gemini LLM fallback for unknown merchants, with strict category validation.

Output shape: {"category": <str in CATEGORIES>, "confidence": <float 0..1>}
"""

import json
import logging
import re
from typing import Optional

from ..gemini_config import GEMINI_API_KEY, generate_text

log = logging.getLogger(__name__)

CATEGORIES = [
    "Food", "Travel", "Shopping", "Entertainment",
    "Healthcare", "Utilities", "Education", "Other",
]

MERCHANT_MAP = {
    # Food
    "domino": "Food", "pizza hut": "Food", "swiggy": "Food", "zomato": "Food",
    "mcdonald": "Food", "kfc": "Food", "starbucks": "Food", "cafe coffee day": "Food",
    "ccd": "Food", "subway": "Food", "burger king": "Food", "haldiram": "Food",
    "barbeque nation": "Food", "biriyani": "Food", "restaurant": "Food",
    # Shopping / groceries
    "blinkit": "Shopping", "bigbasket": "Shopping", "zepto": "Shopping",
    "dmart": "Shopping", "reliance fresh": "Shopping", "more megastore": "Shopping",
    "amazon": "Shopping", "flipkart": "Shopping", "myntra": "Shopping",
    "ajio": "Shopping", "nykaa": "Shopping", "lifestyle": "Shopping",
    "decathlon": "Shopping", "ikea": "Shopping",
    # Travel
    "uber": "Travel", "ola": "Travel", "rapido": "Travel", "irctc": "Travel",
    "indigo": "Travel", "spicejet": "Travel", "vistara": "Travel",
    "air india": "Travel", "redbus": "Travel", "makemytrip": "Travel",
    "goibibo": "Travel", "yatra": "Travel", "metro": "Travel", "fastag": "Travel",
    "indian oil": "Travel", "hp petrol": "Travel", "bharat petroleum": "Travel",
    "shell": "Travel",
    # Entertainment
    "netflix": "Entertainment", "hotstar": "Entertainment", "prime video": "Entertainment",
    "spotify": "Entertainment", "youtube": "Entertainment", "bookmyshow": "Entertainment",
    "pvr": "Entertainment", "inox": "Entertainment", "sony liv": "Entertainment",
    "zee5": "Entertainment",
    # Healthcare
    "apollo": "Healthcare", "medplus": "Healthcare", "1mg": "Healthcare",
    "pharmeasy": "Healthcare", "netmeds": "Healthcare", "practo": "Healthcare",
    "fortis": "Healthcare", "max hospital": "Healthcare", "manipal": "Healthcare",
    # Utilities
    "airtel": "Utilities", "jio": "Utilities", "bsnl": "Utilities", "vi ": "Utilities",
    "vodafone": "Utilities", "tata power": "Utilities", "adani electricity": "Utilities",
    "bescom": "Utilities", "tneb": "Utilities", "act fibernet": "Utilities",
    "hathway": "Utilities", "gas": "Utilities",
    # Education
    "udemy": "Education", "coursera": "Education", "byju": "Education",
    "unacademy": "Education", "vedantu": "Education", "upgrad": "Education",
    "edx": "Education",
}

SYSTEM_PROMPT = (
    "You are a financial expense categorizer.\n"
    "Given a merchant name, map it to EXACTLY one of these categories:\n"
    f"{', '.join(CATEGORIES)}\n\n"
    "Respond ONLY with valid JSON in this exact shape: "
    '{"category": "Food", "confidence": 0.95}\n'
    "No explanation. No markdown. Confidence is a float between 0 and 1."
)

_LLM_READY = bool(GEMINI_API_KEY)


def _rule_match(merchant: str) -> Optional[str]:
    if not merchant:
        return None
    m = merchant.lower()
    for keyword, cat in MERCHANT_MAP.items():
        if keyword in m:
            return cat
    return None


def _parse_llm_json(raw: str) -> dict:
    cleaned = re.sub(r"```json|```", "", raw).strip()
    return json.loads(cleaned)


def _validate(payload: dict) -> dict:
    cat = payload.get("category")
    if cat not in CATEGORIES:
        cat = "Other"
    try:
        conf = float(payload.get("confidence", 0.5))
    except (TypeError, ValueError):
        conf = 0.5
    conf = max(0.0, min(1.0, conf))
    return {"category": cat, "confidence": conf}


def categorize(structured: dict) -> dict:
    merchant = (structured.get("merchant") or "").strip()

    rule_cat = _rule_match(merchant)
    if rule_cat:
        return {"category": rule_cat, "confidence": 0.99}

    if not _LLM_READY or not merchant:
        return {"category": "Other", "confidence": 0.5}

    try:
        prompt = f"{SYSTEM_PROMPT}\n\nMerchant: {merchant}"
        raw = generate_text(prompt)
        return _validate(_parse_llm_json(raw or ""))
    except Exception as e:
        log.warning("LLM categorization failed for '%s': %s", merchant, e)
        return {"category": "Other", "confidence": 0.5}


ANOMALY_THRESHOLD = 1.5
MIN_HISTORY_FOR_ANOMALY = 2


def detect_anomaly(structured: dict, history: list[dict]) -> dict:
    """Flag expense if amount > 1.5x rolling per-merchant average (>=2 priors)."""
    merchant = (structured.get("merchant") or "").strip().lower()
    amount = structured.get("amount")
    if not merchant or not amount or amount <= 0:
        return {"is_anomaly": False, "anomaly_reason": None}

    own_id = structured.get("id")
    prior = []
    for e in history:
        em = e.get("merchant")
        if not em or em.strip().lower() != merchant:
            continue
        if not e.get("amount"):
            continue
        if own_id and e.get("id") == own_id:
            continue
        prior.append(e["amount"])

    if len(prior) < MIN_HISTORY_FOR_ANOMALY:
        return {"is_anomaly": False, "anomaly_reason": None}

    avg = sum(prior) / len(prior)
    if avg > 0 and amount > ANOMALY_THRESHOLD * avg:
        pct = int((amount / avg - 1) * 100)
        return {
            "is_anomaly": True,
            "anomaly_reason": f"{pct}% above your usual Rs. {avg:.0f} at {structured.get('merchant')}",
        }
    return {"is_anomaly": False, "anomaly_reason": None}
