create table if not exists public.support_threads (
  id uuid primary key default gen_random_uuid(),
  client_user_id uuid not null references auth.users(id) on delete restrict,
  subject text not null check (char_length(btrim(subject)) between 1 and 160),
  status text not null default 'open' check (status in ('open', 'pending', 'resolved', 'closed')),
  assigned_to uuid references auth.users(id),
  first_response_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_thread_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.support_threads(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete restrict,
  sender_role text not null check (sender_role in ('client', 'staff')),
  body text not null check (char_length(btrim(body)) between 1 and 5000),
  internal_note boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.canned_replies (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  body text not null check (char_length(btrim(body)) between 1 and 5000),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.personal_detail_verifications (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null,
  verified_by uuid not null references auth.users(id),
  verification_method text not null check (verification_method in ('phone')),
  verified_at timestamptz not null,
  note text check (note is null or char_length(note) <= 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.staff_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  body text not null check (char_length(btrim(body)) between 1 and 10000),
  status text not null default 'draft' check (status in ('draft', 'approved', 'sent')),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  sent_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.staff_announcement_recipients (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.staff_announcements(id) on delete cascade,
  client_user_id uuid not null references auth.users(id) on delete restrict,
  sent_at timestamptz not null,
  unique (announcement_id, client_user_id)
);

create index if not exists support_threads_client_updated_idx
  on public.support_threads(client_user_id, updated_at desc);
create index if not exists support_thread_messages_thread_created_idx
  on public.support_thread_messages(thread_id, created_at);

alter table public.support_threads enable row level security;
alter table public.support_thread_messages enable row level security;
alter table public.canned_replies enable row level security;
alter table public.personal_detail_verifications enable row level security;
alter table public.staff_announcements enable row level security;
alter table public.staff_announcement_recipients enable row level security;

revoke all on public.support_threads, public.support_thread_messages,
  public.canned_replies, public.personal_detail_verifications,
  public.staff_announcements, public.staff_announcement_recipients
  from public, anon, authenticated;
grant all on public.support_threads, public.support_thread_messages,
  public.canned_replies, public.personal_detail_verifications,
  public.staff_announcements, public.staff_announcement_recipients
  to service_role;

drop policy if exists support_threads_staff_only on public.support_threads;
create policy support_threads_staff_only
  on public.support_threads for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'adviser', 'compliance', 'operations'));
