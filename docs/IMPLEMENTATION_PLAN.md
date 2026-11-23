# WEALTH OS implementation and acquisition-readiness plan

Status reviewed: 2026-11-22

> **Standalone-first acceptance amendment:** `WEALTH_OS_MASTER_CHECKLIST.md`
> now controls the current required work order. The application must run
> locally without Supabase credentials or mandatory external services.
> Supabase/Vercel setup and live hosted verification remain optional deployment
> work and are not blockers to standalone acceptance. The roadmap below
> preserves hosted and acquisition-readiness requirements as a separate track;
> it does not replace the standalone acceptance checklist.

## Current verified capability matrix

| Capability | Evidence in this repository | Status | Production boundary |
|---|---|---|---|
| Creator Studio editing and static ZIP export | `src/components/studio/UniversalStudio.tsx`, `src/lib/studio/static-site-export.ts`, related Studio tests | Implemented; standalone browser workflows have existing tests | Browser storage and local publish snapshots are not hosted publishing or secure tenant storage |
| Portals, client profiles, goals, documents and adviser workflows | `src/app`, `src/components/adviser`, `src/lib/adviser`, portal and staff migrations | Partial; a local SQL test covers selected WEALTH OS records, not all app resources or authenticated API workflows | Broader tenant/role and relationship authorization tests remain required |
| Staff role checks and MFA foundations | `src/lib/staff/permissions.ts`, `src/lib/staff/mfa.ts`, adviser/admin server guards | Implemented foundations; configuration and recovery are not verified here | No claim of production MFA enrollment or incident recovery validation |
| Financial twin | `src/lib/wealth-intelligence/twin.ts` and unit tests; wired to `/planning` and an optional API | Prototype: deterministic seeded simulation exists, but model validation, comparisons and API workflow are incomplete | Illustrative only; no verified client data, persistence or two-tenant test |
| Consequence analysis | `src/lib/wealth-intelligence/consequence.ts` and unit tests; wired to the local planning lab | Prototype: graph traversal is shallow and not a persisted, before/after impact workflow | Do not use for client-plan changes |
| Decision history | Local planning state, `/api/wealth-os/decisions`, and additive SQL migrations | Partial: local migration, tenant RLS and append-only SQL assertions pass; API-backed writes use a session-scoped client and atomic RPC | No hosted validation, real-client audit, correction workflow or outcome reconstruction claim |
| Parallel planning | `src/lib/wealth-intelligence/plan-risk.ts`; three hard-coded local cases in the planning lab | Prototype: not an arbitrary saved/versioned scenario workspace | Not a saved client-plan comparison |
| Risk discovery | `analyseHoldingRisk` and local planning UI | Prototype: only basic concentration, currency and liquidity labels; no sourced holdings contract or look-through data | No authorised holdings or live valuations are provided |
| Opportunity review | `orchestrateOpportunity` and `/api/wealth-os/enterprise` | Prototype: deterministic prompts exist; evidence validation and disposition workflow are incomplete | Human review required; no recommendation or execution |
| Relationship graph and institution knowledge | Local state in the planning lab and optional SQL schema | Local prototype; no permission-aware hosted workflow/API | Do not store sensitive production records |
| Crisis rehearsal | Linear calculation in `src/lib/wealth-intelligence/enterprise.ts` | Prototype: simple independent shocks, no correlations or liquidation cascade | Hypothetical only |
| Hosted public-domain publishing | No deployment orchestration API; Studio exports a static ZIP | Not implemented | ZIP export is not a confirmed deployment |
| IP ownership and acquisition handover | Existing product, licence and handover documentation | Incomplete; dependency licence and contributor provenance review is outstanding | No legal ownership, exclusivity, patentability or valuation guarantee |

This matrix describes code and test evidence, not commercial readiness. A module
with a passing unit test is not thereby a validated financial model or an
authorized hosted workflow.

## Phases, dependencies, risks, and acceptance

| Phase | Depends on | Main risk | Acceptance gate |
|---|---|---|---|
| 0. Baseline and capability verification | None | Documentation can overstate code or test evidence | Inventory routes, persistence, auth, migrations and tests; record baseline commands; classify each feature using repository evidence |
| 1. Tenant and security foundation | Phase 0; isolated Supabase development project | Service-role bypass, missing tenant claims, weak client/adviser relationship checks | Authenticated session and server authorization on every sensitive path; non-default tenant claims; RLS tests with multiple tenants and roles; append-only audit tests; backup/restore and readiness gate |
| 2. Financial digital twin | Phase 1; reviewed financial model | False precision, invalid assumptions or irreproducible runs | Versioned schema, bounded inputs, reference calculations, seeded reproducibility, persisted authorized runs, comparison and report tests |
| 3. Consequence engine | Phases 1-2; typed source records | Incorrect propagation or mutation of source records | Deterministic before/after analysis, provenance and uncertainty, cycle/missing-data tests, immutable snapshot and human approval boundary |
| 4. Decision history | Phase 1; stable context/model schemas | A mutable or incomplete audit trail | Atomic append-only records, corrections as new events, timeline reconstruction, tenant/ordering tests and review-pack export |
| 5. Parallel planning | Phases 1-2 | Misleading scenario comparisons | Arbitrary named saved versions, reproducible runs, assumption deltas and downside/trade-off comparisons with E2E coverage |
| 6. Risk discovery | Phase 1; authorized holdings contract | Fabricated or stale exposure and false risk findings | Each finding links to dated source holdings and calculation; unknown data remains unknown; independent calculation and limitation tests |
| 7. Opportunity orchestration | Phases 1-4; verified inputs | Unsubstantiated or unsuitable suggestions | Explicit rule evidence, harm/benefit/missing-input explanation, deduplication, disposition audit and no-execution tests |
| 8. Relationship graph and institution knowledge | Phase 1; access-classification model | Cross-user disclosure or retrieved prompt injection | Tenant/record-scoped retrieval, source citations, human verification and cross-tenant search/revocation tests |
| 9. Crisis rehearsal | Phases 1 and 6; disclosed shock assumptions | False confidence from simple or correlated shocks | Versioned reproducible hypothetical scenarios, coverage and sensitivity disclosure, independent tests and downloadable review pack |
| 10. Creator Studio publishing | Phase 1; selected hosting provider and authorized credentials | Secret exposure, wrong-tenant deployment or false “live” status | Server-only deployment token, immutable verified deployments, domain status, failure/retry/rollback and tenant-isolation tests |
| 11. Buyer-ready demo and handover | Phases 0-10; legal and contributor records | Unsupported ownership, security or readiness claims | Resettable fictional demo, reproducible test environment, architecture/data-flow/threat/API docs, factual dependency/IP inventory and reviewed limitations |

Phases 2-10 do not authorize transactions, fund movement, autonomous decisions,
personalized regulated advice, or use of real client financial data. Hosted
features remain disabled until their per-phase acceptance evidence is
available.

## Work completed in this review

- Confirmed the repository is a Next.js 16.4.6 App Router application and read
  the installed Route Handler, authentication, data-security, backend-for-
  frontend, and production guidance before implementation.
- Ran baseline lint, TypeScript, unit tests and production build. Baseline
  results are recorded in `STATUS.md`.
- Found that the WEALTH OS intelligence API used a service-role database
  client and silently mapped missing tenant claims to a shared `default`
  tenant. The financial-intelligence routes now use an authenticated,
  cookie-bound Supabase client, require an explicit non-default tenant claim,
  rely on RLS, and rate-limit reads and writes.
- Added an additive migration to scope financial-intelligence rows to their
  owner and explicit tenant, tighten relationship-edge ownership, deny
  ordinary decision-history mutation, and atomically create a decision and
  its initial context event. The migration also adds a default-closed
  tenant-readiness gate: a trusted operator must record each required
  authentication, isolation, relationship-access, storage, audit, recovery,
  data-source and legal-review attestation before enabling financial data.
  Corrected the invalid combined `SELECT, INSERT` policy syntax in the
  preceding decision migration.
- The full ordered migration set applies and resets successfully on the local
  Supabase stack. A transactional SQL integration test now passes against two
  tenants and adviser/admin roles, exercising selected project, twin,
  relationship-edge and approved-knowledge RLS, readiness denial, cross-tenant
  write denial and append-only decision constraints. Fixtures roll back.
  Claims are simulated at the database layer; this is not an Auth-issued JWT,
  API-route, or hosted-project test and does not meet Phase 1's full acceptance
  gate.

## Remaining release blockers

- Run end-to-end tests with Auth-issued sessions in a separately configured
  development project, including every sensitive app resource and API path.
- Complete relationship-based adviser/client authorization and tenant-scoped
  checks across the rest of the application, not only the WEALTH OS APIs.
- Extend readiness-gate tests beyond the local default-closed check, and
  implement/test backup/restore, incident response, retention, private
  document lifecycle and MFA recovery evidence.
- Complete the feature-specific acceptance gates above; current planning
  modules remain prototypes.
- Review all dependency licences, fonts/assets, contributor assignments and
  legal/compliance obligations with qualified counsel.

