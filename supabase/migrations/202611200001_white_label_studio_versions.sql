create table if not exists public.site_studio_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null default 'default'
    check (tenant_id ~ '^[a-z0-9][a-z0-9_-]{0,62}$'),
  slug text not null default 'home' check (slug = 'home'),
  status text not null check (status in ('draft', 'published')),
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  published_by uuid,
  published_at timestamptz,
  source_version_id uuid references public.site_studio_versions(id) on delete set null,
  constraint site_studio_versions_publish_metadata_check check (
    (status = 'draft' and published_by is null and published_at is null)
    or (status = 'published' and published_by is not null and published_at is not null)
  )
);

create unique index if not exists site_studio_one_home_draft_per_tenant
  on public.site_studio_versions(tenant_id, slug)
  where status = 'draft';

create index if not exists site_studio_published_history_idx
  on public.site_studio_versions(tenant_id, slug, published_at desc)
  where status = 'published';

alter table public.site_studio_versions enable row level security;

revoke all on public.site_studio_versions from anon, authenticated;
grant select on public.site_studio_versions to anon, authenticated;

drop policy if exists "Public can read the default published homepage" on public.site_studio_versions;
create policy "Public can read the default published homepage"
  on public.site_studio_versions
  for select
  to anon
  using (tenant_id = 'default' and slug = 'home' and status = 'published');

drop policy if exists "Studio admins can read their tenant versions" on public.site_studio_versions;
create policy "Studio admins can read their tenant versions"
  on public.site_studio_versions
  for select
  to authenticated
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    and tenant_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'tenant_id', 'default')
  );

comment on table public.site_studio_versions is
  'Versioned public website homepage configuration. The default tenant preserves single-installation compatibility; tenant provisioning and host resolution are not yet enabled.';
