# Intelligent Expense Categorizer — Hackathon Build Plan

**Event:** Fintech Hackathon · 2–3 Hour POC  
**Stack:** Python (Flask) · Next.js · shadcn/ui · Multi-Agent Pipeline  
**Structure:** Featurebase monorepo · 3 isolated tracks · merge at the end  

---

## Project Structure

```
expense-categorizer/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── routes.py
│   │   ├── agents/
│   │   │   ├── extraction_agent.py
│   │   │   ├── categorization_agent.py
│   │   │   └── insights_agent.py
│   │   ├── services/
│   │   │   ├── ocr_service.py
│   │   │   └── db_service.py
│   │   └── models/
│   │       └── expense.py
│   ├── data/
│   │   └── expenses.db          # SQLite
│   ├── tests/
│   │   └── test_agents.py
│   ├── requirements.txt
│   └── run.py
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── dashboard/
│   │       └── page.tsx
│   ├── components/
│   │   ├── upload/
│   │   │   └── UploadCard.tsx
│   │   ├── dashboard/
│   │   │   ├── ExpenseTable.tsx
│   │   │   ├── CategoryPieChart.tsx
│   │   │   ├── SpendBarChart.tsx
│   │   │   └── InsightsBanner.tsx
│   │   └── ui/                  # shadcn components
│   ├── lib/
│   │   ├── api.ts               # API client
│   │   └── mock-data.ts         # Mock responses for isolated dev
│   ├── types/
│   │   └── expense.ts           # Shared type definitions
│   ├── package.json
│   └── next.config.ts
│
├── contract/
│   └── api-schema.md            # Shared API contract (owned by Member 3)
│
└── README.md
```

---

## API Contract (Shared — Do Not Change Without Team Sync)

> Defined upfront. Both Member 1 (backend) and Member 2 (frontend) build against this.

### `POST /api/upload`

**Request:** `multipart/form-data` — field name: `receipt`

**Response:**
```json
{
  "id": "uuid-string",
  "merchant": "Domino's Pizza",
  "amount": 540.00,
  "date": "2026-01-28",
  "category": "Food",
  "insight": "Biggest spend this week: Food ₹1,200",
  "confidence": 0.94
}
```

### `GET /api/expenses`

**Response:**
```json
{
  "expenses": [
    {
      "id": "uuid",
      "merchant": "Domino's Pizza",
      "amount": 540.00,
      "date": "2026-01-28",
      "category": "Food",
      "confidence": 0.94
    }
  ],
  "summary": {
    "total": 1840.00,
    "by_category": {
      "Food": 1200.00,
      "Travel": 440.00,
      "Other": 200.00
    },
    "insight": "Biggest spend this week: Food ₹1,200"
  }
}
```

### `PATCH /api/expenses/:id`

**Request:**
```json
{ "category": "Travel" }
```

**Response:**
```json
{ "id": "uuid", "category": "Travel", "updated": true }
```

---

---

## Member 1 — Backend & Agent Pipeline

**Owner:** Backend Developer  
**Dir:** `backend/`  
**Timeline:** Full 2–3 hours  
**Dependency:** None — exposes REST endpoints, tested independently with `curl` / Postman

---

### Setup (0:00 – 0:15)

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install flask flask-cors pytesseract pillow google-generativeai python-dotenv uuid sqlite3
```

`requirements.txt`:
```
flask==3.1.0
flask-cors==5.0.0
pytesseract==0.3.13
Pillow==11.2.1
google-generativeai==0.8.5
python-dotenv==1.1.0
```

`.env`:
```
GEMINI_API_KEY=your_key_here
```

---

### Task 1 — Flask App & Routes (0:15 – 0:35)

**File:** `backend/app/__init__.py`
```python
from flask import Flask
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    CORS(app, origins=["http://localhost:3000"])
    from .routes import main
    app.register_blueprint(main)
    return app
```

**File:** `backend/run.py`
```python
from app import create_app
app = create_app()
if __name__ == "__main__":
    app.run(debug=True, port=5000)
```

**File:** `backend/app/routes.py`
```python
from flask import Blueprint, request, jsonify
from .services.ocr_service import run_ocr
from .services.db_service import save_expense, get_all_expenses, update_category
from .agents.extraction_agent import extract_fields
from .agents.categorization_agent import categorize
from .agents.insights_agent import generate_insight
import uuid

main = Blueprint("main", __name__)

@main.route("/api/upload", methods=["POST"])
def upload():
    file = request.files.get("receipt")
    if not file:
        return jsonify({"error": "No file uploaded"}), 400

    raw_text = run_ocr(file)
    structured = extract_fields(raw_text)         # Agent 1
    category = categorize(structured)             # Agent 2
    structured["category"] = category["category"]
    structured["confidence"] = category["confidence"]
    structured["id"] = str(uuid.uuid4())

    save_expense(structured)
    all_expenses = get_all_expenses()
    insight = generate_insight(structured, all_expenses)  # Agent 3
    structured["insight"] = insight

    return jsonify(structured), 200

@main.route("/api/expenses", methods=["GET"])
def expenses():
    data = get_all_expenses()
    return jsonify(data), 200

@main.route("/api/expenses/<expense_id>", methods=["PATCH"])
def patch_expense(expense_id):
    body = request.json
    result = update_category(expense_id, body.get("category"))
    return jsonify(result), 200
```

---

### Task 2 — OCR Service (0:35 – 0:50)

**File:** `backend/app/services/ocr_service.py`
```python
import pytesseract
from PIL import Image, ImageFilter, ImageEnhance
import io

def preprocess(image: Image.Image) -> Image.Image:
    image = image.convert("L")                         # grayscale
    image = image.filter(ImageFilter.SHARPEN)
    enhancer = ImageEnhance.Contrast(image)
    image = enhancer.enhance(2.0)
    return image

def run_ocr(file_storage) -> str:
    image_bytes = file_storage.read()
    image = Image.open(io.BytesIO(image_bytes))
    image = preprocess(image)
    text = pytesseract.image_to_string(image, lang="eng")
    return text.strip()
```

> **Fallback:** If Tesseract accuracy is low on demo receipts, swap `run_ocr` to call  
> Gemini Vision (`gemini-1.5-flash`) and return the raw text. Keep the same function signature.

---

### Task 3 — Agent 1: Extraction Specialist (0:50 – 1:10)

**File:** `backend/app/agents/extraction_agent.py`
```python
import google.generativeai as genai
import json, os, re
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-1.5-flash")

SYSTEM_PROMPT = """
You are a receipt data extraction specialist.
Given raw OCR text from a receipt, extract:
- merchant: the store or service name (string)
- amount: the total amount paid in INR (float, no currency symbol)
- date: the transaction date in YYYY-MM-DD format

Respond ONLY with valid JSON. No explanation. No markdown.
Example: {"merchant": "Domino's Pizza", "amount": 540.00, "date": "2026-01-28"}
If a field cannot be found, use null.
"""

def extract_fields(raw_text: str) -> dict:
    prompt = f"{SYSTEM_PROMPT}\n\nOCR Text:\n{raw_text}"
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        text = re.sub(r"```json|```", "", text).strip()
        return json.loads(text)
    except Exception as e:
        return {"merchant": None, "amount": None, "date": None, "error": str(e)}
```

---

### Task 4 — Agent 2: Categorization Engine (1:10 – 1:30)

**File:** `backend/app/agents/categorization_agent.py`
```python
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

    # Rule-based first (fast, deterministic)
    for keyword, cat in MERCHANT_MAP.items():
        if keyword in merchant:
            return {"category": cat, "confidence": 0.99}

    # LLM fallback
    try:
        prompt = f"{SYSTEM_PROMPT}\n\nMerchant: {merchant}"
        response = model.generate_content(prompt)
        text = re.sub(r"```json|```", "", response.text.strip()).strip()
        return json.loads(text)
    except Exception:
        return {"category": "Other", "confidence": 0.5}
```

---

### Task 5 — Agent 3: Insights Analyst (1:30 – 1:50)

**File:** `backend/app/agents/insights_agent.py`
```python
import google.generativeai as genai
import json, os

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-1.5-flash")

def generate_insight(latest: dict, all_expenses: dict) -> str:
    summary = all_expenses.get("summary", {})
    by_category = summary.get("by_category", {})
    total = summary.get("total", 0)

    # Fast rule-based insight (no LLM cost)
    if by_category:
        top_cat = max(by_category, key=by_category.get)
        top_amt = by_category[top_cat]
        return f"Biggest spend this session: {top_cat} ₹{top_amt:,.0f}"
    return f"Added ₹{latest.get('amount', 0):,.0f} to {latest.get('category', 'expenses')}."

    # Optional: swap with LLM for richer insights
    # prompt = f"Given expenses: {json.dumps(summary)}, write a 1-line insight."
    # return model.generate_content(prompt).text.strip()
```

---

### Task 6 — SQLite DB Service (1:50 – 2:10)

**File:** `backend/app/services/db_service.py`
```python
import sqlite3, json
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
    return {
        "expenses": expenses,
        "summary": {
            "total": sum(e.get("amount", 0) for e in expenses),
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
```

---

### Verify (2:10 – 2:20)

```bash
python run.py

# Test upload
curl -X POST http://localhost:5000/api/upload \
  -F "receipt=@test_receipt.jpg"

# Test list
curl http://localhost:5000/api/expenses
```

---

---

## Member 2 — Frontend (Next.js + shadcn/ui)

**Owner:** Frontend Developer  
**Dir:** `frontend/`  
**Timeline:** Full 2–3 hours  
**Dependency:** None — builds against mock data, replaces with real API at merge

---

### Setup (0:00 – 0:20)

```bash
npx create-next-app@latest frontend --typescript --tailwind --app --src-dir=false
cd frontend
npx shadcn@latest init
npx shadcn@latest add card button badge table progress
npx shadcn@latest add chart    # recharts-based
npm install axios lucide-react
```

---

### Task 1 — Shared Types (0:20 – 0:30)

**File:** `frontend/types/expense.ts`
```ts
export interface Expense {
  id: string
  merchant: string
  amount: number
  date: string
  category: Category
  confidence: number
}

export type Category =
  | "Food"
  | "Travel"
  | "Shopping"
  | "Entertainment"
  | "Healthcare"
  | "Utilities"
  | "Education"
  | "Other"

export interface ExpenseSummary {
  total: number
  by_category: Record<Category, number>
  insight: string
}

export interface UploadResponse extends Expense {
  insight: string
}

export interface ExpensesResponse {
  expenses: Expense[]
  summary: ExpenseSummary
}
```

---

### Task 2 — Mock Data (0:30 – 0:40)

**File:** `frontend/lib/mock-data.ts`
```ts
import { ExpensesResponse, UploadResponse } from "@/types/expense"

export const MOCK_EXPENSES: ExpensesResponse = {
  expenses: [
    { id: "1", merchant: "Domino's Pizza", amount: 540, date: "2026-01-28", category: "Food", confidence: 0.99 },
    { id: "2", merchant: "Uber", amount: 220, date: "2026-01-27", category: "Travel", confidence: 0.99 },
    { id: "3", merchant: "Netflix", amount: 199, date: "2026-01-26", category: "Entertainment", confidence: 0.99 },
    { id: "4", merchant: "Apollo Pharmacy", amount: 340, date: "2026-01-25", category: "Healthcare", confidence: 0.95 },
    { id: "5", merchant: "Blinkit", amount: 670, date: "2026-01-24", category: "Shopping", confidence: 0.97 },
  ],
  summary: {
    total: 1969,
    by_category: { Food: 540, Travel: 220, Entertainment: 199, Healthcare: 340, Shopping: 670, Utilities: 0, Education: 0, Other: 0 },
    insight: "Biggest spend this session: Shopping ₹670",
  },
}

export const MOCK_UPLOAD: UploadResponse = {
  id: "6", merchant: "Swiggy", amount: 380, date: "2026-05-28",
  category: "Food", confidence: 0.98, insight: "You've spent ₹920 on Food this week."
}
```

---

### Task 3 — API Client (0:40 – 0:50)

**File:** `frontend/lib/api.ts`
```ts
import axios from "axios"
import { ExpensesResponse, UploadResponse } from "@/types/expense"
import { MOCK_EXPENSES, MOCK_UPLOAD } from "./mock-data"

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true"
const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

export async function uploadReceipt(file: File): Promise<UploadResponse> {
  if (USE_MOCK) return MOCK_UPLOAD
  const form = new FormData()
  form.append("receipt", file)
  const { data } = await axios.post<UploadResponse>(`${BASE}/api/upload`, form)
  return data
}

export async function fetchExpenses(): Promise<ExpensesResponse> {
  if (USE_MOCK) return MOCK_EXPENSES
  const { data } = await axios.get<ExpensesResponse>(`${BASE}/api/expenses`)
  return data
}

export async function patchCategory(id: string, category: string) {
  if (USE_MOCK) return { id, category, updated: true }
  const { data } = await axios.patch(`${BASE}/api/expenses/${id}`, { category })
  return data
}
```

**.env.local:**
```
NEXT_PUBLIC_USE_MOCK=true
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

### Task 4 — Upload Card Component (0:50 – 1:15)

**File:** `frontend/components/upload/UploadCard.tsx`
```tsx
"use client"
import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Upload, CheckCircle, Loader2 } from "lucide-react"
import { uploadReceipt } from "@/lib/api"
import { UploadResponse } from "@/types/expense"

const CATEGORY_COLORS: Record<string, string> = {
  Food: "bg-orange-100 text-orange-800",
  Travel: "bg-blue-100 text-blue-800",
  Shopping: "bg-purple-100 text-purple-800",
  Entertainment: "bg-pink-100 text-pink-800",
  Healthcare: "bg-green-100 text-green-800",
  Utilities: "bg-yellow-100 text-yellow-800",
  Education: "bg-indigo-100 text-indigo-800",
  Other: "bg-gray-100 text-gray-700",
}

interface Props { onUploadSuccess: (result: UploadResponse) => void }

export function UploadCard({ onUploadSuccess }: Props) {
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<UploadResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setLoading(true); setError(null); setResult(null)
    try {
      const res = await uploadReceipt(file)
      setResult(res)
      onUploadSuccess(res)
    } catch {
      setError("Upload failed. Please try again.")
    } finally { setLoading(false) }
  }

  return (
    <Card className="w-full">
      <CardHeader><CardTitle className="text-base font-medium">Upload Receipt</CardTitle></CardHeader>
      <CardContent>
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
            ${dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}`}
        >
          <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
          {loading
            ? <><Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Processing receipt…</p></>
            : <><Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm font-medium">Drop receipt here or click to upload</p>
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG, PDF supported</p></>}
        </div>

        {error && <p className="text-sm text-destructive mt-3">{error}</p>}

        {result && (
          <div className="mt-4 rounded-lg border p-4 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Extracted successfully</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Merchant</span><span className="font-medium">{result.merchant}</span>
              <span className="text-muted-foreground">Amount</span><span className="font-medium">₹{result.amount.toLocaleString("en-IN")}</span>
              <span className="text-muted-foreground">Date</span><span>{result.date}</span>
              <span className="text-muted-foreground">Category</span>
              <Badge className={CATEGORY_COLORS[result.category]}>{result.category}</Badge>
            </div>
            {result.insight && (
              <p className="text-xs text-muted-foreground border-t pt-2 mt-2">💡 {result.insight}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

---

### Task 5 — Charts (1:15 – 1:45)

**File:** `frontend/components/dashboard/CategoryPieChart.tsx`
```tsx
"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { PieChart, Pie, Cell, Legend } from "recharts"

const COLORS = ["#f97316","#3b82f6","#a855f7","#ec4899","#22c55e","#eab308","#6366f1","#9ca3af"]

interface Props { byCategory: Record<string, number> }

export function CategoryPieChart({ byCategory }: Props) {
  const data = Object.entries(byCategory)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }))

  return (
    <Card>
      <CardHeader><CardTitle className="text-base font-medium">Spend by Category</CardTitle></CardHeader>
      <CardContent>
        <ChartContainer config={{}} className="h-[260px]">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent formatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`} />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
```

**File:** `frontend/components/dashboard/SpendBarChart.tsx`
```tsx
"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"

interface Props { byCategory: Record<string, number> }

export function SpendBarChart({ byCategory }: Props) {
  const data = Object.entries(byCategory)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  return (
    <Card>
      <CardHeader><CardTitle className="text-base font-medium">Amount by Category</CardTitle></CardHeader>
      <CardContent>
        <ChartContainer config={{ value: { label: "Amount", color: "#f97316" } }} className="h-[260px]">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={v => `₹${v}`} tick={{ fontSize: 12 }} />
            <ChartTooltip content={<ChartTooltipContent formatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`} />} />
            <Bar dataKey="value" fill="var(--color-value)" radius={[4,4,0,0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
```

---

### Task 6 — Expense Table + Insights (1:45 – 2:10)

**File:** `frontend/components/dashboard/InsightsBanner.tsx`
```tsx
import { Lightbulb } from "lucide-react"

export function InsightsBanner({ insight }: { insight: string }) {
  if (!insight) return null
  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800 dark:bg-amber-950">
      <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
      <span className="text-amber-800 dark:text-amber-200">{insight}</span>
    </div>
  )
}
```

**File:** `frontend/components/dashboard/ExpenseTable.tsx`
```tsx
"use client"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { patchCategory } from "@/lib/api"
import { Expense, Category } from "@/types/expense"

const ALL_CATEGORIES: Category[] = ["Food","Travel","Shopping","Entertainment","Healthcare","Utilities","Education","Other"]
const CATEGORY_COLORS: Record<string, string> = {
  Food:"bg-orange-100 text-orange-800", Travel:"bg-blue-100 text-blue-800",
  Shopping:"bg-purple-100 text-purple-800", Entertainment:"bg-pink-100 text-pink-800",
  Healthcare:"bg-green-100 text-green-800", Utilities:"bg-yellow-100 text-yellow-800",
  Education:"bg-indigo-100 text-indigo-800", Other:"bg-gray-100 text-gray-700",
}

export function ExpenseTable({ expenses: initial }: { expenses: Expense[] }) {
  const [expenses, setExpenses] = useState(initial)
  const [editing, setEditing] = useState<string | null>(null)

  async function handleCategoryChange(id: string, category: string) {
    await patchCategory(id, category)
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, category: category as Category } : e))
    setEditing(null)
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Merchant</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Confidence</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {expenses.map(e => (
          <TableRow key={e.id}>
            <TableCell className="font-medium">{e.merchant ?? "—"}</TableCell>
            <TableCell>₹{e.amount?.toLocaleString("en-IN")}</TableCell>
            <TableCell className="text-muted-foreground">{e.date}</TableCell>
            <TableCell>
              {editing === e.id
                ? <Select defaultValue={e.category} onValueChange={v => handleCategoryChange(e.id, v)}>
                    <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{ALL_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                : <Badge className={`text-xs ${CATEGORY_COLORS[e.category]}`}>{e.category}</Badge>}
            </TableCell>
            <TableCell className="text-muted-foreground text-xs">{((e.confidence ?? 0) * 100).toFixed(0)}%</TableCell>
            <TableCell>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setEditing(e.id === editing ? null : e.id)}>
                {editing === e.id ? "Cancel" : "Edit"}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

---

### Task 7 — Dashboard Page + Layout (2:10 – 2:30)

**File:** `frontend/app/page.tsx`
```tsx
"use client"
import { useState, useEffect, useCallback } from "react"
import { UploadCard } from "@/components/upload/UploadCard"
import { CategoryPieChart } from "@/components/dashboard/CategoryPieChart"
import { SpendBarChart } from "@/components/dashboard/SpendBarChart"
import { ExpenseTable } from "@/components/dashboard/ExpenseTable"
import { InsightsBanner } from "@/components/dashboard/InsightsBanner"
import { fetchExpenses } from "@/lib/api"
import { ExpensesResponse } from "@/types/expense"
import { UploadResponse } from "@/types/expense"

export default function Home() {
  const [data, setData] = useState<ExpensesResponse | null>(null)
  const [insight, setInsight] = useState("")

  const refresh = useCallback(async () => {
    const d = await fetchExpenses()
    setData(d)
    setInsight(d.summary.insight)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  function handleUpload(result: UploadResponse) {
    setInsight(result.insight)
    refresh()
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="border-b px-6 py-4">
        <h1 className="text-xl font-semibold">Expense Categorizer</h1>
        <p className="text-sm text-muted-foreground">Upload receipts · auto-categorize · track spend</p>
      </div>
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {insight && <InsightsBanner insight={insight} />}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1"><UploadCard onUploadSuccess={handleUpload} /></div>
          {data && (
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-lg border bg-card p-4 text-center">
                <p className="text-xs text-muted-foreground">Total Spend</p>
                <p className="text-3xl font-semibold mt-1">₹{data.summary.total.toLocaleString("en-IN")}</p>
              </div>
              <div className="rounded-lg border bg-card p-4 text-center">
                <p className="text-xs text-muted-foreground">Receipts</p>
                <p className="text-3xl font-semibold mt-1">{data.expenses.length}</p>
              </div>
            </div>
          )}
        </div>
        {data && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CategoryPieChart byCategory={data.summary.by_category} />
              <SpendBarChart byCategory={data.summary.by_category} />
            </div>
            <div className="rounded-lg border bg-card">
              <div className="px-6 py-4 border-b">
                <h2 className="text-base font-medium">All Expenses</h2>
              </div>
              <div className="px-6 py-4">
                <ExpenseTable expenses={data.expenses} />
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
```

---

---

## Member 3 — Integration, Contracts & Final Merge

**Owner:** Integration / Lead  
**Dir:** Root + both `frontend/` and `backend/`  
**Timeline:** 3 phases across the session  
**Dependency:** Unblocks both other members in Phase 1, then merges in Phase 3

---

### Phase 1 — Setup & Contracts (0:00 – 0:30)

> Do this first. Both other members are blocked until this is done.

**1. Scaffold the monorepo:**
```bash
mkdir expense-categorizer && cd expense-categorizer
mkdir backend frontend contract data
git init
echo "backend/venv/\n*.pyc\n__pycache__/\n.env\n.next/\nnode_modules/" > .gitignore
```

**2. Write `contract/api-schema.md`** — copy the API Contract section from this document exactly.  
Both Member 1 and Member 2 must treat this as immutable during the build.

**3. Initialize both repos:**
```bash
# Backend scaffold
cd backend && touch run.py requirements.txt .env
mkdir -p app/agents app/services app/models data tests

# Frontend scaffold
cd ../frontend
# Member 2 runs: npx create-next-app@latest . --typescript --tailwind --app
touch .env.local
```

**4. Ping both members** — confirm they have the contract and can start.

---

### Phase 2 — Integration Tests & Mock Server (0:30 – 1:30)

> Run in parallel while Members 1 & 2 are building.

**Write backend tests** (`backend/tests/test_agents.py`):
```python
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
```

**Write a quick mock server for frontend dev** (optional — only if Member 2 wants a real HTTP server instead of `mock-data.ts`):
```bash
npm install -g json-server
```
```json
// contract/mock-db.json
{
  "expenses": [
    { "id": "1", "merchant": "Domino's Pizza", "amount": 540, "date": "2026-01-28", "category": "Food", "confidence": 0.99 }
  ]
}
```
```bash
json-server --watch contract/mock-db.json --port 5000 --routes contract/routes.json
```

---

### Phase 3 — Merge & Integration (2:00 – 2:30)

**Step 1 — Flip frontend to real API:**
```bash
cd frontend
# Change .env.local:
# NEXT_PUBLIC_USE_MOCK=false
# NEXT_PUBLIC_API_URL=http://localhost:5000
```

**Step 2 — Start both servers:**
```bash
# Terminal 1
cd backend && source venv/bin/activate && python run.py

# Terminal 2
cd frontend && npm run dev
```

**Step 3 — End-to-end smoke test:**
- [ ] Upload `test_receipt.jpg` → fields extracted correctly
- [ ] Category appears in the table
- [ ] Pie chart updates
- [ ] Bar chart updates  
- [ ] Insight banner shows message
- [ ] Manual re-categorization (Edit button) works
- [ ] Refresh page → data persists (SQLite)

**Step 4 — Fix CORS if needed:**
```python
# backend/app/__init__.py — already set but double check:
CORS(app, origins=["http://localhost:3000"])
```

**Step 5 — Final README:**
```markdown
## Run Locally

### Backend
cd backend && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
echo "GEMINI_API_KEY=your_key" > .env
python run.py      # → http://localhost:5000

### Frontend
cd frontend && npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:5000" > .env.local
npm run dev        # → http://localhost:3000
```

---

## Scoring Checklist

| Criteria | Points | How We Hit It |
|---|---|---|
| OCR accuracy | 40 | Gemini Vision / pre-processed Tesseract |
| Categorization quality | 30 | Merchant map + LLM fallback + manual override |
| Dashboard / UI | 20 | Pie + bar charts, insights banner, editable table |
| Code quality | 10 | Single `categorize` module, typed frontend, clean README |
| **Total** | **100** | |

### Stretch Goals Achieved
- [x] Interactive charts (shadcn/recharts)
- [x] Insights panel (Agent 3 / rule-based)
- [x] Learning from manual re-categorization (PATCH + localStorage extension)
