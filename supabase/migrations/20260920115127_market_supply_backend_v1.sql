-- Market Supply Backend V1. Artifact only; remote apply is outside this work.
create table public.market_listings (
  id uuid primary key default gen_random_uuid(), seller_id uuid not null references auth.users(id) on delete restrict,
  title text not null check (char_length(title) between 4 and 80), description text not null check (char_length(description) between 20 and 3000),
  category text not null check (category in ('FISHING_ROD','REEL','LINE_TERMINAL','LURE_BAIT','TACKLE_ACCESSORY','BOAT_EQUIPMENT','MARINE_ELECTRONICS','SAFETY_GEAR','CLOTHING','COOLER_STORAGE','ENGINE_PARTS','OTHER')),
  subcategory text, price_amount bigint, price_type text not null check (price_type in ('FIXED','NEGOTIABLE','FREE','INQUIRY')),
  condition text not null check (condition in ('NEW_UNUSED','LIKE_NEW','GOOD','USED','HEAVILY_USED','FOR_PARTS')),
  region jsonb not null, transaction_methods text[] not null,
  status text not null check (status in ('DRAFT','SUBMITTED','ACTIVE','RESERVED','SOLD','HIDDEN','REJECTED')),
  moderation_status text not null check (moderation_status in ('REVIEW_REQUIRED','APPROVED','REJECTED','CHANGES_REQUESTED','HIDDEN')),
  idempotency_key text not null, content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  raw_payload jsonb not null, normalized_payload jsonb not null, validation_result jsonb not null,
  submitted_at timestamptz not null default now(), activated_at timestamptz, reserved_at timestamptz, sold_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (seller_id, idempotency_key), unique (seller_id, content_hash),
  check ((price_type = 'FIXED' and price_amount > 0) or (price_type = 'NEGOTIABLE' and (price_amount is null or price_amount >= 0)) or (price_type = 'FREE' and price_amount = 0) or (price_type = 'INQUIRY' and price_amount is null)),
  check (transaction_methods <@ array['DIRECT','DELIVERY','PARCEL','OTHER']::text[] and cardinality(transaction_methods) > 0)
);
create index market_listings_public_idx on public.market_listings (status, created_at desc);
create index market_listings_seller_idx on public.market_listings (seller_id, updated_at desc);

create table public.market_listing_images (
  id uuid primary key default gen_random_uuid(), listing_id uuid not null references public.market_listings(id) on delete restrict,
  seller_id uuid not null references auth.users(id) on delete restrict, object_path text not null unique,
  original_filename text not null, mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp')),
  byte_size bigint not null check (byte_size between 1 and 8388608), width integer, height integer,
  order_index integer not null check (order_index between 0 and 7), exposure_status text not null default 'STAGING' check (exposure_status in ('STAGING','APPROVED','HIDDEN')),
  created_at timestamptz not null default now(), unique (listing_id, order_index)
);
create index market_listing_images_listing_idx on public.market_listing_images (listing_id, order_index);

create table public.market_listing_contacts (
  listing_id uuid primary key references public.market_listings(id) on delete restrict, seller_id uuid not null references auth.users(id) on delete restrict,
  contact_type text not null check (contact_type in ('PHONE','EMAIL','EXTERNAL_LINK','INQUIRY_PREPARED')),
  destination text, public_opt_in boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.market_listing_reviews (
  id uuid primary key default gen_random_uuid(), listing_id uuid not null references public.market_listings(id) on delete restrict,
  reviewer_id uuid not null references auth.users(id) on delete restrict, action text not null check (action in ('APPROVE','REJECT','REQUEST_CHANGES','HIDE')),
  reason text not null check (char_length(btrim(reason)) between 3 and 2000), review_snapshot jsonb not null, created_at timestamptz not null default now()
);
create index market_listing_reviews_listing_idx on public.market_listing_reviews (listing_id, created_at desc);

create table public.market_listing_audit_logs (
  id bigint generated always as identity primary key, listing_id uuid not null references public.market_listings(id) on delete restrict,
  actor_id uuid references auth.users(id) on delete restrict,
  event_type text not null check (event_type in ('DRAFT_CREATED','LISTING_SUBMITTED','LISTING_VALIDATED','REVIEW_RECORDED','LISTING_APPROVED','LISTING_REJECTED','CHANGES_REQUESTED','LISTING_ACTIVATED','LISTING_RESERVED','LISTING_SOLD','LISTING_HIDDEN','IMAGE_UPLOAD_INTENT_CREATED')),
  from_status text, to_status text, details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index market_listing_audit_listing_idx on public.market_listing_audit_logs (listing_id, created_at, id);

create function public.market_listing_guard_source() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.raw_payload is distinct from old.raw_payload or new.seller_id is distinct from old.seller_id or new.idempotency_key is distinct from old.idempotency_key or new.content_hash is distinct from old.content_hash then
    raise exception using errcode = '22023', message = 'immutable_market_listing_source';
  end if;
  new.updated_at = now(); return new;
end; $$;
create trigger market_listing_guard_source_before_update before update on public.market_listings for each row execute function public.market_listing_guard_source();

alter table public.market_listings enable row level security;
alter table public.market_listing_images enable row level security;
alter table public.market_listing_contacts enable row level security;
alter table public.market_listing_reviews enable row level security;
alter table public.market_listing_audit_logs enable row level security;
revoke all on table public.market_listings, public.market_listing_images, public.market_listing_contacts, public.market_listing_reviews, public.market_listing_audit_logs from public, anon, authenticated;
revoke all on sequence public.market_listing_audit_logs_id_seq from public, anon, authenticated;
revoke execute on function public.market_listing_guard_source() from public, anon, authenticated;
grant select, insert, update on table public.market_listings, public.market_listing_images, public.market_listing_contacts to service_role;
grant select, insert on table public.market_listing_reviews, public.market_listing_audit_logs to service_role;
grant usage, select on sequence public.market_listing_audit_logs_id_seq to service_role;
