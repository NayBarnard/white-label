# PLACEHOLDER BRAND delivery status

## Standalone completion status

- Local client portal: implemented with fictional values, charts, holdings,
  searchable transactions, goals, local support requests and persisted browser
  state.
- Local adviser portal: implemented with fictional clients, search, profiles,
  notes and persistent tasks.
- Local administration: implemented with people CRUD, role controls, document
  overview, compliance demonstrations and reset-demo-data.
- Central brand configuration: added at `src/config/brand.ts`.
- Local browser persistence: added through reusable localStorage helpers.
- Public enquiry and onboarding: replaced remote submissions with local demo
  saves and explicit feedback.
- Supabase-dependent primary portal routes: replaced with standalone routes.

Database migrations and Supabase provider code remain in the repository for
optional integrations; they are not required to run or build the local
demonstration.

This repository contains software only; it does not certify legal or
regulatory compliance. The firm's compliance officer must review every
workflow before real client data is used.

## White Label Studio status — 2026-11-21

- **Active Studio mode.** `/studio` is a browser-only placeholder editor using
  generic Puck content. It saves and recovers drafts in browser storage, does
  not read/write Studio data in Supabase, and cannot publish.
- **Local access.** Set `STUDIO_DEMO_MODE=true` while running `npm run dev` to
  open the Studio without Supabase. This bypass is limited to development and
  the exact `/studio` page; production still requires the server-side
  administrator/AAL2 check.
- **Optional CMS path.** Protected database APIs and the additive migration
  remain, but APIs return 410 and public homepage Studio lookup is skipped
  unless `STUDIO_STORAGE_MODE=supabase` is explicitly enabled server-side.
  This optional path has not been validated against a live Supabase project.
- **Placeholder data boundary.** Studio defaults no longer import firm
  identity, customer, licensing, contact, or investment performance data.
  Existing business workflows and public-site fallback are unchanged.
- **Not complete.** Global brand/theme management, marketing media, additional
  pages, templates, feature controls, full SEO settings, and end-to-end
  tenant provisioning/host/storage isolation remain outstanding. This is not
  a complete multi-tenant website customization platform.
- **Baseline before changes.** `npm run build` and `npm run lint` passed.
  `npm test` had 27 failures in `src/lib/deployment/routing.test.ts`: route
  isolation returned `allow` for protected routes. That bypass was corrected.
- **Current validation.** 206 Vitest tests, lint, TypeScript, production build,
  and all 41 Playwright tests pass. A local browser check rendered Studio with
  `STUDIO_DEMO_MODE=true` and no Supabase credentials; it observed no Supabase
  network requests.

## Phase status

### Phase 0 — Verify what is already built

- **0(a) Navigation — completed.** The role-aware portal menu, responsive
  sheet, chat/theme/account/sign-out controls and mobile navigation audit are
  present. The public menu no longer links to staff sign-in.
- **0(b) Themes — completed.** Client portal uses the gold theme; staff portal
  routes use the blue theme.
- **0(c) Sign-in — partly done.** Adviser/admin share the staff sign-in and
  land according to their role; clients are refused. Missing role metadata now
  defaults to client only on the client route, and unknown roles are rejected.
  Password visibility,
  forgot-password, sign-in rate limiting and MFA are not complete.
- **0(d) Interactive feature — completed.** Both the Puck homepage studio and
  the fund comparison are present and interactive; Studio now uses a server
  protected draft/publish workflow described above.
- **0(e) Platform matrix — partly done.** Empty-by-default matrix, statuses,
  source/verifier/date, stale marking, search, editor and cell history exist.
  Optional CSV import and a dedicated re-verification queue are not complete.
- **0(f) `.gitignore` and repository — completed.** Ignore rules cover
  dependencies, build output, test output and local env files while allowing
  `.env.example`. The worktree was clean before this task; final repository
  state is recorded below after commit.

### Phase 1 — Separate staff site and security

- **1.1 Deployment modes — partly done.** `APP_MODE` defaults to `public`;
  public mode returns 404 for staff routes/APIs and has no staff navigation,
  sitemap or robots references. Staff mode returns 404 for public pages/APIs,
  redirects `/` to staff sign-in, and emits noindex, HSTS in production,
  no-referrer, frame protections and a per-request nonce script CSP. Two Vercel
  projects, host-only cookies, Auth callbacks and DNS are documented but are
  manual setup. The CSP allows inline style attributes for existing UI code;
  office IP allowlisting is not implemented.
- **1.2 Staff sign-in — partly done.** Existing shared sign-in has role-based
  landing, generic errors and neutral client rejection/sign-out. Password
  show/hide and reset-by-email are implemented. A rate-limited server
  preflight is implemented, but Supabase MFA factor configuration and live
  Auth testing remain required.
- **1.3 MFA and sessions — partly done.** A 30-minute inactivity timeout with
  a 60-second warning exists. Staff-only 12-hour absolute expiry constants and
  TOTP enrollment/challenge/recovery-code UI are implemented. Server AAL2
  checks protect adviser/admin pages and APIs. The admin MFA reset route
  requires typed email confirmation and audit logging. Supabase MFA/TOTP,
  recovery-code project settings and live end-to-end verification remain
  manual prerequisites; sign-out-everywhere uses global sign-out.

### Phase 2 — Roles and permissions

- **2.1 Central permissions — partly done.** `src/lib/staff/permissions.ts`
  now defines role-to-action permissions for admin, adviser, compliance and
  operations. Adviser and admin server authorization consume the map. All
  menus and remaining routes still need migration to it.
- **2.2 People/role administration and maker-checker — not built.** Roles are
  currently checked in existing admin/adviser guards. No People screen,
  additional staff roles, last-admin protection or maker-checker approval
  workflow exists.

### Phase 3 — People and clients

- **3.1 Invitations and bulk import — partly done.** Existing admin client
  records are available. `Task 10` adds the `/admin/people` screen and server
  route for staff/client invitations, role changes, active/deactivated status,
  password-reset email initiation, MFA reset and bounded CSV preview/confirm.
  Supabase Auth and live email delivery still require manual verification.
- **3.2 One-screen client profile — partly done.** Existing client and
  portfolio administration covers some records. The requested unified
  profile, activity timeline and complete linked records are not complete.
- **3.3 CRM-lite — partly done.** Internal notes, follow-up tasks, review
  schedules, tags and complaints links now have staff-only database/API
  foundations in `202611180002_people_and_crm.sql`; the full one-screen UI and
  task update/status workflow remain unfinished.
- **3.4 Adviser-client relationships — partly done.** Migration
  `202611180007_adviser_client_relationships.sql` adds an explicit active
  adviser relationship table and `/api/advisor/clients` returns only active
  relationships after adviser and MFA authorization. Client profile/workflow
  UI and relationship administration remain unfinished.

### Phase 4 — Documents and published content

- **4.1 Client documents — partly done.** Private client PDF upload and
  download exist; bulk upload, replacement/removal workflow and first-opened
  tracking are absent.
- **4.2 Versioned public documents — not built.** No `site_documents` table,
  private source bucket, version workflow or publish-only shared document
  helper exists. Existing generated-document behavior remains.
- **4.3 Content editor — partly done.** The public homepage has protected
  Puck draft, preview, publish, and version restoration foundations.
  Compliance approval, additional pages, brand/theme editing, and content
  management for the remaining public routes are absent.

### Phase 5 — Platforms and codes

- **5.1 Matrix — partly done.** Current matrix feature and history are
  implemented and documented. Optional validated CSV import and a dedicated
  re-verification queue are missing. No platform data is seeded.

### Phase 6 — Client onboarding and FICA tracking

- **6.1 Checklist and review workflow — not built.** No per-client checklist,
  due-date/retention configuration or client upload workflow. A staff review
  queue and checklist schema now exist, but the client and full staff UI remain
  unfinished.
- **6.2 Private files and review logging — not built.** No separate onboarding
  bucket, short-lived signed URL workflow, access log or virus-scan hook.
  Identity/e-sign/payment integrations remain unconfigured provider interfaces.
- **6.3 Retention review — not built.** No configurable retention or
  deletion-approval workflow exists.

### Phase 7 — Support, requests and communications

- **7.1 Support and requests — partly done.** Existing support replies and
  client request status updates exist. Thread inbox, assignment, internal notes,
  response-time indicators and canned replies now have database/API foundations
  in `202611180005_support_comms.sql`; full UI remains unfinished.
- **7.2 Personal/banking verification and announcements — partly done.**
  Existing profile requests require staff follow-up; no required verification
  record gate or compliance-approved selected-client announcement tool exists.
  The completion gate and verification, announcement, and canned-reply API
  foundations exist; send consent/recipient delivery remains unfinished.
- **7.3 Manager updates — partly done.** Draft/publish/media flows exist;
  broader announcement and consent-aware delivery is not implemented.

### Phase 8 — Compliance registers

- **8.1–8.7 Registers — partly done.** Complaints, conflicts, gifts, fit/proper,
  compliance calendar, policy register, incident/breach register, append-only
  history, private attachment bucket and monthly review sign-offs have database
  and API foundations in `202611180006_compliance_registers.sql`. Full staff
  screens, private attachment upload and CSV search/export UI remain unfinished.

### Phase 9 — Audit, security and system

- **9.1 Audit viewer — partly done.** Audit logging exists for current admin
  mutations. A read-only searchable/filterable API and CSV response are now
  added; the staff audit UI remains unfinished.
- **9.2 Security overview/account — not built.** MFA inventory, inactive-user
  reporting, active sessions, failed sign-ins, recovery-code and session
  management screens are absent.
- **9.3 System status — partly done.** Existing setup checks exist; database,
  storage, email connectivity and deployed-version checks are incomplete.
- **9.4 Backups and privacy requests — partly done.** A client deletion
  request record exists. Client data export and a reviewed deletion-completion
  workflow are absent.

### Phase 10 — Data Pack and reporting

- **10.1 Data Pack — not built.** No workbook template/import preview,
  validation/confirm flow, PDF ZIP processing, import history or current-data
  export exists. No Excel dependency was added.
- **10.2 Management reports — not built.** Requested read-only reports and
  CSV exports are absent.

### Phase 11 — Dashboard, notifications, help and email

- **11.1 Dashboard/notifications — partly done.** Existing admin screens and
  setup status remain; the requested task cards, activity feed and staff
  notifications/digest are absent.
- **11.2 Help — partly done.** `docs/ADMIN_GUIDE.md` has existing staff
  walkthroughs and was updated for the staff hostname. It does not yet cover
  all requested workflows or provide an in-app help page.
- **11.3 Transactional email — not built.** No branded staff invite, MFA reset
  or new-device templates were added.

### Phase 12 — Quality, security review and launch readiness

- **12.1 Seed and role/area E2E — partly done.** Existing unit/E2E suites
  remain, and deployment mode status checks were added and run for both
  builds. No safe local-only account/data seed script or full role-by-area
  matrix and responsive/accessibility suite exists.
- **12.2 Accessibility — partly done.** Existing accessibility fixes/tests
  remain; a full pass over staff sign-in, all forms and dashboard is not done.
- **12.3 Security review — partly done.** The deployment route boundary and
  relevant server guards were reviewed for this task. A full API/RLS/service
  role audit is not complete. `npm audit` reports 16 high-severity findings
  related to transitive `picomatch` dependencies; no forced/breaking upgrade
  was applied.
- **12.4 Environment and launch documentation — partly done.** `.env.example`,
  deployment instructions and handover were updated for the two deployments.
  `docs/LAUNCH_CHECKLIST.md` and the requested full phase-12 documentation
  updates are not complete.

## Existing migrations to apply in order

Apply base SQL once:

1. `supabase/schema.sql`
2. `supabase/client-portal.sql`
3. `supabase/puck-studio.sql`

Then apply additive migrations in timestamp order:

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
20. Optional future Studio CMS migration:
    `supabase/migrations/202611200001_white_label_studio_versions.sql`

No new migration was created for the deployment-isolation work.

## Storage buckets

- `client-documents`: private; client-owner read policy is in
  `supabase/client-portal.sql`.
- `manager-updates`: private; published-media read policy is in
  `supabase/migrations/202611170001_manager_updates.sql`.
- No `site-documents` or onboarding/FICA private bucket exists yet.

## Dependencies and data

- New dependencies: none.
- Platform availability, fund facts, fees and other financial data remain
  empty unless supplied and verified by the firm. No financial or compliance
  values were invented.

## Manual steps before using the new deployment modes

1. Create a second firm-owned Vercel project from this repository.
2. Set `APP_MODE=public` in the public deployment and `APP_MODE=staff` in the
   staff deployment; set each `NEXT_PUBLIC_SITE_URL` to its own approved host.
3. Configure each project's DNS with the records Vercel provides, then verify
   the public and staff domains separately.
4. Add both exact production `/auth/callback` URLs, approved preview callbacks
   and localhost to Supabase Auth Redirect URLs.
5. Set the approved Supabase keys in each deployment. Keep the service-role
   key server-only and do not set a shared cookie domain.
6. Set the first administrator's role only through trusted Supabase
   `app_metadata`; test with fake accounts. Staff MFA enforcement is not yet
   implemented, so do not treat this release as ready for real client data.
7. Optionally add an office IP allowlist in a reviewed hosting/edge control;
   this repository does not implement one.
8. Apply existing migrations/buckets in the order above. Have the firm's
   compliance officer review every workflow before real client data is used.

Additional business-supplied values, PDFs, platform records and content
requirements are listed in `docs/HANDOVER.md`, `docs/CONTENT_NEEDED.md` and
`docs/DEPLOYMENT.md`.

## Validation results

- `npx tsc --noEmit` — passed.
- `npm run lint` — passed.
- `npm test` — passed, 178 tests across 45 files.
- Client goals and signed-document/request foundations pass focused Vitest
  and TypeScript/lint validation.
- Assigned-adviser, notification and review APIs were added and validated
  by TypeScript, lint and unit tests. `APP_MODE=public npm run build` was
  attempted but the environment terminated the build with exit 143 before
  collection/diagnostics; no code error was reported.
- Adviser directory/profile focused tests — passed, 13 tests covering role
  routing, adviser authorization, client empty states and session behavior.
- Public `APP_MODE=public npm run build` — passed and generated all adviser
  client/profile/pack routes.
- Focused portal tests — passed, 13 tests covering routing, role guards,
  session state and client empty/error states.
- `APP_MODE=public npm run build` — passed before the final
  `Permissions-Policy` header-only refinement. Later reruns were terminated
  with exit 143 during the build without a compiler diagnostic.
- `APP_MODE=staff npm run build` — passed before the final
  `Permissions-Policy` header-only refinement. A later rerun was terminated
  with exit 143 during compilation without a compiler diagnostic.
- Deployment-mode Playwright smoke — passed separately in public and staff
  modes, including route status checks, staff CSP nonce/noindex, and the public
  sitemap/robots/navigation checks.
- Full `npm run test:e2e` suite — not run in this task.
- `npm audit` — 16 high-severity transitive dependency findings; see the audit
  output and dependency tree before choosing an upgrade.
- **Task 22 delivery.** Commit `78aff50` was pushed to `origin/main`. This
  final status update is included in a follow-up commit; the branch is left
  clean and synchronized after the push.

## Not built (out of scope)

- Trade execution.
- Portfolio accounting and live valuations.
- Fee invoicing and accounting integration.
- Live identity verification.
- E-signature and payment-provider integrations (interfaces only).
- Any legal or policy wording.

## Additional public-site presentation update

- **Homepage and public shell — completed.** Added the scrolling gold
  statement strip below the public header, shown on public pages and omitted
  from client/staff workspace and sign-in routes. Removed the repeated
  statement from the homepage and About page.
- Added the midnight-blue platform carousel and the four count-up statistics
  using the figures supplied for this request. The repository has PLACEHOLDER BRAND logo
  assets but no supplied platform logo assets, so the carousel uses clean text
  wordmarks for Absa, Momentum, Sanlam and Old Mutual rather than recreating
  their official marks.
- Added the five investment-belief cards, strategy swipe carousel, user-supplied
  featured insight cards and a three-item homepage view of the existing
  RSS-backed market-commentary feed. The feed continues to refresh on its
  existing 15-minute interval. No article URLs or financial data were invented;
  the supplied insight cards link to the insights index.
- **Footer — completed.** The public footer now contains the requested firm
  and contact details, the three requested policy links, and an Updates link.
  The POPIA link points to the existing POPI Act statement PDF. The separate
  compliance footer was removed to match the requested footer contents; the
  compliance officer should review disclosure presentation before launch.
- **Instructions file — unavailable.** No `instructions.md` exists in the
  repository; `AGENTS.md` contains only the generated Next.js guidance. The
  installed Next.js App Router and Client Component documentation was read.
- No migration or package dependency was added.
- Validation for this increment: `npx tsc --noEmit` passed,
  `npm run lint` passed, and `npm test` passed (178 tests across 45 files).
- `npm run build` was attempted twice; both attempts were terminated with exit
  143 and no code diagnostic. The first attempt completed compilation before
  termination during the TypeScript phase. The build is therefore not verified
  to completion in this environment.
- The new Playwright cases were added but could not be executed: a pre-existing
  Next dev server held the shared `.next` dev lock and did not respond to the
  local test request. Do not treat the browser checks as passed.
- `npm audit` has not been rerun and the previously recorded 16 high-severity
  transitive `picomatch` findings remain outstanding.
