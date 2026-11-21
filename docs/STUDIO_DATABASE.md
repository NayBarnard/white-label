# Optional Studio database integration

The active browser-only placeholder Studio does not use this schema. Do not
apply this migration for the local demo. The database flow below is reserved
for a future release that explicitly enables server persistence.

## Migration order for the future CMS mode

Keep the existing base SQL and migrations. Apply
`supabase/migrations/202611200001_white_label_studio_versions.sql` after the
base scripts and prior additive migrations. See [`DEPLOYMENT.md`](./DEPLOYMENT.md)
for the full repository migration sequence. The Studio migration is additive
and does not rewrite existing `site_pages` content or business data.

## `public.site_studio_versions`

| Column | Purpose |
| --- | --- |
| `id` | Immutable version identifier |
| `tenant_id` | Trusted tenant scope; defaults to `default` |
| `slug` | Currently constrained to the existing `home` page |
| `status` | `draft` or `published` |
| `content` | Validated Puck JSON configuration |
| `created_by`, `created_at` | Draft/publish actor and snapshot time |
| `published_by`, `published_at` | Publisher and public release time |
| `source_version_id` | Optional source snapshot for a restore |

A partial unique index allows one draft per tenant/homepage. A second index
supports latest-published lookup and history listing.

## Row-level security

RLS is enabled. Anonymous reads are limited to published homepage snapshots
for tenant `default`. Authenticated administrator reads are restricted to the
trusted `app_metadata.tenant_id` claim, with the single-installation fallback
`default`. Authenticated clients receive no direct insert, update, or delete
grant. Server endpoints authorize role and AAL2 before using the server-only
service role for writes.

The `site_pages` RLS policy and table are retained for the legacy fallback.
The service-role key must only be configured server-side. Studio API and
public lookup code skips these tables unless server-side
`STUDIO_STORAGE_MODE=supabase` is explicitly set.

## Migration and operational checks

- Back up the target Supabase database before production migrations.
- Enable the CMS only after an explicit product/security decision, then apply
  the SQL once using the approved migration process.
- Confirm the table, constraints, indexes, grants, and policies in Supabase.
- Test unauthorized, admin AAL1, and admin AAL2 sessions in a non-production
  project.
- Verify public users can read only published default-tenant content and
  cannot see drafts.
- No migration creates Storage buckets; marketing media upload is not part
  of this release.

The version table's tenant column is a forward-compatible starting point, not
proof that multiple customer websites are isolated end-to-end.
