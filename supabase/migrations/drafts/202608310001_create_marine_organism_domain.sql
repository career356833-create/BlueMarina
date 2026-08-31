-- DRAFT ONLY. Marine Organism domain for reviewed marine non-fish species.
-- Transaction: yes. Dependencies: pgcrypto, auth, and Fish role helpers from staging-ready phase 4.
-- This draft does not alter or reference Fish data tables.

begin;

create function public.marine_organism_set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function public.prevent_marine_organism_slug_change()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if new.slug is distinct from old.slug then
    raise exception 'marine_organisms.slug is immutable; create a slug alias instead';
  end if;
  return new;
end;
$$;

revoke all on function public.marine_organism_set_updated_at() from public, anon, authenticated, service_role;
revoke all on function public.prevent_marine_organism_slug_change() from public, anon, authenticated, service_role;

create table public.marine_organism_source_records (
  id uuid primary key,
  source_provider text not null,
  source_id text not null,
  source_url text,
  raw_storage_path text,
  raw_payload_summary jsonb,
  content_hash text not null,
  parser_version text not null,
  crawl_status text not null check (crawl_status in ('pending','crawling','complete','partial','failed','missing','archived')),
  error_message text,
  fetched_at timestamptz not null,
  source_missing_at timestamptz,
  last_seen_at timestamptz,
  is_current boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (raw_storage_path is not null or raw_payload_summary is not null),
  check (crawl_status <> 'missing' or source_missing_at is not null),
  check (archived_at is null or crawl_status = 'archived'),
  unique (source_provider, source_id, content_hash)
);

create unique index marine_organism_source_current_uidx
  on public.marine_organism_source_records(source_provider, source_id)
  where is_current and archived_at is null;
create index marine_organism_source_lookup_idx
  on public.marine_organism_source_records(source_provider, source_id, fetched_at desc);

create table public.marine_organisms (
  id uuid primary key,
  internal_id text not null unique check (internal_id ~ '^BM-SPECIES-[0-9]{6}$'),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  korean_name text not null check (btrim(korean_name) <> ''),
  scientific_name text not null unique check (btrim(scientific_name) <> ''),
  normalized_scientific_name text not null unique check (normalized_scientific_name = lower(btrim(normalized_scientific_name))),
  organism_group text not null check (organism_group in (
    'CRUSTACEAN','CEPHALOPOD','GASTROPOD','BIVALVE','OTHER_MOLLUSK','ECHINODERM','CNIDARIAN',
    'OTHER_MARINE_INVERTEBRATE','OTHER_MARINE_ANIMAL'
  )),
  phylum text not null,
  taxonomic_class text not null,
  taxonomic_order text not null,
  family text not null,
  genus text not null,
  taxonomy jsonb not null check (jsonb_typeof(taxonomy) = 'object'),
  review_status text not null default 'pending' check (review_status in ('pending','needs_review','approved','rejected')),
  publish_status text not null default 'draft' check (publish_status in ('draft','review','published','hidden','archived')),
  version integer not null default 1 check (version >= 1),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (publish_status <> 'published' or review_status = 'approved'),
  check (archived_at is null or publish_status = 'archived')
);

create index marine_organisms_public_idx
  on public.marine_organisms(publish_status, review_status, organism_group)
  where archived_at is null;
create index marine_organisms_taxonomy_idx
  on public.marine_organisms(organism_group, phylum, taxonomic_class, family, genus)
  where archived_at is null;
create index marine_organisms_korean_name_idx on public.marine_organisms(korean_name);

create table public.marine_organism_sources (
  id uuid primary key,
  marine_organism_id uuid not null references public.marine_organisms(id) on delete restrict,
  source_record_id uuid not null references public.marine_organism_source_records(id) on delete restrict,
  is_primary boolean not null default false,
  field_precedence jsonb not null default '{}'::jsonb,
  lineage jsonb not null default '{}'::jsonb check (jsonb_typeof(lineage) = 'object'),
  linked_by text not null default 'import_review' check (linked_by in ('manual','import_review')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (marine_organism_id, source_record_id)
);

create unique index marine_organism_sources_primary_uidx
  on public.marine_organism_sources(marine_organism_id)
  where is_primary and archived_at is null;
create index marine_organism_sources_source_idx on public.marine_organism_sources(source_record_id);

create table public.marine_organism_slug_aliases (
  id uuid primary key default gen_random_uuid(),
  marine_organism_id uuid not null references public.marine_organisms(id) on delete restrict,
  alias_slug text not null unique check (alias_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  redirect_source text not null check (redirect_source in ('taxonomy_revision','legacy_route','manual','migration')),
  note text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index marine_organism_slug_aliases_entity_idx on public.marine_organism_slug_aliases(marine_organism_id);

create table public.marine_organism_aliases (
  id uuid primary key default gen_random_uuid(),
  marine_organism_id uuid not null references public.marine_organisms(id) on delete restrict,
  alias_name text not null,
  normalized_alias text not null,
  alias_type text not null default 'common' check (alias_type in ('common','regional','historic','misspelling','english','scientific')),
  source_type text not null default 'manual' check (source_type in ('official','manual','source_synonym')),
  review_status text not null default 'pending' check (review_status in ('pending','needs_review','approved','rejected')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (marine_organism_id, normalized_alias)
);
create index marine_organism_aliases_lookup_idx
  on public.marine_organism_aliases(normalized_alias)
  where archived_at is null;

create table public.marine_organism_change_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('marine_organism','source_record','source_relation','alias','slug_alias')),
  entity_id uuid not null,
  change_type text not null,
  before_payload jsonb,
  after_payload jsonb,
  source_record_id uuid references public.marine_organism_source_records(id) on delete set null,
  actor_type text not null check (actor_type in ('system','crawler','importer','admin','reviewer')),
  created_at timestamptz not null default now()
);
create index marine_organism_change_logs_entity_idx
  on public.marine_organism_change_logs(entity_type, entity_id, created_at desc);

create trigger marine_organism_source_records_updated_at
  before update on public.marine_organism_source_records
  for each row execute function public.marine_organism_set_updated_at();
create trigger marine_organisms_updated_at
  before update on public.marine_organisms
  for each row execute function public.marine_organism_set_updated_at();
create trigger marine_organisms_slug_immutable
  before update of slug on public.marine_organisms
  for each row execute function public.prevent_marine_organism_slug_change();
create trigger marine_organism_sources_updated_at
  before update on public.marine_organism_sources
  for each row execute function public.marine_organism_set_updated_at();
create trigger marine_organism_slug_aliases_updated_at
  before update on public.marine_organism_slug_aliases
  for each row execute function public.marine_organism_set_updated_at();
create trigger marine_organism_aliases_updated_at
  before update on public.marine_organism_aliases
  for each row execute function public.marine_organism_set_updated_at();

alter table public.marine_organism_source_records enable row level security;
alter table public.marine_organisms enable row level security;
alter table public.marine_organism_sources enable row level security;
alter table public.marine_organism_slug_aliases enable row level security;
alter table public.marine_organism_aliases enable row level security;
alter table public.marine_organism_change_logs enable row level security;

revoke all privileges on table public.marine_organism_source_records from anon, authenticated;
revoke all privileges on table public.marine_organisms from anon, authenticated;
revoke all privileges on table public.marine_organism_sources from anon, authenticated;
revoke all privileges on table public.marine_organism_slug_aliases from anon, authenticated;
revoke all privileges on table public.marine_organism_aliases from anon, authenticated;
revoke all privileges on table public.marine_organism_change_logs from anon, authenticated;

create policy marine_organisms_public_read
  on public.marine_organisms for select to anon, authenticated
  using (publish_status = 'published' and review_status = 'approved' and archived_at is null);
create policy marine_organism_aliases_public_read
  on public.marine_organism_aliases for select to anon, authenticated
  using (review_status = 'approved' and archived_at is null and exists (
    select 1 from public.marine_organisms o
    where o.id = marine_organism_id and o.publish_status = 'published'
      and o.review_status = 'approved' and o.archived_at is null
  ));
create policy marine_organism_slug_aliases_public_read
  on public.marine_organism_slug_aliases for select to anon, authenticated
  using (is_active and exists (
    select 1 from public.marine_organisms o
    where o.id = marine_organism_id and o.publish_status = 'published'
      and o.review_status = 'approved' and o.archived_at is null
  ));

create policy marine_organisms_reviewer_read
  on public.marine_organisms for select to authenticated using (public.is_fish_reviewer());
create policy marine_organism_sources_reviewer_read
  on public.marine_organism_sources for select to authenticated using (public.is_fish_reviewer());
create policy marine_organism_source_records_reviewer_read
  on public.marine_organism_source_records for select to authenticated using (public.is_fish_reviewer());
create policy marine_organism_aliases_reviewer_read
  on public.marine_organism_aliases for select to authenticated using (public.is_fish_reviewer());
create policy marine_organism_slug_aliases_reviewer_read
  on public.marine_organism_slug_aliases for select to authenticated using (public.is_fish_reviewer());
create policy marine_organism_change_logs_reviewer_read
  on public.marine_organism_change_logs for select to authenticated using (public.is_fish_reviewer());
create policy marine_organisms_reviewer_review_status
  on public.marine_organisms for update to authenticated
  using (public.is_fish_reviewer())
  with check (public.is_fish_reviewer());

create policy marine_organisms_admin_all
  on public.marine_organisms for all to authenticated
  using (public.is_fish_admin()) with check (public.is_fish_admin());
create policy marine_organism_source_records_admin_all
  on public.marine_organism_source_records for all to authenticated
  using (public.is_fish_admin()) with check (public.is_fish_admin());
create policy marine_organism_sources_admin_all
  on public.marine_organism_sources for all to authenticated
  using (public.is_fish_admin()) with check (public.is_fish_admin());
create policy marine_organism_aliases_admin_all
  on public.marine_organism_aliases for all to authenticated
  using (public.is_fish_admin()) with check (public.is_fish_admin());
create policy marine_organism_slug_aliases_admin_all
  on public.marine_organism_slug_aliases for all to authenticated
  using (public.is_fish_admin()) with check (public.is_fish_admin());
create policy marine_organism_change_logs_admin_all
  on public.marine_organism_change_logs for all to authenticated
  using (public.is_fish_admin()) with check (public.is_fish_admin());
create policy marine_organism_source_records_crawler_insert
  on public.marine_organism_source_records for insert to authenticated
  with check (public.is_fish_crawler());

grant select on public.marine_organisms, public.marine_organism_aliases,
  public.marine_organism_slug_aliases to anon, authenticated;
grant select on public.marine_organism_source_records, public.marine_organism_sources,
  public.marine_organism_change_logs to authenticated;
grant update(review_status) on public.marine_organisms to authenticated;
grant insert on public.marine_organism_source_records to authenticated;

-- Audit SECURITY DEFINER functions are intentionally deferred to a separate,
-- reviewed phase. Any such function must revoke EXECUTE from PUBLIC, anon, and
-- authenticated before granting a dedicated read-only auditor role.

commit;
