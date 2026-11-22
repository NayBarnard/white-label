# WEALTH OS innovation register

Updated: 2026-11-22

## Existing features reused

- Wealth planning lab and existing nominal/real future-value scenario.
- Goal calculations and adviser client profile.
- Portfolios, transactions, documents, notes, tasks and renewal packs.
- Tax allowance tracker.
- Supabase tenant, user and staff permission foundations.
- Browser-local persistence and existing PDF/JSON exports.

## Implemented

| Feature | Status | Evidence |
|---|---|---|
| Financial digital twin | Implemented and unit-tested | Seeded Monte Carlo, percentile ranges, inflation ranges, life events and versioned run persistence |
| Consequence engine | Implemented and unit-tested | Typed graph nodes/edges and explainable affected-node analysis |
| Decision time machine | Implemented locally and persisted through API | Append-only context events with alternatives and human-approval state |
| Parallel universe planning | Implemented | Cautious/base/higher plan comparison |
| Invisible risk discovery | Implemented for concentration/currency/liquidity | Clearly labelled holdings input and threshold findings |
| Opportunity orchestrator | Implemented | Evidence, missing information, benefits, risks and human review |
| Relationship graph | Browser-local implemented | Unverified entities are explicitly marked for human verification |
| Institution knowledge | Browser-local implemented | Approved-only demo records retain source references |
| Crisis rehearsal | Implemented and unit-tested | Linear hypothetical market, currency, inflation and liquidity shocks |
| Innovation discovery lab | Implemented | Repository/competitor/differentiation/implementation/value/IP review |

No financial transaction or autonomous recommendation is implemented.

## Experimental

- Supabase persistence for all new tables requires migration application and production tenant validation.
- Holdings risk requires real authorised holdings and categorisation data.
- Relationship and institution-knowledge UIs are local demonstrations until record authorisation workflows are complete.
- Crisis rehearsal is linear and does not model correlations, contagion or liquidation cascades.

## Paid or external requirements

No mandatory paid service or external credential is required for standalone operation.
Optional live portfolio, market, tax, document or AI integrations would require
separate approved providers, credentials and legal/security review.

## Competitive differentiation evidence

eMoney public materials describe goals, stress testing and what-if planning.
Orion describes connected planning, portfolio management, risk and institutional
AI. The repository's differentiation is a reproducible evidence-first workflow:
versioned assumptions, traceable explanations, tenant-scoped persistence,
append-only context and a no-execution governance boundary.

## Outstanding security and regulatory concerns

- Real-Supabase tenant isolation must be migration-tested in an isolated project.
- Adviser/client permission boundaries for client-specific twin and graph records require end-to-end validation.
- Browser-local data is not secure or production financial storage.
- Projections are hypothetical and require human verification.
- Tax, legal, suitability and regulatory approvals are not included.
