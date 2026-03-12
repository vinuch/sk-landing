-- Migration: Update delivery_status enum with full order flow
-- Created: 2026-03-12

-- Since we can't easily modify an existing enum, we'll add a new delivery_tracking column
-- that stores the full order status flow as text

-- Add delivery_tracking column for the full order status flow
ALTER TABLE "Orders" 
ADD COLUMN IF NOT EXISTS delivery_tracking TEXT DEFAULT 'pending';

-- Migrate existing data:
-- - If payment_status is null/false and no bank_receipt: pending
-- - If bank_receipt exists but not confirmed: awaiting_confirmation  
-- - If payment_status is true: confirmed
-- - Map old delivery_status values to new flow
UPDATE "Orders" 
SET delivery_tracking = CASE 
    -- Bank transfer pending verification
    WHEN bank_receipt_url IS NOT NULL AND (payment_status = false OR payment_status IS NULL) 
        THEN 'awaiting_confirmation'
    -- Paid but no delivery status yet
    WHEN payment_status = true AND delivery_status IS NULL 
        THEN 'confirmed'
    -- Map old enum values
    WHEN delivery_status = 'preparing' THEN 'preparing'
    WHEN delivery_status = 'packaging' THEN 'ready'
    WHEN delivery_status = 'with_rider' THEN 'rider_arrived'
    WHEN delivery_status = 'delivered' THEN 'delivered'
    -- Default
    ELSE 'pending'
END
WHERE delivery_tracking IS NULL OR delivery_tracking = 'pending';

-- Add check constraint for valid status values
ALTER TABLE "Orders" DROP CONSTRAINT IF EXISTS valid_delivery_tracking;
ALTER TABLE "Orders" ADD CONSTRAINT valid_delivery_tracking 
    CHECK (delivery_tracking IN (
        'pending',
        'awaiting_confirmation',
        'confirmed',
        'preparing',
        'ready',
        'rider_arrived',
        'rider_left',
        'delivered'
    ));

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_orders_delivery_tracking ON "Orders"(delivery_tracking);

-- Add comment
COMMENT ON COLUMN "Orders".delivery_tracking IS 'Full order status flow: pending -> awaiting_confirmation -> confirmed -> preparing -> ready -> rider_arrived -> rider_left -> delivered';
