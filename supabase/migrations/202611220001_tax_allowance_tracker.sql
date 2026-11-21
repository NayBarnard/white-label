create table if not exists public.tax_allowance_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  product_code text not null check (product_code ~ '^[A-Z0-9_-]{1,24}$'),
  tax_year_label text not null check (char_length(tax_year_label) between 4 and 16),
  period_start date not null,
  period_end date not null,
  annual_limit numeric(16, 2) not null check (annual_limit > 0),
  lifetime_limit numeric(16, 2) check (lifetime_limit is null or lifetime_limit > 0),
  currency text not null default 'ZAR' check (currency ~ '^[A-Z]{3}$'),
  over_contribution_penalty_rate numeric(6, 5) not null default 0.4
    check (over_contribution_penalty_rate between 0 and 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end >= period_start),
  unique (tenant_id, product_code, tax_year_label)
);

create table if not exists public.client_contribution_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  client_id uuid not null references auth.users(id) on delete cascade,
  product_code text not null check (product_code ~ '^[A-Z0-9_-]{1,24}$'),
  tax_year_label text not null check (char_length(tax_year_label) between 4 and 16),
  amount numeric(16, 2) not null check (amount > 0),
  contribution_date date not null,
  source text not null check (source in ('INTERNAL_PORTFOLIO', 'EXTERNAL_DECLARED')),
  notes text check (notes is null or char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tax_allowance_rules_tenant_product_year_idx
  on public.tax_allowance_rules (tenant_id, product_code, tax_year_label);
create index if not exists client_contribution_logs_client_product_date_idx
  on public.client_contribution_logs (tenant_id, client_id, product_code, contribution_date);

alter table public.tax_allowance_rules enable row level security;
alter table public.client_contribution_logs enable row level security;
revoke all on public.tax_allowance_rules, public.client_contribution_logs
  from public, anon, authenticated;
grant all on public.tax_allowance_rules, public.client_contribution_logs to service_role;

insert into public.tax_allowance_rules (
  tenant_id, product_code, tax_year_label, period_start, period_end,
  annual_limit, lifetime_limit, currency, over_contribution_penalty_rate
)
values
  ('default', 'TFSA', '2025/2026', '2025-03-01', '2026-02-28', 36000, 500000, 'ZAR', 0.4),
  ('default', 'TFSA', '2026/2027', '2026-03-01', '2027-02-28', 46000, 500000, 'ZAR', 0.4)
on conflict (tenant_id, product_code, tax_year_label) do nothing;
