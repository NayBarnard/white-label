create table if not exists public.funds (
  id text primary key,
  name text not null,
  benchmark text not null,
  inception_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.fund_metrics (
  id text primary key,
  fund_id text references public.funds(id),
  metric_date date,
  nav numeric check (nav is null or nav > 0),
  benchmark_nav numeric check (benchmark_nav is null or benchmark_nav > 0),
  benchmark_name text,
  updated_at timestamptz not null default now(),
  metrics jsonb not null default '{}'::jsonb
);

alter table public.fund_metrics
  add column if not exists fund_id text references public.funds(id),
  add column if not exists metric_date date,
  add column if not exists nav numeric check (nav is null or nav > 0),
  add column if not exists benchmark_nav numeric check (benchmark_nav is null or benchmark_nav > 0),
  add column if not exists benchmark_name text;

alter table public.fund_metrics
  alter column metrics set default '{}'::jsonb;

create index if not exists fund_metrics_fund_date_idx
  on public.fund_metrics (fund_id, metric_date);

insert into public.funds (id, name, benchmark, inception_date)
values
  ('balanced', 'RSA Balanced', 'CPI + 5%', '2018-05-02'),
  ('cautious', 'RSA Cautious', 'CPI + 3%', '2020-06-18')
on conflict (id) do update
set name = excluded.name,
    benchmark = excluded.benchmark,
    inception_date = excluded.inception_date;

create table if not exists public.enquiries (
  id bigint generated always as identity primary key,
  full_name text not null,
  email text not null,
  phone text not null,
  company text not null default '',
  inquiry_type text not null,
  message text not null,
  popi_consent boolean not null check (popi_consent = true),
  created_at timestamptz not null default now()
);

create table if not exists public.newsletter_subscribers (
  id bigint generated always as identity primary key,
  email text not null unique,
  consent boolean not null check (consent = true),
  created_at timestamptz not null default now()
);

create table if not exists public.insights (
  slug text primary key,
  title text not null,
  category text not null check (category in ('CLIENT UPDATES', 'INDUSTRY NEWS', 'MARKET COMMENTARY')),
  date date not null,
  excerpt text not null,
  body text not null,
  is_published boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists insights_published_date_idx
  on public.insights (date desc)
  where is_published = true;

alter table public.fund_metrics enable row level security;
alter table public.funds enable row level security;
alter table public.enquiries enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.insights enable row level security;
