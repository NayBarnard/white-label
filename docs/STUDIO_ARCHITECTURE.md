# Studio architecture

## Product boundary

- **Core business application:** the existing client, adviser, administration,
  portfolio, investment, and document workflows remain in their current
  routes and data models.
- **Public website:** the existing homepage remains the fallback. It reads a
  published Puck homepage snapshot when one is available and valid.
- **White Label Studio:** `/studio` is a noindex, full-screen staff workspace.
  It is not embedded in the public navigation or a portal surface.
- **Publishing engine:** protected `/api/studio/homepage` and
  `/api/studio/homepage/publish` endpoints validate Puck data and write version
  snapshots through the existing Supabase service-role server path.

## Authorization

The Studio page calls `getAdminPageUser()`, which verifies the Supabase session,
trusted `app_metadata` administrator permission, and AAL2 claims server-side.
Every Studio API request calls `authorizeAdminApi()` and repeats those checks.
The browser does not receive a service-role key and cannot write directly to
the version table. The Next.js Proxy isolates public and staff deployment
routes but is not treated as the authorization system.

## Content flow

1. The editor loads a draft if present; otherwise it reads the legacy published
   `site_pages` homepage or uses the bundled Puck defaults.
2. Save writes a `draft` snapshot that is not visible to anonymous visitors.
3. Publish validates the data, saves the current draft, and inserts a new
   immutable `published` snapshot with actor and timestamp.
4. The public homepage queries the latest published snapshot for the `default`
   tenant. Invalid, missing, or unavailable Studio data does not replace the
   built-in page.
5. Restore selects a prior published snapshot and publishes it as a new
   snapshot; historical rows are retained.

Puck provides the existing supported section editor, property fields, section
reordering, add/remove/duplicate interactions, and its own undo/redo controls.
No arbitrary HTML or JavaScript is stored or evaluated.

## Scope and compatibility

The migration adds version history and leaves `site_pages` intact for existing
deployments. Existing business routes are not replaced with a dynamic
catch-all. Only the homepage is currently managed; additional pages and global
brand/theme configuration are not implemented.

`tenant_id` is present on Studio version rows and is derived from the trusted
administrator `app_metadata.tenant_id` claim, defaulting to `default` for
single-installation compatibility. Public rendering currently resolves only
`default`. Tenant provisioning, hostname resolution, media Storage policies,
and cross-tenant verification are absent, so this is not a completed
multi-tenant implementation.
