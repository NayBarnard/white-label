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

## Previously recorded validation

The following is retained from the earlier repository status and is not the
baseline for the acquisition-readiness review below.

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

## 2026-11-22 financial intelligence implementation

- Added a seeded, versioned digital twin with confidence ranges and life events.
- Added consequence graph analysis for proposed planning changes.
- Added append-only browser decision context and Supabase API storage.
- Added parallel plan comparison and concentration/currency/liquidity findings.
- Added evidence-only opportunity review, relationship verification, approved
  knowledge records, hypothetical crisis rehearsal and a discovery register.
- Added unit coverage for reproducibility, risk thresholds, opportunities and
  linear crisis assumptions.
- Optional Supabase migrations are required before hosted persistence can be
  enabled; standalone planning remains browser-local.
- Hosted tenant/RLS validation, authorised real holdings data and regulatory
  review remain outstanding and are not represented as production-ready.

## 2026-11-22 acquisition-readiness reconciliation

- Verified that the financial twin, consequence, plan/risk and enterprise
  helpers exist and are wired into the local planning lab, but their scope is
  materially short of several acceptance criteria. The innovation register
  now labels those modules as prototypes or partial rather than complete
  hosted features.
- Found that the WEALTH OS financial-intelligence handlers used the service
  role for financial rows and substituted `default` for missing tenant
  metadata. Changed those handlers to use the authenticated cookie session,
  require a trusted explicit non-default tenant claim, use RLS, and rate-limit
  reads and writes. Staff access also requires the adviser-portal permission
  and a verified AAL2 session.
- Added an additive RLS/append-only migration and an atomic decision/context
  RPC, plus a default-closed tenant readiness gate that denies direct RLS and
  API access until required verification fields are attested. Fixed invalid
  `FOR SELECT, INSERT` policy syntax in migration
  `202611220003_decisions_plans_risk.sql`. The initial reconciliation did not
  execute migrations; they were subsequently validated in the local setup
  described below.
- A pure validation test covers absent, malformed and shared-demo tenant
  claims. A transactional local SQL test now passes for two tenants and
  adviser/admin roles, covering selected WEALTH OS RLS, readiness denial,
  cross-tenant writes and append-only decision constraints. It simulates JWT
  claims at the database layer and does not substitute for Auth-issued session,
  API-route or hosted-project tests.
- Created `docs/IMPLEMENTATION_PLAN.md`; Phase 1 remains incomplete until
  broader authenticated isolation, relationship authorization, backup/restore
  and operational controls are validated.

### Baseline checks for this review

- `npm run lint` — passed.
- `npx tsc --noEmit` — passed.
- `npm test` — 67 test files and 251 tests passed.
- `npm run build` — passed.
- Initial baseline E2E attempt — could not start because it ran concurrently
  with `next build`; the production build was not yet present.

At baseline, no Supabase CLI, `psql`, or dedicated hosted test-project
credentials were present. The CLI was later run ephemerally to create and
validate an isolated local stack; hosted tenant/role isolation tests remain
unrun. The platform remains suitable only for fictional demo data; do not use
it for real client financial data.

### Final checks after this implementation slice

- `npm run lint` — passed.
- `npx tsc --noEmit` — passed.
- `npm test` — 69 test files and 256 tests passed.
- `npm run build` — passed.
- `npm run test:e2e` — 51 browser tests passed. Chromium and its required
  operating-system libraries were installed in the execution environment;
  no project dependency was added.
- `npm audit --omit=dev --audit-level=moderate` — passed with 0 production
  dependency vulnerabilities.
- `git diff --check` — passed.

The browser suite emitted an HTTP 403 warning for an external BusinessTech
RSS source and reported that public API rate limiting was unavailable without
Supabase configuration. These did not fail the standalone E2E suite and do
not validate hosted security behavior.

### Local Supabase setup

- Added `supabase/config.toml`, a local no-client-data seed, and
  `docs/LOCAL_SUPABASE.md`. The app uses ignored `.env.local` credentials
  generated for this local Docker stack only.
- Added local baseline migration `202611150001_base_schema.sql`, assembled
  from the existing base SQL files, so the complete migration chain runs on a
  fresh local database.
- Fixed invalid identity-column syntax in
  `202611180006_compliance_registers.sql`, which the local database exposed.
- `npx --yes supabase@3.2.0 start` — passed; Auth health returned HTTP 200.
- `npx --yes supabase@3.2.0 db reset` — passed; all 28 migrations and the
  seed script applied to the local database.
- A read-only database check confirmed the readiness table exists, has zero
  rows, and denies an unknown tenant by default.
- `npm run test:supabase:rls` — passed; transactional local SQL test exercised
  two tenants, adviser/admin claims, selected tenant/owner RLS, readiness
  denial, cross-tenant write denial and append-only decision constraints.
  Fixtures were rolled back. This test simulates JWT claims inside Postgres;
  it does not exercise Auth-issued tokens or API routes.
- No hosted project was linked or modified. Hosted, Auth-issued-session and
  broader application-resource isolation tests remain unrun.
