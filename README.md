# WEALTH OS

WEALTH OS is a standalone-first wealth-management application built with
Next.js, React and TypeScript. Browser-local workflows run without Supabase
credentials. Supabase remains an optional hosted, multi-tenant deployment
integration.

## Standalone portals

With Supabase URL and public key unset, the local workspace routes are:

- `/admin`: firm settings, local user records, client/adviser assignments,
  holdings, transactions, documents, and workspace backup/restore.
- `/advisor`: assigned local clients, notes, tasks, holdings, and review-pack
  export.
- `/portal`: client profile, holdings, transactions, goals, documents, and
  locally saved support requests.
- `/studio`: local website editing, project import/export, and static website
  ZIP generation.

The local portals do not authenticate users or isolate records between people
using the same browser profile. Their IndexedDB data remains on that browser
and device; it is not synchronized, encrypted by the application, or suitable
for confidential production records. Workspace backups include the stored
records and uploaded documents; protect exported backups appropriately.

## Optional hosted architecture

Hosted deployments can use Supabase Auth, PostgreSQL, Row Level Security,
Storage, and tenant-aware server authorization. Tenant identity in hosted
mode must come from trusted Supabase `app_metadata.tenant_id`, not a
browser-supplied ID. Membership is stored in
`wealth_os_tenant_memberships` and checked on the server.

Supported hosted roles include platform operator, firm administrator,
compliance officer, financial adviser, adviser support staff, and client.
Hosted authentication, tenant isolation, and private storage are separate
from the unauthenticated local workspace and require their own deployment
configuration and verification.

## Local development

```bash
npm install
npm run dev
```

In the default public app mode, leave `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` unset to use standalone portal routes. No
Supabase login, project link, or remote migration is needed for local
development.

To run the optional local Supabase stack:

```bash
npx supabase start
npx supabase db reset
npm run test:supabase:rls
```

Only configure hosted Supabase values when intentionally testing that
integration. Never expose `SUPABASE_SERVICE_ROLE_KEY` to browser code.

## Studio exports

The Studio saves editable projects in the browser and can export a static
website ZIP. The ZIP is not a deployment, hosted login, or wealth-data
integration. See [White Label Studio](./docs/WHITE_LABEL_STUDIO.md).

## Testing

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
npm run test:e2e
```

Database/RLS tests require the optional local Supabase stack:

```bash
npm run test:supabase:rls
```

Playwright requires Chromium:

```bash
npx playwright install --with-deps chromium
```

See [WEALTH OS master checklist](./WEALTH_OS_MASTER_CHECKLIST.md) for the
authoritative work order and current completion status,
[Security](./docs/SECURITY.md), and [Testing](./docs/TESTING.md).

## Financial calculations

Portfolio values and performance must come from recorded, authorized data.
Missing values remain unavailable. Planning and intelligence outputs are
illustrative, disclose their assumptions, and are not regulated advice or a
guarantee of investment outcomes.

In the planning lab, surplus and tax-allowance inputs start blank. Holding-risk,
relationship, decision, and knowledge records are created only from explicit
user input; the application does not seed those workflows with fictional
records.

## Optional deployment

Hosted operation requires a configured Supabase project, migrations, Auth
callbacks and MFA policy, private storage, deployment environment, domains,
and a Vercel project. These are optional hosted-deployment tasks, not
prerequisites for standalone local workflows. See
[Deployment](./docs/DEPLOYMENT.md).
