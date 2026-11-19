"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { strategies } from "@/data/firmData";

export function AdviserPackGenerator({ clientId }: { clientId: string }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/advisor/clients/${clientId}/pack`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fundIds: selected }),
      });
      if (!response.ok) throw new Error("The adviser pack could not be generated.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `placeholder-adviser-pack-${clientId}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (generationError) {
      console.error("Adviser pack download failed.", generationError);
      setError("The adviser pack could not be generated.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-10 lg:px-8">
      <Link href={`/advisor/clients/${clientId}`} className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[var(--accent)]">
        <ArrowLeft size={16} /> Back to client profile
      </Link>
      <section className="placeholder-glass-card mt-5 rounded-3xl p-5 sm:p-7">
        <p className="text-xs font-bold tracking-[0.16em] text-[var(--accent)]">ADVISER PACK</p>
        <h1 className="mt-2 text-3xl font-semibold">Generate client meeting pack</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">The pack includes only published fund facts and authorised client portfolio records. Missing data is identified rather than filled with estimates.</p>

        <form onSubmit={generate} className="mt-6">
          <fieldset>
            <legend className="text-sm font-semibold">Select funds</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {strategies.map((strategy) => (
                <label key={strategy.id} className="flex min-h-12 items-center gap-3 rounded-xl border border-[var(--border)] px-4">
                  <input
                    type="checkbox"
                    checked={selected.includes(strategy.id)}
                    onChange={(event) => setSelected((current) =>
                      event.target.checked ? [...current, strategy.id].slice(0, 4) : current.filter((id) => id !== strategy.id),
                    )}
                  />
                  <span className="text-sm font-semibold">{strategy.title}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {error ? <p role="alert" className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm">{error}</p> : null}
          <button type="submit" disabled={busy} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--accent-fill)] px-5 text-sm font-bold text-[var(--button-text)]">
            <Download size={17} /> {busy ? "Generating…" : "Generate PDF pack"}
          </button>
        </form>
      </section>
    </main>
  );
}
