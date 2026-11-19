create table if not exists public.staff_profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  role text not null check (role in ('admin', 'adviser', 'compliance', 'operations')),
  full_name text not null check (char_length(btrim(full_name)) between 1 and 160),
  is_active boolean not null default true,
  last_sign_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_crm_notes (
  id uuid primary key default gen_random_uuid(),
  client_user_id uuid not null references auth.users(id) on delete restrict,
  author_user_id uuid not null references auth.users(id) on delete restrict,
  note text not null check (char_length(btrim(note)) between 1 and 5000),
  created_at timestamptz not null default now()
);

create table if not exists public.client_crm_tasks (
  id uuid primary key default gen_random_uuid(),
  client_user_id uuid not null references auth.users(id) on delete restrict,
  owner_user_id uuid references auth.users(id) on delete set null,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  details text check (details is null or char_length(details) <= 5000),
  follow_up_on date,
  review_on date,
  status text not null default 'open' check (status in ('open', 'in_progress', 'completed', 'cancelled')),
  tags text[] not null default '{}',
  complaints_flag boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_crm_notes_client_created_idx
  on public.client_crm_notes(client_user_id, created_at desc);
create index if not exists client_crm_tasks_client_status_idx
  on public.client_crm_tasks(client_user_id, status, follow_up_on);

alter table public.staff_profiles enable row level security;
alter table public.client_crm_notes enable row level security;
alter table public.client_crm_tasks enable row level security;

revoke all on public.staff_profiles, public.client_crm_notes, public.client_crm_tasks
  from public, anon, authenticated;
grant all on public.staff_profiles, public.client_crm_notes, public.client_crm_tasks
  to service_role;

drop policy if exists staff_profiles_staff_read on public.staff_profiles;
create policy staff_profiles_staff_read
  on public.staff_profiles for select to authenticated
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'adviser', 'compliance', 'operations')
  );

drop policy if exists crm_notes_staff_only on public.client_crm_notes;
create policy crm_notes_staff_only
  on public.client_crm_notes for select to authenticated
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'adviser', 'compliance', 'operations')
  );

drop policy if exists crm_tasks_staff_only on public.client_crm_tasks;
create policy crm_tasks_staff_only
  on public.client_crm_tasks for select to authenticated
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'adviser', 'compliance', 'operations')
  );
