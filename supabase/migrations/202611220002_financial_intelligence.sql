create table if not exists public.wealth_financial_twins (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.wealth_os_tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid,
  name text not null,
  calculation_version text not null,
  seed integer not null check (seed between 0 and 2147483647),
  assumptions jsonb not null check (jsonb_typeof(assumptions) = 'object'),
  observed_data jsonb not null default '{}'::jsonb check (jsonb_typeof(observed_data) = 'object'),
  result jsonb not null check (jsonb_typeof(result) = 'object'),
  methodology jsonb not null check (jsonb_typeof(methodology) = 'object'),
  created_at timestamptz not null default now()
);

create table if not exists public.wealth_consequence_nodes (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.wealth_os_tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid,
  node_type text not null check (node_type in ('goal','asset','liability','cash_flow','investment','tax','financial_plan','life_event')),
  label text not null,
  evidence jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence) = 'array'),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wealth_consequence_edges (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.wealth_os_tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_node_id uuid not null references public.wealth_consequence_nodes(id) on delete cascade,
  target_node_id uuid not null references public.wealth_consequence_nodes(id) on delete cascade,
  relationship text not null,
  explanation text not null,
  evidence jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence) = 'array'),
  confidence text not null check (confidence in ('verified','calculated','uncertain')),
  created_at timestamptz not null default now()
);

create table if not exists public.wealth_consequence_analyses (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.wealth_os_tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid,
  twin_id uuid references public.wealth_financial_twins(id) on delete set null,
  proposed_change jsonb not null check (jsonb_typeof(proposed_change) = 'object'),
  affected_nodes jsonb not null check (jsonb_typeof(affected_nodes) = 'array'),
  explanations jsonb not null check (jsonb_typeof(explanations) = 'array'),
  calculation_version text not null,
  created_at timestamptz not null default now()
);

-- Strengthen the existing scenario table's tenant boundary for the same feature
-- family. Existing scenario rows remain accessible only to their owning user
-- and the JWT tenant that owns the row.
drop policy if exists "Clients manage own scenarios" on public.wealth_os_scenarios;
create policy "Clients manage own tenant scenarios"
  on public.wealth_os_scenarios for all to authenticated
  using (
    user_id = auth.uid()
    and tenant_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'tenant_id', 'default')
  )
  with check (
    user_id = auth.uid()
    and tenant_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'tenant_id', 'default')
  );

alter table public.wealth_financial_twins enable row level security;
alter table public.wealth_consequence_nodes enable row level security;
alter table public.wealth_consequence_edges enable row level security;
alter table public.wealth_consequence_analyses enable row level security;

revoke all on public.wealth_financial_twins from anon, authenticated;
revoke all on public.wealth_consequence_nodes from anon, authenticated;
revoke all on public.wealth_consequence_edges from anon, authenticated;
revoke all on public.wealth_consequence_analyses from anon, authenticated;

grant select, insert, update, delete on public.wealth_financial_twins to authenticated;
grant select, insert, update, delete on public.wealth_consequence_nodes to authenticated;
grant select, insert, update, delete on public.wealth_consequence_edges to authenticated;
grant select, insert, update, delete on public.wealth_consequence_analyses to authenticated;

drop policy if exists "Users manage own tenant twin runs" on public.wealth_financial_twins;
create policy "Users manage own tenant twin runs"
  on public.wealth_financial_twins for all to authenticated
  using (
    user_id = auth.uid()
    and tenant_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'tenant_id', 'default')
  )
  with check (
    user_id = auth.uid()
    and tenant_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'tenant_id', 'default')
  );

drop policy if exists "Users manage own tenant consequence nodes" on public.wealth_consequence_nodes;
create policy "Users manage own tenant consequence nodes"
  on public.wealth_consequence_nodes for all to authenticated
  using (
    user_id = auth.uid()
    and tenant_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'tenant_id', 'default')
  )
  with check (
    user_id = auth.uid()
    and tenant_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'tenant_id', 'default')
  );

drop policy if exists "Users manage own tenant consequence edges" on public.wealth_consequence_edges;
create policy "Users manage own tenant consequence edges"
  on public.wealth_consequence_edges for all to authenticated
  using (
    user_id = auth.uid()
    and tenant_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'tenant_id', 'default')
  )
  with check (
    user_id = auth.uid()
    and tenant_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'tenant_id', 'default')
  );

drop policy if exists "Users manage own tenant consequence analyses" on public.wealth_consequence_analyses;
create policy "Users manage own tenant consequence_analyses"
  on public.wealth_consequence_analyses for all to authenticated
  using (
    user_id = auth.uid()
    and tenant_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'tenant_id', 'default')
  )
  with check (
    user_id = auth.uid()
    and tenant_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'tenant_id', 'default')
  );
