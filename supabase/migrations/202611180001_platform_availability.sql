create table if not exists public.platforms (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(btrim(name)) between 1 and 120),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fund_share_classes (
  id uuid primary key default gen_random_uuid(),
  fund_name text not null check (char_length(btrim(fund_name)) between 1 and 160),
  share_class text not null check (char_length(btrim(share_class)) between 1 and 120),
  jse_code text,
  isin text check (isin is null or isin ~ '^[A-Z]{2}[A-Z0-9]{9}[0-9]$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fund_name, share_class)
);

create table if not exists public.platform_availability (
  id uuid primary key default gen_random_uuid(),
  share_class_id uuid not null references public.fund_share_classes(id),
  platform_id uuid not null references public.platforms(id),
  status text not null check (status in ('verified_available', 'verified_unavailable', 'not_verified')),
  platform_fund_code text,
  source text,
  source_url text check (source_url is null or source_url ~ '^https?://'),
  verified_by text,
  verified_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (share_class_id, platform_id),
  check (
    status = 'not_verified'
    or (
      nullif(btrim(source), '') is not null
      and nullif(btrim(verified_by), '') is not null
      and verified_on is not null
    )
  )
);

create table if not exists public.platform_availability_history (
  id bigint generated always as identity primary key,
  availability_id uuid not null,
  action text not null check (action in ('insert', 'update', 'delete')),
  old_values jsonb,
  new_values jsonb not null,
  changed_at timestamptz not null default now()
);

create index if not exists platform_availability_share_class_idx
  on public.platform_availability (share_class_id);
create index if not exists platform_availability_platform_idx
  on public.platform_availability (platform_id);
create index if not exists platform_availability_history_cell_idx
  on public.platform_availability_history (availability_id, changed_at desc);

create or replace function public.record_platform_availability_history()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'DELETE' then
    insert into public.platform_availability_history (
      availability_id,
      action,
      old_values,
      new_values
    )
    values (old.id, 'delete', to_jsonb(old), to_jsonb(old));
    return old;
  end if;

  insert into public.platform_availability_history (
    availability_id,
    action,
    old_values,
    new_values
  )
  values (
    new.id,
    case when tg_op = 'INSERT' then 'insert' else 'update' end,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    to_jsonb(new)
  );
  return new;
end;
$$;

drop trigger if exists platform_availability_history_trigger on public.platform_availability;
create trigger platform_availability_history_trigger
  after insert or update or delete on public.platform_availability
  for each row execute function public.record_platform_availability_history();

create or replace function public.reject_platform_history_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception 'Platform availability history is append-only';
end;
$$;

drop trigger if exists platform_availability_history_immutable on public.platform_availability_history;
create trigger platform_availability_history_immutable
  before update or delete on public.platform_availability_history
  for each row execute function public.reject_platform_history_mutation();

alter table public.platforms enable row level security;
alter table public.fund_share_classes enable row level security;
alter table public.platform_availability enable row level security;
alter table public.platform_availability_history enable row level security;

revoke all on public.platforms, public.fund_share_classes,
  public.platform_availability, public.platform_availability_history
  from public, anon, authenticated;
grant select on public.platforms, public.fund_share_classes,
  public.platform_availability, public.platform_availability_history
  to authenticated;
grant all on public.platforms, public.fund_share_classes,
  public.platform_availability
  to service_role;
grant select on public.platform_availability_history to service_role;

create policy platform_select_adviser_or_admin
  on public.platforms for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('adviser', 'admin'));
create policy fund_share_class_select_adviser_or_admin
  on public.fund_share_classes for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('adviser', 'admin'));
create policy platform_availability_select_adviser_or_admin
  on public.platform_availability for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('adviser', 'admin'));
create policy platform_availability_history_select_adviser_or_admin
  on public.platform_availability_history for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('adviser', 'admin'));

revoke all on function public.record_platform_availability_history() from public, anon, authenticated;
revoke all on function public.reject_platform_history_mutation() from public, anon, authenticated;
