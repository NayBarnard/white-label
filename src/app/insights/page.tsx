import type { Metadata } from "next";
import { InsightsExplorer } from "@/components/InsightsExplorer";
import { SubscribeForm } from "@/components/SubscribeForm";
import { LargeTitle } from "@/components/IOSKit";
import { MarketSnapshotStrip } from "@/components/MarketSnapshotStrip";
import { researchCatalog } from "@/lib/insights/catalog";
import { getPublishedResearchCatalog } from "@/lib/insights/server";
import Link from "next/link";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Insights & perspectives",
  description: "Read market commentary, investment updates and thought leadership from PLACEHOLDER BRAND.",
  openGraph: {
    title: "Insights & perspectives",
    description: "Read market commentary, investment updates and thought leadership from PLACEHOLDER BRAND.",
    url: "/insights",
  },
};

function FeaturedResearchHighlight({ article }: { article: (typeof researchCatalog)[number] }) {
  return (
    <section className="glass-strong mb-10 overflow-hidden rounded-3xl p-6 sm:p-9" aria-labelledby="featured-research-heading">
      <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-[var(--accent)]">FEATURED RESEARCH</p>
          <h2 id="featured-research-heading" className="mt-3 max-w-3xl text-2xl font-semibold sm:text-3xl">{article.title}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">{article.executiveSummary}</p>
          <p className="mt-4 text-xs text-[var(--muted)]">{article.category} · {article.date} · {article.readingTime} min read</p>
        </div>
        <Link href={`/insights/${article.slug}`} className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--accent-fill)] px-5 text-sm font-bold text-[var(--button-text)]">
          Read featured research
        </Link>
      </div>
    </section>
  );
}

async function FeaturedResearch() {
  const managedArticles = await getPublishedResearchCatalog();
  const featuredArticle = managedArticles.find((article) => article.featured) ?? researchCatalog.find((article) => article.featured);
  return featuredArticle ? <FeaturedResearchHighlight article={featuredArticle} /> : null;
}

export default function InsightsPage() {
  return (
    <>
      <LargeTitle
        eyebrow="INSIGHTS & PERSPECTIVES"
        title="Ideas for informed investors."
        description="Read PLACEHOLDER BRAND updates, investment perspectives, and market commentary."
      />

      <section className="mx-auto w-full max-w-7xl px-5 py-16 lg:px-8">
        <Suspense fallback={<div className="glass mb-10 rounded-3xl p-8 text-sm text-[var(--muted)]" role="status">Loading featured research…</div>}>
          <FeaturedResearch />
        </Suspense>
        <Suspense fallback={<div className="glass rounded-3xl p-8 text-sm text-[var(--muted)]" role="status">Loading market snapshot…</div>}>
          <MarketSnapshotStrip />
        </Suspense>
        <div className="mb-5 mt-12 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-[var(--accent)]">PLACEHOLDER BRAND RESEARCH</p>
            <h2 className="mt-2 text-2xl font-semibold">Research and perspectives</h2>
          </div>
          <Link href="/insights/library" className="text-sm font-semibold text-[var(--accent)] hover:underline">
            Browse the versioned research library
          </Link>
        </div>
        <InsightsExplorer />
      </section>

      <section className="glass border-t border-[var(--border)]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 md:grid-cols-[1fr_1.2fr] md:items-center lg:px-8">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-[var(--accent)]">STAY INFORMED</p>
            <h2 className="mt-2 text-2xl font-semibold">Stay informed</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Subscribe for occasional PLACEHOLDER BRAND updates.</p>
          </div>
          <SubscribeForm />
        </div>
      </section>
    </>
  );
}
