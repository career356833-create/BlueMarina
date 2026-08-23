-- DRAFT ONLY. Incremental creation for an empty Fish namespace in public.
-- Transaction: yes. Dependency: 000 preflight passed; pgcrypto already installed.

begin;

create function public.fish_domain_set_updated_at()
returns trigger language plpgsql set search_path = pg_catalog, public, pg_temp as $$
begin new.updated_at = now(); return new; end;
$$;

create function public.prevent_fish_species_slug_change()
returns trigger language plpgsql set search_path = pg_catalog, public, pg_temp as $$
begin
  if new.slug is distinct from old.slug then
    raise exception 'fish_species.slug is immutable; create a slug alias instead';
  end if;
  return new;
end;
$$;

create table public.fish_source_records (
  id uuid primary key default gen_random_uuid(), source_provider text not null,
  source_id text not null, source_url text not null, raw_storage_path text,
  raw_payload_summary jsonb, content_hash text not null, parser_version text not null,
  crawl_status text not null check (crawl_status in ('pending','crawling','complete','partial','failed','missing','archived')),
  error_message text, fetched_at timestamptz not null, source_missing_at timestamptz,
  last_seen_at timestamptz, is_current boolean not null default true,
  archived_at timestamptz, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (raw_storage_path is not null or raw_payload_summary is not null),
  check (crawl_status <> 'missing' or source_missing_at is not null),
  check (archived_at is null or crawl_status = 'archived'),
  unique (source_provider, source_id, content_hash)
);
create unique index fish_source_records_current_version_uidx on public.fish_source_records(source_provider,source_id) where is_current and archived_at is null;
create index fish_source_records_lookup_idx on public.fish_source_records(source_provider,source_id,fetched_at desc);
create index fish_source_records_status_idx on public.fish_source_records(crawl_status,last_seen_at desc);

create table public.fish_species (
  id uuid primary key default gen_random_uuid(), slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  korean_name text not null, english_name text, scientific_name text,
  taxonomy jsonb not null default '{}'::jsonb, official_facts jsonb not null default '{}'::jsonb,
  fact_review_status text not null default 'pending' check (fact_review_status in ('pending','needs_review','approved','rejected')),
  publish_status text not null default 'draft' check (publish_status in ('draft','review','published','hidden','archived')),
  version integer not null default 1 check (version >= 1), archived_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (archived_at is null or publish_status = 'archived')
);
create index fish_species_scientific_name_idx on public.fish_species(scientific_name) where scientific_name is not null;
create index fish_species_korean_name_idx on public.fish_species(korean_name);
create index fish_species_public_idx on public.fish_species(publish_status,fact_review_status) where archived_at is null;
create trigger fish_species_slug_immutable before update of slug on public.fish_species for each row execute function public.prevent_fish_species_slug_change();

create table public.fish_species_sources (
  id uuid primary key default gen_random_uuid(), fish_species_id uuid not null references public.fish_species(id) on delete restrict,
  source_record_id uuid not null references public.fish_source_records(id) on delete restrict,
  is_primary boolean not null default false, field_precedence jsonb not null default '{}'::jsonb,
  linked_by text not null default 'manual' check (linked_by in ('manual','import_review')),
  archived_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(fish_species_id,source_record_id)
);
create unique index fish_species_sources_primary_uidx on public.fish_species_sources(fish_species_id) where is_primary and archived_at is null;
create index fish_species_sources_source_idx on public.fish_species_sources(source_record_id);

create table public.fish_species_slug_aliases (
  id uuid primary key default gen_random_uuid(), fish_species_id uuid not null references public.fish_species(id) on delete restrict,
  alias_slug text not null unique check (alias_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  redirect_source text not null check (redirect_source in ('rename','legacy_route','manual','migration')),
  note text, is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index fish_species_slug_aliases_species_idx on public.fish_species_slug_aliases(fish_species_id);

create table public.fish_aliases (
  id uuid primary key default gen_random_uuid(), fish_species_id uuid not null references public.fish_species(id) on delete restrict,
  alias_name text not null, normalized_alias text not null,
  alias_type text not null default 'common' check (alias_type in ('common','regional','historic','misspelling','english','scientific')),
  source_type text not null default 'manual' check (source_type in ('official','manual','ai_candidate')),
  review_status text not null default 'pending' check (review_status in ('pending','needs_review','approved','rejected')),
  archived_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(fish_species_id,normalized_alias)
);
create index fish_aliases_lookup_idx on public.fish_aliases(normalized_alias) where archived_at is null;

create table public.fish_display_categories (
  id uuid primary key default gen_random_uuid(), slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  label text not null, description text, display_order integer not null default 0,
  is_active boolean not null default true, archived_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.fish_species_display_categories (
  id uuid primary key default gen_random_uuid(), fish_species_id uuid not null references public.fish_species(id) on delete restrict,
  fish_display_category_id uuid not null references public.fish_display_categories(id) on delete restrict,
  is_primary boolean not null default false, display_order integer not null default 0,
  source_type text not null check (source_type in ('taxonomy','manual','ai_candidate')),
  review_status text not null default 'pending' check (review_status in ('pending','needs_review','approved','rejected')),
  assigned_by uuid references auth.users(id) on delete set null, note text, archived_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(fish_species_id,fish_display_category_id)
);
create unique index fish_species_display_categories_primary_uidx on public.fish_species_display_categories(fish_species_id) where is_primary and review_status='approved' and archived_at is null;
create index fish_species_display_categories_category_idx on public.fish_species_display_categories(fish_display_category_id,display_order);

create table public.fish_species_relations (
  id uuid primary key default gen_random_uuid(), source_species_id uuid not null references public.fish_species(id) on delete restrict,
  target_species_id uuid not null references public.fish_species(id) on delete restrict,
  relation_type text not null check (relation_type in ('similar_appearance','same_taxon','same_habitat','confusable','co_search','substitute')),
  reason text not null, source_type text not null check (source_type in ('official','manual','ai_candidate')),
  review_status text not null default 'pending' check (review_status in ('pending','needs_review','approved','rejected')),
  display_order integer not null default 0, archived_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(source_species_id<>target_species_id),
  check(relation_type not in ('similar_appearance','same_taxon','same_habitat','co_search') or source_species_id<target_species_id),
  unique(source_species_id,target_species_id,relation_type)
);
create index fish_species_relations_source_idx on public.fish_species_relations(source_species_id,relation_type,display_order) where archived_at is null;
create index fish_species_relations_target_idx on public.fish_species_relations(target_species_id,relation_type) where archived_at is null;

create table public.fish_generated_contents (
  id uuid primary key default gen_random_uuid(), fish_species_id uuid not null references public.fish_species(id) on delete restrict,
  content_type text not null, target_audience text, provider text not null, model text not null,
  prompt_version text not null, input_hash text not null, generated_payload jsonb not null,
  review_status text not null default 'pending' check(review_status in ('pending','needs_review','approved','rejected')),
  publish_status text not null default 'draft' check(publish_status in ('draft','review','published','archived')),
  generated_at timestamptz not null, archived_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(publish_status<>'published' or review_status='approved')
);
create index fish_generated_contents_species_idx on public.fish_generated_contents(fish_species_id,publish_status,review_status,generated_at desc) where archived_at is null;

create table public.fish_change_logs (
  id uuid primary key default gen_random_uuid(), entity_type text not null, entity_id uuid not null,
  change_type text not null, before_payload jsonb, after_payload jsonb,
  source_record_id uuid references public.fish_source_records(id) on delete set null,
  actor_type text not null check(actor_type in ('system','crawler','importer','admin','reviewer')),
  created_at timestamptz not null default now()
);
create index fish_change_logs_entity_idx on public.fish_change_logs(entity_type,entity_id,created_at desc);

create trigger fish_source_records_updated_at before update on public.fish_source_records for each row execute function public.fish_domain_set_updated_at();
create trigger fish_species_updated_at before update on public.fish_species for each row execute function public.fish_domain_set_updated_at();
create trigger fish_species_sources_updated_at before update on public.fish_species_sources for each row execute function public.fish_domain_set_updated_at();
create trigger fish_slug_aliases_updated_at before update on public.fish_species_slug_aliases for each row execute function public.fish_domain_set_updated_at();
create trigger fish_aliases_updated_at before update on public.fish_aliases for each row execute function public.fish_domain_set_updated_at();
create trigger fish_display_categories_updated_at before update on public.fish_display_categories for each row execute function public.fish_domain_set_updated_at();
create trigger fish_species_display_categories_updated_at before update on public.fish_species_display_categories for each row execute function public.fish_domain_set_updated_at();
create trigger fish_species_relations_updated_at before update on public.fish_species_relations for each row execute function public.fish_domain_set_updated_at();
create trigger fish_generated_contents_updated_at before update on public.fish_generated_contents for each row execute function public.fish_domain_set_updated_at();

commit;
