-- DRAFT ONLY: Do not apply this file to Supabase without a separate approval.
--
-- Blue Marina NIFS fish encyclopedia schema. This draft adds new fish tables
-- only; it does not alter any existing application tables.

create or replace function public.fish_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- RLS roles are intentionally claim-based. The application server must assign
-- app_metadata.fish_role; browsers must never receive a service-role key.
create or replace function public.is_fish_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'fish_role', '') = 'fish_admin';
$$;

create or replace function public.is_fish_reviewer()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'fish_role', '') in ('fish_admin', 'fish_reviewer');
$$;

create or replace function public.is_fish_crawler()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'fish_role', '') = 'fish_crawler';
$$;

create table public.fish_source_records (
  id uuid primary key default gen_random_uuid(),
  source_provider text not null,
  source_id text not null,
  source_url text not null,
  raw_payload_summary jsonb,
  raw_file_path text,
  raw_html_path text,
  raw_byte_size bigint check (raw_byte_size is null or raw_byte_size >= 0),
  raw_mime_type text,
  source_image_urls text[] not null default '{}',
  fetched_at timestamptz not null,
  content_hash text not null,
  parser_version text not null,
  crawl_status text not null check (crawl_status in (
    'pending', 'crawling', 'complete', 'partial', 'failed', 'missing', 'archived'
  )),
  error_message text,
  source_missing_at timestamptz,
  last_seen_at timestamptz,
  is_current boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fish_source_records_payload_or_path_check check (
    raw_payload_summary is not null or raw_file_path is not null or raw_html_path is not null
  ),
  constraint fish_source_records_missing_timestamp_check check (
    crawl_status <> 'missing' or source_missing_at is not null
  ),
  constraint fish_source_records_archived_status_check check (
    archived_at is null or crawl_status = 'archived'
  ),
  unique (source_provider, source_id, content_hash)
);

create unique index fish_source_records_one_current_version_idx
  on public.fish_source_records (source_provider, source_id)
  where is_current and archived_at is null;
create index fish_source_records_lookup_idx
  on public.fish_source_records (source_provider, source_id, fetched_at desc);
create index fish_source_records_crawl_status_idx
  on public.fish_source_records (crawl_status, last_seen_at desc);

create table public.fish_species (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  korean_name text not null,
  common_name text,
  english_name text,
  scientific_name text,
  taxonomy jsonb not null default '{}'::jsonb,
  morphology text,
  habitat text,
  distribution text,
  ecology text,
  spawning text,
  feeding text,
  size text,
  season text,
  fishing_methods text[] not null default '{}',
  food_nutrition text,
  fact_review_status text not null default 'pending' check (
    fact_review_status in ('pending', 'needs_review', 'approved', 'rejected')
  ),
  publish_status text not null default 'draft' check (
    publish_status in ('draft', 'review', 'published', 'hidden', 'archived')
  ),
  version integer not null default 1 check (version >= 1),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fish_species_slug_format_check check (
    slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  constraint fish_species_archived_status_check check (
    archived_at is null or publish_status = 'archived'
  )
);

create index fish_species_scientific_name_idx on public.fish_species (scientific_name);
create index fish_species_korean_name_idx on public.fish_species (korean_name);
create index fish_species_public_lookup_idx
  on public.fish_species (publish_status, fact_review_status)
  where archived_at is null;

-- Canonical slugs are immutable. Renames use fish_species_slug_aliases.
create or replace function public.prevent_fish_species_slug_change()
returns trigger
language plpgsql
as $$
begin
  if new.slug is distinct from old.slug then
    raise exception 'fish_species.slug is immutable; create a slug alias instead';
  end if;
  return new;
end;
$$;

create trigger fish_species_slug_immutable
  before update of slug on public.fish_species
  for each row execute function public.prevent_fish_species_slug_change();

create trigger fish_species_set_updated_at
  before update on public.fish_species
  for each row execute function public.fish_set_updated_at();

create trigger fish_source_records_set_updated_at
  before update on public.fish_source_records
  for each row execute function public.fish_set_updated_at();

create table public.fish_species_sources (
  id uuid primary key default gen_random_uuid(),
  fish_species_id uuid not null references public.fish_species(id) on delete restrict,
  source_record_id uuid not null references public.fish_source_records(id) on delete restrict,
  is_primary boolean not null default false,
  field_precedence jsonb not null default '{}'::jsonb,
  linked_by text not null default 'manual' check (linked_by in ('manual', 'import_review')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fish_species_id, source_record_id)
);

create unique index fish_species_sources_one_primary_idx
  on public.fish_species_sources (fish_species_id)
  where is_primary and archived_at is null;
create index fish_species_sources_source_record_idx
  on public.fish_species_sources (source_record_id);

create trigger fish_species_sources_set_updated_at
  before update on public.fish_species_sources
  for each row execute function public.fish_set_updated_at();

create table public.fish_species_slug_aliases (
  id uuid primary key default gen_random_uuid(),
  fish_species_id uuid not null references public.fish_species(id) on delete restrict,
  alias_slug text not null unique,
  redirect_source text not null check (redirect_source in ('rename', 'legacy_route', 'manual', 'migration')),
  note text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fish_species_slug_aliases_format_check check (
    alias_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  )
);

create index fish_species_slug_aliases_species_idx
  on public.fish_species_slug_aliases (fish_species_id);

create trigger fish_species_slug_aliases_set_updated_at
  before update on public.fish_species_slug_aliases
  for each row execute function public.fish_set_updated_at();

create table public.fish_aliases (
  id uuid primary key default gen_random_uuid(),
  fish_species_id uuid not null references public.fish_species(id) on delete restrict,
  alias_name text not null,
  normalized_alias text not null,
  alias_type text not null default 'common' check (
    alias_type in ('common', 'regional', 'historic', 'misspelling', 'english', 'scientific')
  ),
  source_type text not null default 'manual' check (source_type in ('official', 'manual', 'ai_candidate')),
  review_status text not null default 'pending' check (
    review_status in ('pending', 'needs_review', 'approved', 'rejected')
  ),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fish_species_id, normalized_alias)
);

create index fish_aliases_normalized_alias_idx on public.fish_aliases (normalized_alias);

create trigger fish_aliases_set_updated_at
  before update on public.fish_aliases
  for each row execute function public.fish_set_updated_at();

create table public.fish_display_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  description text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fish_display_categories_slug_format_check check (
    slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  constraint fish_display_categories_archived_check check (
    archived_at is null or is_active = false
  )
);

create index fish_display_categories_active_order_idx
  on public.fish_display_categories (display_order, label)
  where is_active and archived_at is null;

create trigger fish_display_categories_set_updated_at
  before update on public.fish_display_categories
  for each row execute function public.fish_set_updated_at();

create table public.fish_species_display_categories (
  id uuid primary key default gen_random_uuid(),
  fish_species_id uuid not null references public.fish_species(id) on delete restrict,
  fish_display_category_id uuid not null references public.fish_display_categories(id) on delete restrict,
  is_primary boolean not null default false,
  display_order integer not null default 0,
  source_type text not null check (source_type in ('taxonomy', 'manual', 'ai_candidate')),
  review_status text not null default 'pending' check (
    review_status in ('pending', 'needs_review', 'approved', 'rejected')
  ),
  assigned_by uuid references auth.users(id) on delete set null,
  note text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fish_species_id, fish_display_category_id)
);

create unique index fish_species_display_categories_one_primary_idx
  on public.fish_species_display_categories (fish_species_id)
  where is_primary and archived_at is null and review_status = 'approved';
create index fish_species_display_categories_category_idx
  on public.fish_species_display_categories (fish_display_category_id, display_order);

create trigger fish_species_display_categories_set_updated_at
  before update on public.fish_species_display_categories
  for each row execute function public.fish_set_updated_at();

create table public.fish_species_relations (
  id uuid primary key default gen_random_uuid(),
  source_species_id uuid not null references public.fish_species(id) on delete restrict,
  target_species_id uuid not null references public.fish_species(id) on delete restrict,
  relation_type text not null check (relation_type in (
    'similar_appearance', 'same_taxon', 'same_habitat', 'confusable', 'co_search', 'substitute'
  )),
  reason text not null,
  source_type text not null check (source_type in ('official', 'manual', 'ai_candidate')),
  review_status text not null default 'pending' check (
    review_status in ('pending', 'needs_review', 'approved', 'rejected')
  ),
  display_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fish_species_relations_no_self_reference check (source_species_id <> target_species_id),
  constraint fish_species_relations_symmetric_canonical_pair check (
    relation_type not in ('similar_appearance', 'same_taxon', 'same_habitat', 'co_search')
    or source_species_id < target_species_id
  ),
  unique (source_species_id, target_species_id, relation_type)
);

create index fish_species_relations_target_idx
  on public.fish_species_relations (target_species_id, relation_type)
  where archived_at is null;
create index fish_species_relations_source_idx
  on public.fish_species_relations (source_species_id, relation_type, display_order)
  where archived_at is null;

create trigger fish_species_relations_set_updated_at
  before update on public.fish_species_relations
  for each row execute function public.fish_set_updated_at();

create table public.fish_generated_contents (
  id uuid primary key default gen_random_uuid(),
  fish_species_id uuid not null references public.fish_species(id) on delete restrict,
  content_type text not null,
  target_audience text,
  provider text not null,
  model text not null,
  prompt_version text not null,
  input_source_hash text not null,
  generated_payload jsonb not null,
  generated_at timestamptz not null,
  review_status text not null default 'pending' check (
    review_status in ('pending', 'needs_review', 'approved', 'rejected')
  ),
  published boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fish_generated_contents_publish_review_check check (
    not published or review_status = 'approved'
  )
);

create index fish_generated_contents_species_status_idx
  on public.fish_generated_contents (fish_species_id, review_status, published, generated_at desc)
  where archived_at is null;

create trigger fish_generated_contents_set_updated_at
  before update on public.fish_generated_contents
  for each row execute function public.fish_set_updated_at();

create table public.fish_media (
  id uuid primary key default gen_random_uuid(),
  fish_species_id uuid not null references public.fish_species(id) on delete restrict,
  media_type text not null check (media_type in ('image', 'thumbnail', 'illustration', 'diagram', 'video')),
  source_url text not null,
  storage_path text,
  referenced_source_media_id text,
  copyright_status text not null default 'unknown' check (
    copyright_status in ('unknown', 'verified', 'licensed', 'restricted', 'rejected')
  ),
  usage_status text not null default 'pending' check (
    usage_status in ('unknown', 'ready', 'pending', 'blocked', 'archived')
  ),
  prompt text,
  provider text,
  generation_metadata jsonb,
  review_status text not null default 'pending' check (
    review_status in ('pending', 'needs_review', 'approved', 'rejected')
  ),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fish_media_generated_metadata_check check (
    provider is null or generation_metadata is not null or prompt is not null
  )
);

create index fish_media_species_review_idx
  on public.fish_media (fish_species_id, media_type, review_status)
  where archived_at is null;

create trigger fish_media_set_updated_at
  before update on public.fish_media
  for each row execute function public.fish_set_updated_at();

create table public.fish_change_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in (
    'source_record', 'species', 'species_source', 'slug_alias', 'alias',
    'display_category', 'species_category', 'relation', 'generated_content', 'media'
  )),
  entity_id uuid not null,
  change_type text not null check (change_type in (
    'created', 'source_hash_changed', 'review_status_changed', 'publish_status_changed',
    'archived', 'restored', 'manual_correction', 'linked', 'unlinked'
  )),
  before_payload jsonb,
  after_payload jsonb,
  source_record_id uuid references public.fish_source_records(id) on delete set null,
  actor_type text not null check (actor_type in ('system', 'crawler', 'admin', 'importer')),
  created_at timestamptz not null default now(),
  constraint fish_change_logs_payload_change_check check (
    before_payload is distinct from after_payload or change_type in ('created', 'linked', 'unlinked')
  )
);

create index fish_change_logs_entity_idx
  on public.fish_change_logs (entity_type, entity_id, created_at desc);
create index fish_change_logs_source_record_idx
  on public.fish_change_logs (source_record_id, created_at desc)
  where source_record_id is not null;

-- RLS draft. Public readers receive only published, approved presentation data.
alter table public.fish_source_records enable row level security;
alter table public.fish_species enable row level security;
alter table public.fish_species_sources enable row level security;
alter table public.fish_species_slug_aliases enable row level security;
alter table public.fish_aliases enable row level security;
alter table public.fish_display_categories enable row level security;
alter table public.fish_species_display_categories enable row level security;
alter table public.fish_species_relations enable row level security;
alter table public.fish_generated_contents enable row level security;
alter table public.fish_media enable row level security;
alter table public.fish_change_logs enable row level security;

create policy "fish_species_public_read" on public.fish_species
  for select using (publish_status = 'published' and archived_at is null);
create policy "fish_slug_aliases_public_read" on public.fish_species_slug_aliases
  for select using (
    is_active and exists (
      select 1 from public.fish_species species
      where species.id = fish_species_slug_aliases.fish_species_id
        and species.publish_status = 'published' and species.archived_at is null
    )
  );
create policy "fish_aliases_public_read" on public.fish_aliases
  for select using (
    review_status = 'approved' and archived_at is null and exists (
      select 1 from public.fish_species species
      where species.id = fish_aliases.fish_species_id
        and species.publish_status = 'published' and species.archived_at is null
    )
  );
create policy "fish_display_categories_public_read" on public.fish_display_categories
  for select using (is_active and archived_at is null);
create policy "fish_species_display_categories_public_read" on public.fish_species_display_categories
  for select using (
    review_status = 'approved' and archived_at is null and exists (
      select 1 from public.fish_species species
      where species.id = fish_species_display_categories.fish_species_id
        and species.publish_status = 'published' and species.archived_at is null
    )
  );
create policy "fish_species_relations_public_read" on public.fish_species_relations
  for select using (
    review_status = 'approved' and archived_at is null and exists (
      select 1 from public.fish_species source_species
      where source_species.id = fish_species_relations.source_species_id
        and source_species.publish_status = 'published' and source_species.archived_at is null
    ) and exists (
      select 1 from public.fish_species target_species
      where target_species.id = fish_species_relations.target_species_id
        and target_species.publish_status = 'published' and target_species.archived_at is null
    )
  );
create policy "fish_generated_contents_public_read" on public.fish_generated_contents
  for select using (
    published and review_status = 'approved' and archived_at is null and exists (
      select 1 from public.fish_species species
      where species.id = fish_generated_contents.fish_species_id
        and species.publish_status = 'published' and species.archived_at is null
    )
  );
create policy "fish_media_public_read" on public.fish_media
  for select using (
    review_status = 'approved' and usage_status = 'ready'
    and copyright_status in ('verified', 'licensed') and archived_at is null and exists (
      select 1 from public.fish_species species
      where species.id = fish_media.fish_species_id
        and species.publish_status = 'published' and species.archived_at is null
    )
  );

-- Reviewers may inspect unpublished candidates, but have no direct table-write
-- policy. The narrowly-scoped review RPC below is their only write path.
create policy "fish_source_records_reviewer_read" on public.fish_source_records
  for select using (public.is_fish_reviewer());
create policy "fish_species_reviewer_read" on public.fish_species
  for select using (public.is_fish_reviewer());
create policy "fish_species_sources_reviewer_read" on public.fish_species_sources
  for select using (public.is_fish_reviewer());
create policy "fish_slug_aliases_reviewer_read" on public.fish_species_slug_aliases
  for select using (public.is_fish_reviewer());
create policy "fish_aliases_reviewer_read" on public.fish_aliases
  for select using (public.is_fish_reviewer());
create policy "fish_display_categories_reviewer_read" on public.fish_display_categories
  for select using (public.is_fish_reviewer());
create policy "fish_species_display_categories_reviewer_read" on public.fish_species_display_categories
  for select using (public.is_fish_reviewer());
create policy "fish_species_relations_reviewer_read" on public.fish_species_relations
  for select using (public.is_fish_reviewer());
create policy "fish_generated_contents_reviewer_read" on public.fish_generated_contents
  for select using (public.is_fish_reviewer());
create policy "fish_media_reviewer_read" on public.fish_media
  for select using (public.is_fish_reviewer());
create policy "fish_change_logs_reviewer_read" on public.fish_change_logs
  for select using (public.is_fish_reviewer());

-- Administrators own review, publication, links, aliases, and change logs.
create policy "fish_source_records_admin_all" on public.fish_source_records
  for all using (public.is_fish_admin()) with check (public.is_fish_admin());
create policy "fish_species_admin_all" on public.fish_species
  for all using (public.is_fish_admin()) with check (public.is_fish_admin());
create policy "fish_species_sources_admin_all" on public.fish_species_sources
  for all using (public.is_fish_admin()) with check (public.is_fish_admin());
create policy "fish_slug_aliases_admin_all" on public.fish_species_slug_aliases
  for all using (public.is_fish_admin()) with check (public.is_fish_admin());
create policy "fish_aliases_admin_all" on public.fish_aliases
  for all using (public.is_fish_admin()) with check (public.is_fish_admin());
create policy "fish_display_categories_admin_all" on public.fish_display_categories
  for all using (public.is_fish_admin()) with check (public.is_fish_admin());
create policy "fish_species_display_categories_admin_all" on public.fish_species_display_categories
  for all using (public.is_fish_admin()) with check (public.is_fish_admin());
create policy "fish_species_relations_admin_all" on public.fish_species_relations
  for all using (public.is_fish_admin()) with check (public.is_fish_admin());
create policy "fish_generated_contents_admin_all" on public.fish_generated_contents
  for all using (public.is_fish_admin()) with check (public.is_fish_admin());
create policy "fish_media_admin_all" on public.fish_media
  for all using (public.is_fish_admin()) with check (public.is_fish_admin());
create policy "fish_change_logs_admin_read" on public.fish_change_logs
  for select using (public.is_fish_admin());
create policy "fish_change_logs_admin_insert" on public.fish_change_logs
  for insert with check (public.is_fish_admin());

-- A crawler can write only immutable source snapshots. It cannot publish,
-- link sources to species, or change canonical/AI/media records.
create policy "fish_source_records_crawler_insert" on public.fish_source_records
  for insert with check (public.is_fish_crawler());

-- Reviewer writes are limited to review-status fields. This function is the
-- only reviewer mutation path; it cannot publish species or alter provenance.
create or replace function public.review_fish_entity(
  p_entity_type text,
  p_entity_id uuid,
  p_review_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_fish_reviewer() then
    raise exception 'fish reviewer role required';
  end if;
  if p_review_status not in ('pending', 'needs_review', 'approved', 'rejected') then
    raise exception 'invalid review status';
  end if;

  case p_entity_type
    when 'species_fact' then
      update public.fish_species set fact_review_status = p_review_status where id = p_entity_id;
    when 'alias' then
      update public.fish_aliases set review_status = p_review_status where id = p_entity_id;
    when 'category_assignment' then
      update public.fish_species_display_categories set review_status = p_review_status where id = p_entity_id;
    when 'relation' then
      update public.fish_species_relations set review_status = p_review_status where id = p_entity_id;
    when 'generated_content' then
      update public.fish_generated_contents set review_status = p_review_status where id = p_entity_id;
    when 'media' then
      update public.fish_media set review_status = p_review_status where id = p_entity_id;
    else
      raise exception 'unsupported review entity type';
  end case;

  if not found then
    raise exception 'review entity not found';
  end if;
end;
$$;

grant execute on function public.review_fish_entity(text, uuid, text) to authenticated;
