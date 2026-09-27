-- Blue Marina Auth/Profile baseline. Install before the existing Account migration.
-- Do not use the unrelated legacy supabase/schema.sql as this product's baseline.
begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  display_name text,
  avatar_url text,
  region text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
revoke all on table public.profiles from public, anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name, avatar_url, region, bio, updated_at) on table public.profiles to authenticated;

create policy blue_marina_profiles_own_select on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy blue_marina_profiles_own_update on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create schema if not exists blue_marina_private;
revoke all on schema blue_marina_private from public, anon, authenticated;

create function blue_marina_private.create_profile_for_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function blue_marina_private.create_profile_for_auth_user() from public, anon, authenticated;

create trigger blue_marina_auth_user_profile_created
  after insert on auth.users
  for each row execute function blue_marina_private.create_profile_for_auth_user();

commit;
