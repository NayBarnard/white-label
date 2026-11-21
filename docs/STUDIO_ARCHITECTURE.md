# Studio architecture

## Current mode

The active Studio is a browser-only placeholder demo. It uses the existing
Puck editor with generic content and stores drafts/recovery copies in the
current browser. It does not read or write Studio database records, access
customer data, or publish changes to the public site.

`STUDIO_DEMO_MODE=true` permits `/studio` without authentication only when
`NODE_ENV=development`; the route exception is limited to the exact Studio
page. Production keeps the server-side administrator and AAL2 checks.

## Optional future CMS integration

The repository retains protected `/api/studio/homepage` and
`/api/studio/homepage/publish` endpoints plus an additive version-table
migration. Every endpoint returns `410` before authorization or database access
unless the server-only `STUDIO_STORAGE_MODE=supabase` opt-in is configured.
The public homepage likewise skips Studio-version queries unless this mode is
explicitly enabled, and otherwise retains its built-in fallback.

When enabled for a separately reviewed future release, those endpoints use
the server-side admin/AAL2 checks and service role; the browser never receives
the service-role key. The browser-only editor does not call these endpoints
or provide a publishing action.

## Placeholders and data boundaries

Editor defaults are generic editable copy. They do not import company details,
client records, published performance, customer documents, or live homepage
content. Local draft/recovery storage uses separate placeholder-demo keys and
does not reuse older Studio browser data.

## Tenant support

The optional version table includes a tenant column, but the browser-only demo
does not use it. Tenant provisioning, host resolution, media Storage policies,
and cross-tenant verification are not implemented. A tenant column alone is
not tenant isolation.
