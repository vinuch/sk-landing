-- Migration: Add items_subtotal column for price breakdown
-- Date: 2026-03-14

ALTER TABLE "Orders" ADD COLUMN IF NOT EXISTS items_subtotal NUMERIC;

-- Update existing orders to set items_subtotal = total_amount - delivery_fee
-- This is a best-effort calculation for existing data
UPDATE "Orders" 
SET items_subtotal = CASE 
    WHEN delivery_fee IS NOT NULL AND delivery_fee > 0 THEN total_amount - delivery_fee
    ELSE total_amount
END
WHERE items_subtotal IS NULL;