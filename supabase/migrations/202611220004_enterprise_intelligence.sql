create table if not exists public.wealth_opportunities (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.wealth_os_tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid,
  title text not null,
  evidence jsonb not null check (jsonb_typeof(evidence) = 'array'),
  rationale text not null,
  missing_information jsonb not null default '[]'::jsonb check (jsonb_typeof(missing_information) = 'array'),
  benefits jsonb not null check (jsonb_typeof(benefits) = 'array'),
  risks jsonb not null check (jsonb_typeof(risks) = 'array'),
  review_status text not null default 'pending' check (review_status in ('pending','reviewed','accepted','declined')),
  created_at timestamptz not null default now()
);

create table if not exists public.wealth_relationship_nodes (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.wealth_os_tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('person','household','company','trust','beneficiary','account','asset','obligation')),
  label text not null,
  verified boolean not null default false,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create table if not exists public.wealth_relationship_edges (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.wealth_os_tenants(id) on delete cascade,
  source_node_id uuid not null references public.wealth_relationship_nodes(id) on delete cascade,
  target_node_id uuid not null references public.wealth_relationship_nodes(id) on delete cascade,
  relationship text not null,
  authorised boolean not null default false,
  evidence jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence) = 'array'),
  created_at timestamptz not null default now()
);

create table if not exists public.wealth_knowledge_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.wealth_os_tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  record_type text not null check (record_type in ('process','decision','exception','research','approved_document')),
  title text not null,
  summary text not null,
  source_reference text not null,
  tags text[] not null default '{}',
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.wealth_crisis_scenarios (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.wealth_os_tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  assumptions jsonb not null check (jsonb_typeof(assumptions) = 'object'),
  estimated_exposure jsonb not null check (jsonb_typeof(estimated_exposure) = 'object'),
  methodology jsonb not null check (jsonb_typeof(methodology) = 'object'),
  created_at timestamptz not null default now()
);

create table if not exists public.wealth_innovation_evaluations (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.wealth_os_tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  exists_repository boolean not null,
  exists_competitor boolean not null,
  materially_differentiated boolean not null,
  implementation_ready boolean not null,
  meaningful_value boolean not null,
  defensible_ip_assessment text not null,
  evidence jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence) = 'array'),
  created_at timestamptz not null default now()
);

alter table public.wealth_opportunities enable row level security;
alter table public.wealth_relationship_nodes enable row level security;
alter table public.wealth_relationship_edges enable row level security;
alter table public.wealth_knowledge_records enable row level security;
alter table public.wealth_crisis_scenarios enable row level security;
alter table public.wealth_innovation_evaluations enable row level security;

revoke all on public.wealth_opportunities, public.wealth_relationship_nodes,
  public.wealth_relationship_edges, public.wealth_knowledge_records,
  public.wealth_crisis_scenarios, public.wealth_innovation_evaluations
  from anon, authenticated;

grant select, insert, update, delete on public.wealth_opportunities to authenticated;
grant select, insert, update, delete on public.wealth_relationship_nodes to authenticated;
grant select, insert, update, delete on public.wealth_relationship_edges to authenticated;
grant select, insert, update, delete on public.wealth_knowledge_records to authenticated;
grant select, insert, update, delete on public.wealth_crisis_scenarios to authenticated;
grant select, insert, update, delete on public.wealth_innovation_evaluations to authenticated;

drop policy if exists "Users manage tenant intelligence records" on public.wealth_opportunities;
create policy "Users manage tenant opportunities"
  on public.wealth_opportunities for all to authenticated
  using (user_id = auth.uid() and tenant_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'tenant_id', 'default'))
  with check (user_id = auth.uid() and tenant_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'tenant_id', 'default'));

drop policy if exists "Users manage tenant relationship nodes" on public.wealth_relationship_nodes;
create policy "Users manage tenant relationship nodes"
  on public.wealth_relationship_nodes for all to authenticated
  using (tenant_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'tenant_id', 'default'))
  with check (tenant_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'tenant_id', 'default'));

drop policy if exists "Users manage tenant relationship edges" on public.wealth_relationship_edges;
create policy "Users manage tenant relationship edges"
  on public.wealth_relationship_edges for all to authenticated
  using (tenant_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'tenant_id', 'default'))
  with check (tenant_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'tenant_id', 'default'));

drop policy if exists "Users read approved tenant knowledge" on public.wealth_knowledge_records;
create policy "Users read approved tenant knowledge"
  on public.wealth_knowledge_records for select to authenticated
  using (approved and tenant_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'tenant_id', 'default'));

drop policy if exists "Users manage own tenant crisis scenarios" on public.wealth_crisis_scenarios;
create policy "Users manage own tenant crisis scenarios"
  on public.wealth_crisis_scenarios for all to authenticated
  using (user_id = auth.uid() and tenant_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'tenant_id', 'default'))
  with check (user_id = auth.uid() and tenant_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'tenant_id', 'default'));

drop policy if exists "Users manage own tenant innovation evaluations" on public.wealth_innovation_evaluations;
create policy "Users manage own tenant innovation evaluations"
  on public.wealth_innovation_evaluations for all to authenticated
  using (user_id = auth.uid() and tenant_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'tenant_id', 'default'))
  with check (user_id = auth.uid() and tenant_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'tenant_id', 'default'));
