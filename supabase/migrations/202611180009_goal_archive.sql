alter table public.client_goals
  add column if not exists archived_at timestamptz;

create index if not exists client_goals_user_archived_target_idx
  on public.client_goals(user_id, archived_at, target_date);
