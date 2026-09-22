# Business Expense Analyzer
Name - Expense Lens

## What this project is

A hackathon MVP: expense management + analytics app for a small business (Problem Statement 7).
Business owner adds income/expense transactions (manually, via CSV, or via photo of handwritten
ledger), and the system gives them dashboards, category/vendor breakdowns, and flags unusual
expenses automatically.

## Stack

- **Backend**: Node.js, Express
- **DB**: PostgreSQL (raw SQL via `pg`, no ORM — keep queries explicit and debuggable in a hackathon)
- **Frontend**: React
- **Charts**: D3.js
- **AI**: Gemini (vision extraction for image import, natural-language explanation for anomalies),
  Ollama (local model, used for dummy data generation during dev — not part of the runtime app)

## Directory structure (target)

```
/backend
  /src
    /routes        one file per resource: transactions.js, categories.js, vendors.js, dashboard.js, import.js, budgets.js, savings.js, auth.js
    /controllers    business logic, one per resource
    /db
      pool.js       pg Pool setup
      queries/      raw SQL as .sql files or template strings, grouped by resource
    /middleware     auth.js (JWT check), errorHandler.js
    /services       anomalyDetection.js, geminiVision.js, csvParser.js
    app.js
    server.js
  package.json
/frontend
  ... (React app, standard CRA/Vite structure)
/db
  schema.sql        full schema, source of truth
  seed.sql          generated dummy data (see dummy_data_ollama.md)
```

## Core rules the code must respect (do not violate these)

1. **Soft delete only.** Never `DELETE FROM transactions`. Always `UPDATE transactions SET is_deleted = true`.
   Every report/list query MUST filter `WHERE is_deleted = false`. Use the `active_transactions` view
   from schema.sql wherever possible instead of querying `transactions` directly.
2. **Every expense transaction requires a `category_id`.** This is enforced at the DB level
   (`expense_requires_category` constraint) but validate it in the controller too, with a clear
   400 error, so the frontend gets a useful message instead of a raw DB error.
3. **Every transaction requires `txn_date` and `amount`.** `amount` must be > 0 (DB enforces this).
   Income and expense are both stored as positive numbers; sign is derived from `type`, never
   store negative amounts.
4. **All report/dashboard endpoints accept `from` and `to` query params** and must respect them.
   If omitted, default to the current month.
5. **Filtering**: `GET /api/transactions` must support filtering by `category_id`, `vendor_id`,
   `type`, `from`, `to` — all optional, combinable, all applied at the SQL level (not filtered
   in JS after fetching everything).
6. **user_id scoping.** Every query must be scoped to the authenticated user's `user_id`. No
   endpoint should ever return another user's data. Pull `user_id` from the JWT, never trust a
   `user_id` passed in the request body/query for identifying whose data to return.
7. **IDs are UUIDs** (see schema.sql, `uuid-ossp` extension), not auto-increment ints.

## Where things live

- Full schema: `/db/schema.sql` — this is the source of truth for table structure. If you need
  to change a table, edit schema.sql first, then migrate.
- API contract: `/docs/API.md` — every endpoint, request/response shape, must be kept in sync
  as endpoints are built. When you add or change an endpoint, update API.md in the same change.
- Dummy data generation: `/docs/dummy_data_ollama.md` — Ollama prompt + scripts to seed the DB
  with realistic fake transactions for demoing.

## AI feature specifics

- **Unusual expense detection**: rule-based (mean + 2×stddev per category over trailing 6 months),
  NOT an LLM call for the math. See `schema.sql` for the reference query. LLM (Gemini) may be used
  only to phrase the `flag_reason` text nicely — never to compute the numbers.
- **Image import**: send the uploaded ledger/receipt photo to Gemini vision, prompt for structured
  JSON matching the transaction shape, land results in `import_batches.raw_extracted_json` with
  status `needs_review`, never auto-commit straight to `transactions`.

## Conventions

- All API responses: `{ success: boolean, data?: ..., error?: string }`
- Dates: `YYYY-MM-DD` strings over the wire, `DATE` type in Postgres.
- Money: numbers (not strings) over the wire, `NUMERIC(14,2)` in Postgres. Do not use floats for
  arithmetic in JS if avoidable — prefer doing sums in SQL.
- Auth: JWT in `Authorization: Bearer <token>` header. `authMiddleware` attaches `req.userId`.

## Out of scope (per problem statement — do not build)

Bank integration, real accounting/double-entry, tax filing, payment processing.