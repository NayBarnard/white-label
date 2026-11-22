import Link from "next/link";
import { ArrowDownToLine, ArrowLeft, ArrowRight, BarChart3 } from "lucide-react";
import { company, performanceDisclosures, returnSummary } from "@/data/firmData";
import { getResearchArticle, type ResearchArticle } from "@/lib/insights/catalog";

function formattedDate(value: string) {
  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
}

export function ResearchArticleLayout({ article }: { article: ResearchArticle }) {
  const related = article.relatedSlugs;

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-10 lg:px-8 lg:py-16">
      <Link href="/insights" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[var(--accent)] hover:underline">
        <ArrowLeft size={16} aria-hidden="true" /> All insights
      </Link>
      <article className="mt-5">
        <header className="glass-strong rounded-3xl p-6 sm:p-10">
          <p className="text-xs font-bold tracking-[0.16em] text-[var(--accent)]">{article.category}</p>
          <h1 className="mt-3 max-w-4xl text-3xl font-semibold leading-tight sm:text-5xl">{article.title}</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-[var(--muted)]">{article.executiveSummary}</p>
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-[var(--border)] pt-4 text-sm text-[var(--muted)]">
            <span>{article.author} · {article.designation}</span>
            <span>{formattedDate(article.date)}</span>
            <span>{article.category}</span>
            <span>{article.readingTime} min read</span>
          </div>
          <p className="mt-3 max-w-3xl text-xs leading-5 text-[var(--muted)]">{article.authorBio}</p>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="space-y-6">
            <section id="research" className="glass rounded-2xl p-6 sm:p-8">
              <h2 className="text-xl font-semibold">Research</h2>
              <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--muted)]">
                {article.body.split(/(?<=[.!?])\s+/).filter(Boolean).map((paragraph, index) => (
                  <p key={`${article.slug}-paragraph-${index}`}>{paragraph}</p>
                ))}
              </div>
            </section>

            <section id="charts" className="glass rounded-2xl p-6 sm:p-8">
              <div className="flex items-center gap-2">
                <BarChart3 size={18} className="text-[var(--accent)]" aria-hidden="true" />
                <h2 className="text-xl font-semibold">Published fund-performance context</h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                This is the latest performance snapshot published by your firm, not a market quote or a forecast.
              </p>
              <div className="mt-5 space-y-3" role="img" aria-label={`Cumulative return context for ${returnSummary.period}`}>
                {returnSummary.rows.map((row) => {
                  const width = Math.max(2, Math.min(100, row.value / 6));
                  return (
                    <div key={row.name}>
                      <div className="mb-1 flex justify-between gap-3 text-xs">
                        <span>{row.name}</span><span className="font-semibold">{row.label}</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-[var(--border)]">
                        <div className="h-full rounded-full bg-[var(--accent-fill)]" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-xs text-[var(--muted)]">
                Period: {returnSummary.period} · As at {returnSummary.asAt} · Source: {returnSummary.source}
              </p>
            </section>

            <section id="takeaways" className="glass rounded-2xl p-6 sm:p-8">
              <h2 className="text-xl font-semibold">Key takeaways</h2>
              <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-6 text-[var(--muted)]">
                {article.keyTakeaways.map((takeaway) => <li key={takeaway}>{takeaway}</li>)}
              </ol>
            </section>

            <section id="perspective" className="glass rounded-2xl p-6 sm:p-8">
              <h2 className="text-xl font-semibold">your firm perspective</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{article.perspective}</p>
            </section>

            <section id="related" className="glass rounded-2xl p-6 sm:p-8">
              <h2 className="text-xl font-semibold">Related research</h2>
              <ul className="mt-4 space-y-3">
                {related.map((slug) => {
                  const title = getResearchArticle(slug)?.title ?? slug;
                  return (
                    <li key={slug}>
                      <Link href={`/insights/${slug}`} className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)] hover:underline">
                        {title} <ArrowRight size={14} aria-hidden="true" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <section className="glass rounded-2xl p-5">
              <p className="text-xs font-bold tracking-[0.12em] text-[var(--accent)]">RESEARCH DETAILS</p>
              <p className="mt-3 text-sm">Strategy: {article.strategy}</p>
              <p className="mt-2 text-sm">Document type: {article.documentType}</p>
              <a href={`/api/insights/${article.slug}/pdf?branding=clean`} className="mt-5 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-[var(--border-strong)] px-3 text-xs font-bold hover:border-[var(--accent)]">
                <ArrowDownToLine size={15} aria-hidden="true" /> Clean PDF
              </a>
              <a href={`/api/insights/${article.slug}/pdf?branding=co-branded`} className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-[var(--accent-fill)] px-3 text-xs font-bold text-[var(--button-text)]">
                <ArrowDownToLine size={15} aria-hidden="true" /> Adviser-ready PDF
              </a>
            </section>
            <section className="glass-inset rounded-2xl p-5">
              <h2 className="text-sm font-semibold">Important information</h2>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                {company.regulatoryNotice} The Financial Sector Conduct Authority (FSCA) regulates financial services providers in South Africa.
              </p>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{performanceDisclosures.advice}</p>
            </section>
            <p className="px-1 text-xs leading-5 text-[var(--muted)]">Source attribution: {article.source}. {performanceDisclosures.pastPerformance}</p>
          </aside>
        </div>
      </article>
    </main>
  );
}
