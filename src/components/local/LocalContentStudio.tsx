"use client";

import { useState } from "react";
import { useLocalState } from "@/lib/local-store";

type StudioContent = {
  eyebrow: string;
  title: string;
  description: string;
  sectionTitle: string;
};

export function LocalContentStudio() {
  const [content, setContent] = useLocalState<StudioContent>("example-wealth.studio.homepage", {
    eyebrow: "WEALTH MANAGEMENT",
    title: "A considered approach to long-term wealth.",
    description: "Explore a configurable, illustrative platform for investments and planning.",
    sectionTitle: "Investment solutions",
  });
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState("");

  function restoreDefaults() {
    setContent({
      eyebrow: "WEALTH MANAGEMENT",
      title: "A considered approach to long-term wealth.",
      description: "Explore a configurable, illustrative platform for investments and planning.",
      sectionTitle: "Investment solutions",
    });
    setMessage("Default local content restored.");
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-10 lg:px-8">
      <p className="text-xs font-bold tracking-[0.18em] text-[var(--accent)]">LOCAL CONTENT STUDIO</p>
      <h1 className="mt-2 text-3xl font-semibold">Homepage editor</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Changes publish only to local browser storage in this demonstration.</p>
      <div className="mt-7 grid gap-5 lg:grid-cols-2">
        <section className="glass rounded-3xl p-5">
          <div className="space-y-4">
            {([
              ["eyebrow", "Eyebrow"],
              ["title", "Main heading"],
              ["description", "Description"],
              ["sectionTitle", "Section heading"],
            ] as const).map(([key, label]) => (
              <label key={key} className="block text-sm font-semibold">{label}
                <textarea rows={key === "description" ? 3 : 2} value={content[key]} onChange={(event) => setContent((current) => ({ ...current, [key]: event.target.value }))} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3" />
              </label>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={() => { setPreview(true); setMessage("Local preview published."); }} className="min-h-11 rounded-full bg-[var(--accent-fill)] px-5 text-sm font-bold text-[var(--button-text)]">Publish locally</button>
            <button type="button" onClick={restoreDefaults} className="min-h-11 rounded-full border border-[var(--border)] px-5 text-sm font-semibold">Restore defaults</button>
          </div>
        </section>
        <section className="glass rounded-3xl p-5 sm:p-7">
          <p className="text-xs text-[var(--muted)]">{preview ? "Preview" : "Saved preview"}</p>
          <article className="mt-5 rounded-2xl border border-[var(--border)] p-6">
            <p className="text-xs font-bold tracking-[0.16em] text-[var(--accent)]">{content.eyebrow}</p>
            <h2 className="mt-3 text-3xl font-semibold">{content.title}</h2>
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{content.description}</p>
            <h3 className="mt-8 text-xl font-semibold">{content.sectionTitle}</h3>
          </article>
        </section>
      </div>
      {message && <p role="status" className="mt-5 text-sm text-[var(--accent)]">{message}</p>}
    </main>
  );
}
