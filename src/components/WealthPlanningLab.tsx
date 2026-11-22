"use client";

import { useMemo, useState } from "react";
import { useLocalState } from "@/lib/local-store";
import { downloadPdfReport } from "@/lib/pdf-report";
import { simulateFinancialTwin, FINANCIAL_TWIN_VERSION, type LifeEvent } from "@/lib/wealth-intelligence/twin";
import { analyseConsequences, type ConsequenceEdge, type ConsequenceNode } from "@/lib/wealth-intelligence/consequence";
import { analyseHoldingRisk, compareTwinPlans, type Holding } from "@/lib/wealth-intelligence/plan-risk";
import { orchestrateOpportunity, rehearseCrisis, evaluateInnovationProposal } from "@/lib/wealth-intelligence/enterprise";

type Scenario = { id: string; name: string; present: number; monthly: number; years: number; rate: number; result: number };
type HostedRecord = { path: string; payload: object };

export function WealthPlanningLab() {
  const [present, setPresent] = useState(100000);
  const [monthly, setMonthly] = useState(2500);
  const [years, setYears] = useState(10);
  const [rate, setRate] = useState(7);
  const [inflation, setInflation] = useState(5);
  const [name, setName] = useState("Base scenario");
  const [scenarios, setScenarios] = useLocalState<Scenario[]>("example-wealth.planning.scenarios", []);
  const [volatility, setVolatility] = useState(12);
  const [seed, setSeed] = useState(12345);
  const [target, setTarget] = useState(1000000);
  const [lifeEventYear, setLifeEventYear] = useState(3);
  const [lifeEventAmount, setLifeEventAmount] = useState(100000);
  const [lifeEvents, setLifeEvents] = useState<LifeEvent[]>([]);
  const [twinRuns, setTwinRuns] = useLocalState<Array<{ id: string; name: string; result: ReturnType<typeof simulateFinancialTwin>; assumptions: object }>>("example-wealth.planning.twin-runs", []);
  const [decisionTitle, setDecisionTitle] = useState("Review retirement contribution");
  const [decisionContext, setDecisionContext] = useState("Illustrative context: increasing monthly contributions before the next review.");
  const [decisionHistory, setDecisionHistory] = useLocalState<Array<{ id: string; title: string; events: Array<{ type: string; payload: object; createdAt: string }> }>>("example-wealth.planning.decision-history", []);
  const [demoHoldings, setDemoHoldings] = useState<Holding[]>([]);
  const [monthlySurplus, setMonthlySurplus] = useState<number | null>(5000);
  const [taxAllowance, setTaxAllowance] = useState<number | null>(30000);
  const [relationshipEntities, setRelationshipEntities] = useLocalState<Array<{ id: string; type: string; label: string; verified: boolean }>>("example-wealth.relationship.entities", []);
  const [knowledgeRecords, setKnowledgeRecords] = useLocalState<Array<{ id: string; title: string; summary: string; sourceReference: string; approved: boolean }>>("example-wealth.knowledge.records", []);
  const [savedEnterpriseRuns, setSavedEnterpriseRuns] = useLocalState<Array<{ id: string; opportunityCount: number; estimatedExposureZar: number | null }>>("example-wealth.planning.enterprise-runs", []);
  const [persistenceNotice, setPersistenceNotice] = useState<{ kind: "pending" | "success" | "error"; message: string } | null>(null);

  async function persistHostedRecords(records: HostedRecord[], label: string) {
    if (process.env.NEXT_PUBLIC_STUDIO_STORAGE_MODE !== "supabase") return;
    setPersistenceNotice({ kind: "pending", message: `Saving ${label} to the configured account…` });
    try {
      const responses = await Promise.all(records.map(({ path, payload }) =>
        fetch(path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
      ));
      if (responses.some((response) => !response.ok)) {
        setPersistenceNotice({
          kind: "error",
          message: `Hosted save failed for ${label}. The local illustration remains available on this page; no hosted save is confirmed.`,
        });
        return;
      }
      setPersistenceNotice({ kind: "success", message: `${label} saved to the authenticated account.` });
    } catch {
      setPersistenceNotice({
        kind: "error",
        message: `Hosted save failed for ${label}. The local illustration remains available on this page; no hosted save is confirmed.`,
      });
    }
  }

  const twinResult = useMemo(() => simulateFinancialTwin({
    startingAmount: present,
    monthlyContribution: monthly,
    monthlyWithdrawal: 0,
    horizonYears: years,
    nominalReturnPercent: rate,
    inflationPercent: inflation,
    volatilityPercent: volatility,
    targetAmount: target,
    seed,
    iterations: 500,
    lifeEvents,
  }), [inflation, lifeEvents, monthly, present, rate, seed, target, volatility, years]);

  const consequenceNodes = useMemo<ConsequenceNode[]>(() => [
    { id: "cash", type: "cash_flow", label: "Monthly cash flow", evidence: [{ kind: "assumption", label: "Contribution entered by the user" }] },
    { id: "portfolio", type: "investment", label: "Investment portfolio", evidence: [{ kind: "assumption", label: "Illustrative starting amount" }] },
    { id: "goal", type: "goal", label: "Financial goal", evidence: [{ kind: "assumption", label: "Target amount entered by the user" }] },
    { id: "plan", type: "financial_plan", label: "Current plan", evidence: [{ kind: "calculated", label: "Deterministic twin result" }] },
  ], []);
  const consequenceEdges = useMemo<ConsequenceEdge[]>(() => [
    { id: "funds", source: "cash", target: "portfolio", relationship: "funds", explanation: "Monthly contributions enter the illustrated investment value.", confidence: "calculated" },
    { id: "supports", source: "portfolio", target: "goal", relationship: "depends_on", explanation: "The target goal is compared with simulated portfolio values.", confidence: "calculated" },
    { id: "plan-goal", source: "plan", target: "goal", relationship: "constrains", explanation: "Plan assumptions constrain the illustrated goal outcome.", confidence: "calculated" },
  ], []);
  const consequence = useMemo(
    () => analyseConsequences(consequenceNodes, consequenceEdges, { kind: "contribution", label: "Change monthly contribution", amount: monthly }),
    [consequenceEdges, consequenceNodes, monthly],
  );
  const parallelPlans = useMemo(() => {
    const base = {
      startingAmount: present,
      monthlyContribution: monthly,
      monthlyWithdrawal: 0,
      horizonYears: years,
      inflationPercent: inflation,
      targetAmount: target,
      seed,
      iterations: 500,
      lifeEvents,
    };
    return compareTwinPlans([
      { id: "cautious", name: "Cautious", assumptions: { ...base, nominalReturnPercent: 4, volatilityPercent: 14 }, result: simulateFinancialTwin({ ...base, nominalReturnPercent: 4, volatilityPercent: 14 }) },
      { id: "base", name: "Base", assumptions: { ...base, nominalReturnPercent: rate, volatilityPercent: volatility }, result: simulateFinancialTwin({ ...base, nominalReturnPercent: rate, volatilityPercent: volatility }) },
      { id: "higher", name: "Higher assumption", assumptions: { ...base, nominalReturnPercent: 10, volatilityPercent: 18 }, result: simulateFinancialTwin({ ...base, nominalReturnPercent: 10, volatilityPercent: 18 }) },
    ]);
  }, [inflation, lifeEvents, monthly, present, rate, seed, target, volatility, years]);
  const riskFindings = useMemo(() => analyseHoldingRisk(demoHoldings), [demoHoldings]);
  const opportunities = useMemo(() => orchestrateOpportunity({
    verifiedMonthlySurplusZar: monthlySurplus,
    targetShortfallZar: target > twinResult.percentile50 ? target - twinResult.percentile50 : 0,
    taxAllowanceRemainingZar: taxAllowance,
  }), [monthlySurplus, target, taxAllowance, twinResult.percentile50]);
  const crisisResult = useMemo(() => rehearseCrisis(target, {
    marketShockPercent: 20,
    inflationShockPercent: 10,
    currencyShockPercent: 5,
    liquidityShockPercent: 10,
  }), [target]);
  const discoveryEvaluation = useMemo(() => evaluateInnovationProposal({
    existsRepository: false,
    existsCompetitor: true,
    materiallyDifferentiated: true,
    implementationReady: true,
    meaningfulValue: true,
    defensibleIpAssessment: "Potentially defensible implementation workflow; no patentability conclusion.",
  }), []);

  const nominal = useMemo(() => {
    const r = rate / 100 / 12;
    const months = years * 12;
    return present * Math.pow(1 + r, months) + (r === 0 ? monthly * months : monthly * ((Math.pow(1 + r, months) - 1) / r));
  }, [monthly, present, rate, years]);

  const real = nominal / Math.pow(1 + inflation / 100, years);

  function saveScenario() {
    const scenario = { id: `scenario-${Date.now()}`, name, present, monthly, years, rate, result: nominal };
    setScenarios((current) => [
      ...current,
      scenario,
    ]);
    void persistHostedRecords([{
      path: "/api/wealth-os/scenarios",
      payload: {
          name,
          assumptions: { present, monthly, years, nominalRate: rate, inflation },
          result: { nominal, realInflationAdjusted: real },
      },
    }], "scenario");
  }

  function exportScenarios() {
    const blob = new Blob([JSON.stringify({ illustrative: true, assumptions: { present, monthly, years, nominalRate: rate, inflation }, scenarios }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "wealth-planning-illustration.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function addLifeEvent() {
    setLifeEvents((current) => [
      ...current,
      {
        id: `event-${Date.now()}`,
        year: lifeEventYear,
        type: "cash_outflow",
        amount: lifeEventAmount,
        confidence: "uncertain",
        source: "Adviser-entered hypothetical; not verified client fact",
      },
    ]);
  }

  function saveTwinRun() {
    const run = {
      id: `twin-${Date.now()}`,
      name: `${name} digital twin`,
      result: twinResult,
      assumptions: {
        startingAmount: present,
        monthlyContribution: monthly,
        monthlyWithdrawal: 0,
        horizonYears: years,
        nominalReturnPercent: rate,
        inflationPercent: inflation,
        volatilityPercent: volatility,
        targetAmount: target,
        seed,
        iterations: 500,
        lifeEvents,
        calculationVersion: FINANCIAL_TWIN_VERSION,
      },
    };
    setTwinRuns((current) => [run, ...current].slice(0, 20));
    void persistHostedRecords([{
      path: "/api/wealth-os/intelligence",
      payload: {
          name: run.name,
          assumptions: run.assumptions,
          observedData: { source: "manual-illustrative-entry", liveDataImported: false },
      },
    }], "financial twin run");
  }

  function addDecisionContext() {
    setDecisionHistory((current) => [
      ...current,
      {
        id: `decision-${Date.now()}`,
        title: decisionTitle,
        events: [{
          type: "context",
          payload: {
            context: decisionContext,
            assumptions: {
              startingAmount: present,
              monthlyContribution: monthly,
              horizonYears: years,
              nominalReturnPercent: rate,
              inflationPercent: inflation,
              seed,
              calculationVersion: FINANCIAL_TWIN_VERSION,
            },
            alternatives: ["Maintain contribution", "Increase contribution", "Defer change"],
            humanApprovalRequired: true,
            dataSource: "Fictional browser-local illustration",
          },
          createdAt: new Date().toISOString(),
        }],
      },
    ]);
    void persistHostedRecords([{
      path: "/api/wealth-os/decisions",
      payload: {
          title: decisionTitle,
          eventType: "context",
          payload: { context: decisionContext, calculationVersion: FINANCIAL_TWIN_VERSION, humanApprovalRequired: true },
      },
    }], "decision context");
  }

  function loadFictionalRiskDemo() {
    setDemoHoldings([
      { id: "demo-equity", name: "Fictional equity fund", assetClass: "Equity", currency: "ZAR", liquidity: "daily", valueZar: 600000 },
      { id: "demo-private", name: "Fictional private asset", assetClass: "Private", currency: "ZAR", liquidity: "restricted", valueZar: 300000 },
      { id: "demo-cash", name: "Fictional cash account", assetClass: "Cash", currency: "ZAR", liquidity: "daily", valueZar: 100000 },
    ]);
  }

  function saveEnterpriseIllustrations() {
    const localOpportunities = orchestrateOpportunity({
      verifiedMonthlySurplusZar: monthlySurplus,
      targetShortfallZar: target > twinResult.percentile50 ? target - twinResult.percentile50 : 0,
      taxAllowanceRemainingZar: taxAllowance,
    });
    const localCrisis = rehearseCrisis(target, {
      marketShockPercent: 20,
      inflationShockPercent: 10,
      currencyShockPercent: 5,
      liquidityShockPercent: 10,
    });
    setSavedEnterpriseRuns((current) => [{
      id: `enterprise-${Date.now()}`,
      opportunityCount: localOpportunities.length,
      estimatedExposureZar: localCrisis?.estimatedExposureZar ?? null,
    }, ...current].slice(0, 20));
    void persistHostedRecords([
      {
        path: "/api/wealth-os/enterprise",
        payload: {
          kind: "opportunity",
          input: {
            verifiedMonthlySurplusZar: monthlySurplus,
            targetShortfallZar: target > twinResult.percentile50 ? target - twinResult.percentile50 : 0,
            taxAllowanceRemainingZar: taxAllowance,
          },
        },
      },
      {
        path: "/api/wealth-os/enterprise",
        payload: {
          kind: "crisis",
          input: {
            name: "Illustrative combined shock",
            portfolioZar: target,
            assumptions: { marketShockPercent: 20, inflationShockPercent: 10, currencyShockPercent: 5, liquidityShockPercent: 10 },
          },
        },
      },
    ], "opportunity and crisis scenarios");
  }

  function addFictionalRelationship() {
    setRelationshipEntities((current) => [
      ...current,
      { id: `entity-${Date.now()}`, type: "beneficiary", label: "Fictional beneficiary — needs verification", verified: false },
    ]);
  }

  function addApprovedKnowledgeDemo() {
    setKnowledgeRecords((current) => [
      ...current,
      {
        id: `knowledge-${Date.now()}`,
        title: "Approved review process",
        summary: "Every opportunity requires adviser evidence review and explicit human approval.",
        sourceReference: "WEALTH OS Innovation Register / approved platform rule",
        approved: true,
      },
    ]);
  }

  async function exportPdf() {
    await downloadPdfReport(
      "wealth-planning-illustration.pdf",
      "WEALTH OS",
      "Illustrative wealth planning scenario",
      [
        { title: "Assumptions", lines: [
          `Starting amount: R ${present.toLocaleString("en-ZA")}`,
          `Monthly contribution: R ${monthly.toLocaleString("en-ZA")}`,
          `Time horizon: ${years} years`,
          `Nominal annual return: ${rate}%`,
          `Inflation assumption: ${inflation}%`,
        ] },
        { title: "Illustrative result", lines: [
          `Nominal result: R ${nominal.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`,
          `Inflation-adjusted value: R ${real.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`,
        ] },
        { title: "Formula", lines: ["Future value uses monthly compounding. Taxes, fees, timing and market volatility are not included."] },
      ],
      "This is an illustrative local demonstration, not regulated financial advice or a guarantee of investment outcomes.",
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-12 lg:px-8">
      <p className="text-xs font-bold tracking-[0.18em] text-[var(--accent)]">WEALTH PLANNING LAB</p>
      <h1 className="mt-2 text-3xl font-semibold">Illustrative growth scenarios</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">Fictional calculations only. Results are not forecasts, guarantees or personalised advice.</p>
      {persistenceNotice && (
        <p
          className={`mt-4 max-w-3xl text-sm ${persistenceNotice.kind === "error" ? "text-red-700 dark:text-red-300" : "text-[var(--muted)]"}`}
          role={persistenceNotice.kind === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          {persistenceNotice.message}
        </p>
      )}

      <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_1.25fr]">
        <section className="glass rounded-3xl p-5 sm:p-7">
          <h2 className="text-lg font-semibold">Assumptions</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm">Starting amount (R)<input type="number" value={present} onChange={(event) => setPresent(Number(event.target.value))} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3" /></label>
            <label className="text-sm">Monthly contribution (R)<input type="number" value={monthly} onChange={(event) => setMonthly(Number(event.target.value))} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3" /></label>
            <label className="text-sm">Time horizon (years)<input type="number" min={1} value={years} onChange={(event) => setYears(Number(event.target.value))} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3" /></label>
            <label className="text-sm">Nominal annual return (%)<input type="number" value={rate} onChange={(event) => setRate(Number(event.target.value))} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3" /></label>
            <label className="text-sm sm:col-span-2">Inflation assumption (%)<input type="number" value={inflation} onChange={(event) => setInflation(Number(event.target.value))} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3" /></label>
          </div>
          <details className="mt-5 rounded-xl border border-[var(--border)] p-4 text-xs leading-6 text-[var(--muted)]"><summary className="cursor-pointer font-semibold text-[var(--foreground)]">Formula and limitations</summary><p className="mt-3">Future value = P(1+r/m)<sup>mt</sup> + C × ((1+r/m)<sup>mt</sup>-1)/(r/m), with monthly compounding. Inflation-adjusted value = nominal result ÷ (1+i)<sup>t</sup>. Taxes, fees, timing and market volatility are not included.</p></details>
        </section>

        <section className="glass rounded-3xl p-5 sm:p-7">
          <p className="text-sm text-[var(--muted)]">Illustrative nominal result</p>
          <p className="mt-2 text-4xl font-semibold">R {nominal.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}</p>
          <p className="mt-4 text-sm text-[var(--muted)]">Estimated purchasing power after inflation</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--accent)]">R {real.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}</p>
          <div className="mt-6 h-3 overflow-hidden rounded-full bg-[var(--border)]"><div className="h-full rounded-full bg-[var(--accent-fill)]" style={{ width: `${Math.min(100, Math.max(8, nominal / 100000))}%` }} /></div>
          <label className="mt-6 block text-sm">Scenario name<input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3" /></label>
          <div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={saveScenario} className="min-h-11 rounded-full bg-[var(--accent-fill)] px-5 text-sm font-bold text-[var(--button-text)]">Save scenario</button><button type="button" onClick={exportScenarios} className="min-h-11 rounded-full border border-[var(--border)] px-5 text-sm font-semibold">Export JSON</button><button type="button" onClick={() => void exportPdf()} className="min-h-11 rounded-full border border-[var(--border)] px-5 text-sm font-semibold">Export branded PDF</button></div>
        </section>
      </div>

      <section className="glass mt-5 rounded-3xl p-5 sm:p-7">
        <h2 className="text-lg font-semibold">Saved comparisons</h2>
        {scenarios.length ? <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs text-[var(--muted)]"><tr><th className="py-3">Scenario</th><th>Rate</th><th>Years</th><th>Monthly</th><th>Illustrative result</th></tr></thead><tbody>{scenarios.map((scenario) => <tr key={scenario.id} className="border-t border-[var(--border)]"><td className="py-3 pr-4 font-semibold">{scenario.name}</td><td>{scenario.rate}%</td><td>{scenario.years}</td><td>R {scenario.monthly.toLocaleString("en-ZA")}</td><td>R {scenario.result.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}</td></tr>)}</tbody></table></div> : <p className="mt-3 text-sm text-[var(--muted)]">No saved scenarios yet.</p>}
      </section>

      <section className="glass mt-5 rounded-3xl p-5 sm:p-7" aria-labelledby="financial-twin-heading">
        <p className="text-xs font-bold tracking-[0.16em] text-[var(--accent)]">FINANCIAL FUTURE DIGITAL TWIN</p>
        <h2 id="financial-twin-heading" className="mt-2 text-2xl font-semibold">Probability ranges, not promises</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          The result uses {FINANCIAL_TWIN_VERSION}, a seeded monthly simulation. All displayed values are fictional illustrations.
          Life events remain uncertain until a verified human source is attached.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm">Annual volatility (%)<input type="number" min={0} max={100} value={volatility} onChange={(event) => setVolatility(Number(event.target.value))} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3" /></label>
          <label className="text-sm">Reproducible seed<input type="number" min={0} max={2147483647} value={seed} onChange={(event) => setSeed(Number(event.target.value))} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3" /></label>
          <label className="text-sm">Illustrative target (R)<input type="number" min={0} value={target} onChange={(event) => setTarget(Number(event.target.value))} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3" /></label>
          <div className="rounded-xl border border-[var(--border)] p-4"><p className="text-xs text-[var(--muted)]">Target estimate success</p><p className="mt-2 text-3xl font-semibold">{twinResult.targetSuccessPercent.toFixed(1)}%</p></div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-[var(--border)] p-4"><p className="text-xs text-[var(--muted)]">Downside (10th percentile)</p><p className="mt-2 text-xl font-semibold">R {twinResult.percentile10.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}</p><p className="mt-1 text-xs text-[var(--muted)]">Real value: R {twinResult.realPercentile10.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}</p></article>
          <article className="rounded-2xl border border-[var(--border)] p-4"><p className="text-xs text-[var(--muted)]">Median (50th percentile)</p><p className="mt-2 text-xl font-semibold">R {twinResult.percentile50.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}</p><p className="mt-1 text-xs text-[var(--muted)]">Real value: R {twinResult.realPercentile50.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}</p></article>
          <article className="rounded-2xl border border-[var(--border)] p-4"><p className="text-xs text-[var(--muted)]">Upper (90th percentile)</p><p className="mt-2 text-xl font-semibold">R {twinResult.percentile90.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}</p><p className="mt-1 text-xs text-[var(--muted)]">Real value: R {twinResult.realPercentile90.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}</p></article>
        </div>
        <div className="mt-5 flex flex-wrap items-end gap-3 rounded-2xl border border-[var(--border)] p-4">
          <label className="text-sm">Hypothetical year<input type="number" min={0} max={years} value={lifeEventYear} onChange={(event) => setLifeEventYear(Number(event.target.value))} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3" /></label>
          <label className="text-sm">Hypothetical outflow (R)<input type="number" min={0} value={lifeEventAmount} onChange={(event) => setLifeEventAmount(Number(event.target.value))} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3" /></label>
          <button type="button" onClick={addLifeEvent} className="min-h-11 rounded-full border border-[var(--border)] px-5 text-sm font-semibold">Add uncertain event</button>
        </div>
        {lifeEvents.length ? <p className="mt-3 text-sm text-[var(--muted)]">{lifeEvents.length} uncertain hypothetical life event{lifeEvents.length === 1 ? "" : "s"} included.</p> : null}
        <button type="button" onClick={saveTwinRun} className="mt-5 min-h-11 rounded-full bg-[var(--accent-fill)] px-5 text-sm font-bold text-[var(--button-text)]">Save versioned twin run</button>
      </section>

      <section className="glass mt-5 rounded-3xl p-5 sm:p-7" aria-labelledby="consequence-heading">
        <p className="text-xs font-bold tracking-[0.16em] text-[var(--accent)]">FINANCIAL CONSEQUENCE ENGINE</p>
        <h2 id="consequence-heading" className="mt-2 text-xl font-semibold">Contribution change impact</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">The proposed change is human-review required; no transaction or advice is generated automatically.</p>
        <div className="mt-4 flex flex-wrap gap-2">{consequence.affectedNodes.map((node) => <span key={node.id} className="rounded-full border border-[var(--border)] px-3 py-2 text-xs font-semibold">{node.type.replace("_", " ")} · {node.label}</span>)}</div>
        <ul className="mt-4 space-y-3">{consequence.explanations.map((explanation) => <li key={explanation.edgeId} className="rounded-2xl border border-[var(--border)] p-4"><p className="text-sm">{explanation.explanation}</p><p className="mt-2 text-xs font-semibold text-[var(--muted)]">Relationship: {explanation.relationship} · Confidence: {explanation.confidence}</p></li>)}</ul>
      </section>

      <section className="glass mt-5 rounded-3xl p-5 sm:p-7" aria-labelledby="parallel-heading">
        <p className="text-xs font-bold tracking-[0.16em] text-[var(--accent)]">PARALLEL UNIVERSE PLANNING</p>
        <h2 id="parallel-heading" className="mt-2 text-xl font-semibold">Competing plan comparison</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-[var(--muted)]"><tr><th className="py-3">Plan</th><th>Downside</th><th>Median</th><th>Upper</th><th>Target success</th></tr></thead>
            <tbody>{parallelPlans.map((plan) => <tr key={plan.id} className="border-t border-[var(--border)]"><td className="py-3 pr-4 font-semibold">{plan.name}</td><td>R {plan.downside.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}</td><td>R {plan.median.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}</td><td>R {plan.upper.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}</td><td>{plan.successPercent.toFixed(1)}%</td></tr>)}</tbody>
          </table>
        </div>
        <p className="mt-3 text-xs leading-5 text-[var(--muted)]">Trade-offs: cautious assumptions increase certainty of a lower estimate; higher assumptions increase potential upside and uncertainty. These are illustrative, not recommendations.</p>
      </section>

      <section className="glass mt-5 rounded-3xl p-5 sm:p-7" aria-labelledby="decision-heading">
        <p className="text-xs font-bold tracking-[0.16em] text-[var(--accent)]">DECISION TIME MACHINE</p>
        <h2 id="decision-heading" className="mt-2 text-xl font-semibold">Append-only decision context</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm">Decision title<input value={decisionTitle} onChange={(event) => setDecisionTitle(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3" /></label>
          <label className="text-sm">Context<textarea value={decisionContext} onChange={(event) => setDecisionContext(event.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3" /></label>
        </div>
        <button type="button" onClick={addDecisionContext} className="mt-4 min-h-11 rounded-full bg-[var(--accent-fill)] px-5 text-sm font-bold text-[var(--button-text)]">Record decision context</button>
        {decisionHistory.length ? <ul className="mt-5 space-y-3">{decisionHistory.map((decision) => <li key={decision.id} className="rounded-2xl border border-[var(--border)] p-4"><p className="font-semibold">{decision.title}</p>{decision.events.map((event) => <p key={event.createdAt} className="mt-2 text-xs text-[var(--muted)]">{event.type} · {event.createdAt} · alternatives and assumptions preserved</p>)}</li>)}</ul> : <p className="mt-4 text-sm text-[var(--muted)]">No decision context has been recorded.</p>}
      </section>

      <section className="glass mt-5 rounded-3xl p-5 sm:p-7" aria-labelledby="risk-heading">
        <p className="text-xs font-bold tracking-[0.16em] text-[var(--accent)]">INVISIBLE RISK DISCOVERY</p>
        <h2 id="risk-heading" className="mt-2 text-xl font-semibold">Evidence-first holding risk</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">No holding data is inferred or imported. Load clearly labelled fictional holdings to demonstrate concentration, currency and liquidity analysis.</p>
        <button type="button" onClick={loadFictionalRiskDemo} className="mt-4 min-h-11 rounded-full border border-[var(--border)] px-5 text-sm font-semibold">Load fictional demo holdings</button>
        {riskFindings.length ? <ul className="mt-5 space-y-3">{riskFindings.map((finding) => <li key={`${finding.type}-${finding.label}`} className="rounded-2xl border border-[var(--border)] p-4"><p className="font-semibold">{finding.label}</p><p className="mt-1 text-sm text-[var(--muted)]">{finding.evidence}</p><p className="mt-2 text-xs">Confidence: {finding.confidence} · {finding.percent.toFixed(1)}%</p></li>)}</ul> : demoHoldings.length ? <p className="mt-4 text-sm text-[var(--muted)]">No configured concentration, currency or liquidity threshold was triggered.</p> : null}
      </section>

      <section className="glass mt-5 rounded-3xl p-5 sm:p-7" aria-labelledby="relationship-heading">
        <p className="text-xs font-bold tracking-[0.16em] text-[var(--accent)]">WEALTH RELATIONSHIP GRAPH</p>
        <h2 id="relationship-heading" className="mt-2 text-xl font-semibold">Household and entity relationships</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">No personal relationships are inferred. Add only verified or clearly unverified entities.</p>
        <button type="button" onClick={addFictionalRelationship} className="mt-4 min-h-11 rounded-full border border-[var(--border)] px-5 text-sm font-semibold">Add unverified fictional beneficiary</button>
        {relationshipEntities.length ? <ul className="mt-4 space-y-2">{relationshipEntities.map((entity) => <li key={entity.id} className="rounded-xl border border-[var(--border)] p-3"><p className="text-sm font-semibold">{entity.label}</p><p className="mt-1 text-xs text-[var(--muted)]">Type: {entity.type} · Verification: {entity.verified ? "verified" : "missing human verification"}</p></li>)}</ul> : <p className="mt-4 text-sm text-[var(--muted)]">No relationship entities recorded.</p>}
      </section>

      <section className="glass mt-5 rounded-3xl p-5 sm:p-7" aria-labelledby="knowledge-heading">
        <p className="text-xs font-bold tracking-[0.16em] text-[var(--accent)]">WEALTH INSTITUTION BRAIN</p>
        <h2 id="knowledge-heading" className="mt-2 text-xl font-semibold">Permission-aware approved knowledge</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">Only explicitly approved records are eligible for this local illustration. Answers must retain source references.</p>
        <button type="button" onClick={addApprovedKnowledgeDemo} className="mt-4 min-h-11 rounded-full border border-[var(--border)] px-5 text-sm font-semibold">Add approved platform record</button>
        {knowledgeRecords.length ? <ul className="mt-4 space-y-2">{knowledgeRecords.filter((record) => record.approved).map((record) => <li key={record.id} className="rounded-xl border border-[var(--border)] p-3"><p className="text-sm font-semibold">{record.title}</p><p className="mt-1 text-sm text-[var(--muted)]">{record.summary}</p><p className="mt-2 text-xs">Source: {record.sourceReference}</p></li>)}</ul> : <p className="mt-4 text-sm text-[var(--muted)]">No approved knowledge records available.</p>}
      </section>

      <section className="glass mt-5 rounded-3xl p-5 sm:p-7" aria-labelledby="opportunity-heading">
        <p className="text-xs font-bold tracking-[0.16em] text-[var(--accent)]">FINANCIAL OPPORTUNITY ORCHESTRATOR</p>
        <h2 id="opportunity-heading" className="mt-2 text-xl font-semibold">Human-review opportunities</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm">Verified monthly surplus (R)<input type="number" min={0} value={monthlySurplus ?? ""} onChange={(event) => setMonthlySurplus(event.target.value === "" ? null : Number(event.target.value))} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3" /></label>
          <label className="text-sm">Reported remaining tax allowance (R)<input type="number" min={0} value={taxAllowance ?? ""} onChange={(event) => setTaxAllowance(event.target.value === "" ? null : Number(event.target.value))} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3" /></label>
        </div>
        {opportunities.length ? <ul className="mt-5 space-y-3">{opportunities.map((opportunity) => <li key={opportunity.title} className="rounded-2xl border border-[var(--border)] p-4"><p className="font-semibold">{opportunity.title}</p><p className="mt-2 text-sm">{opportunity.rationale}</p><p className="mt-3 text-xs text-[var(--muted)]">Evidence: {opportunity.evidence.join(" ")}</p><p className="mt-2 text-xs text-[var(--muted)]">Missing: {opportunity.missingInformation.join("; ")}</p><p className="mt-2 text-xs">Benefits: {opportunity.benefits.join("; ")}</p><p className="mt-1 text-xs">Risks: {opportunity.risks.join("; ")}</p><p className="mt-3 text-xs font-bold">Status: requires human review — no execution</p></li>)}</ul> : <p className="mt-4 text-sm text-[var(--muted)]">No opportunity is triggered by the currently reported values.</p>}
      </section>

      <section className="glass mt-5 rounded-3xl p-5 sm:p-7" aria-labelledby="crisis-heading">
        <p className="text-xs font-bold tracking-[0.16em] text-[var(--accent)]">GLOBAL CRISIS REHEARSAL</p>
        <h2 id="crisis-heading" className="mt-2 text-xl font-semibold">Illustrative institution-style shock</h2>
        {crisisResult ? <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><article className="rounded-2xl border border-[var(--border)] p-4"><p className="text-xs text-[var(--muted)]">Estimated adjusted exposure</p><p className="mt-2 text-xl font-semibold">R {crisisResult.estimatedExposureZar.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}</p></article><article className="rounded-2xl border border-[var(--border)] p-4"><p className="text-xs text-[var(--muted)]">Market impact</p><p className="mt-2 text-xl font-semibold">R {crisisResult.shocks.marketImpact.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}</p></article><article className="rounded-2xl border border-[var(--border)] p-4"><p className="text-xs text-[var(--muted)]">Currency impact</p><p className="mt-2 text-xl font-semibold">R {crisisResult.shocks.currencyImpact.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}</p></article><article className="rounded-2xl border border-[var(--border)] p-4"><p className="text-xs text-[var(--muted)]">Liquidity impact</p><p className="mt-2 text-xl font-semibold">R {crisisResult.shocks.liquidityImpact.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}</p></article></div> : null}
        <p className="mt-4 text-xs leading-5 text-[var(--muted)]">Hypothetical simulation only: 20% market, 10% inflation, 5% currency and 10% liquidity assumptions. This linear demo does not model correlations or contagion.</p>
        <button type="button" onClick={saveEnterpriseIllustrations} className="mt-4 min-h-11 rounded-full border border-[var(--border)] px-5 text-sm font-semibold">Save illustrative review</button>
        {savedEnterpriseRuns.length ? (
          <ul className="mt-4 space-y-2" aria-label="Saved illustrative enterprise reviews">
            {savedEnterpriseRuns.map((run) => (
              <li key={run.id} className="rounded-xl border border-[var(--border)] p-3 text-sm">
                Review saved locally · {run.opportunityCount} candidate opportunities · estimated hypothetical adjusted exposure: {run.estimatedExposureZar === null ? "unavailable" : `R ${run.estimatedExposureZar.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`}
              </li>
            ))}
          </ul>
        ) : <p className="mt-3 text-sm text-[var(--muted)]">No illustrative review has been saved yet.</p>}
      </section>

      <section className="glass mt-5 rounded-3xl p-5 sm:p-7" aria-labelledby="discovery-heading">
        <p className="text-xs font-bold tracking-[0.16em] text-[var(--accent)]">NOVEL FEATURE DISCOVERY LAB</p>
        <h2 id="discovery-heading" className="mt-2 text-xl font-semibold">Traceable evidence-and-explanation workflow</h2>
        <p className="mt-3 text-sm">Proposal status: <strong>{discoveryEvaluation.proceed ? "Proceed to controlled implementation" : "Hold for evidence"}</strong></p>
        <p className="mt-2 text-sm text-[var(--muted)]">Score: {discoveryEvaluation.score}/5 · {discoveryEvaluation.defensibility}</p>
        <details className="mt-4 rounded-xl border border-[var(--border)] p-4 text-sm"><summary className="cursor-pointer font-semibold">Evaluation criteria</summary><ul className="mt-3 list-disc space-y-1 pl-5 text-[var(--muted)]"><li>Already exists in repository: no</li><li>Comparable capability exists in competitors: yes</li><li>Materially differentiated: traceable, reproducible and governance-first</li><li>Implemented and tested: controlled implementation stage</li><li>Meaningful adviser value: explicit evidence and human review</li></ul></details>
      </section>

      <section className="glass mt-5 rounded-3xl p-5 sm:p-7">
        <h2 className="text-lg font-semibold">Saved digital twin runs</h2>
        {twinRuns.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-[var(--muted)]"><tr><th className="py-3">Run</th><th>Downside</th><th>Median</th><th>Upper</th><th>Target success</th></tr></thead>
              <tbody>{twinRuns.map((run) => <tr key={run.id} className="border-t border-[var(--border)]"><td className="py-3 pr-4 font-semibold">{run.name}</td><td>R {run.result.percentile10.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}</td><td>R {run.result.percentile50.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}</td><td>R {run.result.percentile90.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}</td><td>{run.result.targetSuccessPercent.toFixed(1)}%</td></tr>)}</tbody>
            </table>
          </div>
        ) : <p className="mt-3 text-sm text-[var(--muted)]">No versioned twin runs have been saved yet.</p>}
      </section>
    </main>
  );
}
