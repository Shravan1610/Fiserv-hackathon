# API Contract

> Immutable during the hackathon build. Both backend and frontend build against this.

## POST /api/upload

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

## GET /api/expenses

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

## PATCH /api/expenses/:id

**Request:**
```json
{ "category": "Travel" }
```

**Response:**
```json
{ "id": "uuid", "category": "Travel", "updated": true }
```
