alter table public.client_portfolios
  add column if not exists tenant_id text;
alter table public.client_transactions
  add column if not exists tenant_id text;
alter table public.client_documents
  add column if not exists tenant_id text;
alter table public.client_goals
  add column if not exists tenant_id text;

update public.client_portfolios p
set tenant_id = u.raw_app_meta_data ->> 'tenant_id'
from auth.users u
where p.user_id = u.id
  and p.tenant_id is null
  and nullif(u.raw_app_meta_data ->> 'tenant_id', '') is not null;

update public.client_transactions t
set tenant_id = u.raw_app_meta_data ->> 'tenant_id'
from auth.users u
where t.user_id = u.id
  and t.tenant_id is null
  and nullif(u.raw_app_meta_data ->> 'tenant_id', '') is not null;

update public.client_documents d
set tenant_id = u.raw_app_meta_data ->> 'tenant_id'
from auth.users u
where d.user_id = u.id
  and d.tenant_id is null
  and nullif(u.raw_app_meta_data ->> 'tenant_id', '') is not null;

update public.client_goals g
set tenant_id = u.raw_app_meta_data ->> 'tenant_id'
from auth.users u
where g.user_id = u.id
  and g.tenant_id is null
  and nullif(u.raw_app_meta_data ->> 'tenant_id', '') is not null;

create index if not exists client_portfolios_tenant_user_idx
  on public.client_portfolios (tenant_id, user_id);
create index if not exists client_transactions_tenant_user_idx
  on public.client_transactions (tenant_id, user_id, transacted_at desc);
create index if not exists client_documents_tenant_user_idx
  on public.client_documents (tenant_id, user_id);
create index if not exists client_goals_tenant_user_idx
  on public.client_goals (tenant_id, user_id);

drop policy if exists "Clients read their own portfolios" on public.client_portfolios;
create policy "Clients read own tenant portfolios"
  on public.client_portfolios for select to authenticated
  using (
    user_id = auth.uid()
    and tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'
  );

drop policy if exists "Clients read allocations for their own portfolios" on public.client_allocations;
create policy "Clients read own tenant allocations"
  on public.client_allocations for select to authenticated
  using (
    exists (
      select 1
      from public.client_portfolios p
      where p.id = client_allocations.portfolio_id
        and p.user_id = auth.uid()
        and p.tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'
    )
  );

drop policy if exists "Clients read their own transactions" on public.client_transactions;
create policy "Clients read own tenant transactions"
  on public.client_transactions for select to authenticated
  using (
    user_id = auth.uid()
    and tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'
  );

drop policy if exists "Clients read their own documents" on public.client_documents;
create policy "Clients read own tenant documents"
  on public.client_documents for select to authenticated
  using (
    user_id = auth.uid()
    and tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'
  );

drop policy if exists "Clients read their own goals" on public.client_goals;
create policy "Clients read own tenant goals"
  on public.client_goals for select to authenticated
  using (
    user_id = auth.uid()
    and tenant_id = auth.jwt() -> 'app_metadata' ->> 'tenant_id'
  );
