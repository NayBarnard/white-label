# WEALTH OS repository instructions

`WEALTH_OS_MASTER_CHECKLIST.md` is the authoritative task order and completion
record for this repository.

For every WEALTH OS development task:

1. Read the entire master checklist before changing code.
2. Continue from its first unfinished task and preserve verified completed
   work.
3. Implement, test, fix, and verify the current task before moving to another
   task or phase.
4. Update the checklist and `docs/WEALTH_OS_COMPLETION_REGISTER.md` with the
   implementation evidence, files changed, tests run, results, and remaining
   issues.
5. Keep README and directly related documentation aligned with the actual
   behavior.
6. Never mark a task complete without test evidence. Keep incomplete work
   unchecked and record any genuine blocker precisely.
7. Standalone workflows must not require Supabase credentials or mandatory
   external services. Treat hosted Supabase/Vercel configuration as an
   optional deployment track, not a standalone completion blocker.
8. Do not claim that local browser storage provides authentication,
   cross-device synchronization, encryption, or tenant isolation.
9. Do not start a later phase while a required task in the current phase
   remains incomplete.
