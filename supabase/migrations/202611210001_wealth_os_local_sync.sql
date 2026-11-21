create table if not exists public.wealth_os_tenants (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9_-]{0,62}$'),
  name text not null,
  trading_name text not null,
  configuration jsonb not null check (jsonb_typeof(configuration) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.wealth_os_projects (
  id text primary key,
  tenant_id text not null references public.wealth_os_tenants(id) on delete cascade,
  status text not null check (status in ('draft', 'published')),
  configuration jsonb not null check (jsonb_typeof(configuration) = 'object'),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create unique index if not exists wealth_os_one_draft_project_per_tenant
  on public.wealth_os_projects(tenant_id)
  where status = 'draft';

create table if not exists public.wealth_os_scenarios (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.wealth_os_tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  assumptions jsonb not null check (jsonb_typeof(assumptions) = 'object'),
  result jsonb not null check (jsonb_typeof(result) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wealth_os_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.wealth_os_tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  request_type text not null,
  details jsonb not null check (jsonb_typeof(details) = 'object'),
  status text not null default 'submitted' check (status in ('submitted', 'reviewing', 'completed', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wealth_os_tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.wealth_os_tenants(id) on delete cascade,
  adviser_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid,
  title text not null,
  details text,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wealth_os_notes (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.wealth_os_tenants(id) on delete cascade,
  adviser_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.wealth_os_tenants enable row level security;
alter table public.wealth_os_projects enable row level security;
alter table public.wealth_os_scenarios enable row level security;
alter table public.wealth_os_requests enable row level security;
alter table public.wealth_os_tasks enable row level security;
alter table public.wealth_os_notes enable row level security;

revoke all on public.wealth_os_tenants from anon, authenticated;
revoke all on public.wealth_os_projects from anon, authenticated;
revoke all on public.wealth_os_scenarios from anon, authenticated;
revoke all on public.wealth_os_requests from anon, authenticated;
revoke all on public.wealth_os_tasks from anon, authenticated;
revoke all on public.wealth_os_notes from anon, authenticated;

grant select on public.wealth_os_tenants to authenticated;
grant select on public.wealth_os_projects to authenticated;
grant select, insert, update, delete on public.wealth_os_scenarios to authenticated;
grant select, insert, update on public.wealth_os_requests to authenticated;
grant select, insert, update, delete on public.wealth_os_tasks to authenticated;
grant select, insert, update, delete on public.wealth_os_notes to authenticated;

drop policy if exists "Tenant members read tenant configuration" on public.wealth_os_tenants;
create policy "Tenant members read tenant configuration"
  on public.wealth_os_tenants for select to authenticated
  using (id = coalesce(auth.jwt() -> 'app_metadata' ->> 'tenant_id', 'default'));

drop policy if exists "Admins read tenant projects" on public.wealth_os_projects;
create policy "Admins read tenant projects"
  on public.wealth_os_projects for select to authenticated
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    and tenant_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'tenant_id', 'default')
  );

drop policy if exists "Clients manage own scenarios" on public.wealth_os_scenarios;
create policy "Clients manage own scenarios"
  on public.wealth_os_scenarios for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Clients manage own requests" on public.wealth_os_requests;
create policy "Clients manage own requests"
  on public.wealth_os_requests for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Advisers manage tenant tasks" on public.wealth_os_tasks;
create policy "Advisers manage tenant tasks"
  on public.wealth_os_tasks for all to authenticated
  using (
    adviser_id = auth.uid()
    and tenant_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'tenant_id', 'default')
  )
  with check (
    adviser_id = auth.uid()
    and tenant_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'tenant_id', 'default')
  );

drop policy if exists "Advisers manage tenant notes" on public.wealth_os_notes;
create policy "Advisers manage tenant notes"
  on public.wealth_os_notes for all to authenticated
  using (
    adviser_id = auth.uid()
    and tenant_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'tenant_id', 'default')
  )
  with check (
    adviser_id = auth.uid()
    and tenant_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'tenant_id', 'default')
  );

insert into public.wealth_os_tenants (id, name, trading_name, configuration)
values ('default', 'WEALTH OS', 'WEALTH OS', '{"schemaVersion":1,"sample":true}'::jsonb)
on conflict (id) do nothing;
