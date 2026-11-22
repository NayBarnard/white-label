import { describe, expect, it } from "vitest";
import { evaluateInnovationProposal, orchestrateOpportunity, rehearseCrisis } from "./enterprise";

describe("enterprise intelligence modules", () => {
  it("creates evidence-based opportunities only from permitted values", () => {
    const opportunities = orchestrateOpportunity({
      verifiedMonthlySurplusZar: 5000,
      targetShortfallZar: 100000,
      taxAllowanceRemainingZar: 30000,
    });
    expect(opportunities).toHaveLength(3);
    for (const opportunity of opportunities) {
      expect(opportunity.evidence.length).toBeGreaterThan(0);
      expect(opportunity.risks.length).toBeGreaterThan(0);
      expect(opportunity.missingInformation.length).toBeGreaterThan(0);
    }
  });

  it("returns no opportunity for missing values", () => {
    expect(orchestrateOpportunity({ verifiedMonthlySurplusZar: null, targetShortfallZar: null, taxAllowanceRemainingZar: null })).toEqual([]);
  });

  it("labels crisis rehearsal as hypothetical and calculates shocks", () => {
    const result = rehearseCrisis(1_000_000, { marketShockPercent: 20, inflationShockPercent: 10, currencyShockPercent: 5, liquidityShockPercent: 10 });
    expect(result?.label).toBe("hypothetical simulation only");
    expect(result?.shocks.marketImpact).toBe(200000);
  });

  it("rejects out-of-range or excessive combined shock assumptions", () => {
    expect(rehearseCrisis(1_000_000, {
      marketShockPercent: -1,
      inflationShockPercent: 0,
      currencyShockPercent: 0,
      liquidityShockPercent: 0,
    })).toBeNull();
    expect(rehearseCrisis(1_000_000, {
      marketShockPercent: 80,
      inflationShockPercent: 0,
      currencyShockPercent: 20,
      liquidityShockPercent: 1,
    })).toBeNull();
    expect(rehearseCrisis(1_000_000, {
      marketShockPercent: 101,
      inflationShockPercent: 0,
      currencyShockPercent: 0,
      liquidityShockPercent: 0,
    })).toBeNull();
  });

  it("scores discovery proposals without promising patentability", () => {
    const result = evaluateInnovationProposal({
      existsRepository: false,
      existsCompetitor: true,
      materiallyDifferentiated: true,
      implementationReady: true,
      meaningfulValue: true,
      defensibleIpAssessment: "Potential defensible workflow; not a patent conclusion.",
    });
    expect(result.proceed).toBe(true);
  });
});
