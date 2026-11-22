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
