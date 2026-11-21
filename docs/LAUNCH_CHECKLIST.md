# Launch checklist

This checklist is software operational guidance, not a statement of legal or
regulatory compliance. The firm's compliance officer must review every
client-facing workflow before real client data is used.

## 1. Ownership and accounts

- [ ] Transfer the GitHub organisation, Vercel team/project, Supabase project,
  and domain registrar/DNS account to PLACEHOLDER BRAND' controlled accounts.
- [ ] Confirm a primary administrator and a separate break-glass administrator.
- [ ] Configure named adviser, operations and compliance accounts; do not use
  shared passwords.
- [ ] Enable Supabase MFA/TOTP for every staff account and test recovery codes.
- [ ] Remove former staff access and review active sessions.

## 2. Supabase database

- [ ] Apply `supabase/schema.sql`.
- [ ] Apply `supabase/client-portal.sql`.
- [ ] Apply `supabase/puck-studio.sql`.
- [ ] Apply additive migrations `202611160001` through `202611180009` in
  timestamp order.
- [ ] Apply `supabase/migrations/202611200001_white_label_studio_versions.sql`
  after `supabase/puck-studio.sql` and the existing additive migrations.
- [ ] Confirm no existing migration has failed or been only partially applied.
- [ ] Assign administrator/adviser/client roles exclusively through trusted
  server-side or Supabase Admin processes.
- [ ] Confirm adviser-client relationships exist before adviser profile testing.
- [ ] Run RLS tests for client ownership and unassigned-adviser denial.
- [ ] Verify the Studio route and all `/api/studio/*` operations with admin,
  non-admin, and AAL1-only accounts; confirm publish/restore are denied unless
  the trusted administrator has completed AAL2.
- [ ] Verify draft save, publish, public homepage rendering, legacy `site_pages`
  fallback, and snapshot restoration against a non-production Supabase project.
- [ ] Do not claim multi-tenant isolation: tenant provisioning and public
  host-to-tenant resolution are not implemented.

## 3. Supabase Storage

- [ ] Confirm private bucket `client-documents` exists.
- [ ] Confirm private bucket `manager-updates` exists if manager updates are
  enabled.
- [ ] Confirm private bucket `firm-documents` exists.
- [ ] Confirm private bucket `onboarding-private` exists.
- [ ] Confirm private bucket `compliance-private` exists.
- [ ] Confirm public reads are disabled on private buckets.
- [ ] Test signed client document URLs expire and cannot access another client.
- [ ] Test adviser document access only for authorised relationships.

## 4. Auth and SMTP

- [ ] Set exact public and staff production callback URLs.
- [ ] Set exact preview callbacks and the local callback for development.
- [ ] Verify password login, password reset, invite, sign-out and callback flows.
- [ ] Verify AAL2 enforcement on every adviser/admin page and staff API.
- [ ] Configure verified SMTP sender domain and delivery settings.
- [ ] Send test staff invite, password reset and client sign-in messages.
- [ ] Do not use temporary passwords or expose full invite links in logs.

## 5. Vercel deployments

- [ ] Create the public Vercel project with `APP_MODE=public`.
- [ ] Create the staff Vercel project with `APP_MODE=staff`.
- [ ] Set each project's own `NEXT_PUBLIC_SITE_URL`.
- [ ] Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- [ ] Set `SUPABASE_SERVICE_ROLE_KEY` only in server environments.
- [ ] Set feature flags intentionally; the default for every flag is off.
- [ ] Configure separate subdomain DNS and verify both hostnames.
- [ ] Confirm public sitemap/robots contain no staff paths.
- [ ] Confirm staff `/robots.txt`, noindex metadata and response headers.

## 6. Content and business data

- [ ] Compliance officer verifies the firm name, FSP details and notice.
- [ ] Supply approved six-PDF set or leave generated request copies clearly
  labelled.
- [ ] Supply verified fund facts, costs, allocation and source/as-at dates.
- [ ] Supply a verified platform/share-class/ISIN/JSE spreadsheet and owner.
- [ ] Supply approved important-disclosure text if required.
- [ ] Supply approved leadership photos and an official client count only.
- [ ] Do not seed demo client, portfolio or platform records into production.

## 7. Portal sign-in testing

- [ ] Test a client account with no portfolio records; confirm a non-blank
  empty-state dashboard.
- [ ] Test a client with one or more RLS-visible portfolios.
- [ ] Test a missing-role client account defaults safely to the client portal.
- [ ] Test an unknown role is signed out and sent to the client sign-in page.
- [ ] Test an adviser account with no active client relationships.
- [ ] Test an adviser account with active client relationships.
- [ ] Test adviser access to an unassigned client returns 403/blank deny state.
- [!] Live MFA AAL2, staff account and client account data are external.

## 8. Portal workflows

- [ ] Test client documents, signed download expiry and own-user document RLS.
- [ ] Test client requests, statuses and profile/banking phone-verification gate.
- [ ] Test client goals save/edit/archive/restore/delete and projections.
- [ ] Test adviser directory search/filter and profile section navigation.
- [ ] Test adviser private notes/tasks are visible only to staff.
- [ ] Test adviser review scheduling.
- [ ] Test adviser pack PDF download and missing-data omission.
- [ ] Test no horizontal page overflow at 360, 390, 768, 1024 and 1440 px.

## 9. Final quality gate

- [ ] `npx tsc --noEmit`
- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] `npm run test:e2e`
- [ ] `npm audit`
- [ ] Review keyboard focus, contrast and reduced motion.
- [ ] Review browser network output for public staff traces.
- [ ] Record live environment evidence and remaining external blockers.
