-- DRAFT ONLY. Run after 001-007. Read-only structural smoke test.
begin read only;
do $smoke$
declare v_missing text[]; v_public_execute text[];
begin
  select array_agg(x) into v_missing from unnest(array[
    'fish_source_records','fish_species','fish_species_sources','fish_species_slug_aliases','fish_aliases','fish_display_categories','fish_species_display_categories','fish_species_relations','fish_generated_contents','fish_change_logs',
    'fish_media','fish_observations','fish_observation_private_locations','fish_identification_attempts','fish_observation_verifications','fish_collections','fish_collection_regions','fish_observation_confirmations','fish_achievement_events',
    'regulation_source_records','regulation_source_versions','regulation_rules','regulation_rule_species','regulation_change_logs','fish_media_upload_sessions','fish_media_cleanup_jobs',
    'fish_role_assignments','fish_role_change_operations','fish_role_idempotency_records','fish_role_audit_logs','fish_role_operation_audit_logs','fish_role_session_revocation_jobs','fish_role_session_revocation_dead_letters','fish_role_approvals','fish_role_approval_audit_logs'
  ]) x where to_regclass('public.'||x) is null;
  if v_missing is not null then raise exception 'missing Fish relations: %',v_missing; end if;
  if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname like 'fish_%' and c.relkind='r' and not c.relrowsecurity) then
    raise exception 'one or more Fish tables do not have RLS enabled';
  end if;
  if not exists(select 1 from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace where n.nspname='public' and t.relname='fish_observations' and c.contype='f' and c.confrelid='auth.users'::regclass) then
    raise exception 'fish_observations auth.users FK missing';
  end if;
  select array_agg(p.proname) into v_public_execute
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in ('confirm_fish_observation','claim_fish_media_cleanup_jobs','claim_fish_role_session_revocation_jobs','claim_fish_role_change_operation','claim_fish_role_approval_reconciliation')
    and exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee=0 and a.privilege_type='EXECUTE');
  if v_public_execute is not null then raise exception 'PUBLIC can execute Fish mutation functions: %',v_public_execute; end if;
  if not exists(select 1 from pg_trigger where tgname='fish_observations_protected_fields' and not tgisinternal) then
    raise exception 'protected observation trigger missing';
  end if;
  if not exists(select 1 from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and p.polname='fish_species_public_read') then
    raise exception 'expected public species policy missing';
  end if;
end $smoke$;

select n.nspname,c.relname,c.relrowsecurity,c.relforcerowsecurity
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and (c.relname like 'fish_%' or c.relname like 'regulation_%') and c.relkind='r'
order by c.relname;
select n.nspname,p.proname,p.prosecdef,coalesce(array_to_string(p.proacl,','),'') acl
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and (p.proname like '%fish%' or p.proname='confirm_fish_observation') order by p.proname;
select p.polname,n.nspname,c.relname from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace
where p.polname like 'fish_%' order by n.nspname,c.relname,p.polname;
rollback;
