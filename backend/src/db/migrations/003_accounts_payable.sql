-- Migration 003: Accounts Payable & Credit Term Tracker ("Udhaari" / Due Dates)

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'paid' CHECK (payment_status IN ('paid', 'pending', 'partially_paid')),
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS credit_terms_days INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(12, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS payment_date DATE;

-- For existing transactions, set amount_paid = amount and payment_status = 'paid'
UPDATE transactions
SET amount_paid = amount,
    payment_status = 'paid'
WHERE amount_paid IS NULL OR amount_paid = 0;

-- Partial index for active payables (pending or partially paid)
CREATE INDEX IF NOT EXISTS idx_txn_payables
  ON transactions (user_id, due_date, payment_status)
  WHERE is_deleted = false AND payment_status IN ('pending', 'partially_paid');
