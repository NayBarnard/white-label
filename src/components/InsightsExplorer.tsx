"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Clock3, Newspaper, Radio, Search, TrendingUp } from "lucide-react";
import { ScrollReveal } from "@/components/ScrollReveal";
import Link from "next/link";
import { researchCatalog, researchCategories } from "@/lib/insights/catalog";
import type { ResearchCategory } from "@/lib/insights/catalog";

type Category = "INDUSTRY NEWS" | "MARKET COMMENTARY";
type Article = {
  slug: string;
  title: string;
  category: Category;
  date: string;
  source: string;
  excerpt: string;
  url: string;
};
type ArticlesResponse = {
  articles: Article[];
  count: number;
  sources: string[];
  fetchedAt: string;
};

const categories: Category[] = ["INDUSTRY NEWS", "MARKET COMMENTARY"];
const refreshIntervalMs = 15 * 60 * 1000;

type InsightsExplorerProps = {
  initialCategory?: Category;
  articleLimit?: number;
};

function readableDate(date: string) {
  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Johannesburg",
  }).format(new Date(date));
}

export function InsightsExplorer({
  initialCategory = "INDUSTRY NEWS",
  articleLimit,
}: InsightsExplorerProps) {
  const reduceMotion = useReducedMotion();
  const [category, setCategory] = useState<Category>(initialCategory);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sources, setSources] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);
  const visibleResults = articleLimit ? results.slice(0, articleLimit) : results;
  const [researchCategory, setResearchCategory] = useState<ResearchCategory | "All">("All");
  const [publicationFrom, setPublicationFrom] = useState("");
  const [publicationTo, setPublicationTo] = useState("");
  const [strategy, setStrategy] = useState("All");
  const [documentType, setDocumentType] = useState("All");
  const [researchArticles, setResearchArticles] = useState(researchCatalog);
  const filteredResearch = researchArticles.filter((article) => {
    const textMatches = !query.trim() ||
      `${article.title} ${article.excerpt} ${article.body} ${article.category}`.toLowerCase().includes(query.trim().toLowerCase());
    const categoryMatches = researchCategory === "All" || article.category === researchCategory;
    const fromMatches = !publicationFrom || article.date >= publicationFrom;
    const toMatches = !publicationTo || article.date <= publicationTo;
    const strategyMatches = strategy === "All" || article.strategy === "Both" || article.strategy === strategy;
    const typeMatches = documentType === "All" ||
      (documentType === "Research article" && article.documentType === "Research") ||
      (documentType === "PDF available" && Boolean(article.slug));
    return textMatches && categoryMatches && fromMatches && toMatches && strategyMatches && typeMatches;
  });

  useEffect(() => {
    const timer = window.setInterval(() => setRefreshVersion((version) => version + 1), refreshIntervalMs);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/insights?type=research", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const data = await response.json() as { articles?: typeof researchCatalog; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Published PLACEHOLDER BRAND research could not be loaded.");
        return data;
      })
      .then((data) => {
        if (!controller.signal.aborted && Array.isArray(data.articles)) setResearchArticles(data.articles);
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) console.error("Published PLACEHOLDER BRAND research could not be loaded.", requestError);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ category, q: query });
      setLoading(true);
      setError("");
      fetch(`/api/insights?${params}`, { signal: controller.signal })
        .then(async (response) => {
          const data = (await response.json()) as ArticlesResponse & { error?: string };
          if (!response.ok) throw new Error(data.error ?? "Live insights could not be loaded.");
          return data;
        })
        .then((data) => {
          if (controller.signal.aborted) return;
          setResults(data.articles);
          setSources(data.sources);
          setLastUpdated(data.fetchedAt);
        })
        .catch((requestError: unknown) => {
          if (controller.signal.aborted) return;
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Live insights could not be loaded. Please try again.",
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, query ? 180 : 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [category, query, refreshVersion]);

  return (
    <div>
      <div className="flex flex-col gap-5">
        <section className="glass space-y-4 rounded-2xl p-4 sm:p-5" aria-labelledby="research-filters-heading">
          <h2 id="research-filters-heading" className="text-sm font-semibold">Find PLACEHOLDER BRAND research</h2>
          <label className="flex min-h-12 items-center gap-3 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 backdrop-blur-xl">
            <Search size={18} className="text-[var(--muted)]" aria-hidden="true" />
            <span className="sr-only">Search research</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search research, market commentary and investment insights..."
              maxLength={100}
              className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className="text-xs font-semibold">Category
              <select value={researchCategory} onChange={(event) => setResearchCategory(event.target.value as ResearchCategory | "All")} className="glass-select mt-1 min-h-11 w-full rounded-lg border border-[var(--border-strong)] px-3 text-sm">
                <option value="All">All categories</option>
                {researchCategories.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold">Strategy
              <select value={strategy} onChange={(event) => setStrategy(event.target.value)} className="glass-select mt-1 min-h-11 w-full rounded-lg border border-[var(--border-strong)] px-3 text-sm">
                <option>All</option><option>PLACEHOLDER BRAND Balanced</option><option>PLACEHOLDER BRAND Cautious</option>
              </select>
            </label>
            <label className="text-xs font-semibold">Document type
              <select value={documentType} onChange={(event) => setDocumentType(event.target.value)} className="glass-select mt-1 min-h-11 w-full rounded-lg border border-[var(--border-strong)] px-3 text-sm">
                <option>All</option><option>Research article</option><option>PDF available</option>
              </select>
            </label>
            <label className="text-xs font-semibold">Published from
              <input aria-label="Published from" type="date" value={publicationFrom} onChange={(event) => setPublicationFrom(event.target.value)} className="glass-input mt-1 min-h-11 w-full rounded-lg px-3 text-sm" />
            </label>
            <label className="text-xs font-semibold">Published to
              <input aria-label="Published to" type="date" value={publicationTo} onChange={(event) => setPublicationTo(event.target.value)} className="glass-input mt-1 min-h-11 w-full rounded-lg px-3 text-sm" />
            </label>
          </div>
        </section>

        <section aria-labelledby="canonical-research-heading">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold tracking-[0.14em] text-[var(--accent)]">CANONICAL PLACEHOLDER BRAND CONTENT</p>
              <h2 id="canonical-research-heading" className="mt-1 text-xl font-semibold">Research articles</h2>
            </div>
            <p className="text-xs text-[var(--muted)]">{filteredResearch.length} matching items</p>
          </div>
          {filteredResearch.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredResearch.map((article) => (
                <article key={article.slug} className="glass group rounded-2xl p-5 backdrop-blur-xl transition hover:border-[var(--accent)]">
                  <p className="text-xs font-bold tracking-wide text-[var(--accent)]">{article.category} · {article.date}</p>
                  <h3 className="mt-2 text-lg font-semibold">{article.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{article.executiveSummary}</p>
                  <Link href={`/insights/${article.slug}`} className="mt-4 inline-flex min-h-10 items-center text-sm font-bold text-[var(--accent)] hover:underline">
                    Read research <ArrowUpRight size={14} className="ml-1" aria-hidden="true" />
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-[var(--border)] p-5 text-sm text-[var(--muted)]">No PLACEHOLDER BRAND research matches these filters.</p>
          )}
        </section>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-700/30 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 dark:border-emerald-300/30 dark:bg-emerald-950/40 dark:text-emerald-200">
            <Radio size={14} aria-hidden="true" />
            Live Feed <span aria-hidden="true">·</span> Auto-updating
          </div>
          <p className="text-xs text-[var(--muted)]" aria-live="polite">
            {lastUpdated ? `Updated ${readableDate(lastUpdated)}` : "Checking latest headlines"}
            {sources.length ? ` · Sources: ${sources.join(", ")}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Insights category">
          {categories.map((item) => {
            const selected = category === item;
            const Icon = item === "INDUSTRY NEWS" ? Newspaper : TrendingUp;
            return (
              <motion.button
                type="button"
                key={item}
                id={`insights-tab-${item.toLowerCase().replaceAll(" ", "-")}`}
                role="tab"
                aria-selected={selected}
                onClick={() => setCategory(item)}
                className={`relative isolate inline-flex min-h-11 items-center gap-2 rounded-full border px-5 text-xs font-bold tracking-wide transition duration-200 ${
                  selected
                    ? "border-transparent text-[var(--button-text)] shadow-sm"
                    : "border-[var(--border-strong)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--foreground)]"
                }`}
              >
                {selected && (
                  <motion.span
                    layoutId="insights-category-indicator"
                    className="absolute inset-0 rounded-full bg-[var(--accent-fill)]"
                    transition={
                      reduceMotion
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 300, damping: 30 }
                    }
                    aria-hidden="true"
                  />
                )}
                <span className="relative z-10 inline-flex items-center gap-2">
                <Icon size={15} aria-hidden="true" />
                {item === "INDUSTRY NEWS" ? "Industry News" : "Market Commentary"}
                </span>
              </motion.button>
            );
          })}
        </div>

      </div>

      {error ? (
        <p role="alert" className="mt-8 rounded-lg border border-red-700 bg-red-50 p-4 text-sm text-red-800 dark:border-red-400 dark:bg-red-950 dark:text-red-100">
          {error}
        </p>
      ) : loading ? (
        <div
          className="mt-8 grid gap-5 md:grid-cols-2"
          role="status"
          aria-label="Loading live insights"
          aria-busy="true"
        >
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <div className="placeholder-skeleton h-3 w-1/4 rounded" />
              <div className="placeholder-skeleton mt-4 h-6 w-3/4 rounded" />
              <div className="placeholder-skeleton mt-3 h-3 w-1/3 rounded" />
              <div className="placeholder-skeleton mt-6 h-3 w-full rounded" />
              <div className="placeholder-skeleton mt-2 h-3 w-5/6 rounded" />
            </div>
          ))}
        </div>
      ) : results.length === 0 ? (
        <p className="mt-8 rounded-lg border border-[var(--border)] p-6 text-sm text-[var(--muted)]">
          No {category === "INDUSTRY NEWS" ? "industry news" : "market commentary"} stories match this search.
        </p>
      ) : category === "INDUSTRY NEWS" ? (
        <div
          id="insights-panel-industry-news"
          role="tabpanel"
          aria-labelledby="insights-tab-industry-news"
          className="mt-8 divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background)]"
        >
          {visibleResults.map((article, index) => (
            <ScrollReveal key={article.slug} delayMs={index * 220}>
              <article className="group relative p-5 transition-colors hover:bg-[var(--surface)] sm:p-6">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px]">
                <span className="rounded bg-[var(--surface)] px-2.5 py-1 font-bold tracking-wide text-[var(--foreground)]">
                  {article.source}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[var(--muted)]">
                  <Clock3 size={12} aria-hidden="true" /> {readableDate(article.date)}
                </span>
              </div>
              <h2 className="mt-3 max-w-4xl text-lg font-bold leading-snug text-[var(--foreground)] transition-colors group-hover:text-[var(--accent)] sm:text-xl">
                {article.title}
              </h2>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--muted)]">{article.excerpt}</p>
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex min-h-9 items-center gap-2 text-xs font-bold text-[var(--accent)] hover:underline"
              >
                Read full story <ArrowUpRight size={14} aria-hidden="true" />
                <span className="sr-only"> at {article.source} (opens in a new tab)</span>
              </a>
              </article>
            </ScrollReveal>
          ))}
        </div>
      ) : (
        <div
          id="insights-panel-market-commentary"
          role="tabpanel"
          aria-labelledby="insights-tab-market-commentary"
          className="mt-8 grid gap-5 lg:grid-cols-2"
        >
          {visibleResults.map((article, index) => (
            <ScrollReveal key={article.slug} delayMs={index * 220}>
              <article
                className="group relative flex min-h-64 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[linear-gradient(145deg,var(--surface),var(--background))] p-6 transition duration-300 hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-[0_20px_50px_rgba(2,6,23,0.16)] sm:p-8"
              >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--accent-fill)] via-[var(--accent)] to-transparent" />
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-[10px] font-bold tracking-[0.12em] text-[var(--accent)]">
                  <TrendingUp size={13} aria-hidden="true" /> MARKET PERSPECTIVE
                </span>
                <span className="text-[11px] font-semibold text-[var(--muted)]">{article.source}</span>
              </div>
              <p className="mt-5 text-xs text-[var(--muted)]">{readableDate(article.date)}</p>
              <h2 className="mt-2 text-xl font-semibold leading-snug text-[var(--foreground)] transition-colors group-hover:text-[var(--accent)] sm:text-2xl">
                {article.title}
              </h2>
              <p className="mt-3 flex-1 text-sm leading-6 text-[var(--muted)]">{article.excerpt}</p>
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex min-h-10 items-center gap-2 self-start rounded-full border border-[var(--border-strong)] px-4 text-xs font-bold text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                Read commentary <ArrowUpRight size={14} aria-hidden="true" />
                <span className="sr-only"> at {article.source} (opens in a new tab)</span>
              </a>
              </article>
            </ScrollReveal>
          ))}
        </div>
      )}
    </div>
  );
}
