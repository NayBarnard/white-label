import { simulateFinancialTwin, type TwinAssumptions } from "./twin";

export type PlanComparison = {
  id: string;
  name: string;
  assumptions: TwinAssumptions;
  result: ReturnType<typeof simulateFinancialTwin>;
};

export function compareTwinPlans(plans: PlanComparison[]) {
  return plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    median: plan.result.percentile50,
    downside: plan.result.percentile10,
    upper: plan.result.percentile90,
    successPercent: plan.result.targetSuccessPercent,
  }));
}

export type Holding = {
  id: string;
  name: string;
  assetClass: string;
  currency: string;
  liquidity: "daily" | "monthly" | "restricted";
  valueZar: number;
};

export function analyseHoldingRisk(holdings: Holding[]) {
  const total = holdings.reduce((sum, holding) => sum + holding.valueZar, 0);
  if (!Number.isFinite(total) || total <= 0) return [];
  const byClass = new Map<string, number>();
  const byCurrency = new Map<string, number>();
  for (const holding of holdings) {
    if (!Number.isFinite(holding.valueZar) || holding.valueZar < 0) continue;
    byClass.set(holding.assetClass, (byClass.get(holding.assetClass) ?? 0) + holding.valueZar);
    byCurrency.set(holding.currency, (byCurrency.get(holding.currency) ?? 0) + holding.valueZar);
  }
  const findings: Array<{ type: string; label: string; percent: number; evidence: string; confidence: "calculated" | "uncertain" }> = [];
  for (const [assetClass, value] of byClass) {
    const percent = (value / total) * 100;
    if (percent >= 40) findings.push({
      type: "concentration",
      label: `High ${assetClass} concentration`,
      percent,
      evidence: `${percent.toFixed(1)}% of reported illustrative value is assigned to ${assetClass}.`,
      confidence: "calculated",
    });
  }
  for (const [currency, value] of byCurrency) {
    const percent = (value / total) * 100;
    if (percent >= 70) findings.push({
      type: "currency_exposure",
      label: `High ${currency} currency exposure`,
      percent,
      evidence: `${percent.toFixed(1)}% of reported illustrative value is in ${currency}.`,
      confidence: "calculated",
    });
  }
  const restricted = holdings
    .filter((holding) => holding.liquidity !== "daily")
    .reduce((sum, holding) => sum + holding.valueZar, 0);
  const restrictedPercent = (restricted / total) * 100;
  if (restrictedPercent >= 20) findings.push({
    type: "liquidity_dependency",
    label: "Material limited-liquidity exposure",
    percent: restrictedPercent,
    evidence: `${restrictedPercent.toFixed(1)}% is marked monthly or restricted rather than daily.`,
    confidence: "uncertain",
  });
  return findings;
}
