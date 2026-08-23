-- DRAFT ONLY. Atomic service-role worker claims. Dependencies: 002-004.
begin;

alter table public.fish_role_approvals
  add column reconciliation_lease_token uuid,
  add column reconciliation_lease_expires_at timestamptz,
  add constraint fish_role_approvals_reconciliation_lease_pair_chk check (
    (reconciliation_lease_token is null and reconciliation_lease_expires_at is null)
    or (reconciliation_lease_token is not null and reconciliation_lease_expires_at is not null)
  );

create index fish_role_approvals_reconciliation_claim_idx
  on public.fish_role_approvals(status, approved_at, reconciliation_lease_expires_at)
  where status in ('consumption_pending', 'reconciliation_required');

create function public.claim_fish_media_cleanup_jobs(p_limit integer, p_lease_seconds integer)
returns setof public.fish_media_cleanup_jobs
language plpgsql
security definer
set search_path=pg_catalog,public,auth,extensions,pg_temp
as $$
begin
  if coalesce(auth.jwt()->>'role', '') <> 'service_role' then
    raise exception using errcode='42501', message='service_role_required';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception using errcode='22023', message='invalid_batch_limit';
  end if;
  if p_lease_seconds is null or p_lease_seconds < 10 or p_lease_seconds > 900 then
    raise exception using errcode='22023', message='invalid_lease_seconds';
  end if;

  return query
  with picked as (
    select id
    from public.fish_media_cleanup_jobs
    where (
      (status in ('pending', 'retry_scheduled') and next_attempt_at <= now())
      or (status = 'leased' and lease_expires_at < now())
    )
    order by next_attempt_at, id
    for update skip locked
    limit p_limit
  )
  update public.fish_media_cleanup_jobs j
  set status='leased',
      lease_token=gen_random_uuid(),
      lease_expires_at=now()+make_interval(secs=>p_lease_seconds),
      attempt_count=j.attempt_count+1,
      expected_version=j.expected_version+1
  from picked
  where j.id=picked.id
  returning j.*;
end
$$;

create function public.claim_fish_role_session_revocation_jobs(p_limit integer, p_lease_seconds integer)
returns setof public.fish_role_session_revocation_jobs
language plpgsql
security definer
set search_path=pg_catalog,public,auth,extensions,pg_temp
as $$
begin
  if coalesce(auth.jwt()->>'role', '') <> 'service_role' then
    raise exception using errcode='42501', message='service_role_required';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception using errcode='22023', message='invalid_batch_limit';
  end if;
  if p_lease_seconds is null or p_lease_seconds < 10 or p_lease_seconds > 900 then
    raise exception using errcode='22023', message='invalid_lease_seconds';
  end if;

  return query
  with ranked as materialized (
    select job_id,
           row_number() over (
             partition by target_user_id
             order by (priority='critical') desc, next_attempt_at, job_id
           ) as target_rank
    from public.fish_role_session_revocation_jobs candidate
    where (
      (status in ('queued', 'retry_wait') and next_attempt_at <= now())
      or (status = 'claimed' and lease_expires_at < now())
    )
      and not exists (
        select 1
        from public.fish_role_session_revocation_jobs active
        where active.target_user_id = candidate.target_user_id
          and active.job_id <> candidate.job_id
          and active.status = 'claimed'
          and active.lease_token is not null
          and active.lease_expires_at > now()
      )
  ), picked as (
    select j.job_id
    from public.fish_role_session_revocation_jobs j
    join ranked r on r.job_id=j.job_id and r.target_rank=1
    order by (j.priority='critical') desc, j.next_attempt_at, j.job_id
    for update of j skip locked
    limit p_limit
  )
  update public.fish_role_session_revocation_jobs j
  set status='claimed',
      lease_token=gen_random_uuid()::text,
      lease_expires_at=now()+make_interval(secs=>p_lease_seconds),
      attempt_count=j.attempt_count+1
  from picked
  where j.job_id=picked.job_id
  returning j.*;
end
$$;

create function public.claim_fish_role_change_operation(p_operation_id uuid, p_lease_seconds integer)
returns public.fish_role_change_operations
language plpgsql
security definer
set search_path=pg_catalog,public,auth,extensions,pg_temp
as $$
declare
  v public.fish_role_change_operations%rowtype;
begin
  if coalesce(auth.jwt()->>'role', '') <> 'service_role' then
    raise exception using errcode='42501', message='service_role_required';
  end if;
  if p_operation_id is null then
    raise exception using errcode='22023', message='operation_id_required';
  end if;
  if p_lease_seconds is null or p_lease_seconds < 10 or p_lease_seconds > 900 then
    raise exception using errcode='22023', message='invalid_lease_seconds';
  end if;

  update public.fish_role_change_operations
  set status='locked',
      lease_token=gen_random_uuid(),
      lease_expires_at=now()+make_interval(secs=>p_lease_seconds),
      updated_at=now()
  where operation_id=p_operation_id
    and (status='requested' or (status='locked' and lease_expires_at < now()))
  returning * into v;

  if not found then
    raise exception using errcode='55000', message='operation_not_claimable';
  end if;
  return v;
end
$$;

create function public.claim_fish_role_approval_reconciliation(
  p_before timestamptz,
  p_limit integer,
  p_lease_seconds integer default 300
)
returns setof public.fish_role_approvals
language plpgsql
security definer
set search_path=pg_catalog,public,auth,extensions,pg_temp
as $$
begin
  if coalesce(auth.jwt()->>'role', '') <> 'service_role' then
    raise exception using errcode='42501', message='service_role_required';
  end if;
  if p_before is null or p_before > now() then
    raise exception using errcode='22023', message='invalid_reconciliation_cutoff';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception using errcode='22023', message='invalid_batch_limit';
  end if;
  if p_lease_seconds is null or p_lease_seconds < 10 or p_lease_seconds > 900 then
    raise exception using errcode='22023', message='invalid_lease_seconds';
  end if;

  return query
  with picked as (
    select approval_id
    from public.fish_role_approvals
    where status in ('consumption_pending', 'reconciliation_required')
      and approved_at < p_before
      and (
        reconciliation_lease_expires_at is null
        or reconciliation_lease_expires_at < now()
      )
    order by approved_at, approval_id
    for update skip locked
    limit p_limit
  )
  update public.fish_role_approvals a
  set reconciliation_lease_token=gen_random_uuid(),
      reconciliation_lease_expires_at=now()+make_interval(secs=>p_lease_seconds),
      version=a.version+1
  from picked
  where a.approval_id=picked.approval_id
  returning a.*;
end
$$;

revoke all on function public.claim_fish_media_cleanup_jobs(integer,integer) from public,anon,authenticated;
revoke all on function public.claim_fish_role_session_revocation_jobs(integer,integer) from public,anon,authenticated;
revoke all on function public.claim_fish_role_change_operation(uuid,integer) from public,anon,authenticated;
revoke all on function public.claim_fish_role_approval_reconciliation(timestamptz,integer,integer) from public,anon,authenticated;

grant execute on function public.claim_fish_media_cleanup_jobs(integer,integer) to service_role;
grant execute on function public.claim_fish_role_session_revocation_jobs(integer,integer) to service_role;
grant execute on function public.claim_fish_role_change_operation(uuid,integer) to service_role;
grant execute on function public.claim_fish_role_approval_reconciliation(timestamptz,integer,integer) to service_role;

commit;
