-- DRAFT ONLY. Do not apply automatically.
begin;

alter table public.fish_media_upload_sessions
  add column gateway_expires_at timestamptz,
  add column provider_expires_at timestamptz;

update public.fish_media_upload_sessions
set gateway_expires_at = expires_at,
    provider_expires_at = greatest(expires_at, created_at + interval '2 hours')
where gateway_expires_at is null
   or provider_expires_at is null;

alter table public.fish_media_upload_sessions
  alter column gateway_expires_at set not null,
  alter column provider_expires_at set not null,
  drop constraint if exists fish_media_upload_sessions_state_check,
  add constraint fish_media_upload_sessions_state_check check (
    state in (
      'requested','upload_url_issued','uploaded_unverified','verified','processing',
      'ready_private','ready_for_ai','public_review_pending','published','quarantined',
      'expired','delete_pending','deleted','failed'
    )
  ),
  add constraint fish_media_upload_sessions_expiry_order_chk check (
    gateway_expires_at <= provider_expires_at
  );

create index fish_media_upload_sessions_gateway_expiry_idx
  on public.fish_media_upload_sessions(state, gateway_expires_at)
  where state in ('requested','upload_url_issued','uploaded_unverified');

commit;
