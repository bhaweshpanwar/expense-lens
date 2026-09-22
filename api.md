# API.md — Business Expense Analyzer

Living API contract. Update this file in the same commit/change as any endpoint you add or modify.
All endpoints except `/auth/*` require `Authorization: Bearer <jwt>` header.

Response envelope for everything:
```json
{ "success": true, "data": { ... } }
{ "success": false, "error": "human readable message" }
```

Status: 🟢 built · 🟡 in progress · ⚪ not started

---

## Phase 1 — Core CRUD

### Auth

**POST /api/auth/register** ⚪
```json
// request
{ "name": "string", "email": "string", "password": "string", "business_name": "string" }
// response 201
{ "success": true, "data": { "id": "uuid", "name": "...", "email": "...", "token": "jwt" } }
```

**POST /api/auth/login** ⚪
```json
// request
{ "email": "string", "password": "string" }
// response 200
{ "success": true, "data": { "token": "jwt", "user": { "id": "uuid", "name": "...", "business_name": "..." } } }
```

---

### Categories

**GET /api/categories** ⚪
Query params: `type` (optional: `income` | `expense`)
```json
// response 200
{ "success": true, "data": [
  { "id": "uuid", "name": "Office Supplies", "type": "expense", "icon": "...", "is_default": true }
] }
```

**POST /api/categories** ⚪
```json
// request
{ "name": "string", "type": "income" | "expense", "icon": "string (optional)" }
// response 201 -> single category object
```

**PUT /api/categories/:id** ⚪
```json
// request (any subset)
{ "name": "string", "icon": "string" }
// response 200 -> updated category object
```

**DELETE /api/categories/:id** ⚪
Soft delete (`is_deleted = true`). Reject with 409 if transactions reference it — decide in
build: either block deletion or reassign to "Miscellaneous". Document the chosen behavior here
once built.
```json
// response 200
{ "success": true, "data": { "id": "uuid", "deleted": true } }
```

---

### Vendors

**GET /api/vendors** ⚪
Query params: `search` (optional, matches against `normalized_name`)
```json
{ "success": true, "data": [
  { "id": "uuid", "name": "Reliance Traders", "default_category_id": "uuid|null" }
] }
```

**POST /api/vendors** ⚪
```json
// request
{ "name": "string", "default_category_id": "uuid (optional)" }
// response 201 -> vendor object
// note: normalized_name computed server-side (lowercase + trim). If a vendor with the same
// normalized_name already exists for this user, return the existing one instead of creating
// a duplicate (200, not 201) — prevents "Reliance Traders" / "reliance traders " duplicates.
```

**PUT /api/vendors/:id** ⚪
**DELETE /api/vendors/:id** ⚪ (soft delete, same pattern as categories)

---

### Transactions

**GET /api/transactions** ⚪
Query params (all optional, combinable): `type`, `category_id`, `vendor_id`, `from`, `to`,
`search` (matches notes), `page`, `limit` (default 50)
```json
// response 200
{ "success": true, "data": {
  "transactions": [
    {
      "id": "uuid", "type": "expense", "amount": 4500.00, "currency": "INR",
      "category": { "id": "uuid", "name": "Office Supplies" },
      "vendor": { "id": "uuid", "name": "Staples" },
      "txn_date": "2026-08-14", "notes": "Printer paper + toner",
      "source": "manual", "is_flagged_unusual": false,
      "created_at": "2026-08-14T10:22:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 214 }
} }
```

**POST /api/transactions** ⚪
```json
// request
{
  "type": "income" | "expense",
  "amount": 4500.00,
  "category_id": "uuid",          // required if type = expense
  "vendor_id": "uuid (optional)",
  "vendor_name": "string (optional — if provided instead of vendor_id, look up or create vendor)",
  "txn_date": "2026-08-14",
  "notes": "string (optional)"
}
// response 201 -> full transaction object (same shape as GET)
// validation: 400 if type=expense and category_id missing; 400 if amount <= 0; 400 if txn_date missing
```

**PUT /api/transactions/:id** ⚪
```json
// request: any subset of the POST body fields
// response 200 -> updated transaction object
```

**DELETE /api/transactions/:id** ⚪
Soft delete only.
```json
// response 200
{ "success": true, "data": { "id": "uuid", "deleted": true } }
```

---

## Phase 2 — Dashboard & Reports

**GET /api/dashboard/summary** 🟢
Query params: `from`, `to` (default: current month)
```json
{ "success": true, "data": {
  "total_income": 185000.00,
  "total_expense": 132500.00,
  "net_balance": 52500.00,
  "period": { "from": "2026-09-01", "to": "2026-09-22" }
} }
```

**GET /api/dashboard/by-category** 🟢
Query params: `from`, `to`, `type` (default: `expense`)
```json
{ "success": true, "data": [
  { "category_id": "uuid", "category_name": "Rent", "total": 25000.00, "txn_count": 1, "pct_of_total": 18.9 }
] }
```

**GET /api/dashboard/by-vendor** 🟢
Same shape as by-category, keyed by vendor. Query params: `from`, `to`, `limit` (default: top 10).

**GET /api/dashboard/trend** 🟢
Query params: `months` (default: 6)
```json
{ "success": true, "data": [
  { "month": "2026-04", "income": 150000, "expense": 98000 },
  { "month": "2026-05", "income": 162000, "expense": 110000 }
] }
```

**GET /api/dashboard/unusual-transactions** 🟢
Query params: `from`, `to` (optional — default: all flagged in trailing 6 months)
Runs (or reads cached results of) the anomaly detection query in schema.sql.
```json
{ "success": true, "data": [
  {
    "id": "uuid", "amount": 45000.00, "txn_date": "2026-08-02",
    "category_name": "Office Supplies", "vendor_name": "Staples",
    "avg_amount": 12000.00, "z_score": 3.1,
    "flag_reason": "Office Supplies expense of ₹45,000 is significantly higher than the historical average of ₹12,000 (8 past transactions)"
  }
] }
```

---

## Phase 3 — Import, Budgets, Savings

**POST /api/import/csv** ⚪
Multipart upload. Parses file, does NOT commit to transactions table.
```json
// response 200
{ "success": true, "data": {
  "batch_id": "uuid", "status": "needs_review",
  "preview": [ { "row": 1, "type": "expense", "amount": 500, "category_guess": "Utilities", "vendor_guess": "BSES", "txn_date": "2026-08-01", "issues": [] } ]
} }
```

**POST /api/import/image** ⚪
Multipart upload (photo). Sends to Gemini vision, extracts structured data.
```json
// response 200 — same shape as CSV import response
{ "success": true, "data": { "batch_id": "uuid", "status": "needs_review", "preview": [ ... ] } }
```

**POST /api/import/:batchId/commit** ⚪
```json
// request
{ "rows": [ /* edited/confirmed preview rows, same shape as preview above */ ] }
// response 200
{ "success": true, "data": { "committed_count": 42, "skipped_count": 3 } }
```

**GET/POST /api/budgets** ⚪
```json
// POST request
{ "category_id": "uuid (optional, null = overall)", "limit_amount": 20000.00, "period": "monthly" }
```

**GET /api/budgets/status** ⚪
Compares current period spend against each active budget.
```json
{ "success": true, "data": [
  { "category_name": "Marketing", "limit_amount": 10000, "spent": 8700, "pct_used": 87.0, "exceeded": false }
] }
```

**GET/POST /api/savings-goal** ⚪
```json
// POST request
{ "target_amount": 2000, "monthly_save_amount": 2000, "target_date": "2026-12-31 (optional)" }
```

**GET /api/savings-goal/suggestion** ⚪
Rule-based: looks at top non-essential expense categories, suggests cuts to hit the target.
```json
{ "success": true, "data": {
  "target_monthly_save": 2000,
  "current_avg_monthly_expense": 45000,
  "suggestions": [
    { "category_name": "Marketing", "current_monthly_avg": 6000, "suggested_cut": 800 },
    { "category_name": "Travel", "current_monthly_avg": 4000, "suggested_cut": 1200 }
  ]
} }
```

---

## Changelog
- 2026-09-22: Implemented Phase 2 dashboard endpoints (summary, by-category, by-vendor, trend).
- 2026-09-22: Initial contract drafted, Phase 1–3 endpoints stubbed, none built yet.