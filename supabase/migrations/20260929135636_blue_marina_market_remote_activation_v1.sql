-- Private Market rehearsal uploads. Browser access is granted only through a
-- path-specific signed upload URL issued after server-side seller ownership checks.
-- No direct anon/authenticated storage.objects policy is added.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'market-listing-staging',
  'market-listing-staging',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
);

alter table public.market_listing_audit_logs
  drop constraint market_listing_audit_logs_event_type_check;
alter table public.market_listing_audit_logs
  add constraint market_listing_audit_logs_event_type_check check (event_type in (
    'DRAFT_CREATED', 'LISTING_SUBMITTED', 'LISTING_VALIDATED',
    'LISTING_UPDATED', 'REVIEW_RECORDED', 'LISTING_APPROVED',
    'LISTING_REJECTED', 'CHANGES_REQUESTED', 'LISTING_ACTIVATED',
    'LISTING_RESERVED', 'LISTING_SOLD', 'LISTING_HIDDEN',
    'IMAGE_UPLOAD_INTENT_CREATED'
  ));
