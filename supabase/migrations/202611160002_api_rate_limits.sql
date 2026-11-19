create table if not exists public.api_rate_limits (
  route_key text not null check (char_length(route_key) between 1 and 32),
  ip_hash text not null check (ip_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  primary key (route_key, ip_hash)
);

create index if not exists api_rate_limits_window_idx
  on public.api_rate_limits (window_started_at);

alter table public.api_rate_limits enable row level security;
revoke all on public.api_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on public.api_rate_limits to service_role;

create or replace function public.consume_api_rate_limit(
  p_route_key text,
  p_ip_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns table (allowed boolean, retry_after integer)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_window_start timestamptz;
  v_request_count integer;
begin
  if p_route_key is null
    or char_length(p_route_key) < 1
    or char_length(p_route_key) > 32
    or p_ip_hash is null
    or p_ip_hash !~ '^[0-9a-f]{64}$'
    or p_limit is null
    or p_limit < 1
    or p_limit > 1000
    or p_window_seconds is null
    or p_window_seconds < 1
    or p_window_seconds > 86400
  then
    raise exception 'Invalid rate limit parameters';
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds
  );

  insert into public.api_rate_limits (
    route_key,
    ip_hash,
    window_started_at,
    request_count
  )
  values (p_route_key, p_ip_hash, v_window_start, 1)
  on conflict (route_key, ip_hash) do update
  set
    window_started_at = case
      when public.api_rate_limits.window_started_at < excluded.window_started_at
        then excluded.window_started_at
      else public.api_rate_limits.window_started_at
    end,
    request_count = case
      when public.api_rate_limits.window_started_at < excluded.window_started_at
        then 1
      else public.api_rate_limits.request_count + 1
    end
  returning public.api_rate_limits.request_count into v_request_count;

  if random() < 0.01 then
    delete from public.api_rate_limits
    where window_started_at < clock_timestamp() - interval '24 hours';
  end if;

  return query
  select
    v_request_count <= p_limit,
    greatest(
      1,
      ceil(extract(epoch from (v_window_start + p_window_seconds * interval '1 second' - clock_timestamp())))::integer
    );
end;
$$;

revoke all on function public.consume_api_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, text, integer, integer)
  to service_role;
