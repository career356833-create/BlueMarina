create table if not exists public.blue_marina_learning_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  license_type text not null check (license_type in ('general', 'yacht')),
  progress jsonb not null default '{}'::jsonb,
  wrong_ids jsonb not null default '[]'::jsonb,
  answer_history jsonb not null default '[]'::jsonb,
  exam_history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, license_type)
);

create index if not exists blue_marina_learning_states_user_id_idx
  on public.blue_marina_learning_states (user_id);

create index if not exists blue_marina_learning_states_license_type_idx
  on public.blue_marina_learning_states (license_type);

alter table public.blue_marina_learning_states enable row level security;

drop policy if exists "blue_marina_learning_states_own_select" on public.blue_marina_learning_states;
drop policy if exists "blue_marina_learning_states_own_insert" on public.blue_marina_learning_states;
drop policy if exists "blue_marina_learning_states_own_update" on public.blue_marina_learning_states;
drop policy if exists "blue_marina_learning_states_own_delete" on public.blue_marina_learning_states;

create policy "blue_marina_learning_states_own_select" on public.blue_marina_learning_states
  for select using (user_id = auth.uid());

create policy "blue_marina_learning_states_own_insert" on public.blue_marina_learning_states
  for insert with check (user_id = auth.uid());

create policy "blue_marina_learning_states_own_update" on public.blue_marina_learning_states
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "blue_marina_learning_states_own_delete" on public.blue_marina_learning_states
  for delete using (user_id = auth.uid());
