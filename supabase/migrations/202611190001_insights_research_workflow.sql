alter table public.manager_updates
  add column if not exists public_slug text,
  add column if not exists category text not null default 'Fund Updates',
  add column if not exists author_name text,
  add column if not exists author_designation text,
  add column if not exists author_bio text,
  add column if not exists executive_summary text,
  add column if not exists key_takeaways text[] not null default '{}',
  add column if not exists perspective text,
  add column if not exists related_slugs text[] not null default '{}',
  add column if not exists strategy text not null default 'Both',
  add column if not exists featured boolean not null default false,
  add column if not exists scheduled_at timestamptz,
  add column if not exists pdf_object_path text,
  add column if not exists created_by uuid references auth.users(id),
  add column if not exists internal_review_by uuid references auth.users(id),
  add column if not exists internal_review_at timestamptz,
  add column if not exists approved_by uuid references auth.users(id),
  add column if not exists approved_at timestamptz;

update public.manager_updates
set public_slug = 'manager-update-' || id::text
where public_slug is null;

update public.manager_updates
set internal_review_by = approved_by,
    internal_review_at = coalesce(approved_at, created_at)
where status = 'published'
  and internal_review_by is null;

update public.manager_updates
set created_by = approved_by
where created_by is null and approved_by is not null;

alter table public.manager_updates
  alter column public_slug set not null;

create unique index if not exists manager_updates_public_slug_key
  on public.manager_updates(public_slug);

alter table public.manager_updates
  drop constraint if exists manager_updates_status_check;

alter table public.manager_updates
  add constraint manager_updates_status_check
  check (status in ('draft', 'internal_review', 'approved', 'published', 'archived'));

alter table public.manager_updates
  drop constraint if exists manager_updates_approval_check;

alter table public.manager_updates
  add constraint manager_updates_approval_check check (
    (status in ('draft', 'internal_review'))
    or (internal_review_by is not null and internal_review_at is not null)
  );

alter table public.manager_updates
  add constraint manager_updates_publication_check check (
    status not in ('approved', 'published', 'archived')
    or (approved_by is not null and approved_at is not null)
  );

alter table public.manager_updates
  add constraint manager_updates_category_check check (
    category in (
      'Market Commentary',
      'Investment Strategy',
      'Economic Insights',
      'Fund Updates',
      'Adviser Insights',
      'Investor Education'
    )
  );

alter table public.manager_updates
  add constraint manager_updates_strategy_check check (
    strategy in ('PLACEHOLDER BRAND Balanced', 'PLACEHOLDER BRAND Cautious', 'Both')
  );

alter table public.manager_updates
  add constraint manager_updates_takeaways_check check (
    cardinality(key_takeaways) = 0 or cardinality(key_takeaways) between 3 and 5
  );

alter table public.manager_updates
  add constraint manager_updates_research_summary_check check (
    executive_summary is null or char_length(btrim(executive_summary)) between 20 and 1000
  );

alter table public.manager_updates
  add constraint manager_updates_research_perspective_check check (
    perspective is null or char_length(btrim(perspective)) between 10 and 1000
  );

create index if not exists manager_updates_scheduled_idx
  on public.manager_updates(scheduled_at)
  where status = 'approved' and scheduled_at is not null;

alter table public.site_documents
  add column if not exists document_category text not null default 'Investor Notices',
  add column if not exists strategy text,
  add column if not exists file_format text not null default 'PDF',
  add column if not exists file_size_bytes bigint,
  add column if not exists checksum_sha256 text,
  add column if not exists featured boolean not null default false,
  add column if not exists scheduled_at timestamptz,
  add column if not exists author_name text,
  add column if not exists author_designation text,
  add column if not exists internal_review_by uuid references auth.users(id),
  add column if not exists internal_review_at timestamptz;

update public.site_documents
set document_category = case
  when slug like '%fact-sheet' then 'Fund Fact Sheets / MDDs'
  when slug in ('paia-manual', 'popi-act-statement', 'complaints-resolution-policy', 'conflict-of-interest-policy') then 'Investor Notices'
  else 'Educational Material'
end;

update public.site_documents
set internal_review_by = approved_by,
    internal_review_at = coalesce(approved_at, published_at, created_at)
where status = 'published'
  and internal_review_by is null;

alter table public.site_documents
  drop constraint if exists site_documents_slug_check;

alter table public.site_documents
  add constraint site_documents_slug_check
  check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

alter table public.site_documents
  drop constraint if exists site_documents_status_check;

alter table public.site_documents
  add constraint site_documents_status_check
  check (status in ('draft', 'internal_review', 'approved', 'published', 'archived'));

alter table public.site_documents
  drop constraint if exists site_document_publication_check;

alter table public.site_documents
  add constraint site_document_publication_check check (
    status in ('draft', 'internal_review')
    or (internal_review_by is not null and internal_review_at is not null)
  );

alter table public.site_documents
  add constraint site_document_approval_check check (
    status not in ('approved', 'published', 'archived')
    or (approved_by is not null and approved_at is not null)
  );

alter table public.site_documents
  add constraint site_documents_category_check check (
    document_category in (
      'Monthly Outlooks',
      'Quarterly Outlooks',
      'Annual Outlooks',
      'Fund Fact Sheets / MDDs',
      'Manager Updates',
      'Presentations',
      'Educational Material',
      'Investor Notices'
    )
  );

alter table public.site_documents
  add constraint site_documents_strategy_check check (
    strategy is null or strategy in ('PLACEHOLDER BRAND Balanced', 'PLACEHOLDER BRAND Cautious', 'Both')
  );

alter table public.site_documents
  add constraint site_documents_file_size_check check (
    file_size_bytes is null or file_size_bytes between 1 and 52428800
  );

alter table public.site_documents
  add constraint site_documents_checksum_check check (
    checksum_sha256 is null or checksum_sha256 ~ '^[0-9a-f]{64}$'
  );

create index if not exists site_documents_published_library_idx
  on public.site_documents(document_category, effective_date desc, version desc)
  where status = 'published';
