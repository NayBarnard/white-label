# PLACEHOLDER BRAND portal completion checklist

Status: [ ] not started, [~] in progress, [!] blocked, [x] implemented and verified.
This is a working implementation checklist for the client and adviser portals. It records implementation, testing and external dependencies separately. Software only; compliance approval remains external.

## Worklog for this portal completion pass
- Diagnosed authenticated routing: staff and client roles were not consistently
  redirected from their landing routes. `/portal` now routes staff away,
  missing roles default to client, unknown roles sign out safely, and adviser
  routes require AAL2 plus adviser/admin role checks.
- Added an adviser client directory backed by
  `adviser_client_relationships` and a server-gated comprehensive client
  profile route. Profiles expose only linked clients and authorised portfolio,
  transaction, document, request, note and task sections.
- Added no-role-safe routing and focused Vitest coverage for post-login
  destinations and adviser role guards.

## Phase 1 — Client dashboard
- [~] Redesign client dashboard. Routes/components: `/portal`, `src/components/AuthenticatedClientPortal.tsx`, `src/components/ClientDashboard.tsx`. Role routing and no-role safety implemented; visual/accessibility pass pending.
- [~] Personalised welcome and reliable total investment value. Relevant data: RLS-protected portfolio assignments.
- [~] Contributions and withdrawals; invested capital vs growth. Testing: real-row fixtures pending.
- [~] Available-period performance and interactive historical chart. `[!]` Reliably populated history required.
- [~] Individual holdings and fund breakdown.
- [~] Investment allocation. `[!]` Allocation data required in `fundFacts` or account records.
- [~] Recent transactions, outstanding requests and documents.
- [~] Upcoming reviews and relevant notifications.
- [~] Working quick actions and metric links.
- [~] Responsive dashboard, loading, empty and error states.

## Phase 2 — My investments
- [~] Comprehensive authorised-account overview and individual account detail pages.
- [~] Fund names, identifiers, balances, account types and reporting dates.
- [~] Contribution and transaction history; performance and allocation when available.
- [~] Filters, sorting and downloadable statements when available.
- [ ] Distinguish valuation values from actual cash balances in all views.

## Phase 3 — My goals
- [~] Goals foundation exists (`202611170003_client_goals.sql`). Save/edit/archive workflow in progress.
- [ ] Goal types: retirement, property, education, independence, emergency savings and custom.
- [ ] Target amount/date, current value, monthly contribution/frequency and optional increases.
- [ ] Required growth assumption with no default.
- [ ] Visual progress, future-value illustration and assumption changes.
- [x] Save, edit, delete and archive/restore goal foundations pass validation.
- [ ] No guaranteed-return language; hypothetical illustration disclosure.
- [x] Projection maths foundation and goal migration.

## Phase 4 — Investment simulator
- [ ] Lump sum, monthly contributions, contribution increases and duration.
- [ ] Required illustrative growth, inflation adjustment and low/middle/high scenarios.
- [ ] Invested capital vs projected growth charts.
- [ ] Instant recalculation, save and PDF export.
- [ ] Assumptions and risk disclaimer. Testing: unit and responsive Playwright pending.

## Phase 5 — Document vault
- [~] Private client document listing and signed downloads exist.
- [ ] Categories: statements, tax certificates, fact sheets, confirmations, applications, regulatory documents, correspondence and other.
- [ ] Search, category/date filters and previews.
- [ ] Download-all and recently accessed documents.
- [ ] Publication/issue dates and version information.
- [ ] New-document notifications.
- [ ] Secure replacement/removal workflow with authorised audit logging.
- [!] Missing real client document records and storage-owner process.

## Phase 6 — Transactions and requests
- [~] Existing request centre and status tracking; database success explicitly
  distinguishes submitted records from session-only fallback states.
- [ ] Guided workflows for contributions, debit changes, investor details, switches, withdrawals, transfers, enquiries and documents.
- [ ] Attachments, validation, reference numbers and status history.
- [ ] Outstanding information and client response workflow.
- [ ] Completion/cancellation explanations and status notifications.
- [ ] Do not present submitted requests as executed transactions.

## Phase 7 — My adviser
- [~] Assigned adviser identity and verified relationship lookup exist.
- [x] Client overview displays the active assigned adviser or a no-assignment state.
- [ ] Adviser photo/avatar remains a business-supplied optional field.
- [ ] Last/next review, correspondence and outstanding requests.
- [ ] Secure contact and portfolio-review request workflow.
- [ ] Review history.

## Phase 8 — Client profile and settings
- [~] Password, session and profile foundations exist.
- [ ] Personal, contact, address, investor reference and communication preferences.
- [ ] Sensitive update verification and complete change-request history.
- [ ] Never silently change identity or banking data.

## Phase 9 — Client notifications
- [~] Notification API and client overview list exist.
- [ ] Read/unread state and preferences.
- [ ] Privacy-safe notification previews.

## Phase 10 — Client security and mobile
- [~] Auth callbacks, password reset, inactivity guard and staff MFA foundations.
- [!] MFA/TOTP project settings and live recovery-code testing remain external.
- [~] Mobile navigation and responsive portal work pending full 360/390/tablet/desktop pass.
- [ ] Account recovery, session information, document mobile validation and secure sign-out verification.

## Phase 11 — Adviser command centre
- [~] Adviser route and public-only platform/resource surfaces exist.
- [x] Adviser/client role routing rejects missing/unknown roles safely.
- [ ] Personalised landing, linked client count and authorised workload metrics.
- [ ] Outstanding requests, reviews, documentation, fund updates and platform changes.
- [ ] Recent activity and prioritised task/action centre.
- [ ] Due dates, priorities, assignments and actionable record links.

## Phase 12 — Adviser CRM
- [~] CRM data/API foundations exist in `202611180002_people_and_crm.sql`.
- [~] Authorised adviser/client relationship table and `/api/advisor/clients` directory foundation exist in `202611180007_adviser_client_relationships.sql`.
- [x] Advisers can open `/advisor/clients`, search, filter and open an authorised client profile.
- [ ] Searchable client directory with reference, status, adviser, portfolio, account type and review dates.
- [ ] Outstanding requests, documentation and follow-up status.
- [ ] Filters, sorting, tags and secure client navigation.
- [ ] Enforce adviser-to-client relationship server-side.

## Phase 13 — Comprehensive adviser client profile
- [~] Cohesive profile header: identity, status and quick-section navigation exist.
- [~] Financial overview: authorised reported value and account/request counts exist.
- [x] Adviser pack generator creates a real branded PDF with client reference,
  generation date, authorised portfolio summary and selected published fund facts.
- [ ] Personal and contact details with field-level permissions and change history.
- [ ] Investment portfolio, transactions, switching, statements and allocation.
- [ ] Client document section with categories, missing/expiring items and access logs.
- [ ] Requests and transaction status history, internal notes and response requirements.
- [ ] Private adviser notes with author, timestamp and edit history.
- [ ] Review management, overdue detection, history and report generation.
- [ ] Filterable activity timeline linked to underlying records.
- [ ] Client-specific tasks, priorities, assignments and completion notes.
- [ ] Communication history, secure messaging if available, and internal/client distinction.
- [ ] At-a-glance completion, alerts and unavailable-data states.
- [!] Illustrative client names and financial values must never be seeded into production.

## Phase 14 — Adviser fund intelligence
- [~] Public fund facts and comparison foundations exist.
- [ ] Searchable fund database with identifiers, objectives, categories, asset classes and risk.
- [ ] Fund managers, benchmarks, performance, annualised periods and fees.
- [ ] Fact sheets, commentary, platform codes and publication/verification dates.
- [ ] Individual fund pages, filters and verified/stale/missing/unverified states.

## Phase 15 — Fund comparison workbench
- [~] Public NAV comparison exists.
- [ ] Four-fund adviser selection and consistent objective/period/fee/risk/benchmark/asset comparisons.
- [ ] Interactive charts, reporting selectors and comparability explanations.
- [ ] PDF export and source/reporting dates.

## Phase 16 — Adviser document intelligence
- [~] Public and private document foundations exist.
- [ ] Central fund/type/date/status/platform search.
- [ ] Latest and historical versions, metadata and publication dates.
- [ ] Secure/bulk downloads, recent updates and document notifications.
- [ ] Versioning and audit trail.

## Phase 17 — Advisor pack generator
- [ ] Fund/document selection and client-facing/internal-use modes.
- [ ] Branded PDF pack and ZIP bundle.
- [ ] Overview, objectives, performance, risk, fees, fact sheets, disclosures and sources.
- [ ] Preview, download, generation records and source attribution.

## Phase 18 — Investment tools studio
- [ ] Lump sum, monthly contribution, compound growth and retirement tools.
- [ ] Inflation-adjusted and income-drawdown illustrations.
- [ ] Investment/portfolio comparison and allocation visualisations.
- [ ] Save adviser illustrations and export professional PDFs.
- [ ] Clear non-guarantee assumptions and disclaimers.

## Phase 19 — Platform intelligence
- [~] Platform matrix and history implemented; adviser/admin pages exist.
- [ ] Platform/fund search and platform-specific codes.
- [ ] Availability restrictions, source, verifier and verification date.
- [ ] Stale and re-verification queue; validated CSV import.
- [ ] Export and change history.
- [!] Verified source spreadsheet and verification owner required.

## Phase 20 — Adviser resources
- [ ] Guides, fund documents, forms, insights, commentary, training and compliance resources.
- [ ] Categories, search, filters, publication dates and downloads.
- [ ] Recently updated resources and announcements.

## Phase 21 — Tasks and notifications
- [~] CRM task foundations exist.
- [x] Advisers can create relationship-gated private notes and follow-up tasks.
- [ ] Central task manager for adviser/client work.
- [ ] Assignment, due dates, priorities, status, completion notes.
- [ ] Notification unread counts, history, filtering and record links.
- [ ] Privacy-safe previews.

## Phase 22 — Adviser profile and settings
- [~] Adviser sign-in and role guard exist.
- [ ] Adviser/organisation details, linked client book and notification preferences.
- [ ] Security, session, permissions and secure account management.

## Phase 23 — Shared backend, security and permissions
- [~] Central staff permission module exists.
- [~] Admin/adviser API guards and AAL2 staff checks exist.
- [ ] Complete migration/RLS inventory and adviser-client relationship checks.
- [ ] Sensitive mutation audit trails and storage access review.
- [ ] Server-side API authorisation for all record types.
- [ ] Internal adviser note isolation and client-visible communication separation.
- [ ] Data retention/deletion workflow subject to policy.
- [!] Full security review and live MFA verification remain external.

## Phase 24 — Responsive UX
- [~] Existing portal navigation and shared controls.
- [ ] 360px and 390px client/adviser passes; 768px and 1440px passes.
- [~] Responsive Playwright coverage now includes 360, 390, 768 and 1440 px
  login/public surfaces. Authenticated data-rich portal screenshots remain
  blocked by missing live Supabase test accounts/data.
- [ ] Mobile tables, dialogs, forms, charts and document downloads.
- [ ] Loading, empty, error and confirmation states.
- [ ] Keyboard navigation, focus, screen readers and contrast.

## Phase 25 — Automated quality assurance
- [~] Existing Vitest and Playwright suites.
- [ ] Client dashboard/investments/goals/document/request tests.
- [ ] Adviser access/profile/notes/timeline/fund comparison tests.
- [ ] Document generation/platform/permission/RLS/unauthorised-access tests.
- [ ] Mobile and end-to-end workflows.
- [ ] Accessibility and dependency review.
- [ ] Fix all relevant test failures.
- [x] Portal role-routing, missing-role, adviser guard and client empty/error
  focused tests pass.

## Phase 26 — Documentation and handover
- [~] README, STATUS, HANDOVER, deployment and feature documentation exist.
- [ ] Route and API documentation complete.
- [ ] Migration, storage, environment and integration documentation complete.
- [ ] External configuration, compliance approvals and data requirements recorded.
- [ ] Test results and deployment requirements recorded.
- [!] Final handover report must await live environment verification.
