-- GST & Tax Intelligence Engine Migration
-- Adds GST tracking columns to transactions and vendors tables

BEGIN;

-- 1. Update transactions table
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS is_gst_bill BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5,2) DEFAULT 0 CHECK (gst_rate IN (0, 5, 12, 18, 28)),
ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(14,2),
ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(14,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(14,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS igst_amount NUMERIC(14,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS vendor_gstin VARCHAR(15),
ADD COLUMN IF NOT EXISTS itc_eligible BOOLEAN NOT NULL DEFAULT true;

-- 2. Update vendors table
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS gstin VARCHAR(15);

-- 3. Indexing for performance on tax reports
CREATE INDEX IF NOT EXISTS idx_txn_gst ON transactions(user_id, is_gst_bill, txn_date) WHERE is_deleted = false;

COMMIT;
