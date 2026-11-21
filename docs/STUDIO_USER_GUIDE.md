# Studio user guide

## Open the local placeholder demo

Run:

```bash
STUDIO_DEMO_MODE=true npm run dev
```

Then open `http://localhost:3000/studio`. This explicit bypass works only in
development. Production `/studio` still requires a server-verified
administrator with AAL2.

## Edit and preview

1. Choose **Visual editor** and select a section in the Puck canvas.
2. Edit the generic example text and reorder, add, duplicate, or remove
   supported sections.
3. Use desktop, tablet, or mobile widths and open **Preview** to inspect the
   current local edits.
4. Draft changes and recovery copies stay in this browser. You can manually
   save a local draft; autosave and unsaved-change warnings are also enabled.

All initial content is editable placeholder text. No firm, licensing, contact,
financial, customer, or document data is loaded into the Studio. Do not enter
real or sensitive information into this demo.

## Persistence and publishing

This mode does not contact Supabase, update the public website, or publish.
The **Publishing** and **Version history** sections explain these disabled
capabilities rather than simulating successful operations. Clearing browser
storage removes local demo drafts.

The optional Supabase migration and protected endpoints are reserved for a
future explicitly enabled CMS integration. They are disabled by default and
are not part of this browser-only workflow.
