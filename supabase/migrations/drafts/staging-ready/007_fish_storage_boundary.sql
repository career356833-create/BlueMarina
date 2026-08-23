-- DRAFT ONLY. No bucket or storage object mutation is performed here.
-- Transaction: yes. Dependency: buckets provisioned as a separate reviewed deployment step.
--
-- The gateway uses service_role to issue signed upload/read URLs after checking
-- fish_media and fish_observations ownership. Direct browser object policies are
-- intentionally absent. The public derivative bucket may be public only after
-- moderation and lifecycle controls are operational.
begin;
do $storage_precondition$
declare v_bucket text;
begin
  if to_regclass('storage.buckets') is null or to_regclass('storage.objects') is null then
    raise exception 'Supabase Storage system relations are missing';
  end if;
  foreach v_bucket in array array['fish-observation-originals','fish-observation-processed','fish-observation-public'] loop
    if not exists(select 1 from storage.buckets where id=v_bucket) then
      raise exception 'required bucket % is not provisioned; create it in the separate bucket deployment phase',v_bucket;
    end if;
  end loop;
end $storage_precondition$;
commit;
