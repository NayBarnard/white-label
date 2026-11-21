# Studio user guide

## Access requirements

Open `/studio` from the staff deployment. You need an existing Supabase Auth
account with trusted `app_metadata.role = "admin"` and a completed AAL2 MFA
challenge. The role must be granted by an authorized Supabase operator, never
through editable `user_metadata`. The database migration and server-side
`SUPABASE_SERVICE_ROLE_KEY` must be configured.

## Edit and preview the homepage

1. Choose **Visual editor**.
2. Select a section in the canvas or structure outline. Edit its supported
   fields in the Puck property panel.
3. Reorder, add, duplicate, or remove supported sections using Puck controls.
   The editor includes undo/redo controls.
4. Choose desktop, tablet, or mobile width. Use **Preview** to open the
   current unpublished content in a private preview.
5. Select **Save draft** to persist without changing the public website.
   Leaving with unsaved edits prompts for confirmation.

## Publish and restore

- Select **Publish** and confirm to create a public version. A failed database
  operation is reported as an error; it is not shown as a successful release.
- The public homepage renders the newest valid published version. Before the
  first publish, or if published content cannot be read or validated, the
  existing built-in homepage remains active.
- Open **Version history** to load an old published snapshot for editing or
  restore it. Restore requires confirmation and creates a new published
  snapshot; it does not delete history or alter business records.
- Select **Sign out** to end the Supabase session.

## Current limitations

Only the existing homepage is editable. This release does not provide global
branding/theme controls, extra customer pages, template management, media
uploads, feature controls, or tenant provisioning. Do not use client-document
storage for website images.
