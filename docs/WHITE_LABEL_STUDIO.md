# White Label Studio implementation checklist

This is the delivery checklist for the Studio in this repository. A checked
item means the behavior exists in source and was locally validated; it does
not imply that a live Supabase project or deployment was configured.

## Protected Studio and publishing foundation

- [x] `/studio` is a separate full-screen workspace and no longer writes
  homepage content to browser local storage.
- [x] Studio page access uses the server-verified administrator and AAL2 guard.
- [x] Draft, publish, and restore API requests repeat server-side authorization.
- [x] Studio data is validated against the existing Puck component schema.
- [x] Homepage drafts are persisted separately from immutable published
  snapshots.
- [x] Publishing requires confirmation, records the publishing user and time,
  and does not report success when the database write fails.
- [x] Prior snapshots can be loaded for editing or restored by publishing a
  new version.
- [x] The public homepage renders only a valid published configuration and
  falls back to the legacy `site_pages` row and then the existing homepage.
- [x] Public/staff route isolation is enforced in the Next.js 16 Proxy and
  covered by route tests.
- [x] The migration adds tenant-scoped version rows and RLS without changing
  existing business tables.

## Not implemented yet

- [ ] Full automatic draft saving and unsaved browser-session recovery.
- [ ] Editing public pages other than the existing homepage.
- [ ] Global brand identity and design-token controls reflected throughout
  every public route.
- [ ] Dedicated component library beyond the existing Puck homepage sections.
- [ ] Supabase Storage upload, image cropping, and marketing-media management.
- [ ] Navigation, feature-control, SEO, templates, and full website settings
  managers.
- [ ] Full configuration diffing, separate publishing event log, and version
  retention/cleanup controls.
- [ ] Tenant provisioning, tenant-aware public host resolution, tenant-specific
  Storage policies, and cross-tenant integration tests.
- [ ] Live Supabase integration and browser verification with administrator,
  non-administrator, and AAL1-only accounts.

These deferred areas are intentionally not represented as working controls.
The current release is a secured homepage editing and publishing foundation,
not the complete multi-tenant customization suite.

## Required local verification

- [x] `npm run lint` passed after implementation.
- [x] Focused route, Puck data, and tenant-claim tests passed.
- [x] Full Vitest suite passed (196 tests), TypeScript passed, and the
  production build passed.
- [x] Public E2E smoke suite passed (27/27); the full Playwright suite passed
  (41/41). Browser assertions now match the local demo portal, current research
  headings, and the accurate non-licensed demo disclosures.
- [ ] Authenticated Studio/database E2E remains unavailable without Supabase
  test credentials and a migrated project.

## Deployment prerequisites

Apply the existing base scripts and additive migrations in
[`DEPLOYMENT.md`](./DEPLOYMENT.md), including
`supabase/migrations/202611200001_white_label_studio_versions.sql`. Configure
Supabase Auth, trusted administrator `app_metadata`, AAL2 MFA, and the
server-only service role key before using Studio. Never use live customer data
for initial Studio verification.
