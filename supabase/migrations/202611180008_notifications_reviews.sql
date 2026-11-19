create table if not exists public.portal_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  kind text not null default 'general'
    check (kind in ('document', 'request', 'adviser', 'review', 'security', 'general')),
  link text check (link is null or char_length(link) <= 500),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.adviser_reviews (
  id uuid primary key default gen_random_uuid(),
  adviser_user_id uuid not null references auth.users(id) on delete restrict,
  client_user_id uuid not null references auth.users(id) on delete restrict,
  scheduled_at timestamptz,
  completed_at timestamptz,
  outcome text check (outcome is null or char_length(outcome) <= 5000),
  follow_up_at date,
  follow_up_owner uuid references auth.users(id),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists portal_notifications_user_created_idx
  on public.portal_notifications(user_id, created_at desc);
create index if not exists adviser_reviews_adviser_scheduled_idx
  on public.adviser_reviews(adviser_user_id, scheduled_at);
create index if not exists adviser_reviews_client_idx
  on public.adviser_reviews(client_user_id, scheduled_at);

alter table public.portal_notifications enable row level security;
alter table public.adviser_reviews enable row level security;

revoke all on public.portal_notifications, public.adviser_reviews
  from public, anon, authenticated;
grant select, update on public.portal_notifications to authenticated;
grant all on public.portal_notifications, public.adviser_reviews to service_role;

drop policy if exists portal_notifications_own_select on public.portal_notifications;
create policy portal_notifications_own_select
  on public.portal_notifications for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists portal_notifications_own_update on public.portal_notifications;
create policy portal_notifications_own_update
  on public.portal_notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists adviser_reviews_adviser_select on public.adviser_reviews;
create policy adviser_reviews_adviser_select
  on public.adviser_reviews for select to authenticated
  using (
    adviser_user_id = (select auth.uid())
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

drop policy if exists adviser_reviews_client_select on public.adviser_reviews;
create policy adviser_reviews_client_select
  on public.adviser_reviews for select to authenticated
  using (client_user_id = (select auth.uid()));

drop policy if exists adviser_client_relationship_client_select on public.adviser_client_relationships;
create policy adviser_client_relationship_client_select
  on public.adviser_client_relationships for select to authenticated
  using (client_user_id = (select auth.uid()));
