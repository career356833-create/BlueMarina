-- Blue Marina V1 public-schema privileges, scoped to the twelve backend tables.
-- All tables are owned by postgres in the verified remote and fresh migration chain.
begin;

-- Existing defaults grant ALL to browser roles. Revoke on the concrete tables first.
revoke all on table
  public.blue_marina_learning_states,
  public.profiles,
  public.user_saved_items,
  public.charter_supply_submissions,
  public.charter_supply_reviews,
  public.charter_supply_promotion_candidates,
  public.charter_supply_audit_logs,
  public.market_listings,
  public.market_listing_images,
  public.market_listing_contacts,
  public.market_listing_reviews,
  public.market_listing_audit_logs
from anon, authenticated, service_role;

-- A legacy fish-only auditor is optional on a fresh Supabase database.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'fish_auditor') then
    execute 'revoke all on table public.blue_marina_learning_states, public.profiles, public.user_saved_items, public.charter_supply_submissions, public.charter_supply_reviews, public.charter_supply_promotion_candidates, public.charter_supply_audit_logs, public.market_listings, public.market_listing_images, public.market_listing_contacts, public.market_listing_reviews, public.market_listing_audit_logs from fish_auditor';
  end if;
end;
$$;

-- Learning synchronization requires a signed-in user; no anonymous table access.
grant select, insert, update on table public.blue_marina_learning_states to authenticated;

-- Profile creation and Account APIs use a server-only service role. Retain the
-- pre-existing column-limited direct profile edit contract for signed-in users.
grant select on table public.profiles to authenticated;
grant update (display_name, avatar_url, region, bio, updated_at) on table public.profiles to authenticated;

-- Saved items support own-row CRUD under RLS; TRUNCATE/REFERENCES/TRIGGER do not.
grant select, insert, update, delete on table public.user_saved_items to authenticated;
create policy "Users can update own saved items" on public.user_saved_items
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Server operations only. Admin identity checks stay in the application layer.
grant select, insert, update on table public.profiles to service_role;
grant select, insert, update, delete on table public.user_saved_items to service_role;
grant select, insert, update on table public.charter_supply_submissions to service_role;
grant select, insert on table
  public.charter_supply_reviews,
  public.charter_supply_promotion_candidates,
  public.charter_supply_audit_logs to service_role;
grant select, insert, update on table
  public.market_listings,
  public.market_listing_images,
  public.market_listing_contacts to service_role;
grant select, insert on table
  public.market_listing_reviews,
  public.market_listing_audit_logs to service_role;

revoke all on sequence
  public.charter_supply_audit_logs_id_seq,
  public.market_listing_audit_logs_id_seq
from anon, authenticated, service_role;
grant usage, select on sequence
  public.charter_supply_audit_logs_id_seq,
  public.market_listing_audit_logs_id_seq
 to service_role;

-- Scope future prevention to postgres-owned tables in public. Preserve DML
-- defaults and all Supabase-managed schemas/owners; future migrations must still
-- review their explicit browser grants and RLS.
alter default privileges for role postgres in schema public
  revoke truncate, references, trigger, maintain on tables from anon, authenticated, service_role;

-- Fail atomically if the two destructive browser grants survive.
do $$
begin
  if has_table_privilege('anon', 'public.blue_marina_learning_states', 'TRUNCATE')
     or has_table_privilege('authenticated', 'public.user_saved_items', 'TRUNCATE') then
    raise exception 'Blue Marina privilege hardening left an RLS-bypassing TRUNCATE grant';
  end if;
end;
$$;

commit;
