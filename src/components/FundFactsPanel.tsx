"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { FundFactsRecord } from "@/data/firmData";

const allocationColors = [
  "var(--chart-fund)",
  "var(--chart-benchmark)",
  "var(--accent-fill)",
  "#94A3B8",
  "#64748B",
  "#C5A880",
];

function hasValue(value: unknown): boolean {
  return value !== null && value !== undefined && value !== "";
}

function formatPercent(value: number) {
  return `${new Intl.NumberFormat("en-ZA", { maximumFractionDigits: 2 }).format(value)}%`;
}

export function FundFactsPanel({
  strategyName,
  facts,
}: {
  strategyName: string;
  facts: FundFactsRecord;
}) {
  const managementCompany = facts.managementCompany;
  const keyFacts: { label: string; value: string | number | null | undefined }[] = [
    { label: "ISIN", value: facts.isin },
    { label: "JSE code", value: facts.jseCode },
    { label: "ASISA category", value: facts.asisaCategory },
    { label: "Launch date", value: facts.launchDate },
    { label: "Benchmark", value: facts.benchmark },
    { label: "Maximum drawdown date", value: facts.mddDate },
    { label: "Minimum investment", value: hasValue(facts.minimumInvestment?.amount)
      ? `${facts.minimumInvestment?.currency ?? ""} ${facts.minimumInvestment?.amount}`.trim()
      : null },
    { label: "Management company", value: managementCompany?.name },
    { label: "Management company phone", value: managementCompany?.phone },
    { label: "Management company email", value: managementCompany?.email },
  ].filter((item) => hasValue(item.value));
  const costs = [
    ["TER", facts.tradingCosts?.ter],
    ["Transaction costs", facts.tradingCosts?.transactionCosts],
    ["Total investment charge", facts.tradingCosts?.totalInvestmentCharge],
  ].filter((item): item is [string, number] => typeof item[1] === "number");
  const allocation = facts.assetAllocation?.filter(
    (item) => item.name.trim().length > 0 && Number.isFinite(item.percent),
  ) ?? [];
  const topHoldings = facts.topHoldings?.filter((holding) => holding.trim().length > 0) ?? [];

  if (!keyFacts.length && !costs.length && !allocation.length && !topHoldings.length) return null;

  return (
    <div className="mt-6 grid gap-5">
      {keyFacts.length ? (
        <section className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-5" aria-labelledby={`${strategyName}-key-facts`}>
          <h3 id={`${strategyName}-key-facts`} className="text-sm font-bold">Key facts</h3>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            {keyFacts.map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-1">
                <dt className="text-xs text-[var(--muted)]">{label}</dt>
                <dd className="font-semibold text-[var(--foreground)]">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {allocation.length ? (
        <section className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-5" aria-labelledby={`${strategyName}-allocation`}>
          <h3 id={`${strategyName}-allocation`} className="text-sm font-bold">Asset allocation</h3>
          <div className="mt-4 grid items-center gap-4 sm:grid-cols-[minmax(160px,220px)_1fr]">
            <div className="h-52 w-full" role="img" aria-label={`${strategyName} asset allocation donut chart`}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={allocation} dataKey="percent" nameKey="name" innerRadius={56} outerRadius={82} paddingAngle={2}>
                    {allocation.map((item, index) => (
                      <Cell key={item.name} fill={allocationColors[index % allocationColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => typeof value === "number" ? formatPercent(value) : "Not reported"}
                    contentStyle={{
                      background: "var(--chart-tooltip)",
                      border: "1px solid var(--glass-border)",
                      borderRadius: 12,
                      color: "var(--foreground)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-2 text-sm">
              {allocation.map((item, index) => (
                <li key={item.name} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-[var(--muted)]">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: allocationColors[index % allocationColors.length] }} />
                    {item.name}
                  </span>
                  <span className="font-semibold tabular-nums">{formatPercent(item.percent)}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-3 text-xs text-[var(--muted)]">
            {hasValue(facts.assetAllocationAsAt) ? `As at ${facts.assetAllocationAsAt}` : null}
            {hasValue(facts.assetAllocationAsAt) && hasValue(facts.source) ? " · " : null}
            {hasValue(facts.source) ? `Source: ${facts.source}` : null}
          </p>
        </section>
      ) : null}

      {costs.length ? (
        <section className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-5" aria-labelledby={`${strategyName}-costs`}>
          <h3 id={`${strategyName}-costs`} className="text-sm font-bold">Costs</h3>
          <dl className="mt-3 grid gap-3 sm:grid-cols-3">
            {costs.map(([label, value]) => (
              <div key={label} className="border-b border-[var(--border)] pb-2">
                <dt className="text-xs text-[var(--muted)]">{label}</dt>
                <dd className="mt-1 font-semibold">{formatPercent(value)}</dd>
                {hasValue(facts.tradingCosts?.asAt) ? (
                  <dd className="mt-1 text-xs text-[var(--muted)]">As at {facts.tradingCosts?.asAt}</dd>
                ) : null}
              </div>
            ))}
          </dl>
          {hasValue(facts.source) ? <p className="mt-3 text-xs text-[var(--muted)]">Source: {facts.source}</p> : null}
        </section>
      ) : null}

      {topHoldings.length ? (
        <section className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-5" aria-labelledby={`${strategyName}-holdings`}>
          <h3 id={`${strategyName}-holdings`} className="text-sm font-bold">Top holdings</h3>
          <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            {topHoldings.map((holding) => <li key={holding}>{holding}</li>)}
          </ul>
          {hasValue(facts.source) ? <p className="mt-3 text-xs text-[var(--muted)]">Source: {facts.source}</p> : null}
        </section>
      ) : null}
    </div>
  );
}
