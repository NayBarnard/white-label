alter table public.client_transactions
  add column if not exists account_type text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'client_transactions_account_type_check'
      and conrelid = 'public.client_transactions'::regclass
  ) then
    alter table public.client_transactions
      add constraint client_transactions_account_type_check
      check (account_type is null or account_type in ('Unit Trust', 'TFSA', 'RA'));
  end if;
end
$$;
