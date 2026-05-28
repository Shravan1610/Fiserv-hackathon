# Intelligent Expense Categorizer

AI-powered receipt OCR and expense categorization. Upload a receipt image → get merchant, amount, date, and category extracted automatically via a multi-agent pipeline.

## Stack

- **Backend:** Python · Flask · Tesseract OCR · Gemini 1.5 Flash
- **Frontend:** Next.js 14 · shadcn/ui · Recharts · TypeScript
- **DB:** SQLite

## Run Locally

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # add your GEMINI_API_KEY
python run.py          # → http://localhost:5000
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev            # → http://localhost:3000
```

Set `NEXT_PUBLIC_USE_MOCK=false` in `.env.local` to connect to the real backend.

## Architecture

```
Receipt image
    ↓
OCR Service (Tesseract + preprocessing)
    ↓
Agent 1 — Extraction (Gemini: merchant, amount, date)
    ↓
Agent 2 — Categorization (rule-based + Gemini fallback)
    ↓
Agent 3 — Insights (rule-based summary)
    ↓
SQLite → REST API → Next.js dashboard
```

## Scoring

| Criteria | Points |
|---|---|
| OCR accuracy | 40 |
| Categorization quality | 30 |
| Dashboard / UI | 20 |
| Code quality | 10 |
