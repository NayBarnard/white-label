alter table public.wealth_os_tenants
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'active', 'suspended')),
  add column if not exists primary_domain text,
  add column if not exists logo_url text,
  add column if not exists favicon_url text,
  add column if not exists primary_color text,
  add column if not exists secondary_color text,
  add column if not exists accent_color text,
  add column if not exists typography jsonb not null default '{}'::jsonb
    check (jsonb_typeof(typography) = 'object'),
  add column if not exists contact_details jsonb not null default '{}'::jsonb
    check (jsonb_typeof(contact_details) = 'object'),
  add column if not exists website_url text,
  add column if not exists login_branding jsonb not null default '{}'::jsonb
    check (jsonb_typeof(login_branding) = 'object'),
  add column if not exists email_branding jsonb not null default '{}'::jsonb
    check (jsonb_typeof(email_branding) = 'object'),
  add column if not exists document_branding jsonb not null default '{}'::jsonb
    check (jsonb_typeof(document_branding) = 'object'),
  add column if not exists platform_settings jsonb not null default '{}'::jsonb
    check (jsonb_typeof(platform_settings) = 'object');

update public.wealth_os_tenants
set status = 'active'
where id = 'default';

create unique index if not exists wealth_os_tenant_primary_domain_idx
  on public.wealth_os_tenants (lower(primary_domain))
  where primary_domain is not null;

create table if not exists public.wealth_os_domains (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.wealth_os_tenants(id) on delete cascade,
  domain text not null,
  is_primary boolean not null default false,
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'failed')),
  created_at timestamptz not null default now(),
  verified_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint wealth_os_domains_format
    check (domain ~ '^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$')
);

create unique index if not exists wealth_os_domains_normalized_unique
  on public.wealth_os_domains (lower(domain));

create table if not exists public.wealth_os_tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.wealth_os_tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null
    check (role in (
      'platform_operator',
      'firm_administrator',
      'compliance_officer',
      'financial_adviser',
      'adviser_support',
      'client'
    )),
  status text not null default 'active'
    check (status in ('invited', 'active', 'inactive', 'revoked')),
  invited_by uuid references auth.users(id) on delete set null,
  invited_at timestamptz,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wealth_os_membership_unique unique (tenant_id, user_id)
);

create index if not exists wealth_os_membership_tenant_role_idx
  on public.wealth_os_tenant_memberships (tenant_id, role, status);
create index if not exists wealth_os_membership_user_idx
  on public.wealth_os_tenant_memberships (user_id, status);

alter table public.wealth_os_tenants enable row level security;
alter table public.wealth_os_domains enable row level security;
alter table public.wealth_os_tenant_memberships enable row level security;

revoke all on public.wealth_os_tenants from anon, authenticated;
revoke all on public.wealth_os_domains from anon, authenticated;
revoke all on public.wealth_os_tenant_memberships from anon, authenticated;

grant select on public.wealth_os_tenants to authenticated;
grant select on public.wealth_os_domains to authenticated;
grant select on public.wealth_os_tenant_memberships to authenticated;

create or replace function public.is_platform_operator()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.wealth_os_tenant_memberships m
    where m.user_id = auth.uid()
      and m.role = 'platform_operator'
      and m.status = 'active'
  );
$$;

revoke all on function public.is_platform_operator() from public, anon;
grant execute on function public.is_platform_operator() to authenticated;

create or replace function public.is_firm_administrator(p_tenant_id text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.wealth_os_tenant_memberships m
    where m.user_id = auth.uid()
      and m.tenant_id = p_tenant_id
      and m.role = 'firm_administrator'
      and m.status = 'active'
  );
$$;

revoke all on function public.is_firm_administrator(text) from public, anon;
grant execute on function public.is_firm_administrator(text) to authenticated;

drop policy if exists "Tenant members read tenant configuration" on public.wealth_os_tenants;
create policy "Tenant members read tenant configuration"
  on public.wealth_os_tenants for select to authenticated
  using (
    public.is_platform_operator()
    or id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'
  );

drop policy if exists "Firm administrators update own tenant" on public.wealth_os_tenants;
create policy "Firm administrators update own tenant"
  on public.wealth_os_tenants for update to authenticated
  using (
    public.is_firm_administrator(id)
    and id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'
  )
  with check (
    public.is_firm_administrator(id)
    and id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'
  );

drop policy if exists "Tenant members read domains" on public.wealth_os_domains;
create policy "Tenant members read domains"
  on public.wealth_os_domains for select to authenticated
  using (
    public.is_platform_operator()
    or tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'
  );

drop policy if exists "Firm administrators manage own domains" on public.wealth_os_domains;
create policy "Firm administrators manage own domains"
  on public.wealth_os_domains for all to authenticated
  using (
    public.is_firm_administrator(tenant_id)
    and tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'
  )
  with check (
    public.is_firm_administrator(tenant_id)
    and tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'
  );

drop policy if exists "Users read own memberships" on public.wealth_os_tenant_memberships;
create policy "Users read own memberships"
  on public.wealth_os_tenant_memberships for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_platform_operator()
  );

drop policy if exists "Firm administrators read own tenant memberships" on public.wealth_os_tenant_memberships;
create policy "Firm administrators read own tenant memberships"
  on public.wealth_os_tenant_memberships for select to authenticated
  using (
    public.is_firm_administrator(tenant_id)
    and tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'
  );

