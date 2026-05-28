#!/usr/bin/env bash
set -euo pipefail

# Intelligent Expense Categorizer — local dev launcher
# Starts Flask backend (port 5001) + Next.js frontend (port 3000)
# Stack: Python · PostgreSQL · Tesseract (+ poppler for PDFs)

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
LOG_DIR="$ROOT_DIR/.logs"
mkdir -p "$LOG_DIR"

BACKEND_PID=""
FRONTEND_PID=""
BACKEND_USE_SQLITE=false
FRONTEND_USE_MOCK=unknown

cleanup() {
  echo ""
  echo "→ Shutting down…"
  [[ -n "$BACKEND_PID"  ]] && kill "$BACKEND_PID"  2>/dev/null || true
  [[ -n "$FRONTEND_PID" ]] && kill "$FRONTEND_PID" 2>/dev/null || true
  wait 2>/dev/null || true
  echo "✓ Stopped."
}
trap cleanup EXIT INT TERM

require() {
  command -v "$1" >/dev/null 2>&1 || { echo "✗ Missing required command: $1"; exit 1; }
}

soft_require() {
  command -v "$1" >/dev/null 2>&1 || echo "⚠ $1 not found — $2"
}

# ── Host-level dependency checks ───────────────────────────────────────────────
require python3
require npm
soft_require tesseract  "OCR will fail. Install: brew install tesseract"
soft_require pdftoppm   "PDF receipts will fail. Install: brew install poppler"
soft_require psql       "Postgres CLI missing. Install: brew install postgresql@16"

# ── Postgres readiness ─────────────────────────────────────────────────────────
PG_HOST="${PGHOST:-localhost}"
PG_PORT="${PGPORT:-5432}"
PG_USER="${PGUSER:-postgres}"
PG_DB="${PGDATABASE:-expenses}"

if command -v pg_isready >/dev/null 2>&1; then
  if pg_isready -h "$PG_HOST" -p "$PG_PORT" -q; then
    echo "✓ Postgres is up at $PG_HOST:$PG_PORT"

    if command -v psql >/dev/null 2>&1; then
      if ! psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$PG_DB"; then
        echo "  · Database '$PG_DB' missing — creating it"
        if command -v createdb >/dev/null 2>&1; then
          createdb -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" "$PG_DB" 2>/dev/null \
            && echo "  ✓ Created database '$PG_DB'" \
            || echo "  ⚠ createdb failed — create '$PG_DB' manually"
        fi
      else
        echo "  ✓ Database '$PG_DB' exists"
      fi
    fi
  else
    echo "⚠ Postgres not reachable at $PG_HOST:$PG_PORT"
    echo "   Start it: brew services start postgresql@16"
    echo "   Falling back to SQLite for this run."
    BACKEND_USE_SQLITE=true
  fi
fi

# ── Backend ────────────────────────────────────────────────────────────────────
echo ""
echo "→ Backend setup…"
cd "$BACKEND_DIR"

if [[ ! -d "venv" ]]; then
  echo "  · Creating venv"
  python3 -m venv venv
fi

# shellcheck disable=SC1091
source venv/bin/activate

if [[ ! -f "venv/.deps_installed" ]] || [[ requirements.txt -nt venv/.deps_installed ]]; then
  echo "  · Installing Python dependencies"
  pip install --quiet --upgrade pip
  pip install --quiet -r requirements.txt
  touch venv/.deps_installed
fi

if [[ ! -f ".env" ]]; then
  if [[ -f ".env.example" ]]; then
    cp .env.example .env
    echo "  ⚠ Created backend/.env from example — edit it to set GEMINI_API_KEY + DATABASE_URL"
  fi
fi

if [[ -f ".env" ]]; then
  if ! grep -qE "^GEMINI_API_KEY=.+" .env || grep -q "^GEMINI_API_KEY=your_key_here" .env; then
    echo "  ⚠ GEMINI_API_KEY not set in backend/.env — extraction + LLM categorization will fail"
  fi
  if ! grep -qE "^(DATABASE_URL|PGHOST)=" .env; then
    echo "  ⚠ DATABASE_URL not set in backend/.env — using PG* defaults ($PG_USER@$PG_HOST:$PG_PORT/$PG_DB)"
  fi
fi

echo "  · Starting Flask on http://localhost:5001"
if [[ "$BACKEND_USE_SQLITE" == "true" ]]; then
  echo "  · Backend storage: SQLite (temporary fallback)"
  USE_SQLITE=true python run.py >"$LOG_DIR/backend.log" 2>&1 &
else
  python run.py >"$LOG_DIR/backend.log" 2>&1 &
fi
BACKEND_PID=$!
deactivate

# ── Frontend ───────────────────────────────────────────────────────────────────
echo ""
echo "→ Frontend setup…"
cd "$FRONTEND_DIR"

if [[ ! -d "node_modules" ]] || [[ package.json -nt node_modules ]]; then
  echo "  · Installing npm dependencies"
  npm install --silent
fi

if [[ ! -f ".env.local" ]] && [[ -f ".env.local.example" ]]; then
  cp .env.local.example .env.local
  echo "  · Created frontend/.env.local from example (USE_MOCK=true)"
fi

if [[ -f ".env.local" ]]; then
  if grep -qE "^NEXT_PUBLIC_USE_MOCK=true" .env.local; then
    FRONTEND_USE_MOCK=true
  elif grep -qE "^NEXT_PUBLIC_USE_MOCK=false" .env.local; then
    FRONTEND_USE_MOCK=false
  fi
fi

echo "  · Starting Next.js on http://localhost:3000"
npm run dev >"$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!

# ── Wait & report ──────────────────────────────────────────────────────────────
sleep 2
echo ""
echo "──────────────────────────────────────────────"
echo "  Frontend App       → http://localhost:3000            (PID $FRONTEND_PID)"
echo "  Dashboard Route    → http://localhost:3000/dashboard"
echo "  Backend API        → http://localhost:5001/api/expenses (PID $BACKEND_PID)"
echo "  Backend Root       → http://localhost:5001 returns 404 by design"
if [[ "$BACKEND_USE_SQLITE" == "true" ]]; then
  echo "  Backend Storage    → SQLite fallback"
else
  echo "  Backend Storage    → Postgres at $PG_USER@$PG_HOST:$PG_PORT/$PG_DB"
fi
if [[ "$FRONTEND_USE_MOCK" == "true" ]]; then
  echo "  Frontend Data Mode → Mock data"
elif [[ "$FRONTEND_USE_MOCK" == "false" ]]; then
  echo "  Frontend Data Mode → Real backend API"
fi
echo "  Logs     → $LOG_DIR/{backend,frontend}.log"
echo "──────────────────────────────────────────────"
echo "Press Ctrl+C to stop both."

wait
