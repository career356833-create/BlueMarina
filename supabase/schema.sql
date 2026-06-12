create extension if not exists "pgcrypto";

create type public.user_role as enum ('owner', 'teacher', 'admin');
create type public.institution_type as enum ('daycare', 'kindergarten');
create type public.content_type as enum ('notice', 'newsletter', 'homepage', 'blog', 'instagram');
create type public.subscription_status as enum ('free', 'trialing', 'active', 'past_due', 'canceled');
create type public.tone_type as enum ('warm', 'professional', 'simple', 'promotion');
create type public.upload_status as enum ('pending', 'completed', 'failed');
create type public.instagram_image_selection_mode as enum ('auto_first_3', 'manual', 'ai_recommended');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role public.user_role not null default 'teacher',
  full_name text,
  created_at timestamptz not null default now()
);

create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  name text not null,
  institution_type public.institution_type not null default 'daycare',
  logo_url text,
  address text not null default '',
  phone text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.user_role not null default 'teacher',
  created_at timestamptz not null default now(),
  unique (institution_id, user_id)
);

create table public.uploaded_images (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references public.institutions(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  storage_path text not null,
  public_url text not null,
  mime_type text not null,
  created_at timestamptz not null default now()
);

create table public.generated_contents (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references public.institutions(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  content_type public.content_type not null,
  keywords text[] not null default '{}',
  title text not null,
  body text not null,
  sections jsonb not null default '[]',
  hashtags text[] not null default '{}',
  image_urls text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.generation_records (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references public.institutions(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  uploaded_images jsonb not null default '[]',
  keywords text[] not null default '{}',
  activity_name text not null,
  class_name text not null default '',
  age_group text not null default '',
  activity_date date,
  tone public.tone_type not null default 'warm',
  analyze_photos boolean not null default false,
  notice_text text not null default '',
  newsletter_text text not null default '',
  homepage_text text not null default '',
  blog_text text not null default '',
  instagram_text text not null default '',
  upload_status_homepage public.upload_status not null default 'pending',
  upload_status_blog public.upload_status not null default 'pending',
  upload_status_instagram public.upload_status not null default 'pending',
  instagram_selected_images jsonb not null default '[]',
  instagram_image_selection_mode public.instagram_image_selection_mode not null default 'auto_first_3',
  generation_count integer not null default 1,
  regeneration_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.daily_usage_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  usage_date date not null default current_date,
  generation_count integer not null default 0,
  regeneration_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, usage_date)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  status public.subscription_status not null default 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id)
);

alter table public.profiles enable row level security;
alter table public.institutions enable row level security;
alter table public.memberships enable row level security;
alter table public.uploaded_images enable row level security;
alter table public.generated_contents enable row level security;
alter table public.generation_records enable row level security;
alter table public.daily_usage_limits enable row level security;
alter table public.subscriptions enable row level security;

create policy "profiles_read_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create policy "institutions_member_read" on public.institutions
  for select using (
    exists (
      select 1 from public.memberships m
      where m.institution_id = institutions.id and m.user_id = auth.uid()
    )
  );

create policy "institutions_owner_write" on public.institutions
  for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "memberships_member_read" on public.memberships
  for select using (user_id = auth.uid());

create policy "generated_contents_member_access" on public.generated_contents
  for all using (
    institution_id is null or exists (
      select 1 from public.memberships m
      where m.institution_id = generated_contents.institution_id and m.user_id = auth.uid()
    )
  )
  with check (
    institution_id is null or exists (
      select 1 from public.memberships m
      where m.institution_id = generated_contents.institution_id and m.user_id = auth.uid()
    )
  );

create policy "generation_records_member_access" on public.generation_records
  for all using (
    institution_id is null or exists (
      select 1 from public.memberships m
      where m.institution_id = generation_records.institution_id and m.user_id = auth.uid()
    )
  )
  with check (
    institution_id is null or exists (
      select 1 from public.memberships m
      where m.institution_id = generation_records.institution_id and m.user_id = auth.uid()
    )
  );

create policy "daily_usage_own_access" on public.daily_usage_limits
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "uploaded_images_member_access" on public.uploaded_images
  for all using (
    institution_id is null or exists (
      select 1 from public.memberships m
      where m.institution_id = uploaded_images.institution_id and m.user_id = auth.uid()
    )
  )
  with check (
    institution_id is null or exists (
      select 1 from public.memberships m
      where m.institution_id = uploaded_images.institution_id and m.user_id = auth.uid()
    )
  );

create policy "subscriptions_member_read" on public.subscriptions
  for select using (
    exists (
      select 1 from public.memberships m
      where m.institution_id = subscriptions.institution_id and m.user_id = auth.uid()
    )
  );

insert into storage.buckets (id, name, public)
values ('content-images', 'content-images', true)
on conflict (id) do nothing;

create policy "content_images_public_read" on storage.objects
  for select using (bucket_id = 'content-images');

create policy "content_images_authenticated_upload" on storage.objects
  for insert with check (bucket_id = 'content-images' and auth.role() = 'authenticated');
