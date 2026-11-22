# WEALTH OS innovation register

Updated: 2026-11-22

This register records implementation evidence and limitations, not novelty or
investment claims. "Implemented" means the described code exists; it does not
mean a module has passed hosted, regulatory or production verification.

## Existing functionality reused

- Wealth planning lab and goal calculations.
- Adviser/client profiles, account and portfolio reporting, documents, notes,
  tasks, tax allowance tracking and renewal evidence.
- Staff permission and MFA foundations.
- Browser-local Studio, persistence and static ZIP export.

## Module status

| Module | Evidence | Classification |
|---|---|---|
| Financial twin | `twin.ts`, deterministic unit tests, local `/planning` wiring, optional authenticated persistence API | Prototype; hosted save/reopen and independent methodology verification incomplete |
| Consequence engine | `consequence.ts`, unit tests and local planning-lab wiring | Prototype; no persisted source graph, robust propagation or approval workflow |
| Decision time machine | Browser-local context history, `/api/wealth-os/decisions`, and security migration | Partial; atomic context event persistence is implemented in code but migration/RLS and two-tenant tests are not run; approval/outcome/correction events are not enabled in the API |
| Parallel planning | `plan-risk.ts` and three fixed local comparison cards | Prototype; no arbitrary named/versioned scenario management |
| Risk discovery | Basic holding concentration, currency and liquidity calculations | Prototype; no dated authorized holdings contract or look-through exposures |
| Opportunity orchestration | Explicit rule outputs and optional persistence API | Prototype; evidence quality, disposition, expiry and audit workflows are incomplete |
| Relationship graph | Browser-local entities with verification labels | Local prototype; no hosted authorization/API workflow |
| Institution knowledge | Browser-local approved-source records | Local prototype; no permission-aware hosted retrieval |
| Crisis rehearsal | Linear hypothetical shock helper and tests | Prototype; no correlation, contagion or liquidation cascade model |
| Innovation discovery | Rule-based local evaluation helper | Prototype; no verified competitive or legal/IP opinion |

No financial transaction, autonomous recommendation, or public-site deployment
is implemented by these modules.

## Migration and external requirements

The optional hosted financial-intelligence path depends on the core Wealth OS
tenant migration, the financial-intelligence migrations
`202611220002_financial_intelligence.sql`,
`202611220003_decisions_plans_risk.sql`,
`202611220004_enterprise_intelligence.sql`, and the security migration
`202611220005_wealth_intelligence_security.sql`. The shared authenticated
rate-limit migration is also required for the APIs. These migrations have not
been run or validated against a development project in this review.

The authenticated routes require a trusted, explicit
`app_metadata.tenant_id`; the shared sample tenant `default` is rejected. No
service-role key is used for financial-intelligence row reads or writes.
The added tenant-readiness table is empty/default-disabled and must be enabled
by a trusted server-side operator only after all declared checks are verified.
Rate-limit enforcement still uses the configured server-only rate-limit
service.

Optional market, portfolio, tax, document, hosting or AI integrations require
separately approved providers, credentials and legal/security review. There is
no mandatory paid service for standalone operation.

## Differentiation boundary

Planning, stress testing, what-if tools, portfolio risk and institutional
intelligence have existing market analogues. Any potential differentiation is
an implementation hypothesis around reproducibility, evidence lineage,
explainability and human review. It is not a claim of global uniqueness,
patentability or defensible ownership.

## Outstanding production and regulatory concerns

- Development Supabase RLS and role/tenant isolation tests have not run.
- Adviser-to-client authorization is not complete across the intelligence
  modules.
- Browser-local data is not production financial storage.
- Verified holdings, data freshness, backup/restore, incident response,
  retention and legal/compliance review remain outstanding.
- Projections are hypothetical and are not guarantees or regulated advice.
