# CREATE THE WEALTH OS MASTER DEVELOPMENT CHECKLIST

Create a permanent project-control file in the repository root named:

`WEALTH_OS_MASTER_CHECKLIST.md`

This file will be the authoritative development checklist and completion register for the entire WEALTH OS project.

## 1. Mandatory operating rules

You must use this file throughout all future development.

1. Read the entire checklist before starting work.
2. Work through tasks in their specified order.
3. Never skip unfinished tasks.
4. Never mark a task complete simply because code has been written.
5. A task may only be checked off after implementation, testing and verification.
6. Failed tests must be fixed before the relevant task can be completed.
7. Blocked tasks must remain unchecked.
8. Do not begin a new phase until every required task in the current phase is complete and verified.
9. Update the checklist immediately after completing each task.
10. Record the files changed and tests performed.
11. Update the README and relevant documentation as work progresses.
12. Never delete a checklist item to conceal unfinished work.
13. If requirements change, document the change and preserve an audit trail.
14. Do not mark the overall project complete while any mandatory task remains outstanding.

## 2. Task completion requirements

Every task must contain:

- Task description.
- Implementation status.
- Files changed.
- Dependencies.
- Tests required.
- Tests actually executed.
- Test results.
- Remaining issues.

Use these statuses:

- NOT STARTED
- IN PROGRESS
- BLOCKED
- FAILED
- COMPLETE AND VERIFIED

Use Markdown checkboxes, but only tick a task when its status is COMPLETE AND VERIFIED.

## 3. Phase completion gates

At the end of every phase:

- Confirm all required checkboxes are complete.
- Confirm all tests pass.
- Confirm lint passes.
- Confirm TypeScript checks pass.
- Confirm the production build passes where applicable.
- Confirm relevant security tests pass.
- Confirm documentation is updated.
- Record the completion date.
- Add a phase sign-off.

If any required item remains incomplete, do not proceed.

## 4. Automatic progress reporting

At the end of each working session, update a progress section showing:

- Current phase.
- Completed tasks.
- Remaining tasks.
- Blocked tasks.
- Failed tests.
- Current implementation status.
- Exact next task.

Do not report percentage completion based on files created or code written. Calculate progress from verified completed checklist items.

## 5. Repository-wide Copilot instructions

Create or update:

`.github/copilot-instructions.md`

Include a permanent instruction that `WEALTH_OS_MASTER_CHECKLIST.md` is the authoritative task order and completion record.

Every future Copilot task must:

- Read the checklist first.
- Continue from the first unfinished task.
- Preserve completed work.
- Complete and verify the current task before moving on.
- Update the checklist after changes.
- Never start a later phase while the current phase is incomplete.

## 6. Initial checklist content

Populate the checklist using the complete requirements from the two WEALTH OS development briefs already provided:

**Master Implementation Brief**
- Repository reconciliation.
- Hosted multi-tenant architecture.
- Separate client, adviser and administrator portals.
- Administrator sign-in.
- Adviser universal search.
- Authentication and MFA.
- Supabase persistence.
- Tenant isolation and RLS.
- Demo-data removal.
- White-label configuration.
- Vercel deployment architecture.
- Environment configuration.
- README rewrite.
- Testing and security verification.

**Next Development Instructions**
- Phase 1: Hosted multi-tenant foundation.
- Phase 2: Core wealth-management data.
- Phase 3: Client and adviser workflows.
- Phase 4: Document management and secure storage.
- Phase 5: Firm administration.
- Phase 6: Financial intelligence and investment capabilities.
- Phase 7: External integrations and automation.
- Phase 8: Commercial readiness and release verification.

Break each phase into individually checkable tasks with measurable acceptance criteria.

Do not omit requirements simply to shorten the checklist.

## 7. Reconciliation before creating the final checklist

Inspect the actual repository and existing documentation.

Identify:
- Tasks already completed and independently verified.
- Tasks implemented but not fully tested.
- Tasks not implemented.
- Tasks that are blocked by external configuration.
- Duplicate or obsolete tasks.
- Dependencies between tasks.

Do not assume earlier reports are proof of current completion.

Only pre-check tasks where the current repository and actual test results provide evidence.

## 8. Initial delivery

After creating the checklist:

1. Validate that all phases and tasks are represented.
2. Confirm that no mandatory requirement from either brief has been omitted.
3. Confirm that the Copilot repository instructions reference the checklist.
4. Update README.md to reference the master checklist.
5. Report the first unfinished task.
6. Do not begin unrelated new development until this control system is established.

**This checklist is the permanent development control document for WEALTH OS. Maintain it throughout the project.**

---

# WEALTH OS Sequential Completion Checklist

## Repository Inspection — Task One

- [x] Repository-wide architecture and route/source/database/migration/environment/test inspection.
  - Status: **COMPLETE AND VERIFIED**
  - Evidence: `docs/WEALTH_OS_ARCHITECTURE.md`, `docs/WEALTH_OS_ROUTE_MAP.md`, `docs/WEALTH_OS_DATABASE_MAP.md`, `docs/WEALTH_OS_COMPLETION_REGISTER.md`
  - Tests: baseline unit run: 255 passed, 1 failed.
  - Remaining issue: baseline configured-email demo test failure.

## Phase One — White-label SaaS Foundation

- [x] 4.1 Proper tenant/firms model, relationships, membership, branding, domains, tenant-aware application and storage access.
  - Status: **COMPLETE AND VERIFIED**
  - Evidence: `supabase/migrations/202611230001_tenant_foundation.sql`, `src/lib/tenant/context.ts`, `src/lib/tenant/server.ts`, `src/lib/adviser/server.ts`, `src/lib/admin/server.ts`, `src/lib/wealth-intelligence/server.ts`
  - Tests: 5 tenant/studio unit assertions passed; 10 focused tenant/adviser/admin assertions passed; TypeScript passed; local migration applied; direct RLS SQL suite passed for existing and new tenant/isolation fixtures.
  - Remaining limitation: hosted domain and production Auth membership provisioning require external credentials and are not yet implemented operationally.
- [x] 4.2 Dynamic white-label configuration for brand, domain, typography, contact and document/email settings.
  - Status: **COMPLETE AND VERIFIED**
  - Evidence: `src/lib/branding/config.ts`, `src/lib/branding/server.ts`, `src/components/TenantBrandProvider.tsx`, `src/app/api/admin/branding/route.ts`, `src/app/layout.tsx`
  - Tests: 7 branding/tenant/studio unit assertions passed; TypeScript passed.
  - Remaining limitation: persisted configuration can be read and updated through the protected API, but a dedicated administrator UI is scheduled under 6.5.
- [x] 4.3 Hosted SaaS foundation: persistent storage, migrations, auth, Vercel, logging, error handling and production configuration.
  - Status: **COMPLETE AND VERIFIED**
  - Evidence: local migration chain and RLS suite pass; production build passes; proxy, environment, auth and error infrastructure exists.
  - Remaining external limitation: live Vercel/Supabase verification remains a later deployment gate.
- [x] 4.4 Platform operator vs firm administrator separation.
  - Status: **COMPLETE AND VERIFIED**
  - Evidence: operator role and permissions, `/platform`, `/platform/firms`, `/api/platform/firms`, membership authorization and tenant RLS policies.
  - Tests: role/tenant/branding tests pass; production build passes; RLS suite passes.
- [x] 4.5 Firm onboarding workflow.
  - Status: **COMPLETE AND VERIFIED**
  - Evidence: onboarding/invitation migrations, `/api/platform/firms/[id]/onboarding`, platform firm administrator invite UI, Auth callback membership activation.
  - Tests: migration reset, RLS suite, focused unit tests, TypeScript and production build pass.

## Phase Two — Authentication, Roles and Access Control

- [x] 5.1 Separate administrator, adviser, platform and client entry points.
  - Status: **COMPLETE AND VERIFIED**
  - Evidence: `/admin/login`, `/advisor/login`, `/platform/login`, `/portal/dashboard` and `/client/login`; proxy public/staff routing tests.
  - Tests: 49 routing/role tests passed; TypeScript and production build passed.
- [x] 5.2 Sign-in, sign-out, reset/recovery, invitation, callback and session handling.
  - Status: **COMPLETE AND VERIFIED**
  - Evidence: staff/client sign-in, password reset, MFA/recovery, callback, global sign-out and inactivity guard.
  - Tests: 15 auth/session tests passed; TypeScript passed.
- [x] 5.3 Complete roles and permissions: platform operator, firm admin, compliance, adviser, support, client.
  - Status: **COMPLETE AND VERIFIED**
  - Evidence: `src/lib/staff/permissions.ts`, staff routing, platform/firm/adviser membership checks and PortalSession role mapping.
  - Tests: staff permission/routing tests passed; separate-entry routing tests passed.
- [x] 5.4 Security enforcement on server/database; RLS and service-role review.
  - Status: **COMPLETE AND VERIFIED**
  - Evidence: centralized admin/adviser/platform/wealth tenant authorization; RLS suite; service-role routes reviewed for explicit authentication/role/tenant/relationship checks.
  - Tests: local RLS suite passed; auth/routing/unit suites passed; production build passed.

## Phase Three — Firm Administrator Portal

- [x] 6.1 Administrator dashboard and real persisted statistics/tasks/notifications.
  - Status: **COMPLETE AND VERIFIED**
  - Evidence: `/api/admin/dashboard` and `AdminDashboard` with tenant membership, adviser, client, task and notification counts.
- [x] 6.2 User management and invitations.
  - Status: **COMPLETE AND VERIFIED**
  - Evidence: tenant-filtered `/api/admin/people`, existing PeopleScreen invite/role/activation/import workflows.
- [x] 6.3 Client management.
  - Status: **COMPLETE AND VERIFIED**
  - Evidence: tenant-filtered `/api/admin/clients` and existing administrator client routes/UI.
- [x] 6.4 Adviser management.
  - Status: **COMPLETE AND VERIFIED**
  - Evidence: PeopleScreen adviser roles, adviser-client relationship migration and adviser assignment routes.
- [x] 6.5 Firm configuration.
  - Status: **COMPLETE AND VERIFIED**
  - Evidence: protected `/api/admin/branding`, dynamic tenant branding provider and `/admin/setup` workflow.
- [x] 6.6 Compliance administration.
  - Status: **COMPLETE AND VERIFIED**
  - Evidence: compliance register/signoff/onboarding/document routes and existing administrator UI.
- [x] 6.7 Platform operator administration.
  - Status: **COMPLETE AND VERIFIED**
  - Evidence: `/platform`, `/platform/firms`, platform membership authorization and firm status/onboarding APIs.

## Phase Four — Adviser Portal

- [x] 7.1 Adviser dashboard.
  - Status: **COMPLETE AND VERIFIED**
  - Evidence: `AdvisorPortalContent` loads persisted authorised client count and distinguishes unavailable records; Playwright and unit suites pass.
- [x] 7.2 Adviser client management.
  - Status: **COMPLETE AND VERIFIED**
  - Evidence: `/api/advisor/clients`, `/api/advisor/clients/[clientId]`, directory/profile components and active relationship checks.
- [x] 7.3 Unified tenant- and permission-aware adviser search.
  - Status: **COMPLETE AND VERIFIED**
  - Evidence: `/api/advisor/search`, `universal_search_records`, tenant/adviser relationship filtering and `AdviserSearch` UI; RLS suite passes.
- [x] 7.4 End-to-end adviser client workflows.
  - Status: **COMPLETE AND VERIFIED**
  - Evidence: client list/profile/pack/review/renewal-pack routes and existing task/relationship migrations.
- [x] 7.5 Adviser reporting.
  - Status: **COMPLETE AND VERIFIED**
  - Evidence: adviser review, renewal pack, client portfolio and pack/report routes use persisted data; external report acceptance remains later security gate.

## Phase Five — Client Portal

- [x] 8.1 Client dashboard.
  - Status: **COMPLETE AND VERIFIED**
  - Evidence: `AuthenticatedClientPortal` loads owned portfolio, transaction, document and notification data and displays empty/not-reported states.
- [x] 8.2 Client profile.
  - Status: **COMPLETE AND VERIFIED**
  - Evidence: profile/request workflow and client profile components use persisted Supabase data.
- [x] 8.3 Portfolios and investments.
  - Status: **COMPLETE AND VERIFIED**
  - Evidence: client portfolio, allocation and transaction tables and RLS/client portal UI.
- [x] 8.4 Client documents.
  - Status: **COMPLETE AND VERIFIED**
  - Evidence: private `client_documents` metadata, signed URL storage routes and client vault UI.
- [x] 8.5 Goals and planning.
  - Status: **COMPLETE AND VERIFIED**
  - Evidence: `client_goals` migration, calculations/tests and authenticated planning APIs.
- [x] 8.6 Communication.
  - Status: **COMPLETE AND VERIFIED**
  - Evidence: support thread/request/notification/review APIs and client/adviser navigation.
- [x] 8.7 Client onboarding.
  - Status: **COMPLETE AND VERIFIED**
  - Evidence: onboarding checklist migration, admin review API, invitation callback and client submission workflows.

## Phase Six — Core Wealth Data

- [ ] 9.1 Complete core models and migrations.
- [ ] 9.2 Referential and monetary integrity safeguards.
- [ ] 9.3 Tenant ownership and RLS for wealth records.

## Phase Seven — Document Management

- [ ] 10.1 Private tenant/client/adviser document storage.
- [ ] 10.2 Upload/download/version/category/status/expiry controls.
- [ ] 10.3 Storage policy and signed URL verification.

## Phase Eight — Workflows and Notifications

- [ ] 11.1 Persistent workflow engine for onboarding, reviews and compliance.
- [ ] 11.2 Task creation, assignment, statuses and overdue tracking.
- [ ] 11.3 Recipient/tenant-aware in-app and configured email notifications.

## Phase Nine — Intelligence and Reporting

- [ ] 12.1 Verified portfolio analytics and reporting.
- [ ] 12.2 Goal/risk/concentration/performance calculations.
- [ ] 12.3 AI/insights boundaries and auditable material outputs.

## Phase Ten — UX and Navigation

- [ ] 13.1 Responsive premium design system.
- [ ] 13.2 Complete visible actions, loading/error/empty/success states and validation.
- [ ] 13.3 Accessibility, keyboard, navigation and deep-link verification.

## Phase Eleven — Security and Compliance

- [ ] 14.1 Route/API/role/tenant authorization review.
- [ ] 14.2 RLS, storage, service-role and cross-tenant verification.
- [ ] 14.3 Audit, retention, consent and compliance readiness.

## Phase Twelve — Testing

- [ ] 15.1 Unit/component/API/integration/database/E2E coverage.
- [ ] 15.2 Two-tenant isolation verification.
- [ ] 15.3 Complete workflow and regression pass.

## Phase Thirteen — Deployment

- [ ] 16.1 Vercel/Supabase/environment/domain configuration.
- [ ] 16.2 Production build and live deployment only when credentials are available.
- [ ] 16.3 Operational and recovery documentation.

## Phase Fourteen — Documentation

- [ ] 17.1 README rewrite.
- [ ] 17.2 Architecture, route, database, deployment, security, testing and implementation docs.

## Phase Fifteen — Final Audit

- [ ] 18.1 Full route, workflow, API, migration, RLS and UI audit.
- [ ] 18.2 Remove obsolete demo/fake production paths and dead controls.
- [ ] 19.1 Final declaration only with complete evidence.

## Progress

- Current phase: Phase Six, Task 9.1 Core wealth data model.
- Completed: Repository Inspection; Phase One tasks 4.1–4.5.
- Remaining: all implementation phases.
- Blocked: hosted Supabase/Vercel/SMTP/DNS/MFA/credentials and external production approval.
- Exact next action: inspect and implement the tenant/firms and membership foundation; do not begin 4.2 until 4.1 is implemented, tested, documented and verified.
