import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.agents.extraction_agent import extract_fields
from app.agents.categorization_agent import categorize
from app.agents.insights_agent import generate_insight

def test_extraction():
    raw = "Domino's Pizza\nAmt: 540.00\nDate: 28-Jan-26"
    result = extract_fields(raw)
    assert result.get("merchant") is not None
    assert result.get("amount") is not None
    print(f"✅ Extraction: {result}")

def test_categorization():
    result = categorize({"merchant": "Domino's Pizza", "amount": 540})
    assert result["category"] == "Food"
    print(f"✅ Categorization: {result}")

def test_categorization_fallback():
    result = categorize({"merchant": "XYZ Mart", "amount": 100})
    assert result["category"] in ["Food","Travel","Shopping","Entertainment","Healthcare","Utilities","Education","Other"]
    print(f"✅ Fallback: {result}")

def test_insights():
    insight = generate_insight(
        {"category": "Food", "amount": 540},
        {"summary": {"total": 1200, "by_category": {"Food": 1200}}}
    )
    assert isinstance(insight, str) and len(insight) > 0
    print(f"✅ Insight: {insight}")

if __name__ == "__main__":
    test_extraction()
    test_categorization()
    test_categorization_fallback()
    test_insights()
    print("\n✅ All agent tests passed.")
