"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Circle, Copy, Search, X } from "lucide-react";
import { Sheet } from "@/components/IOSKit";
import {
  classifyPlatformQuery,
  isAvailabilityStale,
  searchPlatformRecords,
  type PlatformSearchRecord,
} from "@/lib/platforms";

const DISCLAIMER =
  "Information for authorised financial advisers. Always confirm codes and availability with the platform before placing a transaction.";
const EMPTY_MESSAGE = "No platform availability has been published yet";

function statusLabel(status: PlatformSearchRecord["availability"]["status"]) {
  if (status === "verified_available") return "Verified available";
  if (status === "verified_unavailable") return "Verified not available";
  return "Not verified";
}

function StatusMark({ record }: { record: PlatformSearchRecord }) {
  const { status, verifiedOn } = record.availability;
  const stale = isAvailabilityStale(verifiedOn);
  return (
    <span className="inline-flex items-center gap-2 text-sm" aria-label={`${statusLabel(status)}${stale ? ", re-verify" : ""}`}>
      {status === "verified_available" ? (
        <Check size={18} className="text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
      ) : status === "verified_unavailable" ? (
        <X size={18} className="text-red-700 dark:text-red-300" aria-hidden="true" />
      ) : (
        <Circle size={16} className="text-[var(--muted)]" aria-hidden="true" />
      )}
      <span>{statusLabel(status)}</span>
      {stale ? <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-300/15 dark:text-amber-200">Re-verify</span> : null}
    </span>
  );
}

export function AdviserPlatformsPage() {
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<PlatformSearchRecord[]>([]);
  const [selected, setSelected] = useState<PlatformSearchRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [emptyMessage, setEmptyMessage] = useState(EMPTY_MESSAGE);
  const [copied, setCopied] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(target.tagName))) return;
      event.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/advisor/platforms?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) {
          const result = await response.json().catch(() => null) as { error?: string } | null;
          throw new Error(result?.error ?? "Platform availability could not be loaded. Please try again.");
        }
        const result = await response.json() as {
          items: PlatformSearchRecord[];
          emptyMessage: string | null;
        };
        setRecords(result.items);
        setEmptyMessage(result.emptyMessage ?? EMPTY_MESSAGE);
      } catch (requestError) {
        if (controller.signal.aborted) return;
        setError(requestError instanceof Error ? requestError.message : "Platform availability could not be loaded. Please try again.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  const matching = searchPlatformRecords(records, query);
  const recognized = query.trim() ? classifyPlatformQuery(query, records) : null;

  async function copyCode(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(`${label} copied`);
    } catch (copyError) {
      console.error("Platform code copy failed.", copyError);
      setCopied("The code could not be copied. Please select and copy it manually.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-5 py-10 lg:px-8 lg:py-14">
      <header>
        <p className="text-xs font-bold tracking-[0.18em] text-[var(--accent)]">ADVISER TOOLS</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Platform Matrix</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">{DISCLAIMER}</p>
      </header>

      <section className="placeholder-glass-card space-y-5 rounded-2xl p-4 sm:p-6" aria-label="Platform fund-code search">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">Search platforms</span>
          <span className="flex items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3">
            <Search size={17} className="shrink-0 text-[var(--muted)]" aria-hidden="true" />
            <input
              ref={inputRef}
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by fund name, ISIN or JSE code"
              className="min-h-12 w-full bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
              aria-label="Search by fund name, ISIN or JSE code"
            />
          </span>
        </label>
        {query.trim() ? (
          <p role="status" className="text-sm text-[var(--muted)]">
            Recognized query: {recognized === "isin" ? "ISIN" : recognized === "jse_code" ? "JSE code" : "fund or platform name"}
          </p>
        ) : null}
        {loading ? <p role="status" className="text-sm text-[var(--muted)]">Loading platform availability…</p> : null}
        {error ? <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm">{error}</p> : null}
        {!loading && !error && !matching.length ? (
          <p role="status" className="rounded-xl border border-dashed border-[var(--border-strong)] p-5 text-sm text-[var(--muted)]">
            {records.length ? "No platform entries match this search." : emptyMessage}
          </p>
        ) : null}

        {!loading && matching.length ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-[var(--muted)]">
                  <tr>
                    <th className="p-3">Fund / share class</th>
                    <th className="p-3">Platform</th>
                    <th className="p-3">Platform code</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Dates</th>
                    <th className="p-3"><span className="sr-only">Details</span></th>
                  </tr>
                </thead>
                <tbody>
                  {matching.map((record) => (
                    <tr key={record.availability.id} className="border-t border-[var(--border)]">
                      <td className="p-3 font-medium">{record.shareClass.fundName}<span className="block text-xs text-[var(--muted)]">{record.shareClass.shareClass}</span></td>
                      <td className="p-3">{record.platform.name}</td>
                      <td className="p-3">{record.availability.platformFundCode ?? "Not listed"}</td>
                      <td className="p-3"><StatusMark record={record} /></td>
                      <td className="p-3 text-xs text-[var(--muted)]">
                        Verified: {record.availability.verifiedOn ?? "Not recorded"}
                        <br />Entry updated: {record.availability.updatedAt.slice(0, 10)}
                      </td>
                      <td className="p-3"><button type="button" className="min-h-11 rounded-full border border-[var(--border-strong)] px-4 text-xs font-semibold" onClick={() => setSelected(record)}>Details</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="grid gap-3 md:hidden">
              {matching.map((record) => (
                <li key={record.availability.id} className="rounded-xl border border-[var(--border)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><h2 className="font-semibold">{record.shareClass.fundName}</h2><p className="text-sm text-[var(--muted)]">{record.shareClass.shareClass} · {record.platform.name}</p></div>
                    <StatusMark record={record} />
                  </div>
                  <p className="mt-3 text-sm">Platform code: {record.availability.platformFundCode ?? "Not listed"}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">Verified: {record.availability.verifiedOn ?? "Not recorded"} · Updated: {record.availability.updatedAt.slice(0, 10)}</p>
                  <button type="button" className="mt-3 min-h-11 rounded-full border border-[var(--border-strong)] px-4 text-xs font-semibold" onClick={() => setSelected(record)}>Details</button>
                </li>
              ))}
            </ul>
          </>
        ) : null}
        <p aria-live="polite" className="min-h-5 text-sm text-[var(--muted)]">{copied}</p>
      </section>

      <Sheet open={selected !== null} onClose={() => setSelected(null)} title="Platform availability details">
        {selected ? (
          <div className="space-y-5 pb-4">
            <div>
              <h2 className="text-lg font-semibold">{selected.shareClass.fundName}</h2>
              <p className="text-sm text-[var(--muted)]">{selected.shareClass.shareClass} · {selected.platform.name}</p>
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {selected.shareClass.jseCode ? <div><dt className="text-[var(--muted)]">JSE code</dt><dd className="font-medium">{selected.shareClass.jseCode}</dd></div> : null}
              {selected.shareClass.isin ? <div><dt className="text-[var(--muted)]">ISIN</dt><dd className="font-medium">{selected.shareClass.isin}</dd></div> : null}
              <div><dt className="text-[var(--muted)]">Platform</dt><dd className="font-medium">{selected.platform.name}</dd></div>
              <div><dt className="text-[var(--muted)]">Status</dt><dd><StatusMark record={selected} /></dd></div>
              <div><dt className="text-[var(--muted)]">Source</dt><dd className="font-medium">{selected.availability.source ?? "Not recorded"}</dd></div>
              {selected.availability.sourceUrl ? <div><dt className="text-[var(--muted)]">Source link</dt><dd><a className="break-all text-[var(--accent)] underline" href={selected.availability.sourceUrl} target="_blank" rel="noreferrer">{selected.availability.sourceUrl}</a></dd></div> : null}
              <div><dt className="text-[var(--muted)]">Verified by</dt><dd className="font-medium">{selected.availability.verifiedBy ?? "Not recorded"}</dd></div>
              <div><dt className="text-[var(--muted)]">Verified on</dt><dd className="font-medium">{selected.availability.verifiedOn ?? "Not recorded"}</dd></div>
              <div><dt className="text-[var(--muted)]">Entry date</dt><dd className="font-medium">{selected.availability.createdAt.slice(0, 10)}</dd></div>
            </dl>
            {[
              selected.shareClass.jseCode && ["JSE code", selected.shareClass.jseCode],
              selected.shareClass.isin && ["ISIN", selected.shareClass.isin],
              selected.availability.platformFundCode && ["Platform fund code", selected.availability.platformFundCode],
            ].filter((code): code is [string, string] => Boolean(code)).map(([label, code]) => (
              <button key={label} type="button" onClick={() => void copyCode(label, code)} className="mr-2 inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--border-strong)] px-4 text-sm font-semibold">
                <Copy size={15} aria-hidden="true" /> Copy {label}
              </button>
            ))}
            <p className="text-xs leading-5 text-[var(--muted)]">{DISCLAIMER}</p>
          </div>
        ) : null}
      </Sheet>
    </main>
  );
}
