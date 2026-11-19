import Link from "next/link";
import { Clock3, ExternalLink } from "lucide-react";
import { connection } from "next/server";

const indicators = [
  { name: "JSE All Share", cadence: "15m Delayed", source: "JSE market data", researchSlug: "market-context-and-time-horizons" },
  { name: "S&P 500", cadence: "EOD", source: "S&P Dow Jones Indices", researchSlug: "building-resilient-portfolios" },
  { name: "USD/ZAR", cadence: "15m Delayed", source: "Authorised FX data provider", researchSlug: "market-context-and-time-horizons" },
  { name: "SA Inflation", cadence: "Official Release", source: "Statistics South Africa", researchSlug: "building-resilient-portfolios" },
  { name: "SA Repo Rate", cadence: "Official Release", source: "South African Reserve Bank", researchSlug: "understanding-investment-costs" },
  { name: "Gold", cadence: "EOD", source: "Authorised commodity data provider", researchSlug: "building-resilient-portfolios" },
] as const;

export async function MarketSnapshotStrip() {
  await connection();
  const checkedAt = new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Johannesburg",
  }).format(new Date());

  return (
    <section className="glass-strong rounded-3xl p-5 sm:p-7" aria-labelledby="market-snapshot-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.16em] text-[var(--accent)]">MARKET OVERVIEW</p>
          <h2 id="market-snapshot-heading" className="mt-2 text-2xl font-semibold">Market snapshot</h2>
        </div>
        <p className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)]">
          <Clock3 size={14} aria-hidden="true" /> Checked {checkedAt} (SAST)
        </p>
      </div>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {indicators.map((indicator) => (
          <li key={indicator.name} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 backdrop-blur-xl">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold">{indicator.name}</h3>
              <span className="rounded-full border border-[var(--border)] px-2 py-1 text-[10px] font-bold text-[var(--muted)]">
                {indicator.cadence}
              </span>
            </div>
            <p className="mt-3 text-sm font-medium">No verified quote available</p>
            <p className="mt-1 text-xs text-[var(--muted)]">Feed not connected · {indicator.source}</p>
            <Link href={`/insights/${indicator.researchSlug}`} className="mt-3 inline-flex text-xs font-semibold text-[var(--accent)] hover:underline">
              Related PLACEHOLDER BRAND research
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4 text-xs text-[var(--muted)]">
        <p>Values are withheld until a timestamped, attributable data feed is configured.</p>
        <Link href="/insights" className="inline-flex items-center gap-1 font-semibold text-[var(--accent)] hover:underline">
          Related PLACEHOLDER BRAND research <ExternalLink size={13} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
