# Local Supabase development

This local Supabase stack is for development and fictional test data only. It
does not connect to a hosted project or authorize production use.

## Requirements

- Docker Engine running.
- Node.js and npm.

The Supabase CLI is run ephemerally at a pinned version; it is not added to the
application dependencies.

## Start, reset, and stop

From the repository root:

```bash
npx --yes supabase@3.2.0 start
npx --yes supabase@3.2.0 status -o env
npx --yes supabase@3.2.0 db reset
npx --yes supabase@3.2.0 stop
```

`db reset` drops and recreates the **local** database, then applies the ordered
migrations and `supabase/seed.sql`. Do not pass a remote database URL or link
this local workflow to a hosted project.

The first migration, `202611150001_base_schema.sql`, is the local CLI baseline
assembled from `schema.sql`, `client-portal.sql`, and `puck-studio.sql`.
Continue to keep it aligned with those SQL-editor setup files. The later
migrations then apply in filename order.

## Connect the app

Copy the local `API_URL`, `ANON_KEY`, and `SERVICE_ROLE_KEY` values from the
CLI's status output into an ignored `.env.local` file, mapping them as follows:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=<local API_URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<local SERVICE_ROLE_KEY>
```

Keep the service-role key server-only; never add a `NEXT_PUBLIC_` prefix. Do not
copy local keys into shared or production environments. Start the app with
`npm run dev`. Remove the local environment file when finished if you no longer
want the application to use Supabase.

Local email delivery is captured by the Supabase mail viewer, not sent to real
recipients. TOTP MFA is enabled in the local Auth configuration. No client,
portfolio, or NAV observation rows are seeded. The base schema retains its
existing two fund-directory metadata rows.

Run the local selected-resource tenant/role, readiness-gate, and append-only
SQL checks with:

```bash
npm run test:supabase:rls
```

The test uses the CLI's local database target. It creates temporary users,
tenants, projects, and financial-intelligence records inside a database
subtransaction, then rolls all fixtures back even when an assertion fails.
It sets simulated JWT claim values in Postgres; it does not obtain Auth-issued
tokens or test application API routes.

## Limitations

Starting this stack does not prove production security. Tenant readiness is
closed by default. Hosted RLS behavior, Auth-issued session/API isolation,
broader adviser-client relationship authorization, backup/restore, and
production-readiness attestations still require independent tests and review.
Never use real client financial data in the local project.
