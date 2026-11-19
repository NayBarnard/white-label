# Content and data still required from the client

The website is intentionally structured to avoid inventing numbers or narrative detail. The following items are still outstanding and should be confirmed before launch or before final performance reporting is published.

## Mandatory data to supply

1. Minimum investment requirements
   - Add the approved minimum investment amount, currency and as-at date to `fundFacts.<strategy>.minimumInvestment` in `src/data/firmData.ts`.
   - Record product/strategy-specific minima there; do not add platform-specific or account-type figures unless they are supplied and approved.

2. Fee information
   - Add each strategy's TER, transaction costs, total investment charge and as-at date to `fundFacts.<strategy>.tradingCosts` in `src/data/firmData.ts`.
   - Add only figures and dates confirmed in approved source material.

3. Asset allocation by strategy
   - Add each strategy's approved asset names and percentages to `fundFacts.<strategy>.assetAllocation`, with `assetAllocationAsAt` and `source`, in `src/data/firmData.ts`.

4. Strategy performance attribution
   - Approved source attribution and calculation methodology for strategy returns and benchmarks
   - Confirm whether “PLACEHOLDER BRAND” is the preferred source label on the site and fact-sheet downloads

5. Leadership / team content
   - Final approved bios and credentials for all team members shown on the website
   - Professional headshots or approved placeholder imagery
   - Any additional leadership roles or committee memberships that should appear

6. Publishing and review requirements
   - Final approved website domain and canonical URL
   - Final marketing copy for all strategy descriptions and investment pages
   - Sign-off from legal/compliance and the relevant adviser or marketing approver

7. Platform availability and fund identifiers
   - Supply a firm-approved, verified spreadsheet of platform names, fund names,
     share classes, JSE codes, ISINs, platform fund codes, availability status,
     evidence/source, verifier, and verification date.
   - Name the staff owner responsible for quarterly re-verification and updates.
   - Confirm that unavailable, available, and unverified statuses are supported
     by the firm's source material. Do not infer platform membership or fill
     missing identifiers.
   - The platform matrix intentionally ships empty. No platform, share-class,
     code, or ISIN data is preloaded.

## Placeholder status in code

The fund fact sheets, portfolio facts UI, and public assistant use `fundFacts` in `src/data/firmData.ts` as the single source for published strategy minimums, costs, and asset allocation. Its fields are empty until verified information is supplied. The client portal's account-specific fees remain separate and must not be inferred from fund-level costs.

Populate only the approved values and their as-at dates before publishing them.

Platform availability is separate from public `fundFacts`: it is restricted to
authorised adviser and admin views and must never be copied into public pages,
the sitemap, or chatbot content. Apply
`supabase/migrations/202611180001_platform_availability.sql` before the firm
enters its verified spreadsheet.
