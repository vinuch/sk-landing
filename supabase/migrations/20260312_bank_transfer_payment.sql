-- Migration: Add bank transfer payment support
-- Created: 2026-03-12

-- Add new columns to Orders table for bank transfer tracking
ALTER TABLE "Orders" 
ADD COLUMN IF NOT EXISTS bank_receipt_url TEXT,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS confirmed_by TEXT;

-- Update payment_status to support more states
-- Note: payment_status is currently boolean, we'll keep it but add payment_method tracking
-- For bank transfers: payment_status = false until admin confirms

-- Create bank_accounts table
CREATE TABLE IF NOT EXISTS "bank_accounts" (
    id SERIAL PRIMARY KEY,
    account_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for active bank accounts
CREATE INDEX IF NOT EXISTS idx_bank_accounts_active ON "bank_accounts"(is_active);

-- Add indexes for order tracking
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON "Orders"(payment_method);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON "Orders"(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_confirmed_at ON "Orders"(confirmed_at);

-- Insert default bank account for Satellite Kitchen
INSERT INTO "bank_accounts" (account_name, account_number, bank_name, is_active)
VALUES ('Satellite Kitchen Ltd', '0123456789', 'Guaranty Trust Bank (GTB)', true)
ON CONFLICT DO NOTHING;

-- Create storage bucket for bank transfer receipts (manual step via Supabase dashboard or API)
-- Note: This requires Supabase Storage to be set up. Run this SQL in Supabase SQL editor:
-- Storage bucket 'bank-receipts' should be created with public read access

-- Add comment for documentation
COMMENT ON COLUMN "Orders".bank_receipt_url IS 'URL to uploaded bank transfer receipt image';
COMMENT ON COLUMN "Orders".paid_at IS 'When customer marked order as paid (submitted receipt)';
COMMENT ON COLUMN "Orders".confirmed_at IS 'When admin confirmed the bank transfer payment';
COMMENT ON COLUMN "Orders".confirmed_by IS 'Admin identifier who confirmed the payment';
