import { describe, expect, it } from "vitest";
import { analyseHoldingRisk, compareTwinPlans } from "./plan-risk";
import { simulateFinancialTwin, type TwinAssumptions } from "./twin";

const assumptions: TwinAssumptions = {
  startingAmount: 100000,
  monthlyContribution: 2000,
  monthlyWithdrawal: 0,
  horizonYears: 10,
  nominalReturnPercent: 7,
  inflationPercent: 5,
  volatilityPercent: 12,
  targetAmount: 500000,
  seed: 42,
  iterations: 500,
  lifeEvents: [],
};

describe("parallel plans and holding risk", () => {
  it("compares stable plan outputs without mutating assumptions", () => {
    const result = simulateFinancialTwin(assumptions);
    const comparison = compareTwinPlans([{ id: "base", name: "Base", assumptions, result }]);
    expect(comparison).toHaveLength(1);
    expect(comparison[0].median).toBe(result.percentile50);
  });

  it("finds concentration, currency and liquidity exposures", () => {
    const findings = analyseHoldingRisk([
      { id: "1", name: "Equity A", assetClass: "Equity", currency: "ZAR", liquidity: "daily", valueZar: 600000 },
      { id: "2", name: "Equity B", assetClass: "Equity", currency: "ZAR", liquidity: "monthly", valueZar: 300000 },
      { id: "3", name: "Cash", assetClass: "Cash", currency: "ZAR", liquidity: "daily", valueZar: 100000 },
    ]);
    expect(findings.some((finding) => finding.type === "concentration")).toBe(true);
    expect(findings.some((finding) => finding.type === "currency_exposure")).toBe(true);
    expect(findings.some((finding) => finding.type === "liquidity_dependency")).toBe(true);
  });

  it("returns no risk findings for empty or invalid data", () => {
    expect(analyseHoldingRisk([])).toEqual([]);
    expect(() => analyseHoldingRisk([
      { id: "invalid", name: "Invalid", assetClass: "Cash", currency: "ZAR", liquidity: "daily", valueZar: -1 },
    ])).toThrow(/valid, non-negative/);
    expect(() => analyseHoldingRisk([
      { id: "large-a", name: "A", assetClass: "Cash", currency: "ZAR", liquidity: "daily", valueZar: Number.MAX_VALUE },
      { id: "large-b", name: "B", assetClass: "Cash", currency: "ZAR", liquidity: "daily", valueZar: Number.MAX_VALUE },
    ])).toThrow(/supported numerical range/);
  });
});
