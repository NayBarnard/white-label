create table if not exists public.client_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  target_amount numeric(16, 2) not null check (target_amount >= 0),
  target_date date not null,
  monthly_contribution numeric(16, 2) not null check (monthly_contribution >= 0),
  assumed_annual_growth_percent numeric(5, 2) not null
    check (assumed_annual_growth_percent between 0 and 30),
  created_at timestamptz not null default now(),
  constraint client_goals_target_date_future_check
    check (target_date > current_date)
);

create index if not exists client_goals_user_target_date_idx
  on public.client_goals (user_id, target_date);

alter table public.client_goals enable row level security;
revoke all on public.client_goals from anon;
revoke all on public.client_goals from authenticated;
grant select, insert, update, delete on public.client_goals to authenticated;

drop policy if exists "Clients read their own goals" on public.client_goals;
create policy "Clients read their own goals"
  on public.client_goals for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Clients create their own goals" on public.client_goals;
create policy "Clients create their own goals"
  on public.client_goals for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Clients update their own goals" on public.client_goals;
create policy "Clients update their own goals"
  on public.client_goals for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Clients delete their own goals" on public.client_goals;
create policy "Clients delete their own goals"
  on public.client_goals for delete to authenticated
  using (user_id = (select auth.uid()));
