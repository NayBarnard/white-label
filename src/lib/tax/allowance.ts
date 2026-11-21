export type ContributionSource = "INTERNAL_PORTFOLIO" | "EXTERNAL_DECLARED";

export type AllowanceRule = {
  product_code: string;
  tax_year_label: string;
  period_start: string;
  period_end: string;
  annual_limit: number;
  lifetime_limit: number | null;
  currency: string;
  over_contribution_penalty_rate: number;
};

export type AllowanceContribution = {
  amount: number;
  contribution_date: string;
  source: ContributionSource;
};

export type AllowanceSummary = {
  annual_contributed: number;
  annual_remaining_headroom: number;
  lifetime_contributed: number;
  lifetime_remaining_headroom: number | null;
  annual_utilization_pct: number;
  status: "NORMAL" | "APPROACHING_CAP" | "CAP_REACHED" | "OVER_CONTRIBUTED";
  internal_annual_contributed: number;
  external_annual_contributed: number;
  annual_excess: number;
  lifetime_excess: number;
  estimated_penalty: number;
};

export function calculateAllowance(
  rule: AllowanceRule,
  contributions: AllowanceContribution[],
): AllowanceSummary {
  const valid = contributions.filter(
    (contribution) =>
      Number.isFinite(contribution.amount) &&
      contribution.amount > 0 &&
      /^\d{4}-\d{2}-\d{2}$/.test(contribution.contribution_date),
  );
  const annual = valid.filter(
    ({ contribution_date }) =>
      contribution_date >= rule.period_start && contribution_date <= rule.period_end,
  );
  const sum = (items: AllowanceContribution[]) =>
    items.reduce((total, item) => total + item.amount, 0);
  const annualContributed = sum(annual);
  const annualExcess = Math.max(0, annualContributed - rule.annual_limit);
  const utilization = rule.annual_limit > 0
    ? (annualContributed / rule.annual_limit) * 100
    : 0;
  const lifetimeContributed = sum(valid);
  const lifetimeHeadroom = rule.lifetime_limit === null
    ? null
    : Math.max(0, rule.lifetime_limit - lifetimeContributed);
  const lifetimeExcess = rule.lifetime_limit === null
    ? 0
    : Math.max(0, lifetimeContributed - rule.lifetime_limit);

  return {
    annual_contributed: annualContributed,
    annual_remaining_headroom: Math.max(0, rule.annual_limit - annualContributed),
    lifetime_contributed: lifetimeContributed,
    lifetime_remaining_headroom: lifetimeHeadroom,
    annual_utilization_pct: utilization,
    status: utilization > 100
      ? "OVER_CONTRIBUTED"
      : utilization >= 100
        ? "CAP_REACHED"
        : utilization >= 80
          ? "APPROACHING_CAP"
          : "NORMAL",
    internal_annual_contributed: sum(
      annual.filter(({ source }) => source === "INTERNAL_PORTFOLIO"),
    ),
    external_annual_contributed: sum(
      annual.filter(({ source }) => source === "EXTERNAL_DECLARED"),
    ),
    annual_excess: annualExcess,
    lifetime_excess: lifetimeExcess,
    estimated_penalty: Math.max(annualExcess, lifetimeExcess) * rule.over_contribution_penalty_rate,
  };
}

export function resolveAllowanceRules<T extends { product_code: string; tax_year_label: string; tenant_id: string }>(
  tenantId: string,
  rules: T[],
): T[] {
  const resolved = new Map<string, T>();
  for (const rule of rules) {
    if (rule.tenant_id !== "default" && rule.tenant_id !== tenantId) continue;
    const key = `${rule.product_code}:${rule.tax_year_label}`;
    if (!resolved.has(key) || rule.tenant_id === tenantId) resolved.set(key, rule);
  }
  return [...resolved.values()].sort((a, b) =>
    b.tax_year_label.localeCompare(a.tax_year_label) || a.product_code.localeCompare(b.product_code),
  );
}
