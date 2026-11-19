"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, FileText, Search } from "lucide-react";

const categories = [
  "Monthly Outlooks",
  "Quarterly Outlooks",
  "Annual Outlooks",
  "Fund Fact Sheets / MDDs",
  "Manager Updates",
  "Presentations",
  "Educational Material",
  "Investor Notices",
] as const;

type LibraryDocument = {
  id: string;
  slug: string;
  title: string;
  version: number;
  category: string;
  strategy: string;
  publicationDate: string;
  format: string;
  sizeBytes: number | null;
  checksum: string | null;
  status: "Latest" | "Archived";
  approvedAt: string | null;
  publishedAt: string | null;
  downloadUrl: string | null;
};

function fileSize(bytes: number | null) {
  if (!bytes) return "Size not supplied";
  return `${new Intl.NumberFormat("en-ZA", { maximumFractionDigits: 1 }).format(bytes / 1024)} KB`;
}

export function ResearchLibrary() {
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories");
  const [strategy, setStrategy] = useState("All strategies");
  const [versionStatus, setVersionStatus] = useState("All versions");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/insights/library", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as { documents?: LibraryDocument[]; error?: string };
        if (!response.ok) throw new Error(result.error ?? "The library could not be loaded.");
        return result;
      })
      .then((result) => {
        if (!controller.signal.aborted) setDocuments(result.documents ?? []);
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) setError(requestError instanceof Error ? requestError.message : "The library could not be loaded.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const filtered = useMemo(() => documents.filter((document) => {
    const textMatches = `${document.title} ${document.category} ${document.strategy}`.toLowerCase().includes(query.trim().toLowerCase());
    return textMatches &&
      (category === "All categories" || document.category === category) &&
      (strategy === "All strategies" || document.strategy === strategy || document.strategy === "Both") &&
      (versionStatus === "All versions" || document.status === versionStatus);
  }), [category, documents, query, strategy, versionStatus]);

  return (
    <div>
      <div className="glass grid gap-3 rounded-2xl p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-semibold">Search documents
          <span className="mt-1 flex min-h-11 items-center gap-2 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 backdrop-blur-xl">
            <Search size={15} aria-hidden="true" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="Title, category or strategy" />
          </span>
        </label>
        <label className="text-xs font-semibold">Category
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="glass-select mt-1 min-h-11 w-full rounded-lg border border-[var(--border-strong)] px-3 text-sm">
            <option>All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold">Strategy
          <select value={strategy} onChange={(event) => setStrategy(event.target.value)} className="glass-select mt-1 min-h-11 w-full rounded-lg border border-[var(--border-strong)] px-3 text-sm">
            <option>All strategies</option><option>PLACEHOLDER BRAND Balanced</option><option>PLACEHOLDER BRAND Cautious</option>
          </select>
        </label>
        <label className="text-xs font-semibold">Version status
          <select value={versionStatus} onChange={(event) => setVersionStatus(event.target.value)} className="glass-select mt-1 min-h-11 w-full rounded-lg border border-[var(--border-strong)] px-3 text-sm">
            <option>All versions</option><option>Latest</option><option>Archived</option>
          </select>
        </label>
      </div>
      {error ? <p role="alert" className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm">{error}</p> : null}
      {loading ? <p role="status" className="mt-5 text-sm text-[var(--muted)]">Loading published document versions…</p> : null}
      {!loading && !error && filtered.length === 0 ? (
        <p className="glass mt-5 rounded-xl p-5 text-sm text-[var(--muted)]">No published versions match the selected filters.</p>
      ) : null}
      <ul className="mt-5 grid gap-4 md:grid-cols-2">
        {filtered.map((document) => (
          <li key={document.id} className="glass rounded-2xl p-5 backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-fill)]/15 text-[var(--accent)]"><FileText size={19} aria-hidden="true" /></span>
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${document.status === "Latest" ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-300" : "border-[var(--border)] text-[var(--muted)]"}`}>{document.status} · v{document.version}</span>
            </div>
            <h2 className="mt-4 text-lg font-semibold">{document.title}</h2>
            <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
              {document.category} · {document.strategy} · Published {document.publicationDate}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">{document.format} · {fileSize(document.sizeBytes)}</p>
            <p className="mt-2 break-all text-[10px] text-[var(--muted)]">
              SHA-256: {document.checksum ?? "Not supplied"} · Approved {document.approvedAt ? new Date(document.approvedAt).toLocaleDateString("en-ZA") : "date not supplied"}
            </p>
            {document.downloadUrl ? (
              <a href={document.downloadUrl} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--accent-fill)] px-4 text-xs font-bold text-[var(--button-text)]">
                <ArrowDownToLine size={15} aria-hidden="true" /> Download latest version
              </a>
            ) : (
              <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-5 text-[var(--muted)]">
                Archived version — downloads are disabled to prevent accidental use of superseded material.
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
