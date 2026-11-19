"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AlertCircle, RefreshCw } from "lucide-react";
import dynamic from "next/dynamic";
import { strategies } from "@/data/firmData";

const PerformanceChart = dynamic(
  () =>
    import("@/components/PerformanceChart").then((module) => module.PerformanceChart),
  {
    loading: () => (
      <div
        role="status"
        aria-label="Loading NAV chart"
        className="min-h-80 rounded-xl border border-[var(--border)] bg-[var(--surface)]"
      />
    ),
  },
);

type Period = "1M" | "6M" | "1Y" | "YTD" | "3Y Annualised" | "ALL";
type Fund = {
  id: string;
  name: string;
  benchmark: string;
  inceptionDate: string | null;
};
export type FundObservation = {
  fundId: string;
  date: string;
  nav: number;
  benchmarkNav: number;
  benchmarkName: string | null;
};
type ComparisonResponse = {
  source: string;
  updatedAt: string | null;
  funds: Fund[];
  observations: FundObservation[];
};

const periods: Period[] = ["1M", "6M", "1Y", "YTD", "3Y Annualised", "ALL"];
const fallbackFunds: Fund[] = strategies.map((strategy) => ({
  id: strategy.id,
  name: strategy.name,
  benchmark: strategy.benchmark,
  inceptionDate: strategy.inceptionDate,
}));

function subtractMonths(date: Date, months: number) {
  const result = new Date(date);
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() - months);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}

function selectPeriod(observations: FundObservation[], period: Period) {
  if (!observations.length || period === "ALL") return observations;
  const latestDate = new Date(`${observations.at(-1)?.date ?? ""}T00:00:00`);
  const cutoff = new Date(latestDate);
  if (period === "1M") cutoff.setTime(subtractMonths(latestDate, 1).getTime());
  if (period === "6M") cutoff.setTime(subtractMonths(latestDate, 6).getTime());
  if (period === "1Y") cutoff.setFullYear(cutoff.getFullYear() - 1);
  if (period === "3Y Annualised") cutoff.setFullYear(cutoff.getFullYear() - 3);
  if (period === "YTD") cutoff.setMonth(0, 1);
  const periodObservations = observations.filter(
    (point) => new Date(`${point.date}T00:00:00`) >= cutoff,
  );
  const firstDate = new Date(`${periodObservations[0]?.date ?? ""}T00:00:00`);
  const days = (latestDate.getTime() - firstDate.getTime()) / 86_400_000;
  if (period === "1Y" && days < 365.25 * 0.9) return [];
  if (period === "3Y Annualised" && days < 365.25 * 2.9) return [];
  return periodObservations;
}

function performance(observations: FundObservation[], period: Period) {
  if (observations.length < 2) return null;
  const first = observations[0];
  const last = observations.at(-1);
  if (!last || first.nav <= 0 || first.benchmarkNav <= 0) return null;
  const elapsedDays = Math.max(
    1,
    (new Date(last.date).getTime() - new Date(first.date).getTime()) / 86_400_000,
  );
  const annualised = period === "3Y Annualised";
  if (annualised && elapsedDays < 365.25 * 2.9) return null;
  if (period === "1Y" && elapsedDays < 365.25 * 0.9) return null;
  const exponent = annualised ? 365.25 / elapsedDays : 1;
  const calc = (start: number, end: number) =>
    (Math.pow(end / start, exponent) - 1) * 100;
  return {
    fund: calc(first.nav, last.nav),
    benchmark: calc(first.benchmarkNav, last.benchmarkNav),
  };
}

function formatPercent(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`
    : "Not reported";
}

function formatDate(value: string | null) {
  if (!value) return "Not reported";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-ZA");
}

export function FundComparison() {
  const reduceMotion = useReducedMotion();
  const indicatorTransition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 300, damping: 30 };
  const [data, setData] = useState<ComparisonResponse | null>(null);
  const [period, setPeriod] = useState<Period>("1Y");
  const [fundId, setFundId] = useState("balanced");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryVersion, setRetryVersion] = useState(0);

  useEffect(() => {
    let active = true;
    const controllers = new Set<AbortController>();
    async function refresh(initial = false) {
      if (initial) setLoading(true);
      const controller = new AbortController();
      controllers.add(controller);
      const timeout = window.setTimeout(() => controller.abort(), 10_000);
      try {
        const response = await fetch("/api/fund-comparison", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Fund comparison data could not be loaded.");
        const result = (await response.json()) as ComparisonResponse;
        if (!active) return;
        setData(result);
        setError("");
        setFundId((current) =>
          result.funds.some((fund) => fund.id === current)
            ? current
            : result.funds[0]?.id ?? "balanced",
        );
      } catch (requestError: unknown) {
        if (requestError instanceof Error && requestError.name === "AbortError") {
          if (active) {
            setError("We couldn't load fund performance right now. Please try again.");
          }
          return;
        }
        if (active) {
          setError("We couldn't load fund performance right now. Please try again.");
        }
      } finally {
        window.clearTimeout(timeout);
        controllers.delete(controller);
        if (active && initial) setLoading(false);
      }
    }

    void refresh(true);
    const refreshInterval = window.setInterval(() => void refresh(), 5 * 60 * 1000);
    return () => {
      active = false;
      controllers.forEach((controller) => controller.abort());
      window.clearInterval(refreshInterval);
    };
  }, [retryVersion]);

  const funds = data?.funds.length ? data.funds : fallbackFunds;
  const selectedFund = funds.find((fund) => fund.id === fundId) ?? funds[0];
  const selectedObservations = useMemo(
    () =>
      data && selectedFund
        ? data.observations.filter((observation) => observation.fundId === selectedFund.id)
        : [],
    [data, selectedFund],
  );
  const latestObservationDate = selectedObservations.reduce<string | null>(
    (latest, observation) => (!latest || observation.date > latest ? observation.date : latest),
    null,
  );
  const filteredObservations = useMemo(() => {
    if (!selectedFund) return [];
    return selectPeriod(
      selectedObservations
        .sort((left, right) => left.date.localeCompare(right.date)),
      period,
    );
  }, [period, selectedFund, selectedObservations]);
  const calculated = performance(filteredObservations, period);
  const reportedStrategy = strategies.find((strategy) => strategy.id === selectedFund?.id);
  const reported = reportedStrategy
    ? period === "1Y"
      ? {
          fund: Number.parseFloat(reportedStrategy.cumulative.oneYear),
          benchmark: Number.parseFloat(reportedStrategy.cumulative.oneYearBenchmark),
        }
      : period === "3Y Annualised"
        ? {
            fund: Number.parseFloat(reportedStrategy.annualised.threeYear),
            benchmark: Number.parseFloat(reportedStrategy.annualised.threeYearBenchmark),
          }
        : null
    : null;
  const visiblePerformance = calculated ?? reported;
  const performanceAsAt =
    calculated || reported === null
      ? latestObservationDate
      : reportedStrategy?.performanceDate ?? null;
  const performanceSource = calculated
    ? data?.source
    : reported !== null
      ? reportedStrategy?.source
      : data?.source;

  if (!selectedFund) return null;

  return (
    <section className="glass-card w-full p-4 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="funds-card-label font-bold tracking-[0.16em]">FUND COMPARISON</p>
          <h2 className="funds-card-title mt-2">Fund NAV vs active benchmark</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Compare indexed fund NAV and benchmark values using PLACEHOLDER BRAND fund data.
          </p>
        </div>
        {loading || selectedObservations.length > 0 ? (
          <div className="text-xs text-[var(--muted)]">
            {loading ? "Loading fund data…" : data?.source ?? "Published return data"}
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Select fund">
          {funds.map((fund) => (
          <motion.button
              type="button"
              key={fund.id}
              onClick={() => setFundId(fund.id)}
              aria-pressed={selectedFund.id === fund.id}
            className={`relative isolate rounded-md border px-3 py-2 text-xs font-semibold transition duration-200 hover:-translate-y-0.5 ${
                selectedFund.id === fund.id
                ? "border-transparent text-[var(--button-text)]"
                  : "border-[var(--border-strong)] text-[var(--muted)]"
              }`}
            >
            {selectedFund.id === fund.id && (
              <motion.span
                layoutId="fund-comparison-selected"
                className="absolute inset-0 rounded-md bg-[var(--accent-fill)]"
                transition={indicatorTransition}
                aria-hidden="true"
              />
            )}
            <span className="relative z-10">{fund.name}</span>
          </motion.button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Select comparison timeframe">
          {periods.map((item) => (
          <motion.button
              type="button"
              key={item}
              onClick={() => setPeriod(item)}
              aria-pressed={period === item}
            className={`relative isolate rounded-full border px-3 py-1.5 text-xs font-semibold transition duration-200 hover:-translate-y-0.5 ${
                period === item
                  ? "border-[var(--accent)] bg-[var(--surface)] text-[var(--accent)] shadow-sm"
                  : "border-[var(--border-strong)] text-[var(--muted)]"
              }`}
            >
            {period === item && (
              <motion.span
                layoutId="fund-comparison-period"
                className="absolute inset-0 rounded-full bg-[var(--surface)] shadow-sm"
                transition={indicatorTransition}
                aria-hidden="true"
              />
            )}
            <span className="relative z-10">{item}</span>
          </motion.button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="mt-6 space-y-5" role="status" aria-label="Loading fund performance">
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1].map((item) => (
              <div key={item} className="p-2">
                <div className="placeholder-skeleton h-3 w-2/3 rounded" />
                <div className="placeholder-skeleton mt-4 h-7 w-1/3 rounded" />
              </div>
            ))}
          </div>
          <div className="placeholder-skeleton h-[320px] rounded-xl" />
        </div>
      ) : error ? (
        <div
          role="alert"
          className="mt-6 flex flex-col items-start gap-4 rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="flex items-center gap-2 text-sm text-[var(--muted)]">
            <AlertCircle size={16} className="shrink-0 text-[var(--accent)]" />
            {error}
          </p>
          <button
            type="button"
            onClick={() => {
              setError("");
              setRetryVersion((version) => version + 1);
            }}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--border-strong)] px-4 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            <RefreshCw size={15} />
            Retry
          </button>
        </div>
      ) : (
        <>
          {selectedObservations.length === 0 ? (
            <div
              role="status"
              className="mt-6 flex min-h-56 items-center justify-center rounded-xl border border-dashed border-[var(--border-strong)] px-6 text-center"
            >
              <p className="font-semibold">Chart data will appear here soon.</p>
            </div>
          ) : (
            <>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 transition hover:border-[var(--accent)]">
                  <p className="text-xs text-[var(--muted)]">{selectedFund.name} · {period}</p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums text-[var(--accent)]">
                    {formatPercent(visiblePerformance?.fund)}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 transition hover:border-[var(--accent)]">
                  <p className="text-xs text-[var(--muted)]">{selectedFund.benchmark} · {period}</p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums">
                    {formatPercent(visiblePerformance?.benchmark)}
                  </p>
                </div>
              </div>

              {selectedObservations.length >= 2 ? (
                <div className="mt-5">
                  <PerformanceChart
                    fundName={selectedFund.name}
                    benchmark={selectedFund.benchmark}
                    observations={filteredObservations}
                    period={period}
                  />
                </div>
              ) : (
                <div
                  role="status"
                  className="mt-5 flex min-h-56 items-center justify-center rounded-xl border border-dashed border-[var(--border-strong)] px-6 text-center"
                >
                  <p className="font-semibold">Chart data will appear here soon.</p>
                </div>
              )}
            </>
          )}
        </>
      )}
      {selectedObservations.length > 0 ? (
        <p className="mt-4 text-[11px] leading-5 text-[var(--muted)]">
          {!loading && !error
            ? `As at ${formatDate(performanceAsAt)} · Source: ${performanceSource ?? "Not available"}. `
            : ""}
          {data?.updatedAt ? `NAV history last synced ${new Date(data.updatedAt).toLocaleString("en-ZA")}. ` : ""}
          {!error && !loading && "Fund history refreshes automatically every five minutes. "}
          {calculated
            ? "Fund and benchmark returns are calculated from the selected period's first and latest NAV observations. "
            : selectedObservations.length && !error
              ? "Selected-period fund history is not yet long enough to report a return. "
              : !error && !loading && !selectedObservations.length
                ? "Charted NAV observations will appear once available. "
                : ""}
          Past performance is not necessarily a guide to future performance.
        </p>
      ) : null}
    </section>
  );
}
