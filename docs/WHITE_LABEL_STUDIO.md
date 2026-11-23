# White Label Studio

The Studio is a browser-local website editor at `/studio`. It can create and
edit website projects, manage page content and media, save local drafts,
import/export project JSON, preview a local publish snapshot, and export a
static website ZIP.

## Standalone behavior

- Studio project metadata, drafts, and version history are browser-local.
- Uploaded media is stored in IndexedDB and included in project exports.
- The standalone editor does not require Supabase credentials or send draft
  content to Studio APIs.
- Publishing creates a local browser snapshot only. It does not deploy a site,
  provision a domain, or publish a hosted tenant website.
- Static ZIPs contain website files only. They do not include authenticated
  login, client financial data, or wealth-management APIs.

Treat browser storage and exported project files as local data. They are not
tenant-isolated or protected by hosted authentication. Store any exported
backup securely.

## Optional hosted integration

Supabase-backed Studio endpoints and migrations remain an optional integration
path. Enabling them requires deliberate server configuration, tenant-aware
authorization, private storage policies, and hosted integration tests. Do not
interpret local save/publish status as proof of a hosted write or deployment.

## Verification

The standalone acceptance suite in `e2e/commercial-audit.spec.ts` exercises
project editing, reload persistence, import/export, static ZIP contents, local
publishing, media, and mobile navigation. The current workspace checklist
records whether the latest run has passed. Live Supabase and Vercel checks are
not required for standalone operation.
