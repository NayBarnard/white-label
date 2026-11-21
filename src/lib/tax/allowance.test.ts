import { describe, expect, it } from "vitest";
import {
  calculateAllowance,
  resolveAllowanceRules,
  type AllowanceRule,
} from "@/lib/tax/allowance";

const rule: AllowanceRule = {
  product_code: "TFSA",
  tax_year_label: "2026/2027",
  period_start: "2026-03-01",
  period_end: "2027-02-28",
  annual_limit: 46_000,
  lifetime_limit: 500_000,
  currency: "ZAR",
  over_contribution_penalty_rate: 0.4,
};

describe("calculateAllowance", () => {
  it("includes both sources at inclusive tax-year boundaries and estimates excess penalty", () => {
    const result = calculateAllowance(rule, [
      { amount: 40_000, contribution_date: "2026-03-01", source: "INTERNAL_PORTFOLIO" },
      { amount: 10_000, contribution_date: "2027-02-28", source: "EXTERNAL_DECLARED" },
      { amount: 900, contribution_date: "2027-03-01", source: "EXTERNAL_DECLARED" },
    ]);

    expect(result.annual_contributed).toBe(50_000);
    expect(result.annual_remaining_headroom).toBe(0);
    expect(result.annual_utilization_pct).toBeCloseTo(108.6956);
    expect(result.status).toBe("OVER_CONTRIBUTED");
    expect(result.internal_annual_contributed).toBe(40_000);
    expect(result.external_annual_contributed).toBe(10_000);
    expect(result.annual_excess).toBe(4_000);
    expect(result.lifetime_excess).toBe(0);
    expect(result.estimated_penalty).toBe(1_600);
    expect(result.lifetime_contributed).toBe(50_900);
  });

  it("treats 80% and 100% as approaching and reached, without inventing a lifetime cap", () => {
    expect(calculateAllowance({ ...rule, lifetime_limit: null }, [
      { amount: 36_800, contribution_date: "2026-03-02", source: "INTERNAL_PORTFOLIO" },
    ]).status).toBe("APPROACHING_CAP");
    const atLimit = calculateAllowance({ ...rule, lifetime_limit: null }, [
      { amount: 46_000, contribution_date: "2026-03-02", source: "INTERNAL_PORTFOLIO" },
    ]);
    expect(atLimit.status).toBe("CAP_REACHED");
    expect(atLimit.lifetime_remaining_headroom).toBeNull();
  });

  it("uses the larger annual or lifetime excess for a conservative penalty estimate", () => {
    const result = calculateAllowance({ ...rule, annual_limit: 100_000 }, [
      { amount: 510_000, contribution_date: "2025-03-01", source: "EXTERNAL_DECLARED" },
    ]);
    expect(result.lifetime_excess).toBe(10_000);
    expect(result.estimated_penalty).toBe(4_000);
  });
});

describe("resolveAllowanceRules", () => {
  it("prefers tenant overrides and keeps system defaults for other years", () => {
    const result = resolveAllowanceRules("firm-one", [
      { ...rule, tenant_id: "default" },
      { ...rule, annual_limit: 50_000, tenant_id: "firm-one" },
      { ...rule, tax_year_label: "2025/2026", tenant_id: "default" },
    ]);
    expect(result).toHaveLength(2);
    expect(result.find((item) => item.tax_year_label === "2026/2027")?.annual_limit).toBe(50_000);
  });
});
