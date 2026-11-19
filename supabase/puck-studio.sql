create table if not exists public.site_pages (
  slug text primary key check (slug = 'home'),
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.site_pages enable row level security;

revoke all on public.site_pages from anon, authenticated;
grant select on public.site_pages to anon, authenticated;
grant insert, update on public.site_pages to authenticated;

drop policy if exists "Anyone can read the published homepage" on public.site_pages;
create policy "Anyone can read the published homepage"
  on public.site_pages for select to anon, authenticated
  using (slug = 'home');

drop policy if exists "Site admins publish homepage content" on public.site_pages;
create policy "Site admins publish homepage content"
  on public.site_pages for insert to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Site admins update homepage content" on public.site_pages;
create policy "Site admins update homepage content"
  on public.site_pages for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
