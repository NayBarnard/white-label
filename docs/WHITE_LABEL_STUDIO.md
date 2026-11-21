# White Label Studio implementation checklist

The current Studio is a browser-only placeholder demo. It intentionally does
not load or publish business data. A draft can be stored in local browser
storage; do not enter real or sensitive information.

## Implemented and locally verified

- [x] `/studio` is a dedicated full-screen Puck workspace.
- [x] Editor defaults are generic placeholders, with no firm identity,
  licensing details, customer records, financial results, or contact details.
- [x] Browser drafts and recovery copies are stored locally and schema-checked.
- [x] Studio does not request Supabase data or send drafts to Studio APIs in its
  default browser-only mode.
- [x] Publishing controls are absent or explicitly disabled; public site
  content is not changed by Studio edits.
- [x] A development-only `STUDIO_DEMO_MODE=true` option opens `/studio`
  without Supabase authentication. Production never honors this bypass.
- [x] Supabase-backed Studio APIs reject reads and writes unless the
  server-side `STUDIO_STORAGE_MODE=supabase` opt-in is set.
- [x] Public homepage rendering does not query Studio versions in browser-only
  mode and retains the existing built-in site fallback.
- [x] Public/staff route isolation remains covered by route tests.

## Not implemented or not enabled

- [ ] Supabase-backed saving, publishing, and rollback are not enabled for
  this placeholder demo and have not been verified against a live project.
- [ ] Full brand identity, global design tokens, additional managed pages,
  media uploads, navigation, templates, feature controls, and SEO settings.
- [ ] Tenant provisioning, tenant-aware host resolution, tenant-specific
  Storage policies, and cross-tenant integration tests.
- [ ] Authenticated Studio/database E2E using a non-production project.

The optional migration
`supabase/migrations/202611200001_white_label_studio_versions.sql` and
protected server routes remain available as a future integration path. They
are not required or used by the browser-only demo.

## Verification

- [x] TypeScript and lint passed after the placeholder-only changes.
- [x] Full Vitest suite passed (206 tests).
- [x] Production build passed.
- [x] Full Playwright suite passed (41/41).
- [x] Local browser check confirmed `/studio` renders without Supabase and
  sends no Supabase requests.
- [ ] Live Supabase and Vercel integration checks are intentionally not run.

## Local demo

Run `STUDIO_DEMO_MODE=true npm run dev`, then open `/studio`. No Supabase or
Vercel credentials are needed. The development proxy permits only the Studio
page for this explicit local mode. Do not set `STUDIO_DEMO_MODE` in production.
