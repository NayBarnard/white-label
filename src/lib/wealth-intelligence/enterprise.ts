export type Opportunity = {
  title: string;
  evidence: string[];
  rationale: string;
  missingInformation: string[];
  benefits: string[];
  risks: string[];
};

export function orchestrateOpportunity(input: {
  verifiedMonthlySurplusZar: number | null;
  targetShortfallZar: number | null;
  taxAllowanceRemainingZar: number | null;
}): Opportunity[] {
  const opportunities: Opportunity[] = [];
  if (input.verifiedMonthlySurplusZar !== null && input.verifiedMonthlySurplusZar >= 2000) {
    opportunities.push({
      title: "Review additional monthly contribution",
      evidence: [`Verified monthly surplus entered: R ${input.verifiedMonthlySurplusZar.toLocaleString("en-ZA")}`],
      rationale: "A repeatable surplus may support a human-reviewed contribution change.",
      missingInformation: ["Income stability", "Emergency reserve", "Existing contractual obligations"],
      benefits: ["Potentially higher projected progress", "A regular, reviewable contribution"],
      risks: ["Reduced liquidity", "Opportunity cost", "Projection assumptions may not occur"],
    });
  }
  if (input.taxAllowanceRemainingZar !== null && input.taxAllowanceRemainingZar > 0) {
    opportunities.push({
      title: "Human review unused tax allowance",
      evidence: [`Reported remaining allowance: R ${input.taxAllowanceRemainingZar.toLocaleString("en-ZA")}`],
      rationale: "A reported remaining allowance warrants adviser verification before a planning recommendation.",
      missingInformation: ["Applicable rule version", "Eligibility", "External contributions"],
      benefits: ["Potential tax-efficient capacity", "An explicit reviewed planning checklist"],
      risks: ["Allowance rules may change", "Incorrect external contribution data", "No execution or regulated advice"],
    });
  }
  if (input.targetShortfallZar !== null && input.targetShortfallZar > 0) {
    opportunities.push({
      title: "Investigate goal shortfall",
      evidence: [`Illustrative target shortfall: R ${input.targetShortfallZar.toLocaleString("en-ZA")}`],
      rationale: "The gap should trigger evidence review rather than an autonomous decision.",
      missingInformation: ["Verified target date", "Fees", "Tax position", "Recent contributions"],
      benefits: ["Clearer action checklist", "Earlier human intervention"],
      risks: ["Market outcomes cannot be guaranteed", "Changing assumptions may reverse the finding"],
    });
  }
  return opportunities;
}

export function rehearseCrisis(
  portfolioZar: number,
  assumptions: { marketShockPercent: number; inflationShockPercent: number; currencyShockPercent: number; liquidityShockPercent: number },
) {
  if (![portfolioZar, ...Object.values(assumptions)].every(Number.isFinite) || portfolioZar < 0) return null;
  const marketImpact = portfolioZar * (assumptions.marketShockPercent / 100);
  const currencyImpact = portfolioZar * (assumptions.currencyShockPercent / 100);
  const inflationImpact = portfolioZar * (assumptions.inflationShockPercent / 100);
  const liquidityImpact = portfolioZar * (assumptions.liquidityShockPercent / 100);
  return {
    estimatedExposureZar: portfolioZar - marketImpact - currencyImpact - liquidityImpact,
    shocks: { marketImpact, currencyImpact, inflationImpact, liquidityImpact },
    label: "hypothetical simulation only",
  };
}

export function evaluateInnovationProposal(input: {
  existsRepository: boolean;
  existsCompetitor: boolean;
  materiallyDifferentiated: boolean;
  implementationReady: boolean;
  meaningfulValue: boolean;
  defensibleIpAssessment: string;
}) {
  const checks = [
    !input.existsRepository,
    input.existsCompetitor || input.materiallyDifferentiated,
    input.materiallyDifferentiated,
    input.implementationReady,
    input.meaningfulValue,
  ];
  return {
    proceed: checks.every(Boolean),
    score: checks.filter(Boolean).length,
    defensibility: input.defensibleIpAssessment,
  };
}
