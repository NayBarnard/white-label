create table if not exists public.wealth_decisions (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.wealth_os_tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid,
  title text not null,
  status text not null default 'open' check (status in ('open','approved','declined','superseded')),
  created_at timestamptz not null default now()
);

create table if not exists public.wealth_decision_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.wealth_os_tenants(id) on delete cascade,
  decision_id uuid not null references public.wealth_decisions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('context','alternative','assumption','approval','outcome','comparison','correction')),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now()
);

create table if not exists public.wealth_parallel_plans (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.wealth_os_tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid,
  name text not null,
  assumptions jsonb not null check (jsonb_typeof(assumptions) = 'object'),
  result jsonb not null check (jsonb_typeof(result) = 'object'),
  tradeoffs jsonb not null check (jsonb_typeof(tradeoffs) = 'array'),
  calculation_version text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.wealth_risk_analyses (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.wealth_os_tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid,
  holdings jsonb not null check (jsonb_typeof(holdings) = 'array'),
  findings jsonb not null check (jsonb_typeof(findings) = 'array'),
  methodology jsonb not null check (jsonb_typeof(methodology) = 'object'),
  created_at timestamptz not null default now()
);

alter table public.wealth_decisions enable row level security;
alter table public.wealth_decision_events enable row level security;
alter table public.wealth_parallel_plans enable row level security;
alter table public.wealth_risk_analyses enable row level security;

revoke all on public.wealth_decisions, public.wealth_decision_events,
  public.wealth_parallel_plans, public.wealth_risk_analyses
  from anon, authenticated;

grant select, insert, update, delete on public.wealth_decisions to authenticated;
grant select, insert on public.wealth_decision_events to authenticated;
grant select, insert, update, delete on public.wealth_parallel_plans to authenticated;
grant select, insert, update, delete on public.wealth_risk_analyses to authenticated;

drop policy if exists "Users manage own tenant decisions" on public.wealth_decisions;
create policy "Users manage own tenant decisions"
  on public.wealth_decisions for all to authenticated
  using (user_id = auth.uid() and tenant_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'tenant_id', 'default'))
  with check (user_id = auth.uid() and tenant_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'tenant_id', 'default'));

drop policy if exists "Users append own tenant decision events" on public.wealth_decision_events;
create policy "Users append own tenant decision events"
  on public.wealth_decision_events for select, insert to authenticated
  using (user_id = auth.uid() and tenant_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'tenant_id', 'default'))
  with check (user_id = auth.uid() and tenant_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'tenant_id', 'default'));

drop policy if exists "Users manage own tenant parallel plans" on public.wealth_parallel_plans;
create policy "Users manage own tenant parallel plans"
  on public.wealth_parallel_plans for all to authenticated
  using (user_id = auth.uid() and tenant_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'tenant_id', 'default'))
  with check (user_id = auth.uid() and tenant_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'tenant_id', 'default'));

drop policy if exists "Users manage own tenant risk analyses" on public.wealth_risk_analyses;
create policy "Users manage own tenant risk analyses"
  on public.wealth_risk_analyses for all to authenticated
  using (user_id = auth.uid() and tenant_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'tenant_id', 'default'))
  with check (user_id = auth.uid() and tenant_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'tenant_id', 'default'));
