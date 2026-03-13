-- Migration: Add Chowdeck delivery fields to Orders table
-- Created: 2026-03-13

-- Add delivery_id column for Chowdeck delivery tracking
ALTER TABLE "Orders" 
ADD COLUMN IF NOT EXISTS delivery_id TEXT;

-- Add rider_name column
ALTER TABLE "Orders" 
ADD COLUMN IF NOT EXISTS rider_name TEXT;

-- Add rider_phone column
ALTER TABLE "Orders" 
ADD COLUMN IF NOT EXISTS rider_phone TEXT;

-- Add tracking_url column
ALTER TABLE "Orders" 
ADD COLUMN IF NOT EXISTS tracking_url TEXT;

-- Add comment to document the new fields
COMMENT ON COLUMN "Orders".delivery_id IS 'Chowdeck delivery ID for tracking';
COMMENT ON COLUMN "Orders".rider_name IS 'Name of the assigned Chowdeck rider';
COMMENT ON COLUMN "Orders".rider_phone IS 'Phone number of the assigned Chowdeck rider';
COMMENT ON COLUMN "Orders".tracking_url IS 'Chowdeck tracking URL for customer';
