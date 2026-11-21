# WEALTH OS delivery status

## Product status

WEALTH OS is a standalone, browser-local demonstration platform and a static
website authoring/export tool. It is not production-ready financial software:
browser storage is not secure authentication, hosted persistence, tenant
isolation, or a substitute for a regulated data platform.

### Implemented and verified

- The Studio supports visual page and section editing, drag insertion and
  reordering, duplication, deletion, responsive preview, undo/redo, templates,
  reusable sections, and local project persistence.
- New local business projects can be created and managed independently, with
  their own brand configuration, pages, templates and media references.
- Studio exports an independently deployable static website ZIP containing
  HTML pages, responsive CSS, navigation behavior, metadata, brand assets,
  uploaded media, a deployment README, and an editable project backup.
  The browser test suite opens the extracted site directly and checks page
  navigation and rendering.
- Local publishing stores browser-side snapshots and versions. It does not
  deploy to a public host.
- Uploaded media is stored in IndexedDB and remains available after reload;
  replacement, deletion, export, backup and restoration are supported within
  the documented browser storage limits.
- Built-in and user-managed templates support preview, apply, duplicate,
  import and export.
- Deterministic local creative suggestions, quality findings and compliance
  reminders work without an AI service. Suggestions are previewable before
  applying.
- Product and licensing information and onboarding are available at
  `/product`, `/licensing` and `/welcome`.
- Standalone fictional-data client and adviser demonstrations open without
  sign-in. `/portal/dashboard` and `/advisor/login` route directly to the
  respective demo when no deployment mode or Supabase credentials are set.
- Planning and adviser report workflows produce downloadable PDFs.
- Data and media import paths validate inputs and enforce documented size
  limits; browser-local persistence and project export/import are implemented.

### Implemented but not exhaustively verified

- Static exports were exercised from extracted files in Chromium, but have not
  been deployed against every third-party static host or custom domain.
- Media persistence was verified across page reload and export; browser
  eviction, storage exhaustion, and every browser's IndexedDB quota behavior
  cannot be guaranteed.
- Visual workflows were exercised in Chromium at desktop, tablet and mobile
  widths, but not across every browser/device combination.
- Optional Supabase adapters require a configured backend and were not
  validated against a production tenant.

### Still requires external infrastructure

- Production identity, authentication, MFA, server-enforced authorization and
  organisation/tenant isolation.
- Secure cross-device persistence, encrypted document storage, backup,
  retention, audit and recovery services.
- Verified live portfolio, market and investment data; transaction execution;
  and operational financial reporting.
- Hosted deployment and public-domain publishing. The ZIP can be deployed to
  ordinary static hosting, but WEALTH OS does not publish it to a host.
- Legal/compliance approval and any regulated service authorization.

Demo records are fictional. Browser-local portals and role selection must not
be used for real client or sensitive financial data. Compliance findings are
review suggestions, not certification; planning calculations are illustrative
and not personalized investment advice.

## Validation performed

- `npm run lint` — passed.
- `npx tsc --noEmit` — passed.
- `npm test` — 61 test files and 229 tests passed.
- `npm run build` — passed.
- `npm run test:e2e` — 50 public and standalone browser tests passed.
- The standalone browser tests verified login-free client/adviser entry,
  Studio editing and persistence, static ZIP export and independent rendering,
  media workflows, project separation, onboarding, templates, PDF downloads,
  responsive layouts and primary route rendering.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Without deployment mode or Supabase credentials,
the app runs in standalone mode with local demonstration data.

Key routes include `/`, `/product`, `/licensing`, `/welcome`, `/studio`,
`/portal`, `/advisor`, `/planning`, `/admin` and `/site/<slug>`.

## Backup, restore and website export

- Use Studio's project export/import for editable project JSON backup and
  restoration.
- Use Studio's website export to download a static website ZIP. Follow the
  included deployment README to publish it on a static host.
- Studio project drafts, media and local published snapshots remain in this
  browser; website export is the portable copy.
- Administrative demo data and planning/adviser reports have their own
  export controls.

## Optional integrations and production boundary

Supabase integrations are optional in standalone mode. If enabled, configure
the required deployment credentials and database policies, then verify the
deployment's authentication, authorization and data isolation before handling
real information. Do not expose service-role credentials to browser code.

Static site export is independent of WEALTH OS and requires no Supabase,
Firebase, Vercel or paid API. It exports public website content, not a secure
client portal, financial database, transaction workflow or authentication
system.
