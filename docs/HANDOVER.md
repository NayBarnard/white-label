# PLACEHOLDER BRAND website handover

This guide explains what the firm needs to supply, who should control the
accounts, and how to prepare the website for launch. The website avoids
publishing financial information that has not been supplied and approved.

This is software only; it does not certify legal or regulatory compliance. The
firm's compliance officer must review every workflow before real client data is
used.

## Account ownership

The firm should own and control all accounts used to run the website:

- Transfer the GitHub repository to a firm-owned GitHub organisation.
- Transfer the Vercel project to a firm-owned team.
- Transfer the Supabase project to a firm-owned organisation.
- Put the domain registrar and DNS account under firm ownership.

Give named staff their own accounts and the minimum access they need. Turn on
multi-factor authentication. Never share personal passwords or send passwords
in email or chat. Remove former staff access when their role ends.

## What the firm must supply

### Firm name and regulatory notice

The public firm name and regulatory wording are held in `company` in
`src/data/firmData.ts`. A compliance owner must confirm the legal name, FSP
number, category, and wording against the current FSCA register before launch.
Do not edit copies in individual pages; use the central values.

### Six approved PDF documents

Supply the final, approved PDFs using these exact names:

- `placeholder-balanced-fact-sheet.pdf`
- `placeholder-cautious-fact-sheet.pdf`
- `conflict-of-interest-policy.pdf`
- `complaints-resolution-policy.pdf`
- `popi-act-statement.pdf`
- `paia-manual.pdf`

Place them in `public/documents/`. The website serves a supplied PDF when it is
present. If a PDF is absent, a generated request copy may be offered; it is not
an official policy or substitute for the approved document. No PDF content is
created by this project.

### Verified fund facts and costs

Use the `fundFacts` object in `src/data/firmData.ts`, keyed by `balanced` and
`cautious`, as the single place for strategy minimums, fees, identifiers,
allocation, holdings, and management-company details. Supply only verified
values. Include the source and relevant as-at dates, especially for fees,
minimums, and allocation. Keep unknown fields empty.

### Platform availability and identifiers

Before using the Platform Matrix, the firm must supply a verified spreadsheet
of platform names, fund names, share classes, JSE codes, ISINs, platform fund
codes, availability statuses, sources, verifier names, and verification dates.
The firm must also name an owner for quarterly re-verification. No platform,
share-class, code, or ISIN data is preloaded; the matrix intentionally ships
empty. Never infer platform availability or fill missing codes. The matrix is
for authorised advisers and admins only, not public content, sitemap entries,
or chatbot knowledge.

### Important disclosure

Compliance must supply the exact approved text for
`performanceDisclosures.importantDisclosure` in `src/data/firmData.ts`. It is
intentionally blank until supplied; do not draft replacement wording in the
website.

### Leadership photos and client count

Supply approved photos and confirm the correct person and alt text. Add each
photo path to that person's optional `photo` field in the `leadership` array in
`src/data/firmData.ts`. The site shows initials when a photo is not supplied.

If the firm wants a client-count tile, supply a verified count for
`firmStats.satisfiedClients` in the same file. It is intentionally `null`; the
tile stays hidden until a count is confirmed.

## Recommended setup order

1. **Take ownership first.** Transfer the repository, hosting project, database
   project, and domain to the firm's accounts. Confirm a firm administrator and
   a separate backup administrator.
2. **Confirm compliance content.** Check the firm identity and regulatory
   notice against the FSCA register. Obtain legal/compliance approval for the
   privacy notice, terms, and important disclosure.
3. **Supply approved content.** Add the six PDFs, verified `fundFacts`, the
   platform/share-class/code spreadsheet, its quarterly verification owner,
   any approved leadership photos, and (if confirmed) the client count. Keep
   missing facts blank.
4. **Configure hosting and database.** Set the required environment variables
   in Vercel. Apply `supabase/schema.sql`, `supabase/client-portal.sql`, and
   `supabase/puck-studio.sql`, then apply all additive migrations listed in
   `docs/DEPLOYMENT.md` in timestamp order. Check `/admin/setup`; its amber
   items explain checks the application cannot verify automatically.
5. **Configure sign-in and email.** Set the production and preview Auth
   callback URLs and an approved SMTP sender in Supabase. Test an invitation,
   sign-in, and password reset with a non-production account.
6. **Test a preview.** Keep new feature flags off first. Check the public site,
   admin access, portal, private document storage, enquiry, charts, and offline
   page. Confirm the right domain, privacy wording, and approved values.
7. **Enable features only when ready.** In local development, set a specific
   flag to `"true"` in `.env.local` and restart the server. For a preview, set
   it to `"true"` in Vercel's Preview environment and redeploy. Keep it off in
   production until its data, access, provider, review, and staff workflows
   are ready. See `docs/FEATURE_FLAGS.md`.
8. **Complete launch checks.** Review `/admin/setup`, resolve missing items,
   verify live sign-in and storage with firm-owned accounts, and obtain final
   compliance approval before launch.

## Feature switches and prerequisites

Every feature flag is off unless its value is exactly `"true"`. Set flags in
`.env.local` for local testing or in the Vercel Preview environment for a
preview deployment; redeploy preview changes. The feature checklist at
`/admin/setup` reports the current state and the remaining setup item.

| Environment variable | What must be ready before enabling |
| --- | --- |
| `NEXT_PUBLIC_FEATURE_MANAGER_UPDATES` | Apply the manager-updates migration; confirm private media storage, compliance approval, and staff publishing access. |
| `NEXT_PUBLIC_FEATURE_TAX_YEAR_CARD` | Verify tax-limit source and dates, apply the transaction account-type migration, and supply tax certificates. |
| `NEXT_PUBLIC_FEATURE_GOALS` | Apply the client-goals migration and test the client workflow and required hypothetical-growth disclosures. |
| `NEXT_PUBLIC_FEATURE_PROFILE_REQUESTS` | Apply the request-type migration and train staff to verify changes with clients before acting. |
| `NEXT_PUBLIC_FEATURE_ONLINE_TOP_UPS` | Integrate and test a payment provider and reconciliation process. The default provider is not configured. |
| `NEXT_PUBLIC_FEATURE_E_FICA` | Integrate approved identity-check providers and complete compliance review. The default provider is not configured. |
| `NEXT_PUBLIC_FEATURE_CHURN_ALERTS` | Approve the alert rules, data use, recipients, and restricted admin workflow. |
| `NEXT_PUBLIC_FEATURE_PUSH_NOTIFICATIONS` | Build and test delivery, permission, and consent handling; service-worker installation alone is not enough. |
| `NEXT_PUBLIC_FEATURE_ONBOARDING_SUBMIT` | Confirm staff handling, POPIA consent, honeypot, rate limiting, and the enquiry delivery path. A submission is not an application or KYC/AML check. |

The authenticated `/advisor` portal displays published fund information and
public resources only. Adviser accounts and administrators can view it; other
roles cannot. Client profiles, investments, reports, and documents are not
displayed there.

Use `/admin/platforms` to enter or maintain firm-verified platform and
share-class records. Use `/advisor/platforms` for the authorised read-only
lookup. Verified entries require a source, verifier, and verification date;
the interface flags entries older than 180 days for re-verification. Deactivate
records rather than deleting platforms with history. Advisers must confirm
codes and availability directly with a platform before placing a transaction.

## Data and privacy

Client account records are stored in the firm's Supabase database. Private
client documents and manager-update media are stored in Supabase Storage in
private buckets. The website is hosted by Vercel. Supabase Auth sends sign-in
and password-reset email through the SMTP service configured by the firm.
Public enquiries and newsletter sign-ups are also stored in the database; the
site does not send newsletter campaigns.

Confirm the database region in the Supabase project settings and document it
for the firm's privacy owner. Confirm whether hosting, database, email, or
support providers process or store personal information outside South Africa.
The privacy notice must name PLACEHOLDER BRAND as the responsible party and
describe relevant cross-border processing, data purposes, retention, and
individual rights. Obtain legal review before publishing it.

The service worker caches only approved public static assets and the offline
page; it must not cache portal, admin, authentication, or API responses.

## Portal launch evidence and blockers

- Client and adviser landing routes now separate trusted roles and return
  useful empty/loading/error states rather than a blank page.
- Adviser clients are visible only through active
  `adviser_client_relationships` records. Internal adviser notes/tasks use
  staff-only APIs and audit entries.
- Private client, onboarding, firm-document, manager-media and compliance
  buckets must be confirmed in the live Supabase project.
- Live signed-in client/adviser testing remains blocked until the firm supplies
  safe test accounts, role claims, adviser relationships and approved sample
  or real-authorised data.
- Real client documents, valuations, transactions, goals and reviews must come
  only from authorised database records. No demo values are inserted into
  production records.
- The adviser PDF pack is a real downloadable PDF and clearly omits unavailable
  portfolio/fund fields rather than guessing.

Use `docs/LAUNCH_CHECKLIST.md` for the final production sequence and
`docs/PORTAL_COMPLETION_CHECKLIST.md` for implementation/test status.
