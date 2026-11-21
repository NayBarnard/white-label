import type { Metadata } from "next";
import { Render } from "@puckeditor/core/rsc";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DeferredFundComparison } from "@/components/DeferredFundComparison";
import { CountUp } from "@/components/CountUp";
import {
  homePageConfig,
  isHomePageData,
} from "@/components/home/HomePageEditorConfig";
import { HomeSwipeCarousel } from "@/components/HomeSwipeCarousel";
import { InsightsExplorer } from "@/components/InsightsExplorer";
import { ScrollPopOut } from "@/components/ScrollPopOut";
import { ScrollReveal } from "@/components/ScrollReveal";
import { company, returnSummary } from "@/data/firmData";
import { LargeTitle } from "@/components/IOSKit";
import { getPublishedHomePage } from "@/lib/supabase/site-pages";

export const metadata: Metadata = {
  title: "PLACEHOLDER BRAND | Independent Fund Management",
  description:
    "Explore PLACEHOLDER BRAND' diversified investment strategies, published performance and client-first advisory approach.",
  openGraph: {
    title: "PLACEHOLDER BRAND | Independent Fund Management",
    description:
      "Explore PLACEHOLDER BRAND' diversified investment strategies, published performance and client-first advisory approach.",
    url: "/",
  },
};

export default async function HomePage() {
  const publishedContent = await getPublishedHomePage();
  if (isHomePageData(publishedContent)) {
    return <Render config={homePageConfig} data={publishedContent} />;
  }
  return <CurrentHomePage />;
}

function CurrentHomePage() {
  const platformNames = ["Absa", "Momentum", "Sanlam", "Old Mutual"];
  const beliefs = [
    {
      title: "Active Management",
      description:
        "Disciplined, informed decision-making across market cycles to protect and grow wealth.",
    },
    {
      title: "Fearless Yet Educated",
      description:
        "Strategic positioning balanced with rigorous risk management for confident investing.",
    },
    {
      title: "Strategic Asset Allocation",
      description:
        "Core belief that allocation drives the majority of portfolio returns over time.",
    },
    {
      title: "Tactical Deviation",
      description:
        "Flexibility to adjust positioning within defined risk parameters as opportunities arise.",
    },
    {
      title: "Cost Optimization",
      description:
        "Competitive fee structures enabling superior net returns for your clients.",
    },
  ];
  const strategySlides = [
    {
      eyebrow: "MODERATE TO AGGRESSIVE",
      title: "PLACEHOLDER BRAND Balanced Strategy",
      description: "Long-term capital growth through diversified multi-asset allocation.",
      href: "/portfolios",
      linkLabel: "LEARN MORE",
    },
    {
      eyebrow: "CONSERVATIVE TO CAUTIOUS",
      title: "PLACEHOLDER BRAND Cautious Strategy",
      description: "Capital preservation with steady real returns above inflation.",
      href: "/portfolios",
      linkLabel: "LEARN MORE",
    },
  ];
  const insightSlides = [
    {
      eyebrow: "INVESTMENT STRATEGY",
      title: "Asset Allocation in Uncertain Times",
      description:
        "How strategic asset allocation continues to be the primary driver of long-term returns during periods of volatility.",
      date: "February 28, 2026",
      href: "/insights",
      linkLabel: "Read More",
    },
    {
      eyebrow: "CLIENT UPDATES",
      title: "Understanding Fee Impact on Returns",
      description:
        "A deep dive into how cost optimization creates compounding benefits for investors over extended time horizons.",
      date: "February 10, 2026",
      href: "/insights",
      linkLabel: "Read More",
      pulse: true,
    },
  ];

  return (
    <div className="home-page min-h-full">
      <LargeTitle
        eyebrow="INDEPENDENT INVESTMENT MANAGEMENT"
        title="Genuinely diversified, cost-conscious fund management."
        description={company.tagline}
      >
        <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/portfolios"
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--accent-fill)] px-5 text-sm font-bold text-[var(--button-text)] transition hover:-translate-y-0.5 hover:brightness-110"
            >
              Explore our portfolios <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link
              href="/contact#enquiry"
              className="inline-flex min-h-11 items-center rounded-full border border-[var(--border-strong)] px-5 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              Speak with our team
            </Link>
        </div>
      </LargeTitle>

      <main className="mx-auto w-full max-w-7xl flex-1 px-5 pb-16 sm:pb-20 lg:px-8">
        <section className="home-platform-marquee -mx-5 mt-3 sm:-mx-5 lg:-mx-8" aria-label="Distribution platforms">
          <p className="sr-only">Available through Absa, Momentum, Sanlam and Old Mutual.</p>
          <div className="platform-marquee" aria-hidden="true">
            <div className="platform-marquee-track">
              {[0, 1].map((group) => (
                <div className="platform-marquee-group" key={group}>
                  {platformNames.map((name) => (
                    <span className={`platform-wordmark platform-wordmark-${name.toLowerCase().replace(" ", "-")}`} key={`${group}-${name}`}>
                      {name}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-10 grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="PLACEHOLDER BRAND at a glance">
          <div className="home-stat-card gold-glass aspect-square rounded-2xl p-4 xl:aspect-auto">
            <p className="text-2xl font-semibold tabular-nums text-[var(--accent)] sm:text-3xl"><CountUp value={65} /></p>
            <p className="mt-2 text-[10px] font-semibold uppercase leading-4 tracking-wide text-[var(--muted)] sm:text-xs sm:leading-5">
              Years combined investment experience
            </p>
          </div>
          <div className="home-stat-card gold-glass aspect-square rounded-2xl p-4 xl:aspect-auto">
            <p className="text-2xl font-semibold tabular-nums text-[var(--accent)] sm:text-3xl"><CountUp value={4942} suffix="+" /></p>
            <p className="mt-2 text-[10px] font-semibold uppercase leading-4 tracking-wide text-[var(--muted)] sm:text-xs sm:leading-5">
              Clients invested across our strategies
            </p>
          </div>
          <div className="home-stat-card gold-glass aspect-square rounded-2xl p-4 xl:aspect-auto">
            <p className="text-2xl font-semibold tabular-nums text-[var(--accent)] sm:text-3xl"><CountUp value={8} /></p>
            <p className="mt-2 text-[10px] font-semibold uppercase leading-4 tracking-wide text-[var(--muted)] sm:text-xs sm:leading-5">
              Distribution platforms
            </p>
          </div>
          <div className="home-stat-card gold-glass aspect-square rounded-2xl p-4 xl:aspect-auto">
            <p className="text-2xl font-semibold tabular-nums text-[var(--accent)] sm:text-3xl">
              FSP <CountUp value={622} />
            </p>
            <p className="mt-2 text-[10px] font-semibold uppercase leading-4 tracking-wide text-[var(--muted)] sm:text-xs sm:leading-5">
              Licensed by the FSCA
            </p>
          </div>
        </section>

        <section className="mt-16" aria-labelledby="why-placeholder-heading">
          <div className="mb-6">
            <p className="text-xs font-bold tracking-[0.16em] text-[var(--accent)]">OUR APPROACH</p>
            <h2 id="why-placeholder-heading" className="heading-slow-pulse mt-2 text-2xl font-semibold sm:text-3xl">
              WHY PLACEHOLDER BRAND
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {beliefs.map((belief, index) => (
              <ScrollReveal key={belief.title} delayMs={index * 120}>
                <ScrollPopOut>
                  <article className="placeholder-glass-card gold-glass h-full rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">{belief.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{belief.description}</p>
                  </article>
                </ScrollPopOut>
              </ScrollReveal>
            ))}
          </div>
        </section>

        <section className="mt-16" aria-labelledby="strategies-heading">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold tracking-[0.16em] text-[var(--accent)]">OUR APPROACH</p>
              <h2 id="strategies-heading" className="heading-slow-pulse mt-2 text-2xl font-semibold sm:text-3xl">
                OUR INVESTMENT STRATEGIES
              </h2>
            </div>
            <Link href="/portfolios" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--accent)] hover:underline">
              View strategy details <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
          <HomeSwipeCarousel label="Investment strategies" slides={strategySlides} />
        </section>

        <section className="mt-16" aria-labelledby="latest-insights-heading">
          <div className="mb-6">
            <p className="text-xs font-bold tracking-[0.16em] text-[var(--accent)]">LATEST INSIGHTS</p>
            <h2 id="latest-insights-heading" className="heading-slow-pulse mt-2 text-2xl font-semibold sm:text-3xl">
              MARKET COMMENTARY
            </h2>
          </div>
          <ScrollReveal>
            <article className="placeholder-glass-card rounded-3xl p-6 sm:p-8">
              <p className="text-xs text-[var(--muted)]">March 15, 2026</p>
              <h3 className="mt-2 text-xl font-semibold text-[var(--foreground)]">Q1 2026 Market Commentary</h3>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
                An overview of global and South African market performance during the first quarter, with key takeaways for advisers.
              </p>
              <Link href="/insights" className="mt-5 inline-flex min-h-11 items-center gap-2 text-xs font-bold text-[var(--accent)] hover:underline">
                Read More <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </article>
          </ScrollReveal>
          <div className="mt-8">
            <InsightsExplorer initialCategory="MARKET COMMENTARY" articleLimit={3} />
          </div>

          <div className="mt-12">
            <HomeSwipeCarousel label="Investment strategy and client updates" slides={insightSlides} />
          </div>
          <Link href="/insights" className="mt-6 inline-flex min-h-11 items-center gap-2 text-xs font-bold tracking-wide text-[var(--accent)] hover:underline">
            VIEW ALL INSIGHTS <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </section>

        <section className="mt-14" aria-labelledby="long-term-returns-heading">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold tracking-[0.16em] text-[var(--accent)]">PUBLISHED PERFORMANCE</p>
              <h2 id="long-term-returns-heading" className="mt-2 text-xl font-semibold text-[var(--foreground)]">
                Long-term total returns
              </h2>
            </div>
            <p className="text-xs text-[var(--muted)]">
              As at {returnSummary.asAt} · Period: {returnSummary.period} · Source: {returnSummary.source}
            </p>
          </div>
          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {returnSummary.rows.map((row, index) => (
              <div
                key={row.name}
                className="placeholder-glass-card rounded-2xl p-5 transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(2,6,23,0.16)] motion-safe:animate-[placeholder-rise-in_500ms_ease-out_both]"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <dt className="text-sm leading-5 text-[var(--muted)]">{row.name}</dt>
                <dd className="mt-3 text-3xl font-semibold tabular-nums text-[var(--accent)]">{row.label}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-14" aria-label="Interactive fund performance comparison">
          <DeferredFundComparison />
        </section>
      </main>
    </div>
  );
}
