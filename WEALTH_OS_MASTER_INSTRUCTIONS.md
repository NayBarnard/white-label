WEALTH OS — MASTER COMPLETION MISSION

Complete the entire white-label wealth management platform

MISSION: TAKE THE EXISTING WHITE-LABEL REPOSITORY TO A FULLY FUNCTIONAL, SECURE, COMMERCIAL, MULTI-TENANT WEALTH MANAGEMENT SAAS PLATFORM.

This is an implementation mission, not a planning exercise.

You are responsible for inspecting, implementing, testing, fixing, documenting and verifying the entire platform until every required task is complete.

Do not simply create plans, recommendations, placeholder pages, mock interfaces or lists of future improvements. Implement the actual working product using the existing repository wherever possible.

1. THE NON-NEGOTIABLE EXECUTION RULE

STRICT SEQUENTIAL COMPLETION

You MUST work through this document in its exact order.

You are not permitted to start the next task until the current task is fully implemented, tested, verified and documented.

This applies to:

Individual checklist items.

Subtasks.

Features.

Modules.

Phases.

Database migrations.

Integrations.

Security requirements.

Deployment requirements.

For every task, follow this exact sequence:

Inspect the existing implementation.

Identify what already exists and what is missing.

Implement the missing functionality.

Integrate it with the existing application.

Run the relevant tests.

Fix all failures caused by your changes.

Verify the actual user workflow.

Update documentation.

Update the completion register.

Only then mark the task COMPLETE AND VERIFIED.

Only then proceed to the next task.

If a task fails any acceptance criterion, it remains incomplete.

If you encounter a blocker:

Mark the task BLOCKED.

Explain the exact reason.

Identify what is required to unblock it.

Do not mark it complete.

Do not silently skip it.

Do not proceed to dependent tasks.

You may inspect future tasks to understand dependencies, but you may not implement future tasks while an earlier task remains incomplete.

Do not use checkboxes as a measure of effort. A checkbox represents verified completion, not work attempted.

Permitted task statuses

NOT STARTED

[~] IN PROGRESS

[!] BLOCKED

COMPLETE AND VERIFIED

A task may only receive [x] when its acceptance criteria have been met and evidence of verification has been recorded.

Never use [x] to mean partially completed.

2. PRODUCT DEFINITION

WEALTH OS is a generic, white-label, multi-tenant wealth management platform.

It must be capable of being licensed, configured and operated by multiple independent financial firms.

Each firm must be able to use its own:

Brand.

Logo.

Colours.

Domain.

Firm identity.

Administrators.

Financial advisers.

Clients.

Investment products.

Portfolios.

Documents.

Compliance configuration.

Workflows.

Reporting.

Permissions.

The platform must not depend on one specific financial institution, one set of investment products, one country-specific brand or one hard-coded customer database.

The product must be a real hosted SaaS application, not a browser-local demonstration.

Core technology direction

Preserve the existing technology stack unless a demonstrable technical reason requires a change.

The existing architecture includes:

Next.js.

React.

TypeScript.

Supabase.

PostgreSQL.

Supabase Authentication.

Supabase Storage.

Row Level Security.

Vercel hosting.

Existing testing infrastructure.

Keep Supabase.

Do not introduce unnecessary infrastructure, dependencies, services or complexity.

Do not require CRON_SECRET for ordinary application use, login, dashboards, normal data access or everyday workflows. If a scheduled background job genuinely requires a secret, isolate that requirement to that job only.

3. REPOSITORY INSPECTION — FIRST TASK

Before changing code:

Inspect the entire current white-label repository.

Inspect all application routes.

Inspect all components.

Inspect all layouts.

Inspect all authentication and authorisation logic.

Inspect all Supabase clients and server helpers.

Inspect all database migrations.

Inspect all existing database tables and relationships.

Inspect all API routes.

Inspect all middleware or proxy logic.

Inspect all tests.

Inspect environment configuration.

Inspect the README and existing documentation.

Inspect existing adviser, client and administrator functionality.

Identify unfinished, duplicated, disconnected, mocked or abandoned features.

Identify existing functionality that can be reused.

Where the original RSA application is available, use it as a reference for identifying useful functionality that was lost during white-labelling.

The white-label repository remains the implementation target.

Do not blindly copy the original application's branding, customer information, credentials, hard-coded data or institution-specific assumptions.

Produce:

A repository architecture map.

A route inventory.

A database inventory.

An existing-feature inventory.

A missing-functionality inventory.

A security risk inventory.

A dependency map.

Create or update:

docs/WEALTH_OS_ARCHITECTURE.md

docs/WEALTH_OS_ROUTE_MAP.md

docs/WEALTH_OS_DATABASE_MAP.md

docs/WEALTH_OS_COMPLETION_REGISTER.md

Update this master instruction file with the verified starting position.

COMPLETION GATE 1

Do not begin implementation until the repository inspection is complete and the existing architecture is understood.

4. PHASE ONE — WHITE-LABEL SAAS FOUNDATION

The foundation must support multiple independent financial firms using the same hosted application.

4.1 Tenant architecture

Implement and verify:

A proper tenant/firms data model.

Unique tenant identifiers.

Tenant ownership and relationships.

Tenant-specific configuration.

Tenant-specific branding.

Tenant-specific domain configuration.

Tenant-specific users.

Tenant-specific permissions.

Tenant-specific financial records.

Tenant-specific documents.

Tenant-specific reporting.

Tenant-aware database queries.

Tenant-aware API access.

Tenant-aware storage access.

A user belonging to one firm must never access another firm's private information.

Tenant identification must be reliable and validated server-side.

Never trust a tenant ID supplied by an unauthorised browser request.

4.2 White-label configuration

Implement a proper configuration system for:

Firm name.

Logo.

Favicon.

Primary colour.

Secondary colour.

Accent colour.

Typography configuration where supported.

Contact details.

Website details.

Login page branding.

Email branding.

Document branding.

Firm-specific domain.

Platform-specific settings.

Branding must be loaded dynamically from the correct tenant.

Do not hard-code one firm's identity throughout the application.

4.3 Hosted SaaS architecture

Ensure the platform supports:

Hosted production operation.

Persistent database storage.

Multiple firms.

Multiple users per firm.

Independent firm configuration.

Secure authentication.

Secure authorisation.

Tenant isolation.

Database migrations.

File storage.

Production environment configuration.

Error handling.

Logging.

Deployment to Vercel.

Remove any architectural dependency on browser-local demo data for actual business operations.

Local development may use seeded test data, but production workflows must use persistent, authenticated backend data.

4.4 Platform operator versus firm administrator

Establish a clear distinction between:

Platform operator

Operates WEALTH OS itself.

Manages the SaaS platform.

Manages firm onboarding.

Manages platform-level configuration.

Monitors platform health.

Manages subscription and licence controls where implemented.

Firm administrator

Manages their own financial firm.

Manages their own advisers.

Manages their own clients.

Manages firm settings.

Manages firm-level permissions.

Manages firm-specific compliance and documents.

Do not accidentally grant a firm administrator platform-wide privileges.

4.5 Firm onboarding

Implement a complete firm onboarding workflow:

Platform operator creates or approves a firm.

Firm identity is captured.

Firm administrator is invited or created securely.

Firm branding is configured.

Firm domain is configured.

Firm settings are saved.

Firm administrator can sign in.

The administrator can configure the firm.

The firm can invite advisers.

Advisers can invite or onboard clients.

Implement proper validation, error states and persistence.

PHASE ONE COMPLETION GATE

Do not begin Phase Two until tenant architecture, tenant isolation, branding, onboarding and hosted application foundations are implemented and verified.

5. PHASE TWO — AUTHENTICATION, ROLES AND ACCESS CONTROL

Implement a complete, secure authentication system.

5.1 Separate entry points

The application must provide professional, clearly separated sign-in experiences for:

Platform administration.

Firm administration.

Financial advisers.

Clients.

Preserve and complete the separate administrator login route, including /admin/login, if present in the existing application.

Do not allow users to access portals merely because they know a URL.

5.2 Authentication

Implement:

Supabase authentication.

Secure session handling.

Sign-in.

Sign-out.

Password reset.

Password recovery.

Invitation acceptance.

Email verification where required.

Session expiration handling.

Appropriate multi-factor authentication.

Secure redirect handling.

Login failure handling.

5.3 Role-based access control

Implement and verify appropriate roles:

Platform super administrator.

Firm administrator.

Compliance officer.

Financial adviser.

Adviser support staff where applicable.

Client.

Permissions must be enforced on the server and database, not just hidden in the interface.

5.4 Security requirements

Apply least-privilege access.

Verify user identity server-side.

Verify tenant membership server-side.

Verify role and permission server-side.

Apply Row Level Security to relevant tables.

Prevent insecure direct object references.

Prevent privilege escalation.

Protect sensitive API routes.

Validate all user input.

Protect against cross-tenant access.

Avoid exposing service-role credentials.

Avoid trusting client-supplied user or tenant identifiers.

Avoid logging passwords, tokens or sensitive financial information.

Review every route that uses the Supabase service-role client.

Service-role access bypasses ordinary RLS protections. It must only be used in appropriately protected server-side operations with explicit authorisation and tenant scoping.

PHASE TWO COMPLETION GATE

No portal functionality may be considered complete until authentication, authorisation, role enforcement and tenant isolation have been verified.

6. PHASE THREE — FIRM ADMINISTRATOR PORTAL

Complete the entire firm administration experience.

The administrator must have a professional, fully functional dashboard.

Implement:

6.1 Dashboard

Firm overview.

Client statistics.

Adviser statistics.

Assets under management where data exists.

Outstanding tasks.

Pending onboarding.

Compliance alerts.

Recent activity.

Important notifications.

Never fabricate statistics or financial values.

Display meaningful empty states when there is no data.

6.2 User management

View users.

Invite users.

Create users through secure supported flows.

Edit user details.

Assign roles.

Assign advisers to clients.

Activate and deactivate access.

Manage invitations.

Revoke access.

View relevant account activity.

6.3 Client management

View all authorised firm clients.

Search clients.

Filter clients.

Open client records.

View client onboarding status.

View client documents.

View assigned adviser.

View client portfolio information where authorised.

Manage client status.

6.4 Adviser management

View advisers.

Add and invite advisers.

Edit adviser profiles.

Assign clients.

Reassign clients.

View adviser activity.

Manage adviser permissions.

View adviser workloads.

6.5 Firm configuration

Branding.

Firm details.

Contact details.

Domain settings.

User permissions.

Workflow settings.

Notification settings.

Document settings.

6.6 Compliance administration

Compliance records.

Outstanding requirements.

Review workflows.

Approval workflows.

Audit history.

Document expiry alerts.

Relevant reporting.

6.7 Platform operator administration

Build a separate platform-level experience where it is not already present.

It must support:

Firm creation.

Firm approval.

Firm suspension.

Firm activation.

Tenant overview.

Platform-wide operational monitoring.

Firm configuration oversight.

Platform-level audit records.

Never expose another firm's private financial information to ordinary firm administrators.

PHASE THREE COMPLETION GATE

The firm administrator must be able to manage the firm and its authorised users through actual persisted workflows, not decorative buttons or mock data.

7. PHASE FOUR — FINANCIAL ADVISER PORTAL

Complete the adviser portal as a working financial-advice workspace.

The adviser must be able to manage their assigned clients and perform normal adviser operations.

7.1 Adviser dashboard

Implement:

Assigned client overview.

Client portfolio overview.

Tasks.

Upcoming reviews.

Outstanding documents.

Client onboarding progress.

Notifications.

Recent activity.

Relevant performance summaries.

Only display data the adviser is authorised to access.

7.2 Adviser client management

View assigned clients.

Search clients.

Filter clients.

Open client profiles.

View client contact information.

View financial information where authorised.

View client documents.

View client goals.

View client portfolios.

View relevant history.

Create and manage adviser notes.

Assign and complete tasks.

Schedule client reviews.

Record client interactions.

7.3 Adviser search — IMPORTANT

Complete the adviser search experience, including the existing /advisor/search route where present.

Search must be a genuinely useful, unified adviser search.

It should support relevant authorised searches across:

Clients.

Client identifiers.

Portfolios.

Investment holdings.

Products.

Funds.

Documents.

Tasks.

Notes.

Transactions.

Reports.

Other relevant firm records.

Implement:

Search input.

Search suggestions where appropriate.

Result categorisation.

Result descriptions.

Useful filtering.

Result navigation.

Empty states.

Loading states.

Error states.

Pagination where appropriate.

Permission-aware results.

Tenant-aware results.

Complete /api/advisor/search if present.

Do not expose records the adviser is not authorised to see.

Review the existing universal-search migration and reuse it where appropriate.

Search must use real database records, not a hard-coded catalogue of fictional funds or clients.

Use sensible indexing and query strategies.

Do not make every search query retrieve the entire database.

7.4 Adviser client workflows

Implement complete workflows for:

Adding a client.

Inviting a client.

Onboarding a client.

Completing client information.

Assigning clients.

Recording client needs.

Recording investment objectives.

Recording risk information.

Managing client documents.

Preparing for reviews.

Recording recommendations where supported.

Following up on outstanding actions.

7.5 Adviser reporting

Implement relevant reports for:

Assigned clients.

Client portfolios.

Client activity.

Outstanding tasks.

Reviews.

Documents.

Adviser workload.

Reports must use actual persisted data.

PHASE FOUR COMPLETION GATE

The adviser must be able to complete meaningful client-management workflows from beginning to end.

8. PHASE FIVE — CLIENT PORTAL

Build a polished client-facing portal.

The client experience must be simple, professional, responsive and trustworthy.

8.1 Client dashboard

Display relevant information such as:

Portfolio overview.

Portfolio value.

Asset allocation.

Investment performance.

Goals.

Recent transactions.

Important documents.

Notifications.

Upcoming reviews.

Adviser contact details.

Financial values must come from authorised persisted data.

Do not use fictional portfolio values or illustrative performance as real client data.

8.2 Client profile

Allow clients to view and, where appropriate, update:

Personal details.

Contact details.

Relevant profile information.

Communication preferences.

Other permitted information.

Sensitive changes may require verification or adviser approval.

8.3 Portfolio and investment information

Implement:

Portfolio holdings.

Asset allocation.

Investment values.

Performance views.

Transaction history.

Product information.

Relevant reporting.

Clearly distinguish unavailable, delayed and calculated data.

Never invent investment performance.

8.4 Client documents

Allow clients to:

View authorised documents.

Download authorised documents.

Upload requested documents.

View document status.

Receive document notifications.

Documents must be private and securely stored.

8.5 Goals and planning

Implement:

Client goals.

Goal progress.

Target dates.

Contributions where supported.

Progress reporting.

Adviser-linked planning information.

8.6 Client communication

Implement appropriate:

Notifications.

Adviser contact details.

Secure communication workflows where supported.

Review reminders.

Important updates.

8.7 Client onboarding

A client must be able to complete the required onboarding process securely.

Include:

Invitation acceptance.

Profile completion.

Required information.

Document submission.

Consent capture where applicable.

Onboarding status.

Adviser review.

Completion confirmation.

PHASE FIVE COMPLETION GATE

A client must be able to sign in, access their own information, complete their onboarding and use the available portal workflows without seeing another client's information.

9. PHASE SIX — CORE WEALTH MANAGEMENT DATA

Implement a proper data model for the platform's wealth management functionality.

Inspect existing migrations first. Extend existing structures rather than creating duplicate or conflicting tables.

Where required, implement appropriate models for:

Firms.

Users.

Memberships.

Roles.

Permissions.

Clients.

Advisers.

Adviser-client assignments.

Client profiles.

Risk profiles.

Investment objectives.

Financial goals.

Portfolios.

Accounts.

Holdings.

Securities.

Funds.

Investment products.

Transactions.

Valuations.

Performance records.

Asset allocations.

Documents.

Tasks.

Notes.

Reviews.

Recommendations.

Notifications.

Audit events.

Compliance records.

Workflow states.

Firm settings.

For every table:

Define its purpose.

Define relationships.

Define tenant ownership.

Define constraints.

Define indexes.

Define access policies.

Define validation rules.

Define migration requirements.

Do not create unnecessary tables if equivalent structures already exist.

Use appropriate numeric precision for monetary and financial data.

Store currency explicitly.

Do not treat different currencies as interchangeable.

Use timestamps consistently.

Use migrations to manage schema changes.

Never silently alter production data.

Financial data integrity

Implement safeguards against:

Duplicate records.

Invalid monetary values.

Invalid transactions.

Unauthorised portfolio changes.

Cross-tenant records.

Incorrect ownership.

Missing currency information.

Inconsistent balances.

Where external financial data is unavailable, clearly indicate that the data is unavailable rather than fabricating it.

PHASE SIX COMPLETION GATE

Core wealth records must be persistently stored, correctly related, tenant-isolated and accessible through authorised application workflows.

10. PHASE SEVEN — DOCUMENT MANAGEMENT AND STORAGE

Complete the document system using Supabase Storage or the existing appropriate storage infrastructure.

Implement:

Private document storage.

Tenant-specific storage organisation.

Client-specific document access.

Adviser document access.

Administrator document access.

Secure upload.

Secure download.

File type validation.

File size validation.

Document metadata.

Document categories.

Document status.

Document expiry dates.

Document versioning where appropriate.

Document permissions.

Audit records.

Document deletion or archival rules.

Use signed URLs or another appropriately secure mechanism for private files.

Never expose private storage buckets publicly merely to make downloads easier.

Verify access at both application and storage-policy level.

PHASE SEVEN COMPLETION GATE

Documents must be securely uploaded, persisted, retrieved and accessed only by authorised users.

11. PHASE EIGHT — WORKFLOWS, TASKS AND NOTIFICATIONS

Implement the workflows that make the platform operational.

Workflow engine

Support relevant processes such as:

Firm onboarding.

Adviser onboarding.

Client onboarding.

Client review.

Document requests.

Document approval.

Compliance review.

Adviser follow-up.

Client communication.

Account or profile updates.

Task management

Implement:

Task creation.

Assignment.

Due dates.

Priorities.

Statuses.

Comments or notes where appropriate.

Completion.

Overdue tracking.

Relevant notifications.

Notifications

Implement a consistent notification system.

Support:

In-app notifications.

Email notifications where configured.

Important account alerts.

Task reminders.

Document reminders.

Onboarding updates.

Review reminders.

Notifications must be tenant-aware and recipient-aware.

Do not claim an email has been delivered unless the email provider confirms successful delivery.

Background jobs

Implement scheduled processing only where necessary.

Ordinary platform operation must not depend on cron secrets.

If a scheduled job requires authentication, secure that job independently.

PHASE EIGHT COMPLETION GATE

Core workflows must function from initiation through completion, with persistent status tracking and correct notifications.

12. PHASE NINE — FINANCIAL INTELLIGENCE AND REPORTING

Develop the platform's financial intelligence capabilities using actual data and transparent calculations.

Implement appropriate capabilities for:

Portfolio analytics.

Asset allocation analysis.

Performance analysis.

Portfolio comparisons.

Investment exposure.

Concentration analysis.

Portfolio risk indicators.

Goal progress analysis.

Client reporting.

Adviser reporting.

Firm reporting.

Investment insights where supported.

Where calculations are used:

Document the calculation method.

Validate inputs.

Identify the reporting period.

Identify the currency.

Handle missing data.

Handle zero or negative values correctly.

Avoid misleading performance comparisons.

Do not present projections as guaranteed outcomes.

Do not present AI-generated content as verified financial advice.

AI functionality must:

Use authorised information only.

Respect tenant boundaries.

Respect user permissions.

Identify uncertainty.

Avoid fabricating financial facts.

Be auditable where material.

Be clearly distinguished from human-approved advice.

Implement only features that can be supported by the available data and reliable calculations.

PHASE NINE COMPLETION GATE

All implemented analytics and reports must be traceable to actual data and verified calculations.

13. PHASE TEN — SEARCH, NAVIGATION AND USER EXPERIENCE

Complete the user experience across every portal.

Design requirements

The application must look and feel like a premium commercial financial technology product.

Implement:

Consistent design system.

Professional typography.

Consistent spacing.

Clear hierarchy.

Professional navigation.

Responsive layouts.

Accessible controls.

Appropriate loading states.

Error states.

Empty states.

Success feedback.

Confirmation dialogs.

Form validation.

Useful search and filtering.

The user must never encounter a button that appears functional but does nothing.

Every visible action must:

Perform its stated action, or

Be clearly disabled with a reason, or

Be removed until implemented.

No decorative functionality pretending to be operational.

Responsive requirements

Verify:

Desktop.

Tablet.

Mobile.

Narrow-screen navigation.

Forms.

Tables.

Dashboards.

Charts.

Dialogues.

Search interfaces.

Accessibility

Implement appropriate:

Keyboard navigation.

Focus indicators.

Labels.

Accessible names.

Contrast.

Semantic structure.

Screen-reader support.

Navigation

Ensure:

Each user sees the correct navigation.

Users cannot navigate into unauthorised portals.

Redirects are correct.

Deep links are handled safely.

Sign-out works.

Session expiry is handled properly.

PHASE TEN COMPLETION GATE

The complete application must be usable across supported screen sizes, with all visible controls performing their intended actions.

14. PHASE ELEVEN — SECURITY, PRIVACY AND COMPLIANCE

Perform a full security review of the application.

Authentication and authorisation

Verify every protected page.

Verify every protected API.

Verify role checks.

Verify tenant membership.

Verify ownership checks.

Verify session handling.

Verify administrative privileges.

Database security

Review every relevant RLS policy.

Test cross-tenant access.

Test unauthorised record access.

Test insert permissions.

Test update permissions.

Test delete permissions.

Test service-role operations.

Storage security

Test private bucket access.

Test signed URL access.

Test cross-tenant file access.

Test unauthorised uploads.

Test file validation.

Application security

Validate inputs.

Handle errors safely.

Prevent unsafe redirects.

Protect secrets.

Review dependencies.

Review exposed environment variables.

Avoid leaking sensitive information.

Review rate limiting for sensitive endpoints.

Review audit logging.

Compliance readiness

Build configurable compliance capabilities appropriate to a wealth management platform.

Support:

Audit trails.

Record retention configuration.

Consent records.

Document history.

User activity history.

Compliance review workflows.

Permission history.

Relevant reporting.

Do not claim regulatory certification or legal compliance without an independent and appropriate assessment.

PHASE ELEVEN COMPLETION GATE

All identified critical and high-severity security issues must be resolved before release. Any remaining material issue must be explicitly documented and must prevent a production-ready sign-off.

15. PHASE TWELVE — TESTING AND QUALITY ASSURANCE

Testing is mandatory throughout implementation, not something to postpone until the end.

Use the existing repository testing infrastructure.

Run relevant checks after every task.

At the end, complete a full regression pass.

Required checks

TypeScript checks.

ESLint.

Unit tests.

Component tests where available.

Integration tests.

API tests.

Database tests.

Supabase RLS tests.

End-to-end Playwright tests.

Production build.

Dependency and security audit.

Required workflow tests

Test the complete user journeys.

Platform operator

Sign in.

Create or approve a firm.

Configure the firm.

Invite a firm administrator.

Review platform-level information.

Firm administrator

Sign in.

Configure the firm.

Invite an adviser.

Create or invite a client.

Assign the adviser.

Manage firm users.

Review firm activity.

Adviser

Sign in.

View assigned clients.

Search for a client.

Open a client record.

View permitted financial information.

Manage a task.

Upload or request a document.

Complete a review workflow.

Client

Accept an invitation.

Sign in.

Complete onboarding.

View their own dashboard.

View their own portfolio.

View and download permitted documents.

Update permitted profile information.

Tenant isolation

Create at least two independent test tenants.

Create users in both tenants.

Verify that users cannot access each other's clients.

Verify that users cannot access each other's documents.

Verify that search cannot return another tenant's records.

Verify that API requests cannot bypass tenant restrictions.

Verify that database policies enforce the intended isolation.

Use synthetic test data only.

Do not use real client information.

Testing discipline

For each failure:

Identify the cause.

Fix the issue.

Rerun the failed test.

Rerun relevant regression tests.

Record the result.

Never report a test as passed if it was not run.

Never conceal failing tests.

Do not reduce test coverage merely to make the suite pass.

PHASE TWELVE COMPLETION GATE

The required test suite must pass, the production build must succeed, and critical workflows must be verified.

16. PHASE THIRTEEN — DEPLOYMENT AND PRODUCTION READINESS

Prepare the platform for hosted operation.

Vercel

Implement and document:

Production build configuration.

Environment variables.

Deployment settings.

Domain configuration.

Redirect configuration.

Production error handling.

Build verification.

Supabase

Document and verify:

Project configuration.

Database migrations.

Authentication settings.

Redirect URLs.

Storage buckets.

Storage policies.

RLS policies.

Required database extensions.

Required environment variables.

Environment configuration

Maintain a clean .env.example.

Document every required variable.

Distinguish:

Required variables.

Optional variables.

Development-only variables.

Test-only variables.

Background-job-only secrets.

Never commit actual secrets.

Never copy credentials from the original application.

Never claim a deployment is live unless it has actually been deployed and verified.

Operational readiness

Document:

Database backup considerations.

Recovery considerations.

Monitoring.

Logging.

Error reporting.

Database migrations.

Rollback strategy.

Incident response.

Dependency updates.

PHASE THIRTEEN COMPLETION GATE

The application must build successfully and have complete, accurate deployment documentation. Any live deployment must be separately verified.

17. PHASE FOURTEEN — FINAL DOCUMENTATION

Update the README to describe the actual completed hosted SaaS product.

The README must include:

What WEALTH OS is.

Product architecture.

Technology stack.

Portal descriptions.

Authentication model.

Tenant architecture.

Database architecture.

Storage architecture.

Search functionality.

Financial data model.

Environment variables.

Local development instructions.

Database migration instructions.

Test instructions.

Deployment instructions.

Security considerations.

Operational considerations.

Create or complete:

docs/WEALTH_OS_ARCHITECTURE.md

docs/WEALTH_OS_ROUTE_MAP.md

docs/WEALTH_OS_DATABASE_MAP.md

docs/DEPLOYMENT.md

docs/SECURITY.md

docs/TESTING.md

docs/IMPLEMENTATION_PLAN.md

docs/WEALTH_OS_COMPLETION_REGISTER.md

Documentation must describe what actually exists.

Do not document planned functionality as completed functionality.

18. PHASE FIFTEEN — FINAL PRODUCT AUDIT

Once all preceding phases are complete, conduct a complete product audit.

Check every route.

Check every portal.

Check every major workflow.

Check every API.

Check every database migration.

Check every relevant RLS policy.

Check every visible button and form.

Check all navigation.

Check mobile responsiveness.

Check error handling.

Check the production build.

Check the documentation.

Check for:

Demo-only functionality.

Fake business records.

Hard-coded financial data.

Placeholder pages.

Disconnected components.

Dead buttons.

Broken links.

Duplicate functionality.

Unused code.

Missing permissions.

Insecure API endpoints.

Missing tenant checks.

Incomplete migrations.

Incorrect environment assumptions.

Unhandled errors.

Remove obsolete demonstration functionality from production paths.

Do not remove useful functionality simply because it was originally developed for a demonstration. Replace fake data sources with real persisted workflows where the feature is required.

Do not remove existing functionality without confirming it is obsolete or redundant.

19. DEFINITION OF FINISHED

WEALTH OS may only be declared FINISHED when all the following are true:

The existing repository has been fully inspected.

The hosted SaaS architecture is complete.

Multiple independent firms are supported.

Tenant isolation is verified.

Firm branding is configurable.

Firm onboarding works.

Platform administration works.

Firm administration works.

Adviser authentication works.

Client authentication works.

Role-based permissions work.

The adviser portal works.

Adviser search works.

The client portal works.

Client onboarding works.

Core wealth data is persisted.

Portfolio information is correctly handled.

Document management works.

Tasks and workflows work.

Notifications work where configured.

Reporting works from actual data.

Financial calculations are verified.

Security review is complete.

Database RLS tests pass.

Cross-tenant tests pass.

Automated tests pass.

End-to-end workflows pass.

Production build succeeds.

Deployment documentation is complete.

README reflects the actual product.

No required feature remains a placeholder.

No required visible action is non-functional.

Completion register is fully updated.

Every checkbox must have supporting evidence.

If an item cannot be verified because external credentials, services, approvals or infrastructure are unavailable, mark it BLOCKED and state exactly what is needed.

Do not falsely declare the product finished.

20. REQUIRED COPILOT WORKING BEHAVIOUR

You must operate as a coordinated senior engineering team consisting of:

Principal software architect.

Senior Next.js engineer.

Senior TypeScript engineer.

Supabase/PostgreSQL engineer.

Cybersecurity engineer.

Financial systems engineer.

UI/UX engineer.

QA and automation engineer.

DevOps engineer.

Think across the entire application, but implement in the prescribed sequence.

Mandatory rules

Reuse existing code where appropriate.

Do not rebuild working functionality unnecessarily.

Do not create duplicate routes or database structures.

Do not introduce fake production data.

Do not introduce unnecessary dependencies.

Do not silently remove features.

Do not bypass security checks.

Do not weaken RLS policies to make tests pass.

Do not expose service-role credentials.

Do not hard-code a particular financial firm into the platform.

Do not make ordinary application functionality depend on CRON_SECRET.

Do not claim tests passed unless they were actually executed.

Do not mark incomplete tasks as complete.

Do not move to the next task when the current task is incomplete.

Do not replace real functionality with placeholder interfaces.

Do not leave dead buttons or non-functional controls.

Do not stop after producing a plan.

Do not ask for permission for ordinary implementation decisions that can safely be made from the repository.

If a decision has security, financial integrity or irreversible data implications, stop and document the decision required.

Keep the repository buildable throughout implementation.

Progress tracking

Maintain WEALTH_OS_MASTER_INSTRUCTIONS.md as the master checklist.

Maintain docs/WEALTH_OS_COMPLETION_REGISTER.md as the evidence register.

For each completed task, record:

Task identifier.

Task description.

Files changed.

Database migrations changed.

Tests executed.

Test results.

Acceptance criteria verified.

Any remaining limitations.

Update both documents as work progresses.

Do not mark a phase complete until every task and subtask in that phase is complete and verified.

If context or session limits interrupt work

The repository files are the source of truth.

At the end of each work session:

Save all completed code.

Update the master checklist.

Update the completion register.

Record the exact current task.

Record the last successful test.

Record the next permitted action.

Record any blockers.

When resuming, read these files first.

Do not repeat completed work unnecessarily.

Do not skip incomplete work.

FINAL COMMAND

BEGIN WITH PHASE ONE, TASK ONE.

Inspect the current repository and establish its actual state.

Then execute the tasks sequentially.

Do not stop at planning.

Do not skip ahead.

Do not mark tasks complete without evidence.

Do not leave unfinished work behind.

THE OBJECTIVE IS A FULLY FUNCTIONAL, SECURE, HOSTED, MULTI-TENANT, WHITE-LABEL WEALTH MANAGEMENT PLATFORM — NOT A DEMONSTRATION OF ONE.

---

## VERIFIED STARTING POSITION — 2026-11-22

- Repository inspection task: **COMPLETE AND VERIFIED**.
- Architecture, route, database, feature, dependency, and security maps are recorded in `docs/`.
- The repository is a Next.js/Supabase application with substantial public, local-demo, staff, adviser, client, Studio, and intelligence functionality.
- Browser-local demonstrations are the default in standalone mode; they are not production tenant storage.
- There is partial tenant and RLS infrastructure, but no complete verified SaaS tenant model.
- Current staff roles are `admin`, `adviser`, `compliance`, and `operations`; platform super-administrator and firm membership models are missing or incomplete.
- Baseline unit test evidence: 68 test files pass, 1 fails; 255 tests pass, 1 fails.
- The current exact next permitted task is **4.1 Tenant architecture**.

## PROGRESS UPDATE — 2026-11-22

- Repository inspection: **COMPLETE AND VERIFIED**
- Phase One 4.1 Tenant architecture: **COMPLETE AND VERIFIED**
- Exact next permitted task: **4.2 Dynamic white-label configuration**

- 4.2 Dynamic white-label configuration: **COMPLETE AND VERIFIED**
- 4.3 Hosted SaaS foundation: **BLOCKED**
- Exact next permitted task: **NONE while 4.3 is blocked**
- Correction: Supabase is connected remotely in the user's environment, but this workspace is not linked to that hosted project; the active CLI project is the separate local stack.
- Remaining blocker: hosted project access/link, Vercel/domain/Auth/SMTP/MFA/storage verification and approvals.

Your final declaration must be one of:

FINISHED — VERIFIED: Every required task and acceptance criterion is complete, with evidence.

NOT FINISHED — BLOCKED: Specific tasks remain blocked, with exact reasons and required actions.

NOT FINISHED — IN PROGRESS: Work remains and the exact next permitted task is identified.

Never declare FINISHED unless the definition of finished in Section 19 has been satisfied.
