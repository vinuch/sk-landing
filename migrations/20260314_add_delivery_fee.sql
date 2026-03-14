-- Migration: Add delivery_fee column to Orders table
-- Created: 2026-03-14

-- Add delivery_fee column for storing Chowdeck delivery fee
ALTER TABLE "Orders" 
ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC;

-- Add comment to document the new field
COMMENT ON COLUMN "Orders".delivery_fee IS 'Delivery fee charged by Chowdeck for this order';
