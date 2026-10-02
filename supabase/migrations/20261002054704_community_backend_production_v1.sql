-- Community V1: unreviewed submissions are private. No automatic publication.
create table public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('CATCH_REPORT','TRIP_REVIEW','REGIONAL','QNA','CAPTAIN_NOTICE','GENERAL')),
  title text not null check (char_length(title) between 4 and 100),
  body text not null check (char_length(body) between 20 and 5000),
  province text not null default '' check (char_length(province) <= 30),
  district text check (char_length(district) <= 40),
  linked_species_ids text[] not null default '{}',
  linked_fishing_spot_ids text[] not null default '{}',
  linked_charter_ids text[] not null default '{}',
  linked_market_listing_ids text[] not null default '{}',
  status text not null default 'SUBMITTED' check (status in ('DRAFT','SUBMITTED','ACTIVE','HIDDEN','REJECTED','DELETED')),
  moderation_status text not null default 'REVIEW_REQUIRED' check (moderation_status in ('REVIEW_REQUIRED','APPROVED','REJECTED','FLAGGED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'ACTIVE' or moderation_status = 'APPROVED')
);
create index community_posts_public_idx on public.community_posts (created_at desc) where status = 'ACTIVE';
create index community_posts_author_idx on public.community_posts (author_id, updated_at desc);

create table public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','HIDDEN','DELETED','FLAGGED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index community_comments_post_idx on public.community_comments (post_id, created_at, id);

create table public.community_reactions (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('LIKE','HELPFUL')),
  created_at timestamptz not null default now(),
  primary key (post_id, actor_id, type)
);

create table public.community_reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('POST','COMMENT')),
  target_id uuid not null,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('SPAM','HARASSMENT','ILLEGAL_TRADE','PERSONAL_INFORMATION','MISLEADING_SAFETY','PROTECTED_SPECIES','OTHER')),
  detail text check (char_length(detail) <= 1000),
  status text not null default 'SUBMITTED' check (status in ('SUBMITTED','REVIEWED')),
  created_at timestamptz not null default now(),
  unique (target_type, target_id, reporter_id, reason)
);
create index community_reports_status_idx on public.community_reports (status, created_at);

alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_reactions enable row level security;
alter table public.community_reports enable row level security;

revoke all on public.community_posts, public.community_comments, public.community_reactions, public.community_reports from public, anon, authenticated;
grant select, insert, update on public.community_posts, public.community_comments to service_role;
grant select, insert, delete on public.community_reactions to service_role;
grant select, insert on public.community_reports to service_role;

-- Direct Data API users can only edit content columns, never moderation or ownership.
grant select on public.community_posts to anon, authenticated;
-- Entity links are written only through the validating server API.
grant insert (author_id,type,title,body,province,district) on public.community_posts to authenticated;
grant update (title,body,province,district) on public.community_posts to authenticated;
grant select on public.community_comments to anon, authenticated;
grant insert (post_id,author_id,body) on public.community_comments to authenticated;
grant update (body) on public.community_comments to authenticated;
grant delete on public.community_comments to authenticated;
grant select on public.community_reactions to authenticated;
grant insert (post_id,actor_id,type) on public.community_reactions to authenticated;
grant delete on public.community_reactions to authenticated;
grant select on public.community_reports to authenticated;
grant insert (target_type,target_id,reporter_id,reason,detail) on public.community_reports to authenticated;

create policy community_posts_public_read on public.community_posts for select to anon, authenticated using (status = 'ACTIVE' and moderation_status = 'APPROVED');
create policy community_posts_own_read on public.community_posts for select to authenticated using (author_id = (select auth.uid()));
create policy community_posts_own_insert on public.community_posts for insert to authenticated with check (author_id = (select auth.uid()) and status = 'SUBMITTED' and moderation_status = 'REVIEW_REQUIRED');
create policy community_posts_own_update on public.community_posts for update to authenticated using (author_id = (select auth.uid()) and status in ('DRAFT','SUBMITTED') and moderation_status = 'REVIEW_REQUIRED') with check (author_id = (select auth.uid()) and status in ('DRAFT','SUBMITTED') and moderation_status = 'REVIEW_REQUIRED');
create policy community_comments_read on public.community_comments for select to anon, authenticated using (status = 'ACTIVE' and exists (select 1 from public.community_posts p where p.id = post_id and p.status = 'ACTIVE' and p.moderation_status = 'APPROVED'));
create policy community_comments_own_read on public.community_comments for select to authenticated using (author_id = (select auth.uid()) or exists (select 1 from public.community_posts p where p.id = post_id and p.author_id = (select auth.uid())));
create policy community_comments_own_insert on public.community_comments for insert to authenticated with check (author_id = (select auth.uid()) and status = 'ACTIVE' and exists (select 1 from public.community_posts p where p.id = post_id and (p.status = 'ACTIVE' or (p.status = 'SUBMITTED' and p.author_id = (select auth.uid())))));
create policy community_comments_own_update on public.community_comments for update to authenticated using (author_id = (select auth.uid()) and status = 'ACTIVE') with check (author_id = (select auth.uid()) and status = 'ACTIVE');
create policy community_comments_own_delete on public.community_comments for delete to authenticated using (author_id = (select auth.uid()));
create policy community_reactions_own_read on public.community_reactions for select to authenticated using (actor_id = (select auth.uid()));
create policy community_reactions_own_insert on public.community_reactions for insert to authenticated with check (actor_id = (select auth.uid()) and exists (select 1 from public.community_posts p where p.id = post_id and (p.status = 'ACTIVE' or (p.status = 'SUBMITTED' and p.author_id = (select auth.uid())))));
create policy community_reactions_own_delete on public.community_reactions for delete to authenticated using (actor_id = (select auth.uid()));
create policy community_reports_own_read on public.community_reports for select to authenticated using (reporter_id = (select auth.uid()));
create policy community_reports_own_insert on public.community_reports for insert to authenticated with check (
  reporter_id = (select auth.uid()) and status = 'SUBMITTED' and
  ((target_type = 'POST' and exists (select 1 from public.community_posts p where p.id = target_id and p.status = 'ACTIVE' and p.author_id <> (select auth.uid()))) or
   (target_type = 'COMMENT' and exists (select 1 from public.community_comments c join public.community_posts p on p.id = c.post_id where c.id = target_id and c.status = 'ACTIVE' and p.status = 'ACTIVE' and c.author_id <> (select auth.uid()))))
);
