# WEALTH OS Architecture Map

## Verified starting architecture

- Next.js 16 App Router application using React 19 and TypeScript.
- Supabase is used for Auth, PostgreSQL, RLS, and private storage in hosted deployments.
- The application has two deployment modes:
  - public mode: public website plus explicitly enabled standalone demos;
  - staff mode: staff and adviser surfaces protected by server-side staff checks.
- Browser-local storage remains for demonstration and Studio workflows. It is not the authority for production financial records.
- `src/proxy.ts` applies route disposition and deployment mode, but route-level server checks remain mandatory.

## Application boundaries

- Public website: `src/app/page.tsx` and public content routes.
- Client portal: `/portal`, `/portal/dashboard`, and `/api/portal/*`.
- Adviser portal: `/advisor`, `/advisor/clients`, `/advisor/search`, and `/api/advisor/*`.
- Firm administration: `/admin`, `/admin/people`, `/admin/platforms`, `/admin/setup`, and `/api/admin/*`.
- Platform/studio: `/studio` and `/api/studio/*`; `/studio` is browser-local/demo or staff-controlled by deployment mode.
- Public and authenticated financial intelligence APIs: `/api/wealth-os/*`.
- Supabase migrations: `supabase/migrations/` in timestamp order.

## Authentication

- Supabase SSR browser/server clients are used for cookie-backed sessions.
- Adviser and admin routes require a Supabase user, staff role metadata, and AAL2 claims.
- Admin API authorization is centralized in `src/lib/admin/server.ts`.
- Adviser API authorization is centralized in `src/lib/adviser/server.ts`.
- Staff permissions are centralized in `src/lib/staff/permissions.ts`.
- Tenant ID is obtained from trusted `app_metadata.tenant_id`; the Studio helper currently defaults missing metadata to `default`.

## Persistence

- PostgreSQL schema is migration-managed.
- RLS is enabled on the tenant and financial modules, but the repository also has some tables and legacy SQL scripts outside the migration set.
- Server operations use the authenticated Supabase client where RLS must apply.
- A service-role client exists only in server code for selected administrative/public operations; every use requires route-specific review.

## Storage

- Private client document storage is represented by the `client-documents` bucket and `client_documents` metadata.
- Signed URL generation and access helpers exist in storage/server code.
- Private storage policies require hosted verification and tenant-aware tests.

## Key risks identified during initial inspection

1. The README and route pages describe browser-local demonstrations as the default. Production tenant workflows are incomplete.
2. Branding is hard-coded in `src/config/brand.ts` and shared demo data.
3. Staff roles do not yet model a platform super-administrator or full firm/client tenant membership model.
4. Existing RLS is split across legacy SQL and migrations and has not been verified end-to-end against Auth-issued sessions.
5. Several public pages expose functional-looking data or controls backed by demo/local state.
6. One baseline unit test fails: the configured demo email test is not receiving the expected illustrative banner.
7. External Supabase, Vercel, storage, SMTP, MFA, and DNS credentials are not available for hosted verification.

