# Fund comparison troubleshooting

The interactive chart reads active fund names from `public.funds` and dated NAV
observations from `public.fund_metrics`. Its server-side API uses the Supabase
service role; the key is never needed in browser code.

## Required Vercel environment variables

Set these for the Production (and Preview, if used) environment, then redeploy:

- `NEXT_PUBLIC_SUPABASE_URL`: the Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY`: the project's service-role key. Keep this
  server-only; do not use a `NEXT_PUBLIC_` name or expose it to client code.

The client portal separately needs `NEXT_PUBLIC_SUPABASE_ANON_KEY`. It is not
used by the fund-comparison API.

The public enquiry, newsletter signup, and chat endpoints also use
`NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for the shared
rate-limit function. If its migration is not installed or the RPC is
unavailable, those endpoints return a temporary service error rather than
silently disabling production rate limits.

## Supabase setup and data import

1. In the Supabase project SQL Editor, run `supabase/schema.sql`. It creates
   `funds` and `fund_metrics` and seeds the `balanced` and `cautious` fund
   records.
2. Obtain approved, dated NAV and benchmark index observations from the firm's
   authoritative data source. Do not populate this table with illustrative or
   estimated values.
3. Import the observations into `public.fund_metrics` using the Supabase table
   editor's CSV import or a trusted server-side import process. Supply a unique
   text `id` for every row, `fund_id` (`balanced` or `cautious`), `metric_date`,
   `nav`, and `benchmark_nav`; `benchmark_name` is optional. NAV values must be
   positive and use consistent, comparable index levels for each fund and its
   benchmark. The table has no generated default for `id`.
4. Confirm the directory and observations in the SQL Editor:

   ```sql
   select id, name, is_active from public.funds order by id;

   select
     f.id as fund_id,
     count(m.id) as observation_count,
     min(m.metric_date) as first_date,
     max(m.metric_date) as latest_date
   from public.funds f
   left join public.fund_metrics m
     on m.fund_id = f.id
     and m.metric_date is not null
     and m.nav is not null
     and m.benchmark_nav is not null
   group by f.id
   order by f.id;
   ```

The API reads the newest 5,000 dated rows with both NAV fields present. If both
Supabase environment variables are absent, it serves the published data and
reports no chart history; if only one is set or Supabase cannot be reached, the
page shows a retryable error. With no imported observations, it shows
“Performance data is being updated.” Requests time out after 10 seconds.

## Public form and API setup

After the existing schema, apply these additive migrations in order:

1. `supabase/migrations/202611160001_admin_audit_log.sql` for `/admin`.
2. `supabase/migrations/202611160002_api_rate_limits.sql` for public API
   limits.
3. `supabase/migrations/202611160003_newsletter_consent_timestamps.sql` to
   store the timestamp for new newsletter consent records.
4. `supabase/migrations/202611160004_portal_data_deletion_request.sql` after
   `supabase/client-portal.sql` to enable the portal's personal-data deletion
   request type.
5. `supabase/migrations/202611160005_admin_audit_logs.sql` to create the
   service-role-only audit table used for admin mutations.

Set `NEXT_PUBLIC_SUPABASE_URL` and the server-only
`SUPABASE_SERVICE_ROLE_KEY` in Vercel for every environment where public
submissions are enabled. The rate limits are 5 enquiry requests per 15
minutes, 3 newsletter signups per hour, 20 unsubscribe attempts per hour, and
30 chat requests per minute.
The enquiry and newsletter forms submit a hidden honeypot field; legitimate
users should leave it empty.

## Splash screen

The connection-only splash displays `public/logo-splash-last.png` as a static
backup logo.
