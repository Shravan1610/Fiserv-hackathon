"""Expense store — SQLite (local dev) or PostgreSQL (team default).

Set USE_SQLITE=true in .env when Postgres is not available.
"""

import logging
import os
import sqlite3
from contextlib import contextmanager
from datetime import date, datetime
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

load_dotenv()
log = logging.getLogger(__name__)

USE_SQLITE = os.getenv("USE_SQLITE", "false").lower() in ("1", "true", "yes")

# --- SQLite (plan.md Task 6) ---
SQLITE_PATH = Path(__file__).parent.parent.parent / "data" / "expenses.db"

SQLITE_CREATE = """
CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    merchant TEXT,
    amount REAL,
    date TEXT,
    category TEXT,
    confidence REAL
);
"""


def _sqlite_conn():
    SQLITE_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(SQLITE_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute(SQLITE_CREATE)
    conn.commit()
    return conn


def _sqlite_save(expense: dict) -> None:
    conn = _sqlite_conn()
    conn.execute(
        "INSERT OR REPLACE INTO expenses VALUES (?,?,?,?,?,?)",
        (
            expense["id"],
            expense.get("merchant"),
            expense.get("amount"),
            expense.get("date"),
            expense.get("category"),
            expense.get("confidence", 0.9),
        ),
    )
    conn.commit()
    conn.close()


def _sqlite_get_all() -> dict:
    conn = _sqlite_conn()
    rows = conn.execute("SELECT * FROM expenses ORDER BY date DESC").fetchall()
    conn.close()
    expenses = [dict(r) for r in rows]
    by_category: dict = {}
    for e in expenses:
        cat = e.get("category") or "Other"
        by_category[cat] = by_category.get(cat, 0.0) + (e.get("amount") or 0)
    total = sum(e.get("amount") or 0 for e in expenses)
    return {
        "expenses": expenses,
        "summary": {
            "total": round(total, 2),
            "by_category": {k: round(v, 2) for k, v in by_category.items()},
            "insight": "",
        },
    }


def _sqlite_update_category(expense_id: str, category: str) -> dict:
    conn = _sqlite_conn()
    cur = conn.execute(
        "UPDATE expenses SET category=? WHERE id=?",
        (category, expense_id),
    )
    updated = cur.rowcount > 0
    conn.commit()
    conn.close()
    return {"id": expense_id, "category": category, "updated": updated}


# --- PostgreSQL ---
DATABASE_URL = os.getenv("DATABASE_URL")
PG_KW = {
    "host": os.getenv("PGHOST", "localhost"),
    "port": int(os.getenv("PGPORT", "5432")),
    "user": os.getenv("PGUSER", "postgres"),
    "password": os.getenv("PGPASSWORD", "postgres"),
    "dbname": os.getenv("PGDATABASE", "expenses"),
}

PG_CREATE = """
CREATE TABLE IF NOT EXISTS expenses (
    id          TEXT PRIMARY KEY,
    merchant    TEXT,
    amount      NUMERIC(12, 2),
    date        DATE,
    category    TEXT,
    confidence  REAL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
"""

_pg_initialized = False


def _pg_connect():
    import psycopg2
    if DATABASE_URL:
        return psycopg2.connect(DATABASE_URL)
    return psycopg2.connect(**PG_KW)


@contextmanager
def _pg_conn():
    global _pg_initialized
    import psycopg2
    conn = _pg_connect()
    try:
        if not _pg_initialized:
            with conn.cursor() as cur:
                cur.execute(PG_CREATE)
            conn.commit()
            _pg_initialized = True
        yield conn
    finally:
        conn.close()


def _coerce_date(value) -> Optional[date]:
    if value is None or value == "":
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    try:
        return datetime.strptime(str(value), "%Y-%m-%d").date()
    except ValueError:
        log.warning("Unparseable date %r — storing as NULL", value)
        return None


def _pg_save(expense: dict) -> None:
    with _pg_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO expenses (id, merchant, amount, date, category, confidence)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                merchant   = EXCLUDED.merchant,
                amount     = EXCLUDED.amount,
                date       = EXCLUDED.date,
                category   = EXCLUDED.category,
                confidence = EXCLUDED.confidence
            """,
            (
                expense["id"],
                expense.get("merchant"),
                expense.get("amount"),
                _coerce_date(expense.get("date")),
                expense.get("category"),
                expense.get("confidence", 0.9),
            ),
        )
        conn.commit()


def _pg_get_all() -> dict:
    from psycopg2.extras import RealDictCursor
    with _pg_conn() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT id, merchant, amount, date, category, confidence
            FROM expenses
            ORDER BY date DESC NULLS LAST, created_at DESC
            """
        )
        rows = cur.fetchall()

    expenses = []
    by_category: dict = {}
    total = 0.0
    for r in rows:
        amt = float(r["amount"]) if r["amount"] is not None else 0.0
        cat = r["category"] or "Other"
        expenses.append({
            "id": r["id"],
            "merchant": r["merchant"],
            "amount": amt,
            "date": r["date"].isoformat() if r["date"] else None,
            "category": cat,
            "confidence": float(r["confidence"]) if r["confidence"] is not None else 0.0,
        })
        by_category[cat] = by_category.get(cat, 0.0) + amt
        total += amt

    return {
        "expenses": expenses,
        "summary": {
            "total": round(total, 2),
            "by_category": {k: round(v, 2) for k, v in by_category.items()},
            "insight": "",
        },
    }


def _pg_update_category(expense_id: str, category: str) -> dict:
    with _pg_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "UPDATE expenses SET category = %s WHERE id = %s",
            (category, expense_id),
        )
        updated = cur.rowcount > 0
        conn.commit()
    return {"id": expense_id, "category": category, "updated": updated}


# --- Public API ---
if USE_SQLITE:
    log.info("Using SQLite database at %s", SQLITE_PATH)
    save_expense = _sqlite_save
    get_all_expenses = _sqlite_get_all
    update_category = _sqlite_update_category
else:
    log.info("Using PostgreSQL database")
    save_expense = _pg_save
    get_all_expenses = _pg_get_all
    update_category = _pg_update_category
