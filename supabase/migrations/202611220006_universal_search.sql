alter table public.adviser_client_relationships
  add column if not exists tenant_id text not null default 'default';

update public.adviser_client_relationships
set tenant_id = 'default'
where tenant_id is null;

create index if not exists adviser_client_relationship_tenant_adviser_idx
  on public.adviser_client_relationships (tenant_id, adviser_user_id, status);

drop policy if exists adviser_client_relationship_own_select on public.adviser_client_relationships;
create policy adviser_client_relationship_own_select
  on public.adviser_client_relationships for select to authenticated
  using (
    (
      adviser_user_id = auth.uid()
      or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    )
    and tenant_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'tenant_id', 'default')
  );

create table if not exists public.universal_search_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references public.wealth_os_tenants(id) on delete cascade,
  category text not null check (category in (
    'fund','provider','platform','document','insight','resource','task','client','request','other'
  )),
  title text not null,
  description text not null default '',
  entity_type text not null,
  entity_id text,
  client_user_id uuid references auth.users(id) on delete cascade,
  internal_path text not null,
  is_published boolean not null default false,
  search_vector tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint universal_search_record_path_check
    check (
      internal_path ~ '^/[a-zA-Z0-9/_#?=&%-]+$'
      and internal_path !~ '(^|/)(\.|%2e|%2f|//)'
    )
);

alter table public.universal_search_records
  add column if not exists search_vector tsvector;

create or replace function public.refresh_universal_search_vector()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.category, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(new.entity_type, '')), 'C');
  return new;
end;
$$;

drop trigger if exists universal_search_vector_refresh on public.universal_search_records;
create trigger universal_search_vector_refresh
before insert or update of title, description, category, entity_type
on public.universal_search_records
for each row execute function public.refresh_universal_search_vector();

update public.universal_search_records
set search_vector =
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(category, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(entity_type, '')), 'C');

create index if not exists universal_search_tenant_published_idx
  on public.universal_search_records (tenant_id, is_published, category);
create index if not exists universal_search_vector_idx
  on public.universal_search_records using gin (search_vector);

alter table public.universal_search_records enable row level security;

grant select on public.adviser_client_relationships to authenticated;

revoke all on public.universal_search_records from anon, authenticated;
grant select on public.universal_search_records to authenticated;

drop policy if exists "Tenant advisers search published authorised records" on public.universal_search_records;
create policy "Tenant advisers search published authorised records"
  on public.universal_search_records for select to authenticated
  using (
    is_published
    and tenant_id = coalesce(auth.jwt() -> 'app_metadata' ->> 'tenant_id', 'default')
    and (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
      or (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'adviser'
        and (
          client_user_id is null
          or exists (
            select 1
            from public.adviser_client_relationships r
            where r.adviser_user_id = auth.uid()
              and r.client_user_id = universal_search_records.client_user_id
              and r.status = 'active'
              and r.tenant_id = universal_search_records.tenant_id
          )
        )
      )
    )
  );
