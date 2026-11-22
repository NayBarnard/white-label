# WEALTH OS capability and innovation audit

Audit date: 2026-11-22

## Existing features deliberately reused

| Existing capability | Repository surface | Reuse in innovation programme |
|---|---|---|
| Illustrated wealth scenarios | [planning route](/src/app/planning/page.tsx), [planning lab](/src/components/WealthPlanningLab.tsx), [scenario API](/src/app/api/wealth-os/scenarios/route.ts) | Replace only the calculation core and extend, do not create a duplicate scenario product |
| Goal calculation and validation | [goal calculations](/src/lib/goals/calculations.ts) | Preserve existing goal rules and validate twin goals through shared types |
| Adviser client profiles | [profile component](/src/components/adviser/AdviserClientProfile.tsx), [client API](/src/app/api/advisor/clients/[clientId]/route.ts) | Integrate twin, consequence and later decision views into the existing profile |
| Portfolios and account valuations | [client portal SQL](/supabase/client-portal.sql), [adviser API](/src/app/api/advisor/clients/[clientId]/route.ts) | Use reported values as observed inputs; never substitute fabricated market values |
| Adviser notes and tasks | Existing profile tabs and wealth OS tables | Reuse for human review and follow-up actions |
| Tax allowance tracking | [tax tracker](/src/components/TaxAllowanceTracker.tsx), [tax API](/src/app/api/tax-allowance/route.ts) | Reuse as a consequence engine obligation and verified fact |
| Renewal packs and evidence | [renewal pack components](/src/components/adviser/RenewalPackManager.tsx), [renewal migrations](/supabase/migrations/202611210002_renewal_packs.sql) | Reuse evidence and review workflow |
| Tenant and staff permissions | [staff permissions](/src/lib/staff/permissions.ts), [adviser access](/src/lib/adviser/access.ts), Supabase RLS migrations | Required foundation for every new API and table |
| Browser-local Studio persistence | [local store](/src/lib/local-store.ts), Studio components | Preserve standalone operation without optional Supabase |

## Partially implemented

- Scenario saving: deterministic basic nominal/real future-value calculation exists, but no versioned assumptions, seed, stochastic ranges, life events or trace.
- Goal progress: exists for single goals, but there is no dependency graph or proposed-change impact analysis.
- Adviser client profiles: combine portfolios, documents, requests, notes and tasks, but not a financial relationship graph or decision history.
- Portfolio reporting: stores valuations and account metadata, but not holdings-level exposure or correlation data.
- Institution knowledge: no permission-aware source-backed knowledge layer exists.
- Innovation evaluation: no feature discovery register or competitive evaluation workflow exists.

## Genuinely absent

1. Reproducible stochastic financial digital twin.
2. Explainable financial consequence dependency graph.
3. Versioned, append-only decision history with later outcome comparison.
4. Parallel plan comparison and trade-off analysis.
5. Holdings-level hidden concentration and scenario-risk discovery.
6. Evidence-based opportunity orchestration.
7. Configurable household/entity relationship graph.
8. Institution-wide crisis rehearsal.
9. Permission-aware institutional knowledge with citations.
10. Novel feature discovery and defensible-IP evaluation.

## Explicit boundaries

All current data and calculations remain illustrative unless an authenticated
Supabase deployment has been verified by an authorised administrator. No
feature added by this programme may execute trades, move funds or present an
outcome as guaranteed or regulated advice.
