-- DRAFT ONLY. RLS and low-risk JWT role helpers.
-- Transaction: yes. Dependencies: 001-003.
begin;
create function public.current_fish_role() returns text language sql stable security definer
set search_path=pg_catalog,public,auth,pg_temp as $$
  select a.fish_role
  from public.fish_role_assignments a
  where a.user_id=auth.uid()
    and a.status='active'
    and a.fish_role=case coalesce(auth.jwt()->'app_metadata'->>'fish_role','')
      when 'fish_admin' then 'fish_admin'
      when 'fish_reviewer' then 'fish_reviewer'
      when 'fish_crawler' then 'fish_crawler'
      else null
    end
    and ((a.fish_role='fish_crawler' and a.identity_type='service_identity')
      or (a.fish_role in ('fish_admin','fish_reviewer') and a.identity_type='human_user'))
$$;
create function public.has_fish_role(p_required_role text) returns boolean language sql stable security invoker
set search_path=pg_catalog,public,auth,pg_temp as $$
  select case p_required_role when 'fish_admin' then public.current_fish_role()='fish_admin' when 'fish_reviewer' then public.current_fish_role() in ('fish_admin','fish_reviewer') when 'fish_crawler' then public.current_fish_role()='fish_crawler' else false end
$$;
create function public.is_fish_admin() returns boolean language sql stable security invoker set search_path=pg_catalog,public,auth,pg_temp as $$select public.has_fish_role('fish_admin')$$;
create function public.is_fish_reviewer() returns boolean language sql stable security invoker set search_path=pg_catalog,public,auth,pg_temp as $$select public.has_fish_role('fish_reviewer')$$;
create function public.is_fish_crawler() returns boolean language sql stable security invoker set search_path=pg_catalog,public,auth,pg_temp as $$select public.has_fish_role('fish_crawler')$$;
revoke all on function public.current_fish_role() from public,anon,authenticated;
revoke all on function public.has_fish_role(text) from public,anon,authenticated;
revoke all on function public.is_fish_admin() from public,anon,authenticated;
revoke all on function public.is_fish_reviewer() from public,anon,authenticated;
revoke all on function public.is_fish_crawler() from public,anon,authenticated;
grant execute on function public.current_fish_role() to authenticated;
grant execute on function public.has_fish_role(text) to authenticated;
grant execute on function public.is_fish_admin() to authenticated;
grant execute on function public.is_fish_reviewer() to authenticated;
grant execute on function public.is_fish_crawler() to authenticated;

do $rls$ declare r record; begin
  for r in select unnest(array[
    'fish_source_records','fish_species','fish_species_sources','fish_species_slug_aliases','fish_aliases','fish_display_categories','fish_species_display_categories','fish_species_relations','fish_generated_contents','fish_change_logs',
    'fish_media','fish_observations','fish_observation_private_locations','fish_identification_attempts','fish_observation_verifications','fish_collections','fish_collection_regions','fish_observation_confirmations','fish_achievement_events',
    'regulation_source_records','regulation_source_versions','regulation_rules','regulation_rule_species','regulation_change_logs','fish_media_upload_sessions','fish_media_cleanup_jobs',
    'fish_role_assignments','fish_role_change_operations','fish_role_idempotency_records','fish_role_audit_logs','fish_role_operation_audit_logs','fish_role_session_revocation_jobs','fish_role_session_revocation_dead_letters','fish_role_approvals','fish_role_approval_audit_logs'
  ]) as name loop execute format('alter table public.%I enable row level security',r.name); end loop;
end $rls$;

-- Supabase may grant browser roles broad default privileges on newly-created
-- public tables. Reset only this migration set before adding the reviewed ACLs.
do $acl$ declare r record; begin
  for r in select unnest(array[
    'fish_source_records','fish_species','fish_species_sources','fish_species_slug_aliases','fish_aliases','fish_display_categories','fish_species_display_categories','fish_species_relations','fish_generated_contents','fish_change_logs',
    'fish_media','fish_observations','fish_observation_private_locations','fish_identification_attempts','fish_observation_verifications','fish_collections','fish_collection_regions','fish_observation_confirmations','fish_achievement_events',
    'regulation_source_records','regulation_source_versions','regulation_rules','regulation_rule_species','regulation_change_logs','fish_media_upload_sessions','fish_media_cleanup_jobs',
    'fish_role_assignments','fish_role_change_operations','fish_role_idempotency_records','fish_role_audit_logs','fish_role_operation_audit_logs','fish_role_session_revocation_jobs','fish_role_session_revocation_dead_letters','fish_role_approvals','fish_role_approval_audit_logs'
  ]) as name loop execute format('revoke all privileges on table public.%I from anon,authenticated',r.name); end loop;
end $acl$;

create policy fish_species_public_read on public.fish_species for select using(publish_status='published' and fact_review_status='approved' and archived_at is null);
create policy fish_media_public_read on public.fish_media for select using(privacy='public' and review_status='approved' and usage_status='ready' and deletion_status='active' and storage_bucket='fish-observation-public' and exif_status='stripped');
create policy fish_generated_contents_public_read on public.fish_generated_contents for select using(publish_status='published' and review_status='approved' and archived_at is null);
create policy regulation_rules_public_read on public.regulation_rules for select using(publish_status='published' and fact_review_status='approved' and archived_at is null and (effective_to is null or effective_to>=current_date));
create policy regulation_rule_species_public_read on public.regulation_rule_species for select using(review_status='approved' and exists(select 1 from public.regulation_rules r where r.id=regulation_rule_id and r.publish_status='published' and r.fact_review_status='approved' and r.archived_at is null));

create policy fish_observations_owner_select on public.fish_observations for select using(user_id=auth.uid());
create policy fish_observations_owner_insert on public.fish_observations for insert with check(user_id=auth.uid() and species_id is null and photo_media_id is null and verification_status='pending' and moderation_status='pending' and deletion_status='active');
create policy fish_observations_owner_update on public.fish_observations for update using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy fish_private_locations_owner_select on public.fish_observation_private_locations for select using(exists(select 1 from public.fish_observations o where o.id=observation_id and o.user_id=auth.uid()));
create policy fish_identification_attempts_owner_read on public.fish_identification_attempts for select using(exists(select 1 from public.fish_observations o where o.id=observation_id and o.user_id=auth.uid()));
create policy fish_verifications_owner_read on public.fish_observation_verifications for select using(exists(select 1 from public.fish_observations o where o.id=observation_id and o.user_id=auth.uid()));
create policy fish_collections_owner_select on public.fish_collections for select using(user_id=auth.uid());
create policy fish_collection_regions_owner_select on public.fish_collection_regions for select using(user_id=auth.uid());
create policy fish_achievement_events_owner_read on public.fish_achievement_events for select using(user_id=auth.uid());
create policy fish_media_owner_select on public.fish_media for select using(user_id=auth.uid());

create policy fish_admin_species_all on public.fish_species for all using(public.is_fish_admin()) with check(public.is_fish_admin());
create policy fish_admin_sources_all on public.fish_source_records for all using(public.is_fish_admin()) with check(public.is_fish_admin());
create policy fish_admin_regulations_all on public.regulation_rules for all using(public.is_fish_admin()) with check(public.is_fish_admin());
create policy fish_reviewer_species_read on public.fish_species for select using(public.is_fish_reviewer());
create policy fish_reviewer_sources_read on public.fish_source_records for select using(public.is_fish_reviewer());
create policy fish_reviewer_regulations_read on public.regulation_rules for select using(public.is_fish_reviewer());
create policy fish_crawler_sources_insert on public.fish_source_records for insert with check(public.is_fish_crawler());
create policy fish_role_assignments_admin_read on public.fish_role_assignments for select using(public.is_fish_admin());
create policy fish_role_audit_admin_read on public.fish_role_audit_logs for select using(public.is_fish_admin());
create policy fish_role_operation_audit_admin_read on public.fish_role_operation_audit_logs for select using(public.is_fish_admin());
create policy fish_role_approval_audit_admin_read on public.fish_role_approval_audit_logs for select using(public.is_fish_admin());
-- Tables without policies are intentionally server/RPC-only under enabled RLS.

-- RLS and SQL privileges are separate. Grant only operations that have an
-- explicit policy above; all other tables remain inaccessible to browser roles.
grant select on public.fish_species,public.fish_media,public.fish_generated_contents,
  public.regulation_rules,public.regulation_rule_species to anon,authenticated;
grant select on public.fish_observations to authenticated;
grant insert(user_id,captured_at,region,fishing_spot_id,marine_place_id,length_cm,weight_g,notes,visibility,location_privacy,is_personal_record,is_anonymous)
  on public.fish_observations to authenticated;
grant update(captured_at,region,fishing_spot_id,marine_place_id,length_cm,weight_g,notes,visibility,location_privacy,is_personal_record,is_anonymous)
  on public.fish_observations to authenticated;
grant select on public.fish_observation_private_locations,public.fish_identification_attempts,
  public.fish_observation_verifications,public.fish_collections,public.fish_collection_regions,
  public.fish_achievement_events to authenticated;
grant select on public.fish_source_records,public.fish_role_assignments,public.fish_role_audit_logs,
  public.fish_role_operation_audit_logs,public.fish_role_approval_audit_logs to authenticated;
grant insert,update on public.fish_source_records to authenticated;
grant insert,update on public.fish_species,public.regulation_rules to authenticated;
commit;
