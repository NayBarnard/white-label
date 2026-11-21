# White-Label Wealth Management Platform

## Standalone demonstration

This project runs locally without a database, Supabase, API keys, authentication
provider, or cloud storage. Client, adviser, and administration workflows use
fictional data and browser localStorage.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Start with `/portal`, `/advisor`, or `/admin`.
Use `/admin` to reset browser demo data.

## Customisation

Central neutral defaults live in `src/config/brand.ts`. Shared illustrative
financial records live in `src/data/`. Update these configuration modules rather
than individual pages for future branding.

The existing public website remains available. Forms, uploads, documents,
portfolios, goals, support, adviser tasks, people management and compliance
screens operate as clearly labelled local demonstrations. No real submission,
identity verification, regulatory check, or financial transaction occurs.

## Deployments

The project is connected to Vercel. Pushes to its configured production branch
trigger a production deployment; pull requests can receive preview deployments
when preview deployments are enabled for the project.

## Environment variables

Copy `.env.example` to `.env.local` for local work. Configure
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for portal,
studio, and browser-side Supabase access. Configure
`SUPABASE_SERVICE_ROLE_KEY` only in server-side environments for fund data,
public submissions, rate limiting, and admin operations. `OPENAI_API_KEY` is
optional; the website chatbot has a knowledge-base fallback. Set
`NEXT_PUBLIC_SITE_URL` to the canonical deployment origin when it differs from
the default.
Set a high-entropy server-side `CRON_SECRET` to enable scheduled research and
document publishing. The Vercel cron calls `/api/cron/publish-insights` every
15 minutes; do not expose this secret to browser code.

Server submission code validates its required environment variables before
making requests and logs the missing variable names without exposing secret
values. Browser Supabase access uses a typed client-safe validator that only
reads the `NEXT_PUBLIC_` variables. Never add a `NEXT_PUBLIC_` prefix to a
secret key.

See [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) for the production domain,
Supabase migration, Auth redirect, and SMTP checklist.

## Fund performance data

Apply [`supabase/schema.sql`](./supabase/schema.sql) to create the fund directory and
metrics tables. `npm run sync:fund-data` updates the published performance snapshot.
To populate the interactive NAV comparison, import dated observations into
`fund_metrics` with `fund_id`, `metric_date`, `nav`, `benchmark_nav`, and
`benchmark_name`; NAV and benchmark values must use consistent, positive index
levels for each fund. The comparison reads active funds and up to 5,000 ordered
observations through the server-side Supabase service role key.

The Insights page reads public RSS feeds from Moneyweb, BusinessTech, and BBC
Business, classifies stories into Industry News and Market Commentary, and
revalidates cached feed data every 15 minutes. A source that blocks automated
requests is skipped while the other available feeds remain in use.

## Client portal

Apply [`supabase/client-portal.sql`](./supabase/client-portal.sql) to the same
Supabase project after configuring `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY`. Enable the desired Supabase Auth sign-up and
email-confirmation settings before inviting clients. The dashboard is at
`/portal` is the authenticated, server-guarded client experience; unauthenticated
visitors are sent to `/portal/dashboard` to sign in. The portal uses the
authenticated browser session and database RLS. When no portfolio records are
assigned, clearly labeled illustrative demo figures and documents are shown;
they are not persisted as client data or presented as actual holdings. Assign
portfolio and transaction records to the client's Supabase Auth user ID using a
trusted administrative process. Do not expose `SUPABASE_SERVICE_ROLE_KEY` to
the browser. The service role bypasses RLS and must only be used by trusted
server-side administration.

The client portal request tracker also uses the RLS-protected
`client_portal_requests` table in `client-portal.sql`. Apply the updated SQL
script to enable persistent request submission and status tracking. If that
table is not yet available, the portal reports that a request is retained only
in the current browser session and has not been sent.

Enable Supabase Auth email sign-ups and configure its Site URL and Redirect URLs
to include the application origin and its `/auth/callback` path (for example,
`http://localhost:3000/auth/callback` for local development and
`https://your-domain.example/auth/callback` for production). Client Portal
registration uses Supabase's one-time email sign-in link; the callback verifies
the link, stores the session in cookies, and redirects to `/portal`. Users can
set a password after signing in or request a secure password setup link. Do not
send temporary passwords by email. Configure Supabase's Auth email templates
and SMTP settings to customize and deliver these links reliably.

Client support messages are stored in `client_support_messages`; authenticated
clients may read their own thread and create client messages, while manager
responses must be written through a trusted server-side process. Portfolio
valuations and performance snapshots are also account-specific. The document
vault uses the private `client-documents` Storage bucket and signed links; store
each object under a first-level folder matching the client's Auth user ID, then
add its metadata to `client_documents` through a trusted administrative process.

## Website studio

The protected Puck-based Studio is available at `/studio` on the staff
deployment. It uses the existing Supabase project and requires a signed-in
administrator with trusted `app_metadata.role = "admin"` and AAL2 MFA.
Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
server-only `SUPABASE_SERVICE_ROLE_KEY`. Never assign roles through editable
`user_metadata` or expose the service-role key to browser code.

Apply [`supabase/puck-studio.sql`](./supabase/puck-studio.sql), then apply
[`supabase/migrations/202611200001_white_label_studio_versions.sql`](./supabase/migrations/202611200001_white_label_studio_versions.sql).
The editor saves a private draft, previews unpublished changes, publishes on
request, and keeps published snapshots for restoration. The public homepage
uses the latest valid published Puck configuration and retains the existing
built-in homepage as a safe fallback. The prior `site_pages` homepage row
remains readable as a migration fallback.

The current Studio release manages the homepage only. Brand/theme management,
media uploads, customer-created pages, template management, and tenant
provisioning are not yet implemented. See
[`docs/WHITE_LABEL_STUDIO.md`](./docs/WHITE_LABEL_STUDIO.md) for verified
scope and [`docs/STUDIO_USER_GUIDE.md`](./docs/STUDIO_USER_GUIDE.md) for use.

The onboarding questionnaire generates a preliminary PDF locally in the
browser. It does not collect identity or banking details, perform KYC/AML
verification, submit an application, or replace official forms.

## Client administration

The restricted back office is available at `/admin`. The page and every
`/api/admin/*` request verify the authenticated user's trusted
`app_metadata.role === "admin"` claim. Apply
[`supabase/migrations/202611160001_admin_audit_log.sql`](./supabase/migrations/202611160001_admin_audit_log.sql)
after `supabase/client-portal.sql`, then apply
[`supabase/migrations/202611160005_admin_audit_logs.sql`](./supabase/migrations/202611160005_admin_audit_logs.sql)
to create the plural service-role-only audit table used by admin mutations.
Configure `SUPABASE_SERVICE_ROLE_KEY` only as a server-side Vercel environment
variable. The back office supports portfolio assignment, private PDF uploads
to the existing `client-documents` bucket, manager support replies, and client
request status updates. Only approved account values should be entered; blank
financial fields remain unreported.

## Public API protections

The enquiry, newsletter signup, and chat endpoints use Supabase-backed fixed
windows keyed by an HMAC of the request IP: 5 enquiries per 15 minutes, 3
newsletter signups per hour, 20 unsubscribe attempts per hour, and 30 chat requests per minute. Apply
[`supabase/migrations/202611160002_api_rate_limits.sql`](./supabase/migrations/202611160002_api_rate_limits.sql)
after the base schema to enable the shared rate-limit store. Apply
[`supabase/migrations/202611160003_newsletter_consent_timestamps.sql`](./supabase/migrations/202611160003_newsletter_consent_timestamps.sql)
to record the timestamp of each new newsletter consent. The rate-limited
endpoints fail closed in production if Supabase or the rate-limit RPC is
unavailable; local development uses an in-memory limiter.

Apply
[`supabase/migrations/202611160004_portal_data_deletion_request.sql`](./supabase/migrations/202611160004_portal_data_deletion_request.sql)
after `supabase/client-portal.sql` to add the authenticated portal's POPIA
personal-data deletion request option. These requests are submitted to the
existing client request tracker for review; they do not automatically delete
records.

Apply
[`supabase/migrations/202611160006_enquiry_consent_timestamps.sql`](./supabase/migrations/202611160006_enquiry_consent_timestamps.sql)
to store the ISO timestamp of enquiry POPIA consent separately from the
submission's creation timestamp.

Apply
[`supabase/migrations/202611190001_insights_research_workflow.sql`](./supabase/migrations/202611190001_insights_research_workflow.sql)
after the published-document and manager-update migrations to add the four-stage
review workflow, scheduled publishing metadata, and the versioned research
library. Public research pages reference canonical records; archived document
versions remain visible for audit context but are not downloadable.

All three endpoints cap the request body size. Enquiry and newsletter forms
also include a hidden honeypot field. Required server-side environment
variables remain `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`;
the service-role key must only be configured in server-side environments.