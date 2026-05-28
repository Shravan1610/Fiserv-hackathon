"""Postgres-backed expense store.

Public API (unchanged from the SQLite version so routes.py stays untouched):
  - save_expense(expense: dict) -> None
  - get_all_expenses() -> {"expenses": [...], "summary": {...}}
  - update_category(expense_id: str, category: str) -> dict

Connection config comes from env vars in this order of preference:
  1. DATABASE_URL  (e.g. postgresql://user:pass@host:5432/dbname)
  2. PGHOST / PGPORT / PGUSER / PGPASSWORD / PGDATABASE
"""

import logging
import os
from contextlib import contextmanager
from datetime import date, datetime
from typing import Optional

import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()
log = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL")
PG_KW = {
    "host": os.getenv("PGHOST", "localhost"),
    "port": int(os.getenv("PGPORT", "5432")),
    "user": os.getenv("PGUSER", "postgres"),
    "password": os.getenv("PGPASSWORD", "postgres"),
    "dbname": os.getenv("PGDATABASE", "expenses"),
}

CREATE_SQL = """
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

_initialized = False


def _connect():
    if DATABASE_URL:
        return psycopg2.connect(DATABASE_URL)
    return psycopg2.connect(**PG_KW)


@contextmanager
def get_conn():
    """Yields a connection; ensures schema exists on first use."""
    global _initialized
    conn = _connect()
    try:
        if not _initialized:
            with conn.cursor() as cur:
                cur.execute(CREATE_SQL)
            conn.commit()
            _initialized = True
        yield conn
    finally:
        conn.close()


def _coerce_date(value) -> Optional[date]:
    """Accept 'YYYY-MM-DD', date, datetime, or None. Bad input → None."""
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


def save_expense(expense: dict) -> None:
    with get_conn() as conn, conn.cursor() as cur:
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


def get_all_expenses() -> dict:
    with get_conn() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
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


def update_category(expense_id: str, category: str) -> dict:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "UPDATE expenses SET category = %s WHERE id = %s",
            (category, expense_id),
        )
        updated = cur.rowcount > 0
        conn.commit()
    return {"id": expense_id, "category": category, "updated": updated}
