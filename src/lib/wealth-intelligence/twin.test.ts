import { describe, expect, it } from "vitest";
import { simulateFinancialTwin, validateTwinAssumptions, type TwinAssumptions } from "./twin";

const base: TwinAssumptions = {
  startingAmount: 100_000,
  monthlyContribution: 2_500,
  monthlyWithdrawal: 0,
  horizonYears: 10,
  nominalReturnPercent: 7,
  inflationPercent: 5,
  volatilityPercent: 12,
  targetAmount: 500_000,
  seed: 12345,
  iterations: 500,
  lifeEvents: [],
};

describe("financial twin deterministic simulation", () => {
  it("produces reproducible percentile ranges for identical assumptions", () => {
    const first = simulateFinancialTwin(base);
    const second = simulateFinancialTwin({ ...base, lifeEvents: [] });
    expect(first).toEqual(second);
  });

  it("returns ordered uncertainty ranges and bounded success", () => {
    const result = simulateFinancialTwin(base);
    expect(result.percentile10).toBeLessThanOrEqual(result.percentile50);
    expect(result.percentile50).toBeLessThanOrEqual(result.percentile90);
    expect(result.realPercentile10).toBeLessThanOrEqual(result.realPercentile50);
    expect(result.realPercentile50).toBeLessThanOrEqual(result.realPercentile90);
    expect(result.targetSuccessPercent).toBeGreaterThanOrEqual(0);
    expect(result.targetSuccessPercent).toBeLessThanOrEqual(100);
  });

  it("rejects unsafe or unsupported assumptions", () => {
    expect(validateTwinAssumptions({ ...base, horizonYears: 61 })).toBeNull();
    expect(validateTwinAssumptions({ ...base, iterations: 99 })).toBeNull();
    expect(validateTwinAssumptions({ ...base, volatilityPercent: 101 })).toBeNull();
    expect(validateTwinAssumptions({ ...base, horizonYears: 1.5 })).toBeNull();
    expect(validateTwinAssumptions({ ...base, lifeEvents: Array.from({ length: 1001 }, (_, index) => ({
      id: `event-${index}`,
      year: 1,
      type: "cash_inflow" as const,
      amount: 1,
      confidence: "uncertain" as const,
      source: "user input",
    })) })).toBeNull();
  });

  it("reports annual drawdowns rather than a full-horizon drawdown", () => {
    const result = simulateFinancialTwin({
      ...base,
      startingAmount: 100_000,
      monthlyContribution: 0,
      horizonYears: 1,
      nominalReturnPercent: 0,
      volatilityPercent: 0,
      targetAmount: 0,
    });
    expect(result.medianAnnualDrawdown).toBe(0);
  });

  it("records cash inflows and outflows as exact life-event assumptions", () => {
    const withoutEvent = simulateFinancialTwin(base);
    const withOutflow = simulateFinancialTwin({
      ...base,
      lifeEvents: [{
        id: "education",
        year: 3,
        type: "cash_outflow",
        amount: 100_000,
        confidence: "uncertain",
        source: "Adviser-entered hypothetical",
      }],
    });
    expect(withOutflow.percentile50).toBeLessThan(withoutEvent.percentile50);
  });
});
