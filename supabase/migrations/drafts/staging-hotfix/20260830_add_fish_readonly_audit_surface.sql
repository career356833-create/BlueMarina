-- STAGING HOTFIX: narrow, read-only Fish inventory surface for the dedicated auditor.
-- Data rows are not modified. Existing RLS policies remain unchanged.

begin;

do $preflight$
begin
  if not exists (
    select 1
    from pg_catalog.pg_roles
    where rolname = 'blue_marina_readonly_auditor'
      and rolcanlogin
      and not rolbypassrls
  ) then
    raise exception 'blue_marina_readonly_auditor must exist, login, and not bypass RLS';
  end if;
end
$preflight$;

create or replace function public.fish_readonly_audit_species_v1()
returns table (
  species_id uuid,
  slug text,
  korean_name text,
  english_name text,
  scientific_name text,
  normalized_scientific_name text,
  internal_id text,
  source_provider text,
  source_id text,
  fact_review_status text,
  publish_status text,
  archived_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
  select
    s.id,
    s.slug,
    s.korean_name,
    s.english_name,
    s.scientific_name,
    coalesce(
      s.official_facts #>> '{scientificNameParsing,scientificNameCanonical}',
      s.official_facts ->> 'normalizedScientificName',
      s.scientific_name
    ),
    s.official_facts ->> 'internalId',
    s.official_facts ->> 'sourceProvider',
    s.official_facts ->> 'sourceId',
    s.fact_review_status,
    s.publish_status,
    s.archived_at
  from public.fish_species as s
$function$;

create or replace function public.fish_readonly_audit_source_records_v1()
returns table (
  source_record_id uuid,
  source_provider text,
  source_id text,
  content_hash text,
  parser_version text,
  crawl_status text,
  is_current boolean,
  archived_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
  select
    r.id,
    r.source_provider,
    r.source_id,
    r.content_hash,
    r.parser_version,
    r.crawl_status,
    r.is_current,
    r.archived_at
  from public.fish_source_records as r
$function$;

create or replace function public.fish_readonly_audit_species_sources_v1()
returns table (
  relation_id uuid,
  species_id uuid,
  source_record_id uuid,
  mbris_source_id text,
  is_primary boolean,
  linked_by text,
  archived_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
  select
    r.id,
    r.fish_species_id,
    r.source_record_id,
    coalesce(
      r.field_precedence ->> 'mbrisSourceId',
      r.field_precedence #>> '{importMetadata,mbrisSourceId}',
      r.field_precedence #>> '{lineage,mbrisSourceId}'
    ),
    r.is_primary,
    r.linked_by,
    r.archived_at
  from public.fish_species_sources as r
$function$;

create or replace function public.fish_readonly_audit_aliases_v1()
returns table (
  alias_id uuid,
  species_id uuid,
  alias_name text,
  normalized_alias text,
  alias_type text,
  source_type text,
  review_status text,
  archived_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
  select
    a.id,
    a.fish_species_id,
    a.alias_name,
    a.normalized_alias,
    a.alias_type,
    a.source_type,
    a.review_status,
    a.archived_at
  from public.fish_aliases as a
$function$;

create or replace function public.fish_readonly_audit_slug_aliases_v1()
returns table (
  slug_alias_id uuid,
  species_id uuid,
  alias_slug text,
  redirect_source text,
  is_active boolean
)
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
  select
    a.id,
    a.fish_species_id,
    a.alias_slug,
    a.redirect_source,
    a.is_active
  from public.fish_species_slug_aliases as a
$function$;

create or replace function public.fish_readonly_audit_change_logs_v1()
returns table (
  change_log_id uuid,
  entity_type text,
  entity_id uuid,
  change_type text,
  source_record_id uuid,
  source_provider text,
  source_id text,
  internal_id text,
  import_batch text,
  normalized_scientific_name text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
  select
    l.id,
    l.entity_type,
    l.entity_id,
    l.change_type,
    l.source_record_id,
    coalesce(l.after_payload ->> 'sourceProvider', l.before_payload ->> 'sourceProvider'),
    coalesce(l.after_payload ->> 'sourceId', l.before_payload ->> 'sourceId'),
    coalesce(l.after_payload ->> 'internalId', l.before_payload ->> 'internalId'),
    coalesce(l.after_payload ->> 'importBatch', l.before_payload ->> 'importBatch'),
    coalesce(
      l.after_payload ->> 'normalizedScientificName',
      l.before_payload ->> 'normalizedScientificName'
    ),
    l.created_at
  from public.fish_change_logs as l
$function$;

alter function public.fish_readonly_audit_species_v1() owner to postgres;
alter function public.fish_readonly_audit_source_records_v1() owner to postgres;
alter function public.fish_readonly_audit_species_sources_v1() owner to postgres;
alter function public.fish_readonly_audit_aliases_v1() owner to postgres;
alter function public.fish_readonly_audit_slug_aliases_v1() owner to postgres;
alter function public.fish_readonly_audit_change_logs_v1() owner to postgres;

revoke all on function public.fish_readonly_audit_species_v1() from public, anon, authenticated, service_role;
revoke all on function public.fish_readonly_audit_source_records_v1() from public, anon, authenticated, service_role;
revoke all on function public.fish_readonly_audit_species_sources_v1() from public, anon, authenticated, service_role;
revoke all on function public.fish_readonly_audit_aliases_v1() from public, anon, authenticated, service_role;
revoke all on function public.fish_readonly_audit_slug_aliases_v1() from public, anon, authenticated, service_role;
revoke all on function public.fish_readonly_audit_change_logs_v1() from public, anon, authenticated, service_role;

grant execute on function public.fish_readonly_audit_species_v1() to blue_marina_readonly_auditor;
grant execute on function public.fish_readonly_audit_source_records_v1() to blue_marina_readonly_auditor;
grant execute on function public.fish_readonly_audit_species_sources_v1() to blue_marina_readonly_auditor;
grant execute on function public.fish_readonly_audit_aliases_v1() to blue_marina_readonly_auditor;
grant execute on function public.fish_readonly_audit_slug_aliases_v1() to blue_marina_readonly_auditor;
grant execute on function public.fish_readonly_audit_change_logs_v1() to blue_marina_readonly_auditor;

commit;
