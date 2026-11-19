create table if not exists public.site_documents (
  id uuid primary key default gen_random_uuid(),
  slug text not null check (slug in (
    'rsa-balanced-fact-sheet',
    'rsa-cautious-fact-sheet',
    'conflict-of-interest-policy',
    'complaints-resolution-policy',
    'popi-act-statement',
    'paia-manual'
  )),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  version integer not null check (version > 0),
  object_path text not null,
  effective_date date not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  published_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (slug, version),
  constraint site_document_publication_check check (
    status = 'draft'
    or (approved_by is not null and approved_at is not null and published_at is not null)
  )
);

create index if not exists site_documents_slug_status_idx
  on public.site_documents(slug, status, effective_date desc);

alter table public.site_documents enable row level security;
revoke all on public.site_documents from public, anon, authenticated;
grant select on public.site_documents to authenticated;
grant all on public.site_documents to service_role;

drop policy if exists site_documents_published_read on public.site_documents;
create policy site_documents_published_read
  on public.site_documents for select to authenticated
  using (status = 'published');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('firm-documents', 'firm-documents', false, 52428800, array['application/pdf'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
