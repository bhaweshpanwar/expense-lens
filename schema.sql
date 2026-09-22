-- ============================================================
-- Business Expense Analyzer — Postgres Schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- USERS
-- ------------------------------------------------------------
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(120) NOT NULL,
    email           VARCHAR(160) UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    business_name   VARCHAR(160),
    currency        VARCHAR(10) DEFAULT 'INR',
    language_pref   VARCHAR(10) DEFAULT 'en',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- CATEGORIES  (income & expense both live here, distinguished by type)
-- ------------------------------------------------------------
CREATE TABLE categories (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    type            VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
    icon            VARCHAR(40),
    is_default      BOOLEAN NOT NULL DEFAULT false,
    is_deleted      BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, name, type)
);

-- ------------------------------------------------------------
-- VENDORS / PAYEES
-- ------------------------------------------------------------
CREATE TABLE vendors (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name                VARCHAR(160) NOT NULL,
    normalized_name     VARCHAR(160) NOT NULL,  -- lowercased/trimmed for fuzzy match
    default_category_id UUID REFERENCES categories(id),
    is_deleted          BOOLEAN NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, normalized_name)
);

-- ------------------------------------------------------------
-- IMPORT BATCHES  (CSV / image uploads staged before commit)
-- ------------------------------------------------------------
CREATE TABLE import_batches (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_type         VARCHAR(10) NOT NULL CHECK (source_type IN ('csv', 'image')),
    file_url            TEXT,
    status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','processing','needs_review','committed','failed')),
    raw_extracted_json  JSONB,
    error_message       TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    committed_at        TIMESTAMPTZ
);

-- ------------------------------------------------------------
-- TRANSACTIONS
-- ------------------------------------------------------------
CREATE TABLE transactions (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type                VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
    amount              NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    currency            VARCHAR(10) NOT NULL DEFAULT 'INR',
    category_id         UUID REFERENCES categories(id),
    vendor_id           UUID REFERENCES vendors(id),
    txn_date            DATE NOT NULL,
    notes               TEXT,
    source              VARCHAR(10) NOT NULL DEFAULT 'manual'
                         CHECK (source IN ('manual','csv','image')),
    import_batch_id     UUID REFERENCES import_batches(id),
    is_deleted          BOOLEAN NOT NULL DEFAULT false,
    is_flagged_unusual  BOOLEAN NOT NULL DEFAULT false,
    flag_reason         TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- business rule: every expense must have a category
    CONSTRAINT expense_requires_category
        CHECK (type <> 'expense' OR category_id IS NOT NULL)
);

CREATE INDEX idx_txn_user_date       ON transactions(user_id, txn_date) WHERE is_deleted = false;
CREATE INDEX idx_txn_category        ON transactions(category_id) WHERE is_deleted = false;
CREATE INDEX idx_txn_vendor          ON transactions(vendor_id) WHERE is_deleted = false;
CREATE INDEX idx_txn_flagged         ON transactions(user_id, is_flagged_unusual) WHERE is_deleted = false;

-- ------------------------------------------------------------
-- BUDGETS / LIMITS
-- ------------------------------------------------------------
CREATE TABLE budgets (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id     UUID REFERENCES categories(id),   -- NULL = overall monthly limit
    limit_amount    NUMERIC(14,2) NOT NULL CHECK (limit_amount > 0),
    period          VARCHAR(10) NOT NULL DEFAULT 'monthly' CHECK (period IN ('monthly','weekly','yearly')),
    start_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- SAVINGS GOALS
-- ------------------------------------------------------------
CREATE TABLE savings_goals (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_amount       NUMERIC(14,2) NOT NULL,
    monthly_save_amount NUMERIC(14,2) NOT NULL,
    target_date         DATE,
    status              VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','achieved','abandoned')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- USEFUL VIEWS / QUERIES
-- ============================================================

-- Active (non-deleted) transactions only — use this as your base for ALL reports
CREATE VIEW active_transactions AS
SELECT * FROM transactions WHERE is_deleted = false;

-- Monthly summary: income, expense, net
-- params: $1 = user_id, $2 = from_date, $3 = to_date
--
-- SELECT
--     date_trunc('month', txn_date) AS month,
--     SUM(amount) FILTER (WHERE type = 'income')  AS total_income,
--     SUM(amount) FILTER (WHERE type = 'expense') AS total_expense,
--     SUM(amount) FILTER (WHERE type = 'income') - SUM(amount) FILTER (WHERE type = 'expense') AS net
-- FROM active_transactions
-- WHERE user_id = $1 AND txn_date BETWEEN $2 AND $3
-- GROUP BY 1
-- ORDER BY 1;

-- Category-wise spend
-- SELECT c.name, SUM(t.amount) AS total, COUNT(*) AS txn_count
-- FROM active_transactions t
-- JOIN categories c ON c.id = t.category_id
-- WHERE t.user_id = $1 AND t.type = 'expense' AND t.txn_date BETWEEN $2 AND $3
-- GROUP BY c.name
-- ORDER BY total DESC;

-- Vendor-wise spend
-- SELECT v.name, SUM(t.amount) AS total, COUNT(*) AS txn_count
-- FROM active_transactions t
-- JOIN vendors v ON v.id = t.vendor_id
-- WHERE t.user_id = $1 AND t.type = 'expense' AND t.txn_date BETWEEN $2 AND $3
-- GROUP BY v.name
-- ORDER BY total DESC;

-- ============================================================
-- UNUSUAL EXPENSE DETECTION (category-level z-score style)
-- Flags a transaction if amount > mean + 2*stddev for that category,
-- computed over the trailing 6 months excluding the txn itself.
-- ============================================================

WITH category_stats AS (
    SELECT
        category_id,
        AVG(amount) AS avg_amount,
        STDDEV_POP(amount) AS stddev_amount,
        COUNT(*) AS sample_size
    FROM active_transactions
    WHERE user_id = $1
      AND type = 'expense'
      AND txn_date >= (CURRENT_DATE - INTERVAL '6 months')
    GROUP BY category_id
    HAVING COUNT(*) >= 4          -- need a minimum sample before flagging anything
)
SELECT
    t.id,
    t.amount,
    t.txn_date,
    c.name AS category_name,
    v.name AS vendor_name,
    cs.avg_amount,
    cs.stddev_amount,
    ROUND(((t.amount - cs.avg_amount) / NULLIF(cs.stddev_amount, 0))::numeric, 2) AS z_score,
    CONCAT(
        c.name, ' expense of ₹', t.amount,
        ' is significantly higher than the historical average of ₹',
        ROUND(cs.avg_amount::numeric, 2),
        ' (', cs.sample_size, ' past transactions)'
    ) AS flag_reason
FROM active_transactions t
JOIN category_stats cs ON cs.category_id = t.category_id
JOIN categories c ON c.id = t.category_id
LEFT JOIN vendors v ON v.id = t.vendor_id
WHERE t.user_id = $1
  AND t.type = 'expense'
  AND t.amount > (cs.avg_amount + 2 * cs.stddev_amount)
ORDER BY z_score DESC;
