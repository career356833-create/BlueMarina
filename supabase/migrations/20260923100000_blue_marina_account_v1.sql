begin;

alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists region text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

alter table public.profiles drop constraint if exists profiles_display_name_length;
alter table public.profiles add constraint profiles_display_name_length check (display_name is null or char_length(display_name) between 1 and 50);
alter table public.profiles drop constraint if exists profiles_region_length;
alter table public.profiles add constraint profiles_region_length check (region is null or char_length(region) between 1 and 80);
alter table public.profiles drop constraint if exists profiles_bio_length;
alter table public.profiles add constraint profiles_bio_length check (bio is null or char_length(bio) between 1 and 300);
alter table public.profiles drop constraint if exists profiles_avatar_url_protocol;
alter table public.profiles add constraint profiles_avatar_url_protocol check (avatar_url is null or avatar_url ~ '^https?://');

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);

create table if not exists public.user_saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('FISHING_SPOT','FISH','CHARTER','MARKET_LISTING')),
  entity_id text not null check (char_length(entity_id) between 1 and 160),
  label text check (label is null or char_length(label) between 1 and 160),
  href text check (href is null or href ~ '^/[^/]'),
  created_at timestamptz not null default now(),
  unique (user_id, entity_type, entity_id)
);

create index if not exists user_saved_items_user_created_idx on public.user_saved_items (user_id, created_at desc);
alter table public.user_saved_items enable row level security;

drop policy if exists "Users can read own saved items" on public.user_saved_items;
create policy "Users can read own saved items" on public.user_saved_items for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users can create own saved items" on public.user_saved_items;
create policy "Users can create own saved items" on public.user_saved_items for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users can delete own saved items" on public.user_saved_items;
create policy "Users can delete own saved items" on public.user_saved_items for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.user_saved_items from anon;
grant select, insert, delete on public.user_saved_items to authenticated;

commit;
