alter table if exists public.checkout_sessions
    add column if not exists items_subtotal numeric,
    add column if not exists delivery_fee numeric;
