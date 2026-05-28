#!/usr/bin/env bash
set -euo pipefail

# Intelligent Expense Categorizer — local dev launcher
# Starts the Flask backend (port 5000) and Next.js frontend (port 3000) together.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
LOG_DIR="$ROOT_DIR/.logs"
mkdir -p "$LOG_DIR"

BACKEND_PID=""
FRONTEND_PID=""

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

require python3
require npm
command -v tesseract >/dev/null 2>&1 || echo "⚠ tesseract not found — OCR will fail. Install via: brew install tesseract"

# ── Backend ────────────────────────────────────────────────────────────────────
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
    echo "  ⚠ Created backend/.env from example — edit it to set GEMINI_API_KEY"
  fi
fi

if [[ -f ".env" ]] && ! grep -q "^GEMINI_API_KEY=.\+" .env || grep -q "^GEMINI_API_KEY=your_key_here" .env 2>/dev/null; then
  echo "  ⚠ GEMINI_API_KEY not set in backend/.env — extraction agent will fail"
fi

echo "  · Starting Flask on http://localhost:5000"
python run.py >"$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
deactivate

# ── Frontend ───────────────────────────────────────────────────────────────────
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

echo "  · Starting Next.js on http://localhost:3000"
npm run dev >"$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!

# ── Wait & report ──────────────────────────────────────────────────────────────
sleep 2
echo ""
echo "──────────────────────────────────────────────"
echo "  Backend  → http://localhost:5000   (PID $BACKEND_PID)"
echo "  Frontend → http://localhost:3000   (PID $FRONTEND_PID)"
echo "  Logs     → $LOG_DIR/{backend,frontend}.log"
echo "──────────────────────────────────────────────"
echo "Press Ctrl+C to stop both."

wait
