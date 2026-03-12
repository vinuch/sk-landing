-- Checkout sessions used for server-authoritative pricing and payment verification.
create table if not exists public.checkout_sessions (
    id bigint generated always as identity primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    reference text not null unique,
    status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'expired')),
    amount_kobo integer not null check (amount_kobo > 0),
    currency text not null default 'NGN',
    payment_method text,
    delivery_address text,
    delivery_instructions text,
    vendor_instructions text,
    cart_snapshot jsonb not null,
    order_id bigint,
    paid_at timestamptz,
    expires_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_checkout_sessions_user_created_at
    on public.checkout_sessions (user_id, created_at desc);

create index if not exists idx_checkout_sessions_status_created_at
    on public.checkout_sessions (status, created_at desc);

-- Helps replay protection in verify endpoint.
create unique index if not exists idx_orders_payment_reference_unique
    on public."Orders" (payment_reference)
    where payment_reference is not null;

-- Optional trigger for updated_at.
create or replace function public.set_checkout_sessions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_checkout_sessions_updated_at on public.checkout_sessions;
create trigger trg_checkout_sessions_updated_at
before update on public.checkout_sessions
for each row execute function public.set_checkout_sessions_updated_at();
