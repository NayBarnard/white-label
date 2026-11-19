create table if not exists public.manager_updates (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 160),
  body text not null check (char_length(body) between 1 and 10000),
  kind text not null check (kind in ('text', 'audio', 'video')),
  media_path text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  constraint manager_updates_media_kind_check check (
    (kind = 'text' and media_path is null)
    or (kind in ('audio', 'video') and media_path is not null)
  ),
  constraint manager_updates_approval_check check (
    status = 'draft'
    or (approved_by is not null and approved_at is not null and published_at is not null)
  )
);

create index if not exists manager_updates_published_created_idx
  on public.manager_updates (published_at desc)
  where status = 'published';

alter table public.manager_updates enable row level security;
revoke all on public.manager_updates from anon, authenticated;
grant select on public.manager_updates to authenticated;
grant all on public.manager_updates to service_role;

drop policy if exists "Authenticated users read published manager updates" on public.manager_updates;
create policy "Authenticated users read published manager updates"
  on public.manager_updates for select to authenticated
  using (status = 'published');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'manager-updates',
  'manager-updates',
  false,
  104857600,
  array['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'video/mp4']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Clients read media for published manager updates" on storage.objects;
create policy "Clients read media for published manager updates"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'manager-updates'
    and exists (
      select 1
      from public.manager_updates
      where manager_updates.media_path = storage.objects.name
        and manager_updates.status = 'published'
    )
  );
