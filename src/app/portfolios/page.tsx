import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  fundFacts,
  performanceDisclosures,
  returnSummary,
  strategies,
} from "@/data/firmData";
import { FundComparison } from "@/components/FundComparison";
import { FundFactsPanel } from "@/components/FundFactsPanel";
import { ImportantDisclosure } from "@/components/ImportantDisclosure";
import { PublishedFundPerformance } from "@/components/PublishedFundPerformance";
import { FactSheetModal } from "@/components/FactSheetModal";
import { StrategyCarousel } from "@/components/StrategyCarousel";
import { StrategyPerformanceTables } from "@/components/StrategyPerformanceTables";
import { LargeTitle } from "@/components/IOSKit";

export const metadata: Metadata = {
  title: "Our portfolios",
  description: "Review your firm' investment strategies, published performance and portfolio positioning.",
  openGraph: {
    title: "Our portfolios",
    description: "Review your firm' investment strategies, published performance and portfolio positioning.",
    url: "/portfolios",
  },
};

function StrategySection({ strategy }: { strategy: (typeof strategies)[number] }) {
  const cumulativeRows = [
    { period: "1 Month", portfolio: strategy.cumulative.oneMonth, benchmark: "—" },
    { period: "1 Year", portfolio: strategy.cumulative.oneYear, benchmark: strategy.cumulative.oneYearBenchmark },
    { period: "3 Years", portfolio: strategy.cumulative.threeYear, benchmark: strategy.cumulative.threeYearBenchmark },
  ];
  const annualisedRows = [
    { period: "3 Years", portfolio: strategy.annualised.threeYear, benchmark: strategy.annualised.threeYearBenchmark },
    { period: "5 Years", portfolio: strategy.annualised.fiveYear, benchmark: strategy.annualised.fiveYearBenchmark },
  ];

  return (
    <section id={strategy.id} className="glass h-full w-full max-w-full overflow-visible scroll-mt-24 p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="text-xs font-bold tracking-[0.16em] text-[var(--accent)]">{strategy.profile}</p>
          <h2 className="mt-2 text-3xl font-semibold">{strategy.title}</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Benchmark: {strategy.benchmark}</p>
        </div>
        <div className="text-sm leading-6 text-[var(--muted)]">
          <p>Performance as at: <strong className="text-[var(--foreground)]">{strategy.performanceDate}</strong></p>
          <p>Source: <strong className="text-[var(--foreground)]">{strategy.source}</strong></p>
          <p>Inception date: <strong className="text-[var(--foreground)]">{strategy.inceptionDate}</strong></p>
        </div>
      </div>

      <div className="mt-8 grid w-full min-w-0 max-w-full gap-6 lg:grid-cols-2">
        <StrategyPerformanceTables
          strategyName={strategy.name}
          cumulativeRows={cumulativeRows}
          annualisedRows={annualisedRows}
        />

        <div className="grid min-w-0 max-w-full content-start gap-5">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-5">
            <h3 className="text-sm font-bold">Risk statistics (standard deviation)</h3>
            <dl className="mt-4 grid grid-cols-2 gap-3">
              <div><dt className="text-xs text-[var(--muted)]">1 Year</dt><dd className="mt-1 text-xl font-semibold">{strategy.risk.oneYear}</dd></div>
              <div><dt className="text-xs text-[var(--muted)]">3 Years</dt><dd className="mt-1 text-xl font-semibold">{strategy.risk.threeYears}</dd></div>
            </dl>
          </div>
          <div className="glass-inset p-5">
            <h3 className="text-sm font-bold">1-year performance since inception</h3>
            <dl className="mt-4 grid grid-cols-2 gap-3">
              <div><dt className="text-xs text-[var(--muted)]">High</dt><dd className="mt-1 text-xl font-semibold text-[var(--accent)]">{strategy.sinceInceptionOneYear.high}</dd></div>
              <div><dt className="text-xs text-[var(--muted)]">Low</dt><dd className="mt-1 text-xl font-semibold">{strategy.sinceInceptionOneYear.low}</dd></div>
            </dl>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={`/contact?inquiry=${encodeURIComponent(strategy.name)}#enquiry`} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--accent-fill)] px-4 text-sm font-bold text-[var(--button-text)]">
              REQUEST INFORMATION <ArrowRight size={15} />
            </Link>
            <FactSheetModal
              title={`${strategy.name} Fact Sheet`}
              href={`/api/documents/placeholder-${strategy.id}-fact-sheet`}
            />
          </div>
        </div>
      </div>
      <FundFactsPanel strategyName={strategy.title} facts={fundFacts[strategy.id]} />
    </section>
  );
}

export default function PortfoliosPage() {
  return (
    <>
      <LargeTitle
        eyebrow="OUR PORTFOLIOS"
        title="Disciplined, diversified investment strategies."
        description="Genuinely diversified, cost-conscious fund management, so you can focus on relations, and not portfolio construction."
      />

      <section className="mx-auto w-full max-w-7xl space-y-8 overflow-x-clip px-5 py-16 lg:px-8">
        <PublishedFundPerformance />

        <StrategyCarousel labels={strategies.map((strategy) => strategy.name)}>
          {strategies.map((strategy) => <StrategySection key={strategy.id} strategy={strategy} />)}
        </StrategyCarousel>
        <FundComparison />
      </section>

      <section className="glass">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-5 sm:py-12 lg:px-8">
          <p className="text-xs font-bold tracking-[0.18em] text-[var(--accent)]">LONG-TERM TOTAL RETURNS</p>
          <h2 className="mt-2 text-xl font-semibold sm:text-2xl">Cumulative total return comparison</h2>
          <p className="mt-2 break-words text-xs leading-5 text-[var(--muted)] sm:text-sm">
            As at {returnSummary.asAt} · Period: {returnSummary.period} · Source: {returnSummary.source}
          </p>
          <div className="glass-inset mt-5 overflow-hidden">
            <table className="w-full table-fixed text-left text-xs sm:text-sm">
              <colgroup>
                <col className="w-[65%]" />
                <col className="w-[35%]" />
              </colgroup>
              <thead className="text-[10px] uppercase leading-tight tracking-wide text-[var(--muted)] sm:text-xs">
                <tr>
                  <th scope="col" className="break-words px-3 py-3 font-semibold sm:px-4">Fund / benchmark</th>
                  <th scope="col" className="break-words px-3 py-3 text-right font-semibold sm:px-4">Cumulative total return</th>
                </tr>
              </thead>
              <tbody>
                {returnSummary.rows.map((row) => (
                  <tr key={row.name} className="border-t border-[var(--border)]">
                    <th scope="row" className="break-words px-3 py-3 text-left font-medium sm:px-4">{row.name}</th>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums text-[var(--accent)] sm:px-4">{row.label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ImportantDisclosure text={performanceDisclosures.importantDisclosure} />
          <p className="glass-inset mt-5 px-4 py-4 text-sm leading-6 text-[var(--muted)]">
            {performanceDisclosures.pastPerformance}
          </p>
          <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
            Long-term returns are reported to {returnSummary.asAt}, while strategy returns are as at {strategies[0].performanceDate}. These blocks use separate reporting dates.
          </p>
        </div>
      </section>
    </>
  );
}
