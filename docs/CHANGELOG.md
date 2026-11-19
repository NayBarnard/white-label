# Changelog

## Task 22: Public homepage presentation
- Added the scrolling gold statement ticker beneath the public header and
  removed repeated copies of the statement from other public page content.
- Added the midnight-blue distribution-platform marquee, count-up statistics,
  animated investment beliefs, swipeable strategy and insight cards, and a
  three-item view of the existing live market-commentary feed.
- Simplified the public footer to the requested firm, contact, and policy
  links. The POPIA link uses the existing POPI Act statement PDF.
- Removed public advisor-login links so the public navigation does not expose
  a staff sign-in route.
- Added Playwright coverage for the homepage content, ticker visibility,
  carousel controls, and requested footer links.

## Phase 1: Fund comparison resilience
- Added timeout handling and clearer empty/error states for the comparison chart.
- Prevented the infinite spinner by treating empty `fund_metrics` as a normal empty state instead of a loading state.
- Added `docs/TROUBLESHOOTING.md` covering the required environment variables and Supabase setup/import steps.

## Phase 2: Glass design foundation
- Continued standardising the visual system around reusable glass tokens in `src/app/globals.css`.
- Replaced flat light-mode inputs with translucent galaxy-glass gradients, speckle highlights, light hairline borders, and a darker elevated menu treatment.
- Improved chart, reveal, and portal styling for the iOS-inspired design language.
- Kept content and logic intact while improving motion and reduced-motion handling.
- Verified the primary routes at 360, 768, 1024, and 1440 px in both themes with Playwright; no horizontal overflow was detected.

## Phase 3: Connection splash
- Gated the splash to the connection flow and suppressed repeat displays for the browser session.
- Kept a minimum 800 ms display for quick successful checks, then dismisses with a fade.
- Added the poster to the video element and retained the still-logo and reduced-motion fallbacks.
- Removed the global video preload so the asset is fetched only when the connection splash is shown.
- Documented that the MP4 needs visual confirmation for the all-four-paws requirement; it could not be previewed in this environment.

## Phase 4: Content, metadata and placeholders
- Added unique page metadata and OG tags across the primary pages.
- Added route-specific Open Graph metadata to the portal, admin, studio, and unsubscribe routes and kept restricted routes out of indexing.
- Added `robots.txt` and `sitemap.xml` generation.
- Added typed placeholder exports in `src/data/firmData.ts` for minimum investment, fee data and asset allocation, along with `docs/CONTENT_NEEDED.md` documenting the exact client-supplied items still required.
- Added explicit as-at dates and source labels to published performance blocks, plus a note explaining the June and September reporting dates.

## Phase 5: Client administration
- Added a server-guarded `/admin` page and role-checked API handlers for client listing, portfolio assignment, private PDF upload, manager support replies, and client request status updates.
- Added validation for admin inputs, client ownership references, PDF type/size, and request status values.
- Added service-role-only admin audit logging through additive migrations, including the plural `admin_audit_logs` table used by current mutations.
- Added current portfolio assignments to the client list and supported updating an existing assignment.
- Made portfolio, document, support-reply, and request-status mutations revert if their audit record cannot be saved.
- Documented migration and environment setup in `README.md`.

## Client action still required
- Confirm the final minimum investment levels for each product or strategy.
- Approve the fee schedule, including management, performance and entry fees.
- Supply final target asset allocations for each strategy.
- Confirm the approved source attribution and calculation methodology for strategy performance.
- Confirm the final live domain and canonical URL configuration in Vercel and Supabase.
- Review and approve any final legal/compliance copy, including POPIA and terms/privacy content.
- Apply the additive migrations in `docs/DEPLOYMENT.md` after the matching base SQL files and confirm the private bucket already exists.
- Configure and verify the production domain, Supabase Auth callback URLs, SMTP settings, and production environment variables.
- Obtain legal approval for the privacy and terms pages and verify CSP against the live Supabase Auth/Storage project.

## Phase 6: Hardening and quality
- Added baseline security headers, including production HSTS.
- Added a Supabase-backed, atomic fixed-window rate-limit RPC and server-side HMAC IP hashing for the enquiry, newsletter signup, and chat endpoints.
- Added bounded JSON-body reads, request-size limits, and hidden honeypot fields for enquiry and newsletter forms.
- Recorded newsletter consent and unsubscribe timestamps through an additive migration; added signed unsubscribe links and a self-service confirmation page.
- Added an authenticated portal request path for POPIA personal-data deletion, with a new additive request-type migration; records are not deleted automatically.
- Added generic provider-failure handling for the chat endpoint.
- Added typed, readable required-environment validation for public submission storage.
- Added a browser-safe typed validator for public Supabase configuration and kept server environment validation separate.
- Recorded enquiry POPIA consent as an ISO timestamp through additive migration `202611160006_enquiry_consent_timestamps.sql`.
- Added Vitest/React Testing Library coverage for public API validation, chat fallback, unsubscribe, and fund-comparison empty/error/retry states.
- Added Playwright smoke tests for portal/admin redirects, studio access gating, security headers, responsive theme/viewport checks, branded 404 behavior, and all 16 public document downloads, plus a GitHub Actions workflow.
- Added real 429-window and enquiry-consent timestamp tests; the quick-connection splash now avoids loading the MP4 unless the initial connection is still pending after 500 ms.
- Added Playwright report/result folders to `.gitignore`.
- Verified locally: TypeScript, lint, production build, Vitest (55 tests), and Playwright (25 tests, including all 16 resource downloads) pass. Lighthouse measured desktop at 99/100/96/100 and mobile Performance varied from 60 to 72, with Accessibility/Best Practices/SEO at 100/96/100. The requested 90+ mobile Performance target remains unmet and needs additional profiling against the deployed environment.
- Still outstanding: review the current CSP's `unsafe-inline` allowances before launch, verify authenticated admin workflows with live Supabase Auth/Storage, confirm newsletter delivery-platform integration, and continue mobile performance tuning.

## Phase 7: Deployment readiness
- Added a Vercel/Supabase custom-domain, SQL migration, Auth redirect, and SMTP checklist in `docs/DEPLOYMENT.md`.
- Added a branded 404 page, route/root error boundaries, and privacy and website terms placeholders marked for legal review.
- Added privacy and terms pages to the sitemap and site footer.

## Deployment and client follow-up
- No live Supabase migrations or Vercel settings were changed or verified in this workspace.
- Apply the additive migrations listed in `docs/DEPLOYMENT.md` in order, configure the required Vercel environment variables, and verify Auth redirects, SMTP, private storage, and CSP against the production project.
- The MP4 splash asset still needs a client visual check to confirm the bear runs on all four paws.
- A newsletter delivery platform must honor the signed unsubscribe URL before campaign emails are sent.

## PLACEHOLDER BRAND phased delivery
- Stabilized portal auth refreshes, centralized the firm name and regulatory notice, restricted illustrative portal data to allowlisted demo accounts, and fixed the home-page background across themes.
- Replaced visitor-facing provider errors with plain-language messages; added no-data handling for NAV charts and reusable firm counters, optional leadership photos, and initials avatars.
- Added real-PDF serving when approved files are supplied, a conditional important-disclosure section, and typed fund facts used by the portfolio pages and assistant.
- Added typed feature flags and provider interfaces, plus gated manager updates, tax-year information, client goals, profile-change requests, and optional onboarding submission. Provider integrations remain unconfigured until the firm selects and authorizes providers.
- Added an installable PWA manifest, offline page, public-only service-worker caching, installation control, and safe-area-aware layout support.
- Added the admin-only `/admin/setup` checklist and non-developer handover and admin guides. The setup page reports variable names and presence only, never environment values. Updated deployment instructions with the additive migrations.
- No dependencies were added. Real client PDFs, fund facts, important-disclosure text, client count, and leadership photos remain firm-supplied items. Live Supabase, Vercel, Auth, and domain configuration were not changed or verified here.

## Final quality gate
- Passed `npx tsc --noEmit`, `npm run lint`, `npm test` (97 tests), `npm run build`, and `npm run test:e2e` (30 Playwright tests).
- The E2E run logged a 403 from the external BusinessTech insights feed; it did not fail any test. Live signed-in Supabase workflows still require verification with firm-owned test accounts.

## Adviser portal foundation
- Added a feature-flagged `/advisor` page that requires a server-verified `app_metadata.role` of `adviser`. It displays existing published PLACEHOLDER BRAND fund information and public resources only.
- Added in-page section navigation, fund search, session-local recent-fund tracking, document search/category filters, and a multi-strategy performance comparison using only already-published values.
- Added typed fund-search and client-grant contracts. The grant check fails closed unless the link is active, client-consented, placeholder-approved, not revoked, and includes the required scope.
- Adviser accounts do not inherit visibility of investor records. Client profiles, investments, reports, and documents remain unavailable until the consent, approval, revocation, audit, and record-fetching workflow is implemented and verified. LISP listings, fee data, and MDD dates render empty states when unpublished.
- Added unit tests for fund/platform search, recent-fund tracking, document filtering, and client-grant authorization, plus the route-off E2E check. Updated service-worker exclusion and handover prerequisites; Navbar/navigation remains unchanged.
- Verified with TypeScript, lint, Vitest (106 tests), production build, and Playwright (31 tests). No dependencies were added.

## Portal access and platform availability

- Unified adviser and administrator sign-in at `/advisor/login`; administrators
  land at `/admin`, advisers at `/advisor`, and client accounts are signed out
  with staff-only guidance. Admin pages return 404 for non-admins. Added the
  public-footer Staff sign-in link and 30-minute inactivity sign-out with a
  60-second warning.
- Verified that both the protected Puck editor and interactive homepage fund
  comparison remain available; added browser coverage for the fund and
  timeframe controls.
- Added additive migration `202611180001_platform_availability.sql` for
  platforms, fund share classes, availability, role-restricted reads, and
  append-only per-cell history. Admin mutations are server-authorized and
  audited; adviser lookup is role-checked and rate-limited.
- Added ISIN normalization, format/check-digit validation with explicit admin
  confirmation on checksum warnings, JSE-code normalization, ranked lookup,
  and a 180-day re-verification flag. The matrix intentionally ships empty and
  is not included in public pages, the sitemap, or chatbot content.
- The firm must supply the verified platform/share-class/code/ISIN spreadsheet
  and name a quarterly re-verification owner before populating the matrix. The
  optional CSV import UI is not included.
- No dependencies were added. Live Supabase migrations and signed-in firm
  accounts were not available for verification in this workspace.

## Public and staff deployment separation

- Added `APP_MODE` route isolation in the Next.js 16 proxy. Public mode returns
  404 for staff routes/APIs; staff mode returns 404 for public routes/APIs and
  redirects its root to the shared staff sign-in.
- Removed staff/adviser sign-in links from public navigation and footer.
  Public sitemap and robots output no longer expose staff paths; staff output
  is noindex.
- Added nonce-based staff script CSP, frame protections, no-referrer and
  production HSTS. Inline style attributes remain allowed for existing UI
  components and should stay under review.
- Documented the second Vercel project, deployment-specific environment
  variables, subdomain DNS, Supabase redirect URLs and host-only cookies in
  `docs/DEPLOYMENT.md`.
- Added deployment route tests for both modes and a Playwright smoke test that
  runs against public and staff builds. No dependencies or migrations were
  added.
- Remaining work: staff MFA, central permissions and the other unfinished
  phases are listed in `STATUS.md`.

## Staff MFA and permissions

- Added staff sign-in password show/hide, forgot-password email, generic
  sign-in messaging and a rate-limited server preflight.
- Added Supabase TOTP enrollment and challenge UI, recovery-code verification
  and recovery-code generation, with named 30-minute inactivity, 60-second
  warning and 12-hour absolute session constants.
- Protected adviser/admin pages and APIs by checking verified JWT claims for
  AAL2. Staff sign-out uses global scope where available.
- Added `src/lib/staff/permissions.ts` for central role/action checks and
  wired adviser/admin server authorization to it.
- Added an admin MFA-reset route that requires exact typed target-email
  confirmation and writes an audit entry. Supabase MFA settings and live
  enrollment/verification remain manual prerequisites.

## People and CRM foundations

- Added the `/admin/people` screen and server-authorized People API for
  invitations, role changes, deactivation/reactivation, password-reset email
  initiation and MFA reset.
- Added a 500-row CSV preview and second-confirmation client invitation flow.
- Added staff-only `staff_profiles`, `client_crm_notes` and
  `client_crm_tasks` tables through additive migration
  `202611180002_people_and_crm.sql`.
- Added audit-backed CRM note/task creation APIs. Unified client CRM editing,
  task status updates and the remaining People workflow are not complete.

## Published document foundations

- Added additive `site_documents` version storage and the private
  `firm-documents` PDF bucket migration.
- Added draft creation, compliance approval and publish-only signed access
  foundations. The public document route can prefer a published version and
  otherwise keep its existing real-PDF/generated fallback behavior.

## Onboarding records foundation

- Added staff/client onboarding checklist rows for the required document
  classes and review statuses, with rejection reasons and reviewer metadata.
- Added private `onboarding-private` storage and an append-style document
  access log table. The review queue and audit-backed review API are present;
  client upload UI and signed-URL delivery remain unfinished.

## Support, communications and compliance foundations

- Added support-thread, thread-message, canned-reply, phone-verification,
  announcement and announcement-recipient database/API foundations.
- Personal/banking-detail requests cannot be completed as staff actions until
  a phone-verification record exists.
- Added append-only compliance register entries and history, private
  attachment storage, monthly review sign-offs, and a read-only filtered audit
  API with CSV export.

## Empty portal diagnosis and adviser client workspaces

- Corrected client/adviser post-login destinations. Missing client role
  metadata defaults safely to the client portal; unknown roles are rejected.
- Adviser pages now require AAL2 and adviser/admin role authorization.
- Added an adviser client directory and relationship-gated client profile.
- Added relationship-gated adviser private notes/tasks and a downloadable
  branded PDF adviser pack that identifies unavailable data instead of inventing it.

## Assigned adviser and review workflows

- Added client API data for the active assigned adviser relationship.
- Added client notification and review list APIs and RLS-protected tables.
- Added assigned-adviser client lookup and client overview/adviser cards.
- Added notification read-state API and goal archive/restore support.
- Added adviser review scheduling and client-visible notifications/adviser
  details to the existing portal surfaces.

## Responsive portal QA

- Added public/login Playwright viewport coverage at 360, 390, 768 and
  1440 px and corrected adviser-portal deployment-mode expectations.
- Authenticated live client/adviser pages still require Supabase test accounts,
  role claims and approved development data before they can be verified end-to-end.
