-- DRAFT ONLY. DO NOT APPLY.
-- This draft establishes JWT claim helpers and an append-only audit table.
-- Role issuance/revocation remains a server-side Auth Admin API workflow; no
-- browser, normal user, or SQL client is granted permission to edit auth.users.

create or replace function public.current_fish_role()
returns text
language sql
stable
security invoker
set search_path = public, auth, pg_temp
as $$
  select case coalesce(auth.jwt() -> 'app_metadata' ->> 'fish_role', '')
    when 'fish_admin' then 'fish_admin'
    when 'fish_reviewer' then 'fish_reviewer'
    when 'fish_crawler' then 'fish_crawler'
    else null
  end;
$$;

create or replace function public.has_fish_role(p_required_role text)
returns boolean
language sql
stable
security invoker
set search_path = public, auth, pg_temp
as $$
  select case p_required_role
    when 'fish_admin' then public.current_fish_role() = 'fish_admin'
    when 'fish_reviewer' then public.current_fish_role() in ('fish_admin', 'fish_reviewer')
    when 'fish_crawler' then public.current_fish_role() = 'fish_crawler'
    else false
  end;
$$;

create or replace function public.is_fish_admin()
returns boolean language sql stable security invoker set search_path = public, auth, pg_temp
as $$ select public.has_fish_role('fish_admin'); $$;

create or replace function public.is_fish_reviewer()
returns boolean language sql stable security invoker set search_path = public, auth, pg_temp
as $$ select public.has_fish_role('fish_reviewer'); $$;

create or replace function public.is_fish_crawler()
returns boolean language sql stable security invoker set search_path = public, auth, pg_temp
as $$ select public.has_fish_role('fish_crawler'); $$;

create table public.fish_role_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  target_user_id uuid not null references auth.users(id) on delete restrict,
  previous_role text check (previous_role in ('fish_reviewer', 'fish_admin', 'fish_crawler')),
  new_role text check (new_role in ('fish_reviewer', 'fish_admin', 'fish_crawler')),
  action text not null check (action in ('grant', 'revoke')),
  reason text not null check (length(trim(reason)) > 0),
  approval_reference text not null check (length(trim(approval_reference)) > 0),
  idempotency_key text not null,
  request_context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (actor_user_id, idempotency_key)
);

alter table public.fish_role_audit_logs enable row level security;
create policy "fish_role_audit_admin_select" on public.fish_role_audit_logs
  for select using (public.is_fish_admin());
-- No INSERT/UPDATE/DELETE policy: only a future SECURITY DEFINER role issuer
-- owned by the deployment role may append audit records.

revoke all on function public.current_fish_role() from public;
revoke all on function public.has_fish_role(text) from public;
revoke all on function public.is_fish_admin() from public;
revoke all on function public.is_fish_reviewer() from public;
revoke all on function public.is_fish_crawler() from public;
grant execute on function public.current_fish_role() to authenticated;
grant execute on function public.has_fish_role(text) to authenticated;
grant execute on function public.is_fish_admin() to authenticated;
grant execute on function public.is_fish_reviewer() to authenticated;
grant execute on function public.is_fish_crawler() to authenticated;
