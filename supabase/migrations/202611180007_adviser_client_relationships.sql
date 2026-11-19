create table if not exists public.adviser_client_relationships (
  id uuid primary key default gen_random_uuid(),
  adviser_user_id uuid not null references auth.users(id) on delete cascade,
  client_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (adviser_user_id, client_user_id)
);

create index if not exists adviser_client_relationship_adviser_idx
  on public.adviser_client_relationships(adviser_user_id, status);
create index if not exists adviser_client_relationship_client_idx
  on public.adviser_client_relationships(client_user_id, status);

alter table public.adviser_client_relationships enable row level security;

revoke all on public.adviser_client_relationships from public, anon, authenticated;
grant all on public.adviser_client_relationships to service_role;

drop policy if exists adviser_client_relationship_own_select on public.adviser_client_relationships;
create policy adviser_client_relationship_own_select
  on public.adviser_client_relationships for select to authenticated
  using (
    adviser_user_id = auth.uid()
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
