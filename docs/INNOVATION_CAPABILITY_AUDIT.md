# WEALTH OS capability and innovation audit

Audit date: 2026-11-22

This audit distinguishes code presence, local UI wiring, tests, and hosted
authorization. A passing unit test proves only the tested function behavior.
No Supabase migration was applied or verified against a database during this
review.

## Existing capabilities reused

| Capability | Repository evidence | Verified boundary |
|---|---|---|
| Creator Studio | `src/components/studio/UniversalStudio.tsx`, `src/lib/studio/*`, Studio tests | Browser-local project editing, IndexedDB media and static ZIP export exist; hosted public deployment does not |
| Wealth planning lab | `src/components/WealthPlanningLab.tsx`, `src/lib/goals/calculations.ts` | The planning route is a local interactive illustration; some results are browser-local |
| Adviser/client workflows | `src/components/adviser/*`, `src/lib/adviser/*`, adviser APIs | Auth and relationship checks exist in some adviser paths; broader tenant/role isolation has not been verified |
| Portfolio and account reporting | Portal components and `supabase/migrations/20260101000002_client_portal.sql` | Depends on configured Supabase and authorized source records; the demonstration is not live market data |
| Tax allowance tracking | `src/components/TaxAllowanceTracker.tsx`, tax API and migrations | Rule and contribution tracking exists; user-entered/external figures require review |
| Staff role/MFA foundations | `src/lib/staff/permissions.ts`, `src/lib/staff/mfa.ts` | Code paths exist; real deployment settings, recovery and tenant-role tests remain unverified |

## Innovation-module evidence

| Module | What exists | Status and remaining limitation |
|---|---|---|
| Financial twin | Seeded Monte Carlo function, assumption validator, percentile outputs, unit tests, local planning UI and optional API | Prototype. Does not have independent reference-model validation, full source/version provenance or verified hosted save/reopen/compare flow |
| Consequence analysis | Typed nodes/edges, graph analysis function, unit tests and a local planning-lab view | Prototype. No persisted client dependency model or source-record approval workflow; propagation is not a complete deterministic impact model |
| Decision history | Local browser history and optional authenticated API; the security migration adds atomic decision/context writes and append-only database protection | Partial and unverified. Hosted functionality depends on applying migrations and passing database isolation tests; current API intentionally accepts only context/alternative/assumption/comparison events |
| Parallel planning | Comparison helper and three illustrative local plans | Prototype. The UI is not an arbitrary saved, versioned scenario workspace |
| Risk discovery | Basic asset-class, currency and liquidity calculations | Prototype. No authorized holdings contract, dated valuation lineage, look-through evidence or independent coverage validation |
| Opportunity review | Rule-based opportunity helper and optional API persistence | Prototype. Evidence is caller-provided, and disposition, duplicate suppression, expiry and audit workflow are incomplete |
| Relationship graph | Browser-local relationship nodes | Local prototype. No hosted record authorization or cross-tenant test |
| Institution knowledge | Browser-local approved-source records | Local prototype. No permission-aware hosted search, revocation or retrieved-content defenses |
| Crisis rehearsal | A deterministic linear shock calculation and unit tests | Prototype. It does not model correlations, contagion, liquidity cascades or authorized institution-wide exposures |
| Innovation discovery | A small rule-based evaluation helper | Prototype. It is not a verified novelty, competitive, legal or IP assessment |

## Hosted security finding and corrective work

The original financial-intelligence route handlers used a Supabase
service-role client for financial rows and substituted the shared `default`
tenant when a signed-in user's `app_metadata.tenant_id` was missing. The
handlers now use a cookie-bound authenticated client so Postgres RLS applies,
require a valid explicit non-default tenant claim, filter by the signed-in
user, and enforce authenticated request limits. A new additive migration
tightens ownership policies for the WEALTH OS intelligence tables and adds
atomic, append-only decision creation. It also adds a default-closed readiness
gate that requires trusted attestations for authentication/MFA, tenant
isolation, relationship access, private storage, audit controls,
backup/restore, incident/retention, authorized data sources and legal review.

This is a code change, not a deployment verification. RLS and trigger behavior
have not been exercised in a development Supabase project. Other application
APIs, including Studio and adviser/admin surfaces, require separate
authorization review. The feature set therefore remains unsafe for real client
financial records.

## Explicit product boundaries

- Demo data and browser-local state are not secure production financial
  storage.
- No feature may autonomously trade, move funds, or execute a regulated
  financial decision.
- No live investment data, tenant-isolation certification, legal/compliance
  approval, patentability, global uniqueness, or exclusive ownership is
  claimed.
- Use only fictional data until authentication, relationship authorization,
  tenant tests, storage controls and operational safeguards are independently
  verified.
