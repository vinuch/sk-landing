-- Stores contact/inquiry submissions from homepage form.
create table if not exists public."ContactInquiries" (
    id bigint generated always as identity primary key,
    name text not null,
    phone text not null,
    message text not null,
    inquiry_type text not null,
    inquiry_other text,
    created_at timestamptz not null default now()
);

create index if not exists idx_contact_inquiries_created_at
    on public."ContactInquiries" (created_at desc);
