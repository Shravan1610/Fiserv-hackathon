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
    confidence REAL,
    is_anomaly INTEGER DEFAULT 0,
    anomaly_reason TEXT
);
"""

SQLITE_CREATE_INCOME = """
CREATE TABLE IF NOT EXISTS income (
    id TEXT PRIMARY KEY,
    source TEXT,
    amount REAL,
    date TEXT,
    category TEXT,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
"""


def _sqlite_migrate(conn) -> None:
    """Add anomaly columns to legacy DBs that pre-date the schema bump."""
    cols = {row["name"] for row in conn.execute("PRAGMA table_info(expenses)").fetchall()}
    if "is_anomaly" not in cols:
        conn.execute("ALTER TABLE expenses ADD COLUMN is_anomaly INTEGER DEFAULT 0")
    if "anomaly_reason" not in cols:
        conn.execute("ALTER TABLE expenses ADD COLUMN anomaly_reason TEXT")
    conn.commit()


def _sqlite_conn():
    SQLITE_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(SQLITE_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute(SQLITE_CREATE)
    conn.execute(SQLITE_CREATE_INCOME)
    conn.commit()
    _sqlite_migrate(conn)
    return conn


def _sqlite_save(expense: dict) -> None:
    conn = _sqlite_conn()
    conn.execute(
        """
        INSERT OR REPLACE INTO expenses
            (id, merchant, amount, date, category, confidence, is_anomaly, anomaly_reason)
        VALUES (?,?,?,?,?,?,?,?)
        """,
        (
            expense["id"],
            expense.get("merchant"),
            expense.get("amount"),
            expense.get("date"),
            expense.get("category"),
            expense.get("confidence", 0.9),
            1 if expense.get("is_anomaly") else 0,
            expense.get("anomaly_reason"),
        ),
    )
    conn.commit()
    conn.close()


def _sqlite_get_all() -> dict:
    conn = _sqlite_conn()
    rows = conn.execute("SELECT * FROM expenses ORDER BY date DESC").fetchall()
    conn.close()
    expenses = []
    by_category: dict = {}
    for r in rows:
        d = dict(r)
        d["is_anomaly"] = bool(d.get("is_anomaly"))
        expenses.append(d)
        cat = d.get("category") or "Other"
        by_category[cat] = by_category.get(cat, 0.0) + (d.get("amount") or 0)
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


def _sqlite_save_income(income: dict) -> None:
    conn = _sqlite_conn()
    conn.execute(
        """
        INSERT OR REPLACE INTO income
            (id, source, amount, date, category, notes)
        VALUES (?,?,?,?,?,?)
        """,
        (
            income["id"],
            income.get("source"),
            income.get("amount"),
            income.get("date"),
            income.get("category"),
            income.get("notes"),
        ),
    )
    conn.commit()
    conn.close()


def _sqlite_get_all_income() -> dict:
    conn = _sqlite_conn()
    rows = conn.execute("SELECT * FROM income ORDER BY date DESC").fetchall()
    conn.close()
    income = []
    by_category: dict = {}
    for r in rows:
        d = dict(r)
        income.append({
            "id": d["id"],
            "source": d.get("source"),
            "amount": d.get("amount") or 0,
            "date": d.get("date"),
            "category": d.get("category") or "Other",
            "notes": d.get("notes"),
        })
        cat = d.get("category") or "Other"
        by_category[cat] = by_category.get(cat, 0.0) + (d.get("amount") or 0)
    total = sum(i.get("amount") or 0 for i in income)
    return {
        "income": income,
        "summary": {
            "total": round(total, 2),
            "by_category": {k: round(v, 2) for k, v in by_category.items()},
        },
    }


def _sqlite_update_income(income_id: str, fields: dict) -> dict:
    allowed = {"source", "amount", "date", "category", "notes"}
    sets = [f"{k}=?" for k in fields if k in allowed]
    values = [fields[k] for k in fields if k in allowed]
    if not sets:
        return {"id": income_id, "updated": False}
    conn = _sqlite_conn()
    cur = conn.execute(
        f"UPDATE income SET {', '.join(sets)} WHERE id=?",
        (*values, income_id),
    )
    updated = cur.rowcount > 0
    conn.commit()
    conn.close()
    return {"id": income_id, "updated": updated}


def _sqlite_delete_income(income_id: str) -> dict:
    conn = _sqlite_conn()
    cur = conn.execute("DELETE FROM income WHERE id=?", (income_id,))
    deleted = cur.rowcount > 0
    conn.commit()
    conn.close()
    return {"id": income_id, "deleted": deleted}


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
    id              TEXT PRIMARY KEY,
    merchant        TEXT,
    amount          NUMERIC(12, 2),
    date            DATE,
    category        TEXT,
    confidence      REAL,
    is_anomaly      BOOLEAN DEFAULT FALSE,
    anomaly_reason  TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_anomaly BOOLEAN DEFAULT FALSE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS anomaly_reason TEXT;
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

CREATE TABLE IF NOT EXISTS income (
    id          TEXT PRIMARY KEY,
    source      TEXT,
    amount      NUMERIC(12, 2),
    date        DATE,
    category    TEXT,
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_income_date ON income(date DESC);
CREATE INDEX IF NOT EXISTS idx_income_category ON income(category);
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
            INSERT INTO expenses (id, merchant, amount, date, category, confidence,
                                  is_anomaly, anomaly_reason)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                merchant       = EXCLUDED.merchant,
                amount         = EXCLUDED.amount,
                date           = EXCLUDED.date,
                category       = EXCLUDED.category,
                confidence     = EXCLUDED.confidence,
                is_anomaly     = EXCLUDED.is_anomaly,
                anomaly_reason = EXCLUDED.anomaly_reason
            """,
            (
                expense["id"],
                expense.get("merchant"),
                expense.get("amount"),
                _coerce_date(expense.get("date")),
                expense.get("category"),
                expense.get("confidence", 0.9),
                bool(expense.get("is_anomaly")),
                expense.get("anomaly_reason"),
            ),
        )
        conn.commit()


def _pg_get_all() -> dict:
    from psycopg2.extras import RealDictCursor
    with _pg_conn() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT id, merchant, amount, date, category, confidence,
                   is_anomaly, anomaly_reason
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
            "is_anomaly": bool(r.get("is_anomaly")),
            "anomaly_reason": r.get("anomaly_reason"),
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


def _pg_save_income(income: dict) -> None:
    with _pg_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO income (id, source, amount, date, category, notes)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                source   = EXCLUDED.source,
                amount   = EXCLUDED.amount,
                date     = EXCLUDED.date,
                category = EXCLUDED.category,
                notes    = EXCLUDED.notes
            """,
            (
                income["id"],
                income.get("source"),
                income.get("amount"),
                _coerce_date(income.get("date")),
                income.get("category"),
                income.get("notes"),
            ),
        )
        conn.commit()


def _pg_get_all_income() -> dict:
    from psycopg2.extras import RealDictCursor
    with _pg_conn() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT id, source, amount, date, category, notes
            FROM income
            ORDER BY date DESC NULLS LAST, created_at DESC
            """
        )
        rows = cur.fetchall()

    income = []
    by_category: dict = {}
    total = 0.0
    for r in rows:
        amt = float(r["amount"]) if r["amount"] is not None else 0.0
        cat = r["category"] or "Other"
        income.append({
            "id": r["id"],
            "source": r["source"],
            "amount": amt,
            "date": r["date"].isoformat() if r["date"] else None,
            "category": cat,
            "notes": r.get("notes"),
        })
        by_category[cat] = by_category.get(cat, 0.0) + amt
        total += amt

    return {
        "income": income,
        "summary": {
            "total": round(total, 2),
            "by_category": {k: round(v, 2) for k, v in by_category.items()},
        },
    }


def _pg_update_income(income_id: str, fields: dict) -> dict:
    allowed = {"source", "amount", "date", "category", "notes"}
    sets = []
    values = []
    for k in fields:
        if k not in allowed:
            continue
        sets.append(f"{k} = %s")
        values.append(_coerce_date(fields[k]) if k == "date" else fields[k])
    if not sets:
        return {"id": income_id, "updated": False}
    with _pg_conn() as conn, conn.cursor() as cur:
        cur.execute(
            f"UPDATE income SET {', '.join(sets)} WHERE id = %s",
            (*values, income_id),
        )
        updated = cur.rowcount > 0
        conn.commit()
    return {"id": income_id, "updated": updated}


def _pg_delete_income(income_id: str) -> dict:
    with _pg_conn() as conn, conn.cursor() as cur:
        cur.execute("DELETE FROM income WHERE id = %s", (income_id,))
        deleted = cur.rowcount > 0
        conn.commit()
    return {"id": income_id, "deleted": deleted}


# --- Public API ---
if USE_SQLITE:
    log.info("Using SQLite database at %s", SQLITE_PATH)
    save_expense = _sqlite_save
    get_all_expenses = _sqlite_get_all
    update_category = _sqlite_update_category
    save_income = _sqlite_save_income
    get_all_income = _sqlite_get_all_income
    update_income = _sqlite_update_income
    delete_income = _sqlite_delete_income
else:
    log.info("Using PostgreSQL database")
    save_expense = _pg_save
    get_all_expenses = _pg_get_all
    update_category = _pg_update_category
    save_income = _pg_save_income
    get_all_income = _pg_get_all_income
    update_income = _pg_update_income
    delete_income = _pg_delete_income
