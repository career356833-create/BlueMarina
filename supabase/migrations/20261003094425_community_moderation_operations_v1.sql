-- Only the server service role can invoke moderation. Each transition is atomic
-- with its audit event and checks the actor's server-managed Auth metadata.
create table public.community_moderation_events (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('POST', 'REPORT')),
  target_id uuid not null,
  actor_id uuid not null references auth.users(id),
  action text not null check (action in ('APPROVE', 'REJECT', 'HIDE', 'RESOLVE', 'DISMISS')),
  previous_status text not null,
  next_status text not null,
  created_at timestamptz not null default now()
);
create index community_moderation_events_target_idx on public.community_moderation_events (target_type, target_id, created_at desc);
alter table public.community_moderation_events enable row level security;
revoke all on public.community_moderation_events from public, anon, authenticated, service_role;
grant select, insert on public.community_moderation_events to service_role;
grant update on public.community_reports to service_role;

create function public.community_review_post(p_id uuid, p_actor uuid, p_action text)
returns public.community_posts
language plpgsql security definer set search_path = ''
as $$
declare previous_row public.community_posts;
declare next_row public.community_posts;
declare next_status text;
declare next_moderation text;
begin
  if not exists (
    select 1 from auth.users where id = p_actor and raw_app_meta_data ->> 'community_role' = 'community_admin'
  ) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if p_action not in ('APPROVE', 'REJECT', 'HIDE') then
    raise exception 'INVALID_ACTION' using errcode = '22023';
  end if;
  select * into previous_row from public.community_posts where id = p_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if p_action in ('APPROVE', 'REJECT') and
     (previous_row.status <> 'SUBMITTED' or previous_row.moderation_status <> 'REVIEW_REQUIRED') then
    raise exception 'INVALID_STATE' using errcode = '22023';
  end if;
  if p_action = 'HIDE' and
     (previous_row.status <> 'ACTIVE' or previous_row.moderation_status <> 'APPROVED') then
    raise exception 'INVALID_STATE' using errcode = '22023';
  end if;
  next_status := case p_action when 'APPROVE' then 'ACTIVE' when 'REJECT' then 'REJECTED' else 'HIDDEN' end;
  next_moderation := case p_action when 'APPROVE' then 'APPROVED' when 'REJECT' then 'REJECTED' else 'APPROVED' end;
  update public.community_posts set status = next_status, moderation_status = next_moderation,
    updated_at = now() where id = p_id returning * into next_row;
  insert into public.community_moderation_events(target_type,target_id,actor_id,action,previous_status,next_status)
    values ('POST',p_id,p_actor,p_action,previous_row.status || '/' || previous_row.moderation_status,
      next_row.status || '/' || next_row.moderation_status);
  return next_row;
end;
$$;
revoke all on function public.community_review_post(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.community_review_post(uuid,uuid,text) to service_role;

create function public.community_review_report(p_id uuid, p_actor uuid, p_action text)
returns public.community_reports
language plpgsql security definer set search_path = ''
as $$
declare previous_row public.community_reports;
declare next_row public.community_reports;
begin
  if not exists (
    select 1 from auth.users where id = p_actor and raw_app_meta_data ->> 'community_role' = 'community_admin'
  ) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  if p_action not in ('RESOLVE', 'DISMISS') then raise exception 'INVALID_ACTION' using errcode = '22023'; end if;
  select * into previous_row from public.community_reports where id = p_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if previous_row.status <> 'SUBMITTED' then raise exception 'INVALID_STATE' using errcode = '22023'; end if;
  update public.community_reports set status = 'REVIEWED' where id = p_id returning * into next_row;
  insert into public.community_moderation_events(target_type,target_id,actor_id,action,previous_status,next_status)
    values ('REPORT',p_id,p_actor,p_action,previous_row.status,next_row.status);
  return next_row;
end;
$$;
revoke all on function public.community_review_report(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.community_review_report(uuid,uuid,text) to service_role;
