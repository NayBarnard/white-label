# Route and feature reconciliation

## Comparison scope

The original repository named in the execution brief was not available in this workspace, so a direct repository-to-repository diff could not be performed. Reconciliation below is based on the complete `white-label` route inventory and the missing routes named in the brief.

## Preserved routes

- `/portal` and `/portal/dashboard`: client portal entry and secure client sign-in experience.
- `/advisor/login`, `/advisor`, `/advisor/clients`, `/advisor/clients/[clientId]`, `/advisor/platforms`: adviser authentication, dashboard, client workspaces and platform information.
- `/admin/login`, `/admin`, `/admin/people`, `/admin/platforms`, `/admin/setup`, `/admin/manager-updates`: administrator authentication and firm administration.
- `/resources`, `/insights`, `/insights/library`, `/portfolios`, `/planning`, `/product`: public information and planning capabilities.
- `/studio`: tenant homepage and content studio.

## Restored routes

- `/admin/login`: administrator-only Supabase staff sign-in with MFA and recovery-code handling.
- `/advisor/search`: authorised adviser universal search.
- `/api/advisor/search`: tenant-aware adviser search API.

## Platform operator status

The existing role model distinguishes `admin`, `adviser`, `compliance`, and `operations`, but there is no separate authenticated platform-operator role or global-tenant operator permission set. Ordinary firm administrators remain tenant-scoped. A future `platform_operator` role should be additive and must use an explicit allowlist for cross-tenant operations; it must not be inferred from `admin`.

## Remaining manual work

- Create tenant and role metadata for users in Supabase `app_metadata`.
- Populate `wealth_os_tenants`, firm configuration, and `universal_search_records` with organisation-specific published records.
- Apply the migration to the target project without connecting this implementation to a production project.
- Configure and test real MFA factors for staff accounts.
