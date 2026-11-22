"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

type SearchResult = {
  id: string;
  category: string;
  title: string;
  description: string;
  href: string;
};

const categoryLabels: Record<string, string> = {
  fund: "Funds",
  provider: "Providers",
  platform: "Platforms",
  document: "Documents",
  insight: "Research",
  resource: "Resources",
  task: "Tasks",
  client: "Clients",
  request: "Requests",
  other: "Other",
};

export function AdviserSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const searched = query.trim().length >= 2;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      const timeout = window.setTimeout(() => {
        setLoading(false);
        setError("");
        setResults([]);
      }, 0);
      return () => window.clearTimeout(timeout);
    }
    if (trimmed.length > 100) {
      const timeout = window.setTimeout(() => {
        setLoading(false);
        setError("Search text must be 100 characters or fewer.");
        setResults([]);
      }, 0);
      return () => window.clearTimeout(timeout);
    }
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/advisor/search?q=${encodeURIComponent(trimmed)}&limit=12`, {
          cache: "no-store",
        });
        const data = await response.json() as { results?: SearchResult[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Search could not be completed.");
        setResults(Array.isArray(data.results) ? data.results : []);
      } catch (caught) {
        setResults([]);
        setError(caught instanceof Error ? caught.message : "Search could not be completed.");
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [query]);

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-12 lg:px-8">
      <header>
        <p className="text-xs font-bold tracking-[0.18em] text-[var(--accent)]">ADVISER DISCOVERY</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Universal search</h1>
      </header>
      <div className="mt-7 flex items-center gap-3 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] px-4">
        <Search size={19} className="shrink-0 text-[var(--muted)]" aria-hidden="true" />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-h-14 min-w-0 flex-1 bg-transparent text-base outline-none"
          placeholder="Search funds, clients, documents, tasks..."
          aria-label="Search platform"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="rounded-full p-2 text-[var(--muted)] hover:bg-[var(--surface-strong)]">
            <X size={18} />
          </button>
        )}
        <kbd className="hidden rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--muted)] sm:block">Ctrl/Cmd K</kbd>
      </div>

      {loading && <p role="status" className="mt-6 text-sm text-[var(--muted)]">Searching…</p>}
      {error && <p role="alert" className="mt-6 rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm">{error}</p>}
      {!loading && !error && searched && results.length === 0 && (
        <p role="status" className="mt-6 rounded-2xl border border-[var(--border)] p-6 text-sm text-[var(--muted)]">
          No authorised records match this search.
        </p>
      )}
      {!searched && (
        <p className="mt-6 text-sm text-[var(--muted)]">Enter at least two characters to search authorised records.</p>
      )}
      {results.length > 0 && (
        <ul className="mt-6 grid gap-3">
          {results.map((result) => (
            <li key={result.id}>
              <Link href={result.href} className="block rounded-2xl border border-[var(--border)] p-5 transition hover:border-[var(--accent)]">
                <p className="text-xs font-bold tracking-[0.12em] text-[var(--accent)]">
                  {categoryLabels[result.category] ?? "Other"}
                </p>
                <p className="mt-2 font-semibold">{result.title}</p>
                {result.description && <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{result.description}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
