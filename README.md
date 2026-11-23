# WEALTH OS

WEALTH OS is a hosted, multi-tenant white-label wealth-management SaaS platform built with Next.js, React, TypeScript and Supabase.

## Portals

- `/platform` and `/platform/firms`: WEALTH OS platform operator administration.
- `/admin` and `/admin/login`: firm administration.
- `/advisor` and `/advisor/login`: authorised adviser workspace.
- `/portal` and `/portal/dashboard`: authenticated client portal.
- `/studio`: website and content studio.

## Architecture

- Next.js 16 App Router and React 19.
- Supabase Auth, PostgreSQL, Row Level Security and Storage.
- Public/staff deployment modes with server-side route protection.
- Tenant, firm membership, domain and branding tables.
- Tenant-aware adviser search and core wealth records.
- Private signed-URL document storage.
- Browser-local demo workflows only in standalone/development mode.

## Tenant model

Tenant identity must come from trusted Supabase `app_metadata.tenant_id`, not a browser-supplied ID. Membership is stored in `wealth_os_tenant_memberships` and verified on the server.

Supported roles include platform operator, firm administrator, compliance officer, financial adviser, adviser support staff and client.

## Local development

```bash
npm install
npm run dev
```

For browser-only demonstrations, use `/client`, `/advisor`, `/admin` and `/studio` without Supabase credentials.

For local Supabase:

```bash
npx supabase start
npx supabase db reset
npm run dev
```

Copy `.env.example` to `.env.local` and set hosted or local Supabase values. Never expose `SUPABASE_SERVICE_ROLE_KEY` to browser code.

## Database

Apply migrations with the ordered Supabase migration chain:

```bash
npx supabase db reset
npm run test:supabase:rls
```

The migration set includes the tenant foundation, core wealth tenant isolation, universal search and existing portfolio/document/onboarding migrations.

## Testing

```bash
npm run lint
npx tsc --noEmit
npm test
npm run test:supabase:rls
npm run build
npm run test:e2e
```

Playwright requires Chromium:

```bash
npx playwright install --with-deps chromium
```

## Security

- Supabase Auth session verification is server-side.
- Staff and tenant memberships are checked before privileged operations.
- RLS protects tenant data.
- Service-role keys are restricted to server-only routes.
- Private documents use signed URLs and private buckets.
- MFA is required for staff sessions in configured deployments.

See [Security](./docs/SECURITY.md) and [Testing](./docs/TESTING.md).

## Deployment

Set required public and server environment variables in Vercel. Live deployment requires approved Supabase project access, database migrations, Auth URLs/MFA/SMTP, private storage, domains/DNS and a Vercel project.

See [Deployment](./docs/DEPLOYMENT.md).

## Financial data

Portfolio values and performance must come from persisted authorised records. Missing values are reported as unavailable. The platform does not present demo values as real client data. Intelligence outputs are methodology-labelled and are not regulatory advice.
