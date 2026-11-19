create table if not exists public.client_portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  created_at timestamptz not null default now(),
  valuation_zar numeric(16, 2) check (valuation_zar is null or valuation_zar >= 0),
  valuation_as_of date,
  performance_percent numeric(8, 4),
  performance_period text
);

alter table public.client_portfolios
  add column if not exists valuation_zar numeric(16, 2)
    check (valuation_zar is null or valuation_zar >= 0);
alter table public.client_portfolios
  add column if not exists performance_percent numeric(8, 4);
alter table public.client_portfolios
  add column if not exists valuation_as_of date;
alter table public.client_portfolios
  add column if not exists performance_period text;

create table if not exists public.client_allocations (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.client_portfolios(id) on delete cascade,
  asset_class text not null,
  allocation_percent numeric(5, 2) not null
    check (allocation_percent >= 0 and allocation_percent <= 100)
);

create table if not exists public.client_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transacted_at timestamptz not null default now(),
  description text not null,
  amount numeric(16, 2) not null,
  status text not null default 'Pending'
);

create table if not exists public.client_support_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sender_role text not null default 'client' check (sender_role in ('client', 'manager')),
  message text not null check (char_length(message) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.client_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  document_type text not null,
  object_path text not null,
  issued_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.client_portal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_type text not null check (
    request_type in ('Lump Sum Top-Up', 'Strategy Switch', 'Debit Order Update', 'Withdrawal', 'Portfolio Review')
  ),
  details text not null check (char_length(details) between 1 and 2000),
  status text not null default 'Submitted' check (status in ('Submitted', 'In Review', 'Completed')),
  created_at timestamptz not null default now()
);

create index if not exists client_portfolios_user_created_idx
  on public.client_portfolios (user_id, created_at desc);
create index if not exists client_allocations_portfolio_idx
  on public.client_allocations (portfolio_id);
create index if not exists client_transactions_user_date_idx
  on public.client_transactions (user_id, transacted_at desc);
create index if not exists client_support_messages_user_date_idx
  on public.client_support_messages (user_id, created_at);
create index if not exists client_documents_user_issued_idx
  on public.client_documents (user_id, issued_at desc nulls last);
create index if not exists client_portal_requests_user_created_idx
  on public.client_portal_requests (user_id, created_at desc);

alter table public.client_portfolios enable row level security;
alter table public.client_allocations enable row level security;
alter table public.client_transactions enable row level security;
alter table public.client_support_messages enable row level security;
alter table public.client_documents enable row level security;
alter table public.client_portal_requests enable row level security;

revoke all on public.client_portfolios from anon, authenticated;
revoke all on public.client_allocations from anon, authenticated;
revoke all on public.client_transactions from anon, authenticated;
revoke all on public.client_support_messages from anon, authenticated;
revoke all on public.client_documents from anon, authenticated;
revoke all on public.client_portal_requests from anon, authenticated;

grant select on public.client_portfolios to authenticated;
grant select on public.client_allocations to authenticated;
grant select on public.client_transactions to authenticated;
grant select, insert on public.client_support_messages to authenticated;
grant select on public.client_documents to authenticated;
grant select, insert on public.client_portal_requests to authenticated;

drop policy if exists "Clients read their own portfolios" on public.client_portfolios;
create policy "Clients read their own portfolios"
  on public.client_portfolios for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Clients read allocations for their own portfolios" on public.client_allocations;
create policy "Clients read allocations for their own portfolios"
  on public.client_allocations for select to authenticated
  using (
    exists (
      select 1
      from public.client_portfolios
      where client_portfolios.id = client_allocations.portfolio_id
        and client_portfolios.user_id = (select auth.uid())
    )
  );

drop policy if exists "Clients read their own transactions" on public.client_transactions;
create policy "Clients read their own transactions"
  on public.client_transactions for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Clients read their own support messages" on public.client_support_messages;
create policy "Clients read their own support messages"
  on public.client_support_messages for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Clients send their own support messages" on public.client_support_messages;
create policy "Clients send their own support messages"
  on public.client_support_messages for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and sender_role = 'client'
  );

drop policy if exists "Clients read their own documents" on public.client_documents;
create policy "Clients read their own documents"
  on public.client_documents for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Clients read their own portal requests" on public.client_portal_requests;
create policy "Clients read their own portal requests"
  on public.client_portal_requests for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Clients submit their own portal requests" on public.client_portal_requests;
create policy "Clients submit their own portal requests"
  on public.client_portal_requests for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'Submitted'
  );

insert into storage.buckets (id, name, public)
values ('client-documents', 'client-documents', false)
on conflict (id) do update set public = false;

drop policy if exists "Clients read their own private documents" on storage.objects;
create policy "Clients read their own private documents"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'client-documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
