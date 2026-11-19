alter table public.newsletter_subscribers
  add column if not exists consented_at timestamptz;

alter table public.newsletter_subscribers
  add column if not exists unsubscribed_at timestamptz;
