# WEALTH OS Security

## Standalone local workspace boundary

The browser-local administrator, adviser, client, and Studio workflows do not
authenticate users or provide server-side tenant isolation. IndexedDB data is
device/browser scoped and is not encrypted by the application. Do not treat
these workflows as a secure multi-user hosted deployment or store confidential
production records in them.

## Authentication

- Supabase Auth provides browser/server sessions.
- Staff routes require a trusted role and active tenant membership.
- Staff MFA uses AAL2; absolute and inactivity session limits are enforced in the portal guard.
- Password recovery and invitation callbacks use verified Supabase Auth exchange/OTP flows.

## Authorization

- Platform operator access is separate from firm administration.
- Firm administrators cannot manage platform-level firms.
- Adviser records require active adviser-client relationships.
- Client records require the authenticated user ID and matching tenant claim.

## Database

- RLS is enabled on tenant, membership, financial, search and readiness tables.
- Core client portfolios, transactions, documents and goals carry tenant ownership.
- Service-role access is restricted to server-side administrative/public operations.
- The local SQL isolation suite verifies tenant and role boundaries with synthetic identities.

## Storage

- `client-documents` and `manager-updates` are private buckets.
- Downloads use signed URLs or server-authorized download routes.
- Tenant-specific object organization must be configured and verified for each hosted project.
- Hosted storage policy testing remains required before production sign-off.

## Secrets

Never place `SUPABASE_SERVICE_ROLE_KEY`, SMTP credentials or provider secrets in browser environment variables or source control.

## Audit

Admin mutations write audit records through protected server routes. Compliance registers, document history and approval workflows are migration-backed.

## Remaining external security verification

Hosted Auth-issued-session tests, hosted MFA, private bucket policies, live cross-tenant API tests and production incident controls require approved credentials and infrastructure.
