-- ============================================================
-- FULL DATABASE SETUP & SEED DATA: Business Expense Analyzer
-- ============================================================
-- This file contains both the schema definition and seed data.
-- Target: PostgreSQL
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. EXTENSIONS
-- ------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- 2. TABLES DEFINITION
-- ------------------------------------------------------------

-- USERS
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

-- CATEGORIES
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

-- VENDORS / PAYEES
CREATE TABLE vendors (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name                VARCHAR(160) NOT NULL,
    normalized_name     VARCHAR(160) NOT NULL,
    default_category_id UUID REFERENCES categories(id),
    is_deleted          BOOLEAN NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, normalized_name)
);

-- IMPORT BATCHES
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

-- TRANSACTIONS
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
    CONSTRAINT expense_requires_category
        CHECK (type <> 'expense' OR category_id IS NOT NULL)
);

-- BUDGETS
CREATE TABLE budgets (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id     UUID REFERENCES categories(id),
    limit_amount    NUMERIC(14,2) NOT NULL CHECK (limit_amount > 0),
    period          VARCHAR(10) NOT NULL DEFAULT 'monthly' CHECK (period IN ('monthly','weekly','yearly')),
    start_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SAVINGS GOALS
CREATE TABLE savings_goals (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_amount       NUMERIC(14,2) NOT NULL,
    monthly_save_amount NUMERIC(14,2) NOT NULL,
    target_date         DATE,
    status              VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','achieved','abandoned')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 3. INDEXES & VIEWS
-- ------------------------------------------------------------
CREATE INDEX idx_txn_user_date       ON transactions(user_id, txn_date) WHERE is_deleted = false;
CREATE INDEX idx_txn_category        ON transactions(category_id) WHERE is_deleted = false;
CREATE INDEX idx_txn_vendor          ON transactions(vendor_id) WHERE is_deleted = false;
CREATE INDEX idx_txn_flagged         ON transactions(user_id, is_flagged_unusual) WHERE is_deleted = false;

CREATE VIEW active_transactions AS
SELECT * FROM transactions WHERE is_deleted = false;

-- ------------------------------------------------------------
-- 4. SEED DATA (Extracted from DummyDATA.md)
-- ------------------------------------------------------------

-- Global User Variable
-- User ID: d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d
INSERT INTO users (id, name, email, password_hash, business_name, currency, language_pref)
VALUES ('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Test User', 'test@example.com', 'hashed_password_123', 'Indore Electronics Hub', 'INR', 'en');

-- Categories
INSERT INTO categories (id, user_id, name, type, icon) VALUES
('a1111111-1111-1111-1111-111111111111', 'd1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Sales', 'income', 'shopping_cart'),
('a2222222-2222-2222-2222-222222222222', 'd1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Services', 'income', 'build'),
('a3333333-3333-3333-3333-333333333333', 'd1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Other Income', 'income', 'payments'),
('b1111111-1111-1111-1111-111111111111', 'd1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Rent', 'expense', 'home'),
('b2222222-2222-2222-2222-222222222222', 'd1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Utilities', 'expense', 'bolt'),
('b3333333-3333-3333-3333-333333333333', 'd1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Office Supplies', 'expense', 'description'),
('b4444444-4444-4444-4444-444444444444', 'd1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Inventory/Stock Purchase', 'expense', 'inventory'),
('b5555555-5555-5555-5555-555555555555', 'd1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Salaries', 'expense', 'people'),
('b6666666-6666-6666-6666-666666666666', 'd1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Marketing', 'expense', 'campaign'),
('b7777777-7777-7777-7777-777777777777', 'd1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Transport', 'expense', 'local_shipping'),
('b8888888-8888-8888-8888-888888888888', 'd1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Maintenance', 'expense', 'build'),
('b9999999-9999-9999-9999-999999999999', 'd1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Miscellaneous', 'expense', 'more_horiz');

-- Vendors
INSERT INTO vendors (id, user_id, name, normalized_name, default_category_id) VALUES
('e1111111-1111-1111-1111-111111111111', 'd1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Indore Electronics Wholesale Hub', 'indore electronics wholesale hub', 'b4444444-4444-4444-4444-444444444444'),
('e2222222-2222-2222-2222-222222222222', 'd1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Global Semi-Conductors Ltd', 'global semi-conductors ltd', 'b4444444-4444-4444-4444-444444444444'),
('e3333333-3333-3333-3333-333333333333', 'd1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Rajesh Electricals', 'rajesh electricals', 'b4444444-4444-4444-4444-444444444444'),
('e4444444-4444-4444-4444-444444444444', 'd1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Saraswati Components', 'saraswati components', 'b4444444-4444-4444-4444-444444444444'),
('e5555555-5555-5555-5555-555555555555', 'd1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'City Power Solutions', 'city power solutions', 'b4444444-4444-4444-4444-444444444444'),
('e6666666-6666-6666-6666-666666666666', 'd1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'MP State Electricity Board', 'mp state electricity board', 'b2222222-2222-2222-2222-222222222222'),
('e7777777-7777-7777-7777-777777777777', 'd1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Indore Municipal Corporation', 'indore municipal corporation', 'b2222222-2222-2222-2222-222222222222'),
('e8888888-8888-8888-8888-888888888888', 'd1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Airtel Business', 'airtel business', 'b2222222-2222-2222-2222-222222222222'),
('e9999999-9999-9999-9999-999999999999', 'd1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Reliance Jio Enterprise', 'reliance jio enterprise', 'b2222222-2222-2222-2222-222222222222'),
('f1111111-1111-1111-1111-111111111111', 'd1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Local Property Management Co', 'local property management co', 'b1111111-1111-1111-1111-111111111111'),
('f2222222-2222-2222-2222-222222222222', 'd1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'stationary Mart', 'stationary mart', 'b3333333-3333-3333-3333-333333333333'),
('f3333333-3333-3333-3333-333333333333', 'd1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Print & Copy Hub', 'print & copy hub', 'b3333333-3333-3333-3333-333333333333'),
('f4444444-4444-4444-4444-444444444444', 'd1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Local Flyer Press', 'local flyer press', 'b6666666-6666-6666-6666-666666666666'),
('f5555555-5555-5555-5555-555555555555', 'd1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Quick-Fix Repair Services', 'quick-fix repair services', 'b8888888-8888-8888-8888-888888888888'),
('f6666666-6666-6666-6666-666666666666', 'd1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Clean-Up Pros Indore', 'clean-up pros indore', 'b8888888-8888-8888-8888-888888888888'),
('f7777777-7777-7777-7777-777777777777', 'd1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Safe-Guard Security Systems', 'safe-guard security systems', 'b8888888-8888-8888-8888-888888888888'),
('f8888888-8888-8888-8888-888888888888', 'd1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Ola Corporate', 'ola corporate', 'b7777777-7777-7777-7777-777777777777'),
('f9999999-9999-9999-9999-999999999999', 'd1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Uber for Business', 'uber for business', 'b7777777-7777-7777-7777-777777777777'),
('0a111111-1111-1111-1111-111111111111', 'd1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Indore Logistics & Courier', 'indore logistics & courier', 'b7777777-7777-7777-7777-777777777777'),
('0b222222-2222-2222-2222-222222222222', 'd1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'City Bank India', 'city bank india', 'b9999999-9999-9999-9999-999999999999'),
('0c333333-3333-3333-3333-333333333333', 'd1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Legal Advisor Sharma', 'legal advisor sharma', 'b9999999-9999-9999-9999-999999999999'),
('0d444444-4444-4444-4444-444444444444', 'd1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Tax Consultant Gupta', 'tax consultant gupta', 'b9999999-9999-9999-9999-999999999999'),
('0e555555-5555-5555-5555-555555555555', 'd1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Amazon Business', 'amazon business', 'b3333333-3333-3333-3333-333333333333'),
('0f666666-6666-6666-6666-666666666666', 'd1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Facebook Ads', 'facebook ads', 'b6666666-6666-6666-6666-666666666666'),
('0a777777-7777-7777-7777-777777777777', 'd1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Google Ads', 'google ads', 'b6666666-6666-6666-6666-666666666666');

-- Transactions
INSERT INTO transactions (user_id, type, amount, currency, category_id, vendor_id, txn_date, notes, source) VALUES
-- Rent
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 25000, 'INR', 'b1111111-1111-1111-1111-111111111111', 'f1111111-1111-1111-1111-111111111111', '2026-04-01', 'Shop rent for April', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 25000, 'INR', 'b1111111-1111-1111-1111-111111111111', 'f1111111-1111-1111-1111-111111111111', '2026-05-01', 'Shop rent for May', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 25000, 'INR', 'b1111111-1111-1111-1111-111111111111', 'f1111111-1111-1111-1111-111111111111', '2026-06-01', 'Shop rent for June', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 25000, 'INR', 'b1111111-1111-1111-1111-111111111111', 'f1111111-1111-1111-1111-111111111111', '2026-07-01', 'Shop rent for July', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 25000, 'INR', 'b1111111-1111-1111-1111-111111111111', 'f1111111-1111-1111-1111-111111111111', '2026-08-01', 'Shop rent for August', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 25000, 'INR', 'b1111111-1111-1111-1111-111111111111', 'f1111111-1111-1111-1111-111111111111', '2026-09-01', 'Shop rent for September', 'manual'),
-- Salaries
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 12000, 'INR', 'b5555555-5555-5555-5555-555555555555', NULL, '2026-04-30', 'Store assistant salary', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 12000, 'INR', 'b5555555-5555-5555-5555-555555555555', NULL, '2026-05-30', 'Store assistant salary', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 12000, 'INR', 'b5555555-5555-5555-5555-555555555555', NULL, '2026-06-30', 'Store assistant salary', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 12000, 'INR', 'b5555555-5555-5555-5555-555555555555', NULL, '2026-07-30', 'Store assistant salary', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 12000, 'INR', 'b5555555-5555-5555-5555-555555555555', NULL, '2026-08-30', 'Store assistant salary', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 12000, 'INR', 'b5555555-5555-5555-5555-555555555555', NULL, '2026-09-20', 'Store assistant salary', 'manual'),
-- Utilities
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 4200, 'INR', 'b2222222-2222-2222-2222-222222222222', 'v6', '2026-04-10', 'Electricity bill', 'manual'),
('d1a2b3c4-e5f6-8c9d-0e1f2a3b4c5d', 'expense', 4500, 'INR', 'b2222222-2222-2222-2222-222222222222', 'v6', '2026-05-10', 'Electricity bill', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 4800, 'INR', 'b2222222-2222-2222-2222-222222222222', 'v6', '2026-06-10', 'Electricity bill', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 5100, 'INR', 'b2222222-2222-2222-2222-222222222222', 'v6', '2026-07-10', 'Electricity bill', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 5300, 'INR', 'b2222222-2222-2222-2222-222222222222', 'v6', '2026-08-10', 'Electricity bill', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 4900, 'INR', 'b2222222-2222-2222-2222-222222222222', 'v6', '2026-09-10', 'Electricity bill', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 1200, 'INR', 'b2222222-2222-2222-2222-222222222222', 'v8', '2026-04-15', 'Internet bill', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 1200, 'INR', 'b2222222-2222-2222-2222-222222222222', 'v8', '2026-05-15', 'Internet bill', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 1200, 'INR', 'b2222222-2222-2222-2222-222222222222', 'v8', '2026-06-15', 'Internet bill', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 1200, 'INR', 'b2222222-2222-2222-2222-222222222222', 'v8', '2026-07-15', 'Internet bill', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 1200, 'INR', 'b2222222-2222-2222-2222-222222222222', 'v8', '2026-08-15', 'Internet bill', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 1200, 'INR', 'b2222222-2222-2222-2222-222222222222', 'v8', '2026-09-15', 'Internet bill', 'manual'),
-- Inventory
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 45000, 'INR', 'b4444444-4444-4444-4444-444444444444', 'v1', '2026-04-05', 'Bulk inventory', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 32000, 'INR', 'b4444444-4444-4444-4444-444444444444', 'v2', '2026-04-12', 'Microcontrollers', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 15000, 'INR', 'b4444444-4444-4444-4444-444444444444', 'v3', '2026-04-20', 'Wiring supplies', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 50000, 'INR', 'b4444444-4444-4444-4444-444444444444', 'v4', '2026-05-05', 'Capacitors bulk', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 28000, 'INR', 'b4444444-4444-4444-4444-444444444444', 'v5', '2026-05-15', 'Power supplies', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 40000, 'INR', 'b4444444-4444-4444-4444-444444444444', 'v1', '2026-06-02', 'Electronic components', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 35000, 'INR', 'b4444444-4444-4444-4444-444444444444', 'v2', '2026-06-18', 'Sensors bulk', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 12000, 'INR', 'b4444444-4444-4444-4444-444444444444', 'v3', '2026-06-25', 'Connectors', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 55000, 'INR', 'b4444444-4444-4444-4444-444444444444', 'v4', '2026-07-05', 'High-end chips', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 30000, 'INR', 'b4444444-4444-4444-4444-444444444444', 'v5', '2026-07-20', 'Battery packs', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 42000, 'INR', 'b4444444-4444-4444-4444-444444444444', 'v1', '2026-08-05', 'Stock refill', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 38000, 'INR', 'b4444444-4444-4444-4444-444444444444', 'v2', '2026-08-15', 'Integrated circuits', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 18000, 'INR', 'b4444444-4444-4444-4444-444444444444', 'v3', '2026-08-28', 'Switchgear', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 60000, 'INR', 'b4444444-4444-4444-4444-444444444444', 'v4', '2026-09-05', 'Bulk refill', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 31000, 'INR', 'b4444444-4444-4444-4444-444444444444', 'v5', '2026-09-15', 'Transformers', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 220000, 'INR', 'b4444444-4444-4444-4444-444444444444', 'v1', '2026-07-12', 'Quarterly stock refill', 'manual'),
-- Maintenance
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 18000, 'INR', 'b8888888-8888-8888-8888-888888888888', 'v14', '2026-04-18', 'AC servicing', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 3000, 'INR', 'b8888888-8888-8888-8888-888888888888', 'v15', '2026-04-22', 'Deep cleaning', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 15000, 'INR', 'b8888888-8888-8888-8888-888888888888', 'v16', '2026-05-10', 'CCTV maintenance', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 18000, 'INR', 'b8888888-8888-8888-8888-888888888888', 'v14', '2026-06-18', 'Electrical panel repair', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 3000, 'INR', 'b8888888-8888-8888-8888-888888888888', 'v15', '2026-06-22', 'Monthly cleaning', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 15000, 'INR', 'b8888888-8888-8888-8888-888888888888', 'v16', '2026-07-10', 'Security system check', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 18000, 'INR', 'b8888888-8888-8888-8888-888888888888', 'v14', '2026-08-18', 'AC servicing', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 3000, 'INR', 'b8888888-8888-8888-8888-888888888888', 'v15', '2026-08-22', 'Monthly cleaning', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 15000, 'INR', 'b8888888-8888-8888-8888-888888888888', 'v16', '2026-09-10', 'CCTV update', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 85000, 'INR', 'b8888888-8888-8888-8888-888888888888', 'v14', '2026-08-25', 'Shop flooring upgrade', 'manual'),
-- Office Supplies
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 1500, 'INR', 'b3333333-3333-3333-3333-333333333333', 'v11', '2026-04-02', 'Printer paper and ink', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 800, 'INR', 'b3333333-3333-3333-3333-333333333333', 'v12', '2026-04-10', 'Business cards', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 2500, 'INR', 'b3333333-3333-3333-3333-333333333333', 'v23', '2026-05-05', 'Desk organizer', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 1500, 'INR', 'b3333333-3333-3333-3333-333333333333', 'v11', '2026-05-12', 'Ledgers and pens', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 1200, 'INR', 'b3333333-3333-3333-3333-333333333333', 'v12', '2026-06-10', 'Invoice books', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 2000, 'INR', 'b3333333-3333-3333-3333-333333333333', 'v23', '2026-06-20', 'Keyboard and mouse', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 1500, 'INR', 'b3333333-3333-3333-3333-333333333333', 'v11', '2026-07-02', 'Printer paper', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 800, 'INR', 'b3333333-3333-3333-3333-333333333333', 'v12', '2026-07-15', 'Marketing flyers', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 2200, 'INR', 'b3333333-3333-3333-3333-333333333333', 'v23', '2026-08-05', 'Office chair cushion', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 1500, 'INR', 'b3333333-3333-3333-3333-333333333333', 'v11', '2026-08-12', 'Stationery refill', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 1200, 'INR', 'b3333333-3333-3333-3333-333333333333', 'v12', '2026-09-10', 'Invoice books', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 2000, 'INR', 'b3333333-3333-3333-3333-333333333333', 'v23', '2026-09-20', 'External hard drive', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 12000, 'INR', 'b3333333-3333-3333-3333-333333333333', 'v23', '2026-06-10', 'High-end label printer', 'manual'),
-- Marketing
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 5000, 'INR', 'b6666666-6666-6666-6666-666666666666', 'v24', '2026-04-15', 'Local target ads', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 5000, 'INR', 'b6666666-6666-6666-6666-666666666666', 'v25', '2026-04-20', 'Search keywords', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 2000, 'INR', 'b6666666-6666-6666-6666-666666666666', 'v13', '2026-05-01', 'Pamphlet printing', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 5000, 'INR', 'b6666666-6666-6666-6666-666666666666', 'v24', '2026-05-15', 'Local target ads', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 5000, 'INR', 'b6666666-6666-6666-6666-666666666666', 'v25', '2026-05-20', 'Search keywords', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 2000, 'INR', 'b6666666-6666-6666-6666-666666666666', 'v13', '2026-06-01', 'Pamphlet printing', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 5000, 'INR', 'b6666666-6666-6666-6666-666666666666', 'v24', '2026-06-15', 'Local target ads', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 5000, 'INR', 'b6666666-6666-6666-6666-666666666666', 'v25', '2026-06-20', 'Search keywords', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 2000, 'INR', 'b6666666-6666-6666-6666-666666666666', 'v13', '2026-07-01', 'Pamphlet printing', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 5000, 'INR', 'b6666666-6666-6666-6666-666666666666', 'v24', '2026-07-15', 'Local target ads', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 5000, 'INR', 'b6666666-6666-6666-6666-666666666666', 'v25', '2026-07-20', 'Search keywords', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 2000, 'INR', 'b6666666-6666-6666-6666-666666666666', 'v13', '2026-08-01', 'Pamphlet printing', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 5000, 'INR', 'b6666666-6666-6666-6666-666666666666', 'v24', '2026-08-15', 'Local target ads', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 5000, 'INR', 'b6666666-6666-6666-6666-666666666666', 'v25', '2026-08-20', 'Search keywords', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 2000, 'INR', 'b6666666-6666-6666-6666-666666666666', 'v13', '2026-09-01', 'Pamphlet printing', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 5000, 'INR', 'b6666666-6666-6666-6666-666666666666', 'v24', '2026-09-15', 'Local target ads', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 5000, 'INR', 'b6666666-6666-6666-6666-666666666666', 'v25', '2026-09-20', 'Search keywords', 'manual'),
-- Transport
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 800, 'INR', 'b7777777-7777-7777-7777-777777777777', 'v17', '2026-04-05', 'Trip to warehouse', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 600, 'INR', 'b7777777-7777-7777-7777-777777777777', 'v18', '2026-04-15', 'Vendor meeting', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 1200, 'INR', 'b7777777-7777-7777-7777-777777777777', 'v19', '2026-04-25', 'Shipping', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 800, 'INR', 'b7777777-7777-7777-7777-777777777777', 'v17', '2026-05-05', 'Trip to warehouse', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 600, 'INR', 'b7777777-7777-7777-7777-777777777777', 'v18', '2026-05-15', 'Vendor meeting', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 1200, 'INR', 'b7777777-7777-7777-7777-777777777777', 'v19', '2026-05-25', 'Shipping', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 800, 'INR', 'b7777777-7777-7777-7777-777777777777', 'v17', '2026-06-05', 'Trip to warehouse', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 600, 'INR', 'b7777777-7777-7777-7777-777777777777', 'v18', '2026-06-15', 'Vendor meeting', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 1200, 'INR', 'b7777777-7777-7777-7777-777777777777', 'v19', '2026-06-25', 'Shipping', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 800, 'INR', 'b7777777-7777-7777-7777-777777777777', 'v17', '2026-07-05', 'Trip to warehouse', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 600, 'INR', 'b7777777-7777-7777-7777-777777777777', 'v18', '2026-07-15', 'Vendor meeting', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 1200, 'INR', 'b7777777-7777-7777-7777-777777777777', 'v19', '2026-07-25', 'Shipping', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 800, 'INR', 'b7777777-7777-7777-7777-777777777777', 'v17', '2026-08-05', 'Trip to warehouse', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 600, 'INR', 'b7777777-7777-7777-7777-777777777777', 'v18', '2026-08-15', 'Vendor meeting', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 1200, 'INR', 'b7777777-7777-7777-7777-777777777777', 'v19', '2026-08-25', 'Shipping', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 800, 'INR', 'b7777777-7777-7777-7777-777777777777', 'v17', '2026-09-05', 'Trip to warehouse', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 600, 'INR', 'b7777777-7777-7777-7777-777777777777', 'v18', '2026-09-15', 'Vendor meeting', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 1200, 'INR', 'b7777777-7777-7777-7777-777777777777', 'v19', '2026-09-25', 'Shipping', 'manual'),
-- Miscellaneous
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 2000, 'INR', 'b9999999-9999-9999-9999-999999999999', 'v20', '2026-04-01', 'Bank charges', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 5000, 'INR', 'b9999999-9999-9999-9999-999999999999', 'v21', '2026-04-15', 'Contract review', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 3000, 'INR', 'b9999999-9999-9999-9999-999999999999', 'v22', '2026-05-10', 'GST filing', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 2000, 'INR', 'b9999999-9999-9999-9999-999999999999', 'v20', '2026-05-01', 'Bank charges', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 5000, 'INR', 'b9999999-9999-9999-9999-999999999999', 'v21', '2026-05-15', 'Contract review', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 3000, 'INR', 'b9999999-9999-9999-9999-999999999999', 'v22', '2026-06-10', 'GST filing', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 2000, 'INR', 'b9999999-9999-9999-9999-999999999999', 'v20', '2026-06-01', 'Bank charges', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 5000, 'INR', 'b9999999-9999-9999-9999-999999999999', 'v21', '2026-06-15', 'Contract review', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 3000, 'INR', 'b9999999-9999-9999-9999-999999999999', 'v22', '2026-07-10', 'GST filing', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 2000, 'INR', 'b9999999-9999-9999-9999-999999999999', 'v20', '2026-07-01', 'Bank charges', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 5000, 'INR', 'b9999999-9999-9999-9999-999999999999', 'v21', '2026-07-15', 'Contract review', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 3000, 'INR', 'b9999999-9999-9999-9999-999999999999', 'v22', '2026-08-10', 'GST filing', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 2000, 'INR', 'b9999999-9999-9999-9999-999999999999', 'v20', '2026-08-01', 'Bank charges', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 5000, 'INR', 'b9999999-9999-9999-9999-999999999999', 'v21', '2026-08-15', 'Contract review', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 3000, 'INR', 'b9999999-9999-9999-9999-999999999999', 'v22', '2026-09-10', 'GST filing', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 2000, 'INR', 'b9999999-9999-9999-9999-999999999999', 'v20', '2026-09-01', 'Bank charges', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'expense', 5000, 'INR', 'b9999999-9999-9999-9999-999999999999', 'v21', '2026-09-15', 'Contract review', 'manual'),
-- Income - Sales
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'income', 120000, 'INR', 'a1111111-1111-1111-1111-111111111111', NULL, '2026-04-05', 'Daily sales week 1', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'income', 135000, 'INR', 'a1111111-1111-1111-1111-111111111111', NULL, '2026-04-12', 'Daily sales week 2', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'income', 110000, 'INR', 'a1111111-1111-1111-1111-111111111111', NULL, '2026-04-19', 'Daily sales week 3', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'income', 140000, 'INR', 'a1111111-1111-1111-1111-111111111111', NULL, '2026-04-26', 'Daily sales week 4', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'income', 125000, 'INR', 'a1111111-1111-1111-1111-111111111111', NULL, '2026-05-03', 'Daily sales week 1', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'income', 140000, 'INR', 'a1111111-1111-1111-1111-111111111111', NULL, '2026-05-10', 'Daily sales week 2', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'income', 115000, 'INR', 'a1111111-1111-1111-1111-111111111111', NULL, '2026-05-17', 'Daily sales week 3', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'income', 150000, 'INR', 'a1111111-1111-1111-1111-111111111111', NULL, '2026-05-24', 'Daily sales week 4', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'income', 130000, 'INR', 'a1111111-1111-1111-1111-111111111111', NULL, '2026-06-01', 'Daily sales week 1', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'income', 145000, 'INR', 'a1111111-1111-1111-1111-111111111111', NULL, '2026-06-08', 'Daily sales week 2', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'income', 120000, 'INR', 'a1111111-1111-1111-1111-111111111111', NULL, '2026-06-15', 'Daily sales week 3', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'income', 160000, 'INR', 'a1111111-1111-1111-1111-111111111111', NULL, '2026-06-22', 'Daily sales week 4', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'income', 135000, 'INR', 'a1111111-1111-1111-1111-111111111111', NULL, '2026-07-01', 'Daily sales week 1', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'income', 150000, 'INR', 'a1111111-1111-1111-1111-111111111111', NULL, '2026-07-08', 'Daily sales week 2', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'income', 125000, 'INR', 'a1111111-1111-1111-1111-111111111111', NULL, '2026-07-15', 'Daily sales week 3', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'income', 170000, 'INR', 'a1111111-1111-1111-1111-111111111111', NULL, '2026-07-22', 'Daily sales week 4', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'income', 140000, 'INR', 'a1111111-1111-1111-1111-111111111111', NULL, '2026-08-01', 'Daily sales week 1', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'income', 155000, 'INR', 'a1111111-1111-1111-1111-111111111111', NULL, '2026-08-08', 'Daily sales week 2', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'income', 130000, 'INR', 'a1111111-1111-1111-1111-111111111111', NULL, '2026-08-15', 'Daily sales week 3', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'income', 180000, 'INR', 'a1111111-1111-1111-1111-111111111111', NULL, '2026-08-22', 'Daily sales week 4', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'income', 145000, 'INR', 'a1111111-1111-1111-1111-111111111111', NULL, '2026-09-01', 'Daily sales week 1', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'income', 160000, 'INR', 'a1111111-1111-1111-1111-111111111111', NULL, '2026-09-08', 'Daily sales week 2', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'income', 135000, 'INR', 'a1111111-1111-1111-1111-111111111111', NULL, '2026-09-15', 'Daily sales week 3', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'income', 190000, 'INR', 'a1111111-1111-1111-1111-111111111111', NULL, '2026-09-22', 'Daily sales week 4', 'manual'),
-- Income - Services
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'income', 15000, 'INR', 'a2222222-2222-2222-2222-222222222222', NULL, '2026-04-10', 'Repair service fee', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'income', 12000, 'INR', 'a2222222-2222-2222-2222-222222222222', NULL, '2026-04-22', 'Custom circuit design', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'income', 15000, 'INR', 'a2222222-2222-2222-2222-222222222222', NULL, '2026-05-10', 'Repair service fee', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'income', 18000, 'INR', 'a2222222-2222-2222-2222-222222222222', NULL, '2026-05-22', 'Installation service', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'income', 15000, 'INR', 'a2222222-2222-2222-2222-222222222222', NULL, '2026-06-10', 'Repair service fee', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'income', 12000, 'INR', 'a2222222-2222-2222-2222-222222222222', NULL, '2026-06-22', 'Custom circuit design', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'income', 15000, 'INR', 'a2222222-2222-2222-2222-222222222222', NULL, '2026-07-10', 'Repair service fee', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'income', 18000, 'INR', 'a2222222-2222-2222-2222-222222222222', NULL, '2026-07-22', 'Installation service', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'income', 15000, 'INR', 'a2222222-2222-2222-2222-222222222222', NULL, '2026-08-10', 'Repair service fee', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'income', 12000, 'INR', 'a2222222-2222-2222-2222-222222222222', NULL, '2026-08-22', 'Custom circuit design', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'income', 15000, 'INR', 'a2222222-2222-2222-2222-222222222222', NULL, '2026-09-10', 'Repair service fee', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'income', 18000, 'INR', 'a2222222-2222-2222-2222-222222222222', NULL, '2026-09-22', 'Installation service', 'manual'),
-- Income - Other
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'income', 5000, 'INR', 'a3333333-3333-3333-3333-333333333333', NULL, '2026-05-15', 'Sale of old furniture', 'manual'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'income', 2000, 'INR', 'a3333333-3333-3333-3333-333333333333', NULL, '2026-08-10', 'Bank interest', 'manual');

-- ------------------------------------------------------------
-- 5. SYNTHETIC DATA (Not in DummyDATA.md)
-- ------------------------------------------------------------

-- Budgets (Reasonable monthly limits)
INSERT INTO budgets (user_id, category_id, limit_amount, period, start_date) VALUES
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'b4444444-4444-4444-4444-444444444444', 100000.00, 'monthly', '2026-01-01'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'b6666666-6666-6666-6666-666666666666', 20000.00, 'monthly', '2026-01-01'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', NULL, 200000.00, 'monthly', '2026-01-01'); -- Overall limit

-- Savings Goals
INSERT INTO savings_goals (user_id, target_amount, monthly_save_amount, target_date, status) VALUES
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 500000.00, 25000.00, '2027-01-01', 'active'),
('d1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 100000.00, 10000.00, '2026-12-31', 'active');

COMMIT;
