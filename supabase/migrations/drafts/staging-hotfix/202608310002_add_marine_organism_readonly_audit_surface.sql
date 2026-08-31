-- STAGING ONLY: narrow, read-only Marine Organism inventory for the dedicated auditor.
-- This migration creates functions and ACLs only. It does not modify application rows or RLS policies.

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

create or replace function public.marine_organism_readonly_audit_organisms_v1()
returns table (
  organism_id uuid,
  internal_id text,
  slug text,
  korean_name text,
  scientific_name text,
  normalized_scientific_name text,
  organism_group text,
  phylum text,
  taxonomic_class text,
  taxonomic_order text,
  family text,
  genus text,
  review_status text,
  publish_status text,
  version integer,
  archived_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
  select
    o.id,
    o.internal_id,
    o.slug,
    o.korean_name,
    o.scientific_name,
    o.normalized_scientific_name,
    o.organism_group,
    o.phylum,
    o.taxonomic_class,
    o.taxonomic_order,
    o.family,
    o.genus,
    o.review_status,
    o.publish_status,
    o.version,
    o.archived_at
  from public.marine_organisms as o
$function$;

create or replace function public.marine_organism_readonly_audit_source_records_v1()
returns table (
  source_record_id uuid,
  source_provider text,
  source_id text,
  content_hash text,
  parser_version text,
  crawl_status text,
  fetched_at timestamptz,
  source_missing_at timestamptz,
  last_seen_at timestamptz,
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
    r.fetched_at,
    r.source_missing_at,
    r.last_seen_at,
    r.is_current,
    r.archived_at
  from public.marine_organism_source_records as r
$function$;

create or replace function public.marine_organism_readonly_audit_sources_v1()
returns table (
  relation_id uuid,
  organism_id uuid,
  source_record_id uuid,
  source_provider text,
  source_id text,
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
    rel.id,
    rel.marine_organism_id,
    rel.source_record_id,
    src.source_provider,
    src.source_id,
    rel.is_primary,
    rel.linked_by,
    rel.archived_at
  from public.marine_organism_sources as rel
  join public.marine_organism_source_records as src on src.id = rel.source_record_id
$function$;

create or replace function public.marine_organism_readonly_audit_aliases_v1()
returns table (
  alias_id uuid,
  organism_id uuid,
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
    a.marine_organism_id,
    a.alias_name,
    a.normalized_alias,
    a.alias_type,
    a.source_type,
    a.review_status,
    a.archived_at
  from public.marine_organism_aliases as a
$function$;

create or replace function public.marine_organism_readonly_audit_slug_aliases_v1()
returns table (
  slug_alias_id uuid,
  organism_id uuid,
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
    a.marine_organism_id,
    a.alias_slug,
    a.redirect_source,
    a.is_active
  from public.marine_organism_slug_aliases as a
$function$;

create or replace function public.marine_organism_readonly_audit_change_logs_v1()
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
  from public.marine_organism_change_logs as l
$function$;

alter function public.marine_organism_readonly_audit_organisms_v1() owner to postgres;
alter function public.marine_organism_readonly_audit_source_records_v1() owner to postgres;
alter function public.marine_organism_readonly_audit_sources_v1() owner to postgres;
alter function public.marine_organism_readonly_audit_aliases_v1() owner to postgres;
alter function public.marine_organism_readonly_audit_slug_aliases_v1() owner to postgres;
alter function public.marine_organism_readonly_audit_change_logs_v1() owner to postgres;

revoke all on function public.marine_organism_readonly_audit_organisms_v1() from public, anon, authenticated, service_role;
revoke all on function public.marine_organism_readonly_audit_source_records_v1() from public, anon, authenticated, service_role;
revoke all on function public.marine_organism_readonly_audit_sources_v1() from public, anon, authenticated, service_role;
revoke all on function public.marine_organism_readonly_audit_aliases_v1() from public, anon, authenticated, service_role;
revoke all on function public.marine_organism_readonly_audit_slug_aliases_v1() from public, anon, authenticated, service_role;
revoke all on function public.marine_organism_readonly_audit_change_logs_v1() from public, anon, authenticated, service_role;

grant execute on function public.marine_organism_readonly_audit_organisms_v1() to blue_marina_readonly_auditor;
grant execute on function public.marine_organism_readonly_audit_source_records_v1() to blue_marina_readonly_auditor;
grant execute on function public.marine_organism_readonly_audit_sources_v1() to blue_marina_readonly_auditor;
grant execute on function public.marine_organism_readonly_audit_aliases_v1() to blue_marina_readonly_auditor;
grant execute on function public.marine_organism_readonly_audit_slug_aliases_v1() to blue_marina_readonly_auditor;
grant execute on function public.marine_organism_readonly_audit_change_logs_v1() to blue_marina_readonly_auditor;

commit;
