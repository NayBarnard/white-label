"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { researchCategories } from "@/lib/insights/catalog";
import type { ResearchArticle } from "@/lib/insights/catalog";

export function PublishedResearchFeed() {
  const [articles, setArticles] = useState<ResearchArticle[]>([]);
  const [category, setCategory] = useState("All categories");
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/insights?type=research", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as { articles?: ResearchArticle[]; error?: string };
        if (!response.ok) throw new Error(result.error ?? "Published PLACEHOLDER BRAND research could not be loaded.");
        return result;
      })
      .then((result) => {
        if (!controller.signal.aborted) setArticles(result.articles ?? []);
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) setError(requestError instanceof Error ? requestError.message : "Published PLACEHOLDER BRAND research could not be loaded.");
      });
    return () => controller.abort();
  }, []);

  const visible = useMemo(
    () => articles.filter((article) => category === "All categories" || article.category === category),
    [articles, category],
  );

  return (
    <div>
      <label className="mb-4 block max-w-xs text-xs font-semibold">Filter by category
        <select value={category} onChange={(event) => setCategory(event.target.value)} className="glass-select mt-1 min-h-11 w-full rounded-lg border border-[var(--border-strong)] px-3 text-sm">
          <option>All categories</option>{researchCategories.map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
      {error ? <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm">{error}</p> : null}
      {!error && articles.length === 0 ? <p role="status" className="text-sm text-[var(--muted)]">Loading published PLACEHOLDER BRAND research…</p> : null}
      {visible.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((article) => (
            <article key={article.slug} className="placeholder-glass-card rounded-2xl p-5 sm:p-6">
              <p className="text-xs font-bold tracking-[0.12em] text-[var(--accent)]">{article.category} · {article.date}</p>
              <h3 className="mt-2 font-semibold">{article.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{article.executiveSummary}</p>
              <Link className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)] hover:underline" href={`/insights/${article.slug}`}>
                Read canonical research <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
