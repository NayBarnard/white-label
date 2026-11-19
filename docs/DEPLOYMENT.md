# Deployment readiness checklist

## Two Vercel deployments

Deploy this repository as two independent Vercel projects. Use the same
Supabase project only after the firm's data owner has approved the environment
and access model.

1. Import the repository into the firm's Vercel team for the **public** project.
   Set `APP_MODE=public`, and add the approved public hostname (for example
   `www.placeholder-am.co.za`) in **Project → Settings → Domains**.
2. Import the same repository into a second Vercel project owned by the firm.
   Set `APP_MODE=staff`, and add a separate staff hostname (for example
   `staff.placeholder-am.co.za`). The staff deployment returns 404 for public pages;
   the public deployment returns 404 for staff pages and APIs.
3. Configure each hostname's DNS records exactly as its own Vercel project
   displays. Do not copy DNS records between projects. Verify both domains and
   choose the public canonical hostname separately.
4. Set the following values in **each** project's Production environment,
   using that project's own URL. Keep Preview and Development values scoped to
   the matching project:
   - `APP_MODE`: exactly `public` or `staff` as appropriate.
   - `NEXT_PUBLIC_SITE_URL`: that deployment's canonical HTTPS origin.
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`: the
     approved shared Supabase project URL and publishable/anon key.
   - `SUPABASE_SERVICE_ROLE_KEY`: server-only key, only where the staff/admin
     server APIs require it. Never prefix it with `NEXT_PUBLIC_`.
   - `OPENAI_API_KEY`: optional; without it, public chat uses its local
     knowledge fallback.
   - Feature flags and `NEXT_PUBLIC_DEMO_ACCOUNT_EMAILS` only where needed.
5. Redeploy both projects after changing build-time variables. `APP_MODE` is
   read by the Next.js build and determines which site surface is included.
6. Confirm the public site has no staff link, staff sitemap entry, or staff
   route access. Confirm the staff host has no public pages and sends
   `X-Robots-Tag: noindex`.

The staff build uses a nonce-based script CSP, disallows frames, uses
`Referrer-Policy: no-referrer`, and sets HSTS in production. It permits inline
style attributes for the existing animation/layout components; review that
exception before claiming a fully style-restricted CSP. The staff build keeps
Next.js Cache Components enabled, but uses request-aware rendering so its
response nonce can be applied to server-generated scripts. The current
deployment does not implement an office IP allowlist; an optional network
restriction must be configured and tested in the hosting or edge layer.

Do not configure a shared cookie domain. Keep authentication cookies
host-only, so sessions on the public and staff subdomains are not shared by
cookie scope.

## Supabase SQL setup

Apply the project base SQL files once, in this order:

1. `supabase/schema.sql`
2. `supabase/client-portal.sql`
3. `supabase/puck-studio.sql`

Then apply the additive migrations:

1. `supabase/migrations/202611160001_admin_audit_log.sql`
2. `supabase/migrations/202611160002_api_rate_limits.sql`
3. `supabase/migrations/202611160003_newsletter_consent_timestamps.sql`
4. `supabase/migrations/202611160004_portal_data_deletion_request.sql`
5. `supabase/migrations/202611160005_admin_audit_logs.sql`
6. `supabase/migrations/202611160006_enquiry_consent_timestamps.sql`
7. `supabase/migrations/202611170001_manager_updates.sql`
8. `supabase/migrations/202611170002_client_transaction_account_type.sql`
9. `supabase/migrations/202611170003_client_goals.sql`
10. `supabase/migrations/202611170004_profile_mandate_requests.sql`
11. `supabase/migrations/202611180001_platform_availability.sql`
12. `supabase/migrations/202611180002_people_and_crm.sql`
13. `supabase/migrations/202611180003_published_documents.sql`
14. `supabase/migrations/202611180004_onboarding.sql`
15. `supabase/migrations/202611180005_support_comms.sql`
16. `supabase/migrations/202611180006_compliance_registers.sql`
17. `supabase/migrations/202611180007_adviser_client_relationships.sql`
18. `supabase/migrations/202611180008_notifications_reviews.sql`
19. `supabase/migrations/202611180009_goal_archive.sql`

Import only approved NAV and benchmark observations into `fund_metrics`. Set
the admin `app_metadata.role` claim through a trusted Supabase Admin API
process. Confirm the private `client-documents` bucket is present. The
manager-updates migration creates the private `manager-updates` bucket. Never
put the service-role key in client-side environment variables.
The platform migration creates no seeded platforms, share classes, or codes.
Populate it only from the firm's verified spreadsheet, after a quarterly
re-verification owner has been assigned.

## Supabase Auth URLs and email delivery

In Supabase **Authentication → URL Configuration**:

- Set **Site URL** to the approved primary origin selected by the firm's
  Supabase administrator.
- Add both exact production callbacks to **Redirect URLs**:
  `https://www.placeholder-am.co.za/auth/callback` and
  `https://staff.placeholder-am.co.za/auth/callback` (replace these examples with the
  approved hostnames).
- Add each required Vercel Preview callback explicitly, plus the local callback
  `http://localhost:3000/auth/callback` for local development. Avoid broad
  wildcard redirects unless the team has reviewed their security implications.
- Enable TOTP MFA on the Supabase Auth project. Test first-time enrollment,
  authenticator-code challenges and recovery-code verification using
  non-production adviser/admin accounts before production use.

In **Authentication → SMTP Settings**, configure a verified sender domain and
the organization's approved SMTP host, port, username, and password. Set a
recognizable sender name/address and test one-time sign-in and password setup
messages using a non-production account. Update and review the Auth email
templates before inviting clients; do not email temporary passwords.

## Release checks and remaining approvals

- [ ] Verify login, sign-out, callback redirects, public/staff route separation,
  and trusted admin-role access with test accounts.
- [ ] Verify the production security headers in a browser and confirm Supabase
  Auth/Storage behavior. The public deployment permits `'unsafe-inline'` for
  scripts and styles. The staff deployment uses a nonce for scripts but permits
  inline style attributes for existing components; review this exception.
- [ ] Complete visual and accessibility checks at 360, 768, 1024, and 1440 px
  in light and dark themes; run Lighthouse against the deployed homepage.
- [ ] Replace the draft privacy and website terms placeholders only after legal
  review. Confirm all compliance wording and approved performance attribution.
- [ ] Verify the splash MP4 visually shows the bear running on all four paws;
  re-render the asset if it does not.
- [ ] Confirm rate-limit RPC and unsubscribe migrations are live before
  accepting production submissions.
- [ ] Confirm newsletter campaign delivery and ensure any sent campaign links
  use the signed unsubscribe URL returned on signup. This repository does not
  send newsletter campaigns.
