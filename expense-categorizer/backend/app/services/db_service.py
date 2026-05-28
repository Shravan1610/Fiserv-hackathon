import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent.parent / "data" / "expenses.db"

def get_conn():
    DB_PATH.parent.mkdir(exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("""
        CREATE TABLE IF NOT EXISTS expenses (
            id TEXT PRIMARY KEY,
            merchant TEXT,
            amount REAL,
            date TEXT,
            category TEXT,
            confidence REAL
        )
    """)
    conn.commit()
    return conn

def save_expense(expense: dict):
    conn = get_conn()
    conn.execute(
        "INSERT OR REPLACE INTO expenses VALUES (?,?,?,?,?,?)",
        (expense["id"], expense.get("merchant"), expense.get("amount"),
         expense.get("date"), expense.get("category"), expense.get("confidence", 0.9))
    )
    conn.commit()
    conn.close()

def get_all_expenses() -> dict:
    conn = get_conn()
    rows = conn.execute("SELECT * FROM expenses ORDER BY date DESC").fetchall()
    conn.close()
    expenses = [dict(r) for r in rows]
    by_category = {}
    for e in expenses:
        cat = e.get("category", "Other")
        by_category[cat] = by_category.get(cat, 0) + (e.get("amount") or 0)
    total = sum((e.get("amount") or 0) for e in expenses)
    return {
        "expenses": expenses,
        "summary": {
            "total": total,
            "by_category": by_category,
            "insight": ""
        }
    }

def update_category(expense_id: str, category: str) -> dict:
    conn = get_conn()
    conn.execute("UPDATE expenses SET category=? WHERE id=?", (category, expense_id))
    conn.commit()
    conn.close()
    return {"id": expense_id, "category": category, "updated": True}
