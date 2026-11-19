"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { FundObservation } from "@/components/FundComparison";

type Period = "1M" | "6M" | "1Y" | "YTD" | "3Y Annualised" | "ALL";

type Props = {
  fundName: string;
  benchmark: string;
  observations: FundObservation[];
  period: Period;
};

function dateLabel(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString("en-ZA", { month: "short", year: "2-digit" });
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      mediaQuery.addEventListener("change", onChange);
      return () => mediaQuery.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

export function PerformanceChart({
  fundName,
  benchmark,
  observations,
  period,
}: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const firstObservation = observations[0];
  const rows =
    firstObservation && firstObservation.nav > 0 && firstObservation.benchmarkNav > 0
      ? observations.map((point) => ({
          date: point.date,
          label: dateLabel(point.date),
          fund: (point.nav / firstObservation.nav) * 100,
          benchmark:
            (point.benchmarkNav / firstObservation.benchmarkNav) * 100,
        }))
      : [];

  useEffect(() => {
    if (prefersReducedMotion) return;
    const container = chartRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setInView(true);
        observer.disconnect();
      },
      { threshold: 0.15 },
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, [prefersReducedMotion]);

  if (rows.length < 2) {
    return (
      <div
        role="status"
        className="flex min-h-56 items-center justify-center rounded-lg border border-dashed border-[var(--border)] px-6 text-center text-sm text-[var(--muted)]"
      >
        Verified NAV and {benchmark} history for {period} will appear here when the time series is synced.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="funds-card-title">Indexed NAV growth · base 100</h3>
        <p className="text-xs text-[var(--muted)]">
          {fundName} vs {benchmark}
        </p>
      </div>
      <div
        ref={chartRef}
        className="h-[320px] w-full"
        role="img"
        aria-label={`${fundName} and ${benchmark} indexed NAV comparison`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            key={period}
            data={rows}
            margin={{ top: 4, right: 12, left: 0, bottom: 4 }}
          >
            <defs>
              <linearGradient id="fund-area-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-fund)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--chart-fund)" stopOpacity={0.015} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              minTickGap={26}
              tick={{ fill: "var(--muted)", fontSize: 11 }}
            />
            <YAxis
              width={58}
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              tickFormatter={(value: number) => value.toFixed(0)}
            />
            <Legend
              verticalAlign="top"
              height={30}
              wrapperStyle={{ color: "var(--foreground)", fontSize: 12 }}
            />
            <Tooltip
              cursor={{ stroke: "var(--border-strong)", strokeDasharray: "4 4" }}
              labelFormatter={(_label, payload) =>
                payload?.[0]?.payload?.date
                  ? new Date(`${payload[0].payload.date}T00:00:00`).toLocaleDateString("en-ZA")
                  : ""
              }
              formatter={(value, name) => [
                typeof value === "number" ? value.toFixed(2) : "Not reported",
                name,
              ]}
              contentStyle={{
                background: "var(--chart-tooltip)",
                backdropFilter: "blur(16px)",
                border: "1px solid var(--glass-border)",
                borderRadius: 12,
                color: "var(--foreground)",
                boxShadow: "0 18px 48px rgba(18, 52, 91, 0.12)",
              }}
            />
            <Area
              type="monotone"
              dataKey="fund"
              name={fundName}
              stroke="none"
              fill="url(#fund-area-gradient)"
              legendType="none"
              isAnimationActive={inView && !prefersReducedMotion}
              animationDuration={950}
            />
            <Line
              type="monotone"
              dataKey="fund"
              name={fundName}
              stroke="var(--chart-fund)"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 5, fill: "var(--accent-fill)", stroke: "var(--background)", strokeWidth: 2 }}
              isAnimationActive={inView && !prefersReducedMotion}
              animationDuration={950}
            />
            <Line
              type="monotone"
              dataKey="benchmark"
              name={benchmark}
              stroke="var(--chart-benchmark)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: "#94A3B8", stroke: "var(--background)", strokeWidth: 2 }}
              isAnimationActive={inView && !prefersReducedMotion}
              animationDuration={950}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-[11px] text-[var(--muted)]">
        Indexed NAV is rebased to 100 at the first available observation in this period.
      </p>
    </div>
  );
}
