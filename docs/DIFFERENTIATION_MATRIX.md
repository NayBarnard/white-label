# Wealth management differentiation matrix

## Competitive evidence reviewed

- eMoney: goals, financial planning, data organisation, stress testing and what-if conversations.
- Orion: connected CRM, planning, portfolio management, reporting, risk and an institutional intelligence layer.
- HolistiPlan-style tax planning: tax-document intake and planning opportunities.
- This repository: a local-first wealth planning lab, portfolio and adviser workflows, tax allowance tracking, renewal evidence, RLS foundations and a Studio.

Sources: vendor public websites reviewed on 2026-11-22:
https://emoneyadvisor.com/
https://www.orion.com/
https://www.holistiplan.com/

## Differentiation assessment

| Capability | Existing comparable pattern | Repository differentiation | Defensibility assessment |
|---|---|---|---|
| Digital twin | Common planning projections and what-if tools | A traceable, reproducible seed-based twin with confidence bands, observed/derived/assumed/predicted labels and embedded methodology | Potentially defensible as a composable evidence-and-explanation workflow, not a claimed patent |
| Consequence engine | What-if and goal dependencies | Explain every edge and changed-node relationship, preserving affected assumptions and human review state | Defensible execution details must come from implementation and validation |
| Decision history | Review notes and approval records in many systems | Append-only reconstructable context plus actual later outcomes and alternatives | Differentiation is in reconstruction and audit semantics |
| Parallel planning | Scenario/what-if comparison | Side-by-side stable scenarios with trade-offs, downside ranges and immutable assumptions | Moderate differentiation |
| Risk discovery | Portfolio risk systems and stress tests | Evidence-first overlap and liquidity explanation across incomplete authorised data | Requires real holdings data to leave demonstration stage |
| Opportunity orchestration | Tax and planning opportunity engines | Human-review opportunities with evidence, missing information and both benefits and risks | Differentiation is governance, explainability and no-execution policy |

No globally unique claim is made. "Protectable" is not synonymous with "patentable".

## Technical architecture

- Deterministic pure TypeScript calculation modules in `src/lib/wealth-intelligence`.
- Versioned assumptions and result schemas in JSON.
- Supabase tables for immutable twin runs and consequence analyses with tenant/user RLS.
- Existing adviser client route used to expose information only to authorised advisers.
- Browser-local demonstration fallback using `useLocalState`.
- Optional Supabase persistence; no mandatory paid service or CRON dependency.
