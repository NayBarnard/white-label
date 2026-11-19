alter table public.enquiries
  add column if not exists consented_at timestamptz;
