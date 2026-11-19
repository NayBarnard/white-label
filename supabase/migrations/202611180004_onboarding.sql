create table if not exists public.onboarding_checklists (
  id uuid primary key default gen_random_uuid(),
  client_user_id uuid not null references auth.users(id) on delete restrict,
  document_class text not null check (document_class in (
    'identity_document',
    'proof_of_address',
    'proof_of_bank_account',
    'source_of_funds',
    'risk_profile',
    'signed_mandate',
    'signed_investment_agreement'
  )),
  status text not null default 'requested' check (status in (
    'requested', 'received', 'under_review', 'approved', 'rejected'
  )),
  rejection_reason text check (
    status <> 'rejected'
    or (rejection_reason is not null and char_length(btrim(rejection_reason)) between 1 and 2000)
  ),
  reviewer_user_id uuid references auth.users(id),
  reviewer_at timestamptz,
  refresh_due_on date,
  retention_days integer check (retention_days is null or retention_days > 0),
  object_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_user_id, document_class)
);

create table if not exists public.onboarding_document_access (
  id bigint generated always as identity primary key,
  checklist_id uuid not null references public.onboarding_checklists(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (action in ('view', 'download')),
  accessed_at timestamptz not null default now()
);

alter table public.onboarding_checklists enable row level security;
alter table public.onboarding_document_access enable row level security;

revoke all on public.onboarding_checklists, public.onboarding_document_access
  from public, anon, authenticated;
grant all on public.onboarding_checklists, public.onboarding_document_access
  to service_role;

drop policy if exists onboarding_client_read_own on public.onboarding_checklists;
create policy onboarding_client_read_own
  on public.onboarding_checklists for select to authenticated
  using (
    client_user_id = (select auth.uid())
  );

drop policy if exists onboarding_staff_read on public.onboarding_checklists;
create policy onboarding_staff_read
  on public.onboarding_checklists for select to authenticated
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'adviser', 'compliance', 'operations')
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'onboarding-private',
  'onboarding-private',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
