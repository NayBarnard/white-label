"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

type PublishedStrategy = {
  id: string;
  name: string;
  cumulative: { oneYear: string };
};

type FundMetricsResponse = {
  source: string;
  updatedAt: string | null;
  metrics?: {
    performanceDate?: string;
    strategies?: unknown;
  } | null;
};

function isPublishedStrategy(value: unknown): value is PublishedStrategy {
  if (!value || typeof value !== "object") return false;
  const strategy = value as Record<string, unknown>;
  const cumulative = strategy.cumulative;
  if (!cumulative || typeof cumulative !== "object") return false;
  const oneYear = (cumulative as Record<string, unknown>).oneYear;
  return (
    typeof strategy.id === "string" &&
    typeof strategy.name === "string" &&
    typeof oneYear === "string" &&
    Number.isFinite(Number.parseFloat(oneYear))
  );
}

export function PublishedFundPerformance() {
  const [response, setResponse] = useState<FundMetricsResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retryVersion, setRetryVersion] = useState(0);
  const hasData = useRef(false);

  useEffect(() => {
    let active = true;
    const controllers = new Set<AbortController>();
    async function refresh() {
      const controller = new AbortController();
      controllers.add(controller);
      const timeout = window.setTimeout(() => controller.abort(), 10_000);
      if (!hasData.current) setLoading(true);
      try {
        const result = await fetch("/api/fund-metrics", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!result.ok) throw new Error("Published fund performance could not be loaded.");
        const nextResponse = (await result.json()) as FundMetricsResponse;
        if (!active) return;
        setResponse(nextResponse);
        hasData.current = true;
        setError("");
      } catch {
        if (active) setError("Published fund returns are temporarily unavailable.");
      } finally {
        window.clearTimeout(timeout);
        controllers.delete(controller);
        if (active) setLoading(false);
      }
    }

    void refresh();
    const refreshInterval = window.setInterval(() => void refresh(), 5 * 60 * 1000);
    return () => {
      active = false;
      controllers.forEach((controller) => controller.abort());
      window.clearInterval(refreshInterval);
    };
  }, [retryVersion]);

  const strategyValues = response?.metrics?.strategies;
  const strategies = Array.isArray(strategyValues) ? strategyValues.filter(isPublishedStrategy) : [];

  return (
    <section
      aria-label="Published fund performance"
      className="glass-card w-full p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="funds-card-label font-bold tracking-[0.16em]">PUBLISHED FUND PERFORMANCE</p>
          <h2 className="funds-card-title mt-1">One-year returns</h2>
        </div>
        <p className="text-xs text-[var(--muted)]">
          {response?.metrics?.performanceDate
            ? `As at ${response.metrics.performanceDate}`
            : error || response?.source || "Loading published figures…"}
        </p>
      </div>
      {strategies.length ? (
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {strategies.map((strategy) => (
            <div key={strategy.id} className="py-2">
              <dt className="funds-card-label">{strategy.name}</dt>
              <dd className="funds-card-value funds-card-value-highlight">
                {strategy.cumulative.oneYear}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p role={error ? "alert" : "status"} className="mt-4 text-sm text-[var(--muted)]">
          {error || (loading ? "Loading published figures…" : "No verified performance figures have been published.")}
        </p>
      )}
      <p className="mt-3 text-[10px] leading-5 text-[var(--muted)]">
        {response?.source ? `Source: ${response.source}. ` : error ? "Source: Not available. " : ""}
        Past performance is not necessarily a guide to future performance.
      </p>
      {error && !strategies.length ? (
        <button
          type="button"
          onClick={() => {
            setError("");
            setRetryVersion((version) => version + 1);
          }}
          className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--border-strong)] px-4 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
        >
          <RefreshCw size={15} />
          Retry
        </button>
      ) : null}
    </section>
  );
}
