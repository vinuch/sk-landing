# Bank Transfer Payment Setup

## Database Migration

Run the SQL migration in Supabase SQL Editor:

```sql
-- File: supabase/migrations/20260312_bank_transfer_payment.sql
```

## Supabase Storage Setup

1. Go to Supabase Dashboard → Storage
2. Create a new bucket called `bank-receipts`
3. Set the bucket to **Public** (so receipt images can be viewed by admin)
4. Add the following RLS policies:

### Upload Policy (Authenticated users)
```sql
CREATE POLICY "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'bank-receipts' AND
  (storage.foldername(name))[1] = 'bank-receipts'
);
```

### Select Policy (Public read)
```sql
CREATE POLICY "Allow public read"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'bank-receipts');
```

## Environment Variables

Add to your `.env.local`:

```
# Existing variables
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ORDER_ADMIN_KEY=

# Paystack (existing)
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=
PAYSTACK_SECRET_KEY=
```

## Admin Access

The admin verification page is at `/admin/verify-orders`

Use the same `ORDER_ADMIN_KEY` as the regular orders admin page.

## Cron Job for Auto-Cancel

To auto-cancel orders pending for more than 2 hours, set up a cron job:

### Option 1: Vercel Cron (if deployed on Vercel)
Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/cancel-pending-orders",
      "schedule": "0 */2 * * *"
    }
  ]
}
```

### Option 2: External Cron Service
Use a service like cron-job.org to hit:
```
POST https://your-domain.com/api/cron/cancel-pending-orders
Headers: { "Authorization": "Bearer YOUR_CRON_SECRET" }
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/bank-accounts` | GET | Get active bank account details |
| `/api/bank-transfer/create-order` | POST | Create order for bank transfer |
| `/api/orders/confirm-transfer` | POST | Submit payment receipt |
| `/api/admin/pending-orders` | GET | List orders awaiting verification |
| `/api/admin/verify-transfer` | POST | Confirm/reject bank transfer |
| `/api/cron/cancel-pending-orders` | POST | Auto-cancel old pending orders |

## Flow

1. Customer selects "Bank Transfer" at checkout
2. Order is created with `payment_status = false`
3. Customer sees bank account details
4. Customer uploads receipt and clicks "I Have Made Payment"
5. Order shows `bank_receipt_url` and `paid_at` timestamp
6. Admin reviews at `/admin/verify-orders`
7. Admin confirms → `payment_status = true`, `confirmed_at` set
8. Admin rejects → `bank_receipt_url` and `paid_at` cleared, customer can retry
