"use client";

import { useCallback, useEffect, useState } from "react";

type ChecklistItem = {
  id: string;
  type: "document" | "confirmation" | "information";
  label: string;
  required: boolean;
  status: "pending" | "submitted" | "verified" | "rejected";
  response_text: string | null;
  rejection_reason: string | null;
  signedUrl: string | null;
};
type PackData = {
  pack: { title: string; status: string; expiresAt: string; submittedAt: string | null };
  items: ChecklistItem[];
};

function messageFrom(response: Response, body: unknown) {
  return typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
    ? body.error
    : `Request failed (${response.status}).`;
}

export function RenewalPackClient({ token }: { token: string }) {
  const [data, setData] = useState<PackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File | undefined>>({});
  const [busyItem, setBusyItem] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const endpoint = `/api/renewal-packs/${token}`;
  const load = useCallback(async () => {
    setError("");
    const response = await fetch(endpoint, { cache: "no-store", referrerPolicy: "no-referrer" });
    const body = await response.json();
    if (!response.ok) throw new Error(messageFrom(response, body));
    setData(body);
    setResponses((current) => {
      const next = { ...current };
      for (const item of body.items as ChecklistItem[]) {
        if (!(item.id in next)) next[item.id] = item.response_text ?? "";
      }
      return next;
    });
  }, [endpoint]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load()
        .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "The renewal checklist could not be loaded."))
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function saveItem(item: ChecklistItem) {
    setBusyItem(item.id);
    setError("");
    setMessage("");
    try {
      const file = files[item.id];
      let response: Response;
      if (file) {
        const formData = new FormData();
        formData.set("itemId", item.id);
        formData.set("file", file);
        response = await fetch(endpoint, { method: "POST", body: formData, referrerPolicy: "no-referrer" });
      } else {
        response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "respond", itemId: item.id, response: responses[item.id] }),
          referrerPolicy: "no-referrer",
        });
      }
      const body = await response.json();
      if (!response.ok) throw new Error(messageFrom(response, body));
      setFiles((current) => ({ ...current, [item.id]: undefined }));
      setMessage(`${item.label} saved.`);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "The checklist item could not be saved.");
    } finally {
      setBusyItem("");
    }
  }

  async function submitPack() {
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit" }),
        referrerPolicy: "no-referrer",
      });
      const body = await response.json();
      if (!response.ok) throw new Error(messageFrom(response, body));
      setMessage("Your renewal pack has been submitted securely.");
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "The renewal pack could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <main className="mx-auto max-w-3xl px-5 py-12"><p role="status">Loading secure renewal checklist…</p></main>;
  if (error && !data) return <main className="mx-auto max-w-3xl px-5 py-12"><p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">{error}</p></main>;
  if (!data) return null;

  const requiredItems = data.items.filter((item) => item.required);
  const completeCount = requiredItems.filter((item) => item.status === "submitted" || item.status === "verified").length;
  const canEdit = data.pack.status === "active";
  const allComplete = completeCount === requiredItems.length;

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 lg:px-8">
      <header className="placeholder-glass-card rounded-3xl p-6 sm:p-8">
        <p className="text-xs font-bold tracking-[0.16em] text-[var(--accent)]">SECURE CLIENT CHECKLIST</p>
        <h1 className="mt-2 text-3xl font-semibold">{data.pack.title}</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">Complete the requested information and upload supporting evidence. Only your adviser can access submitted items.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[var(--border)] p-3"><p className="text-xs text-[var(--muted)]">Progress</p><p className="mt-1 font-semibold">{completeCount} of {requiredItems.length} required items completed</p></div>
          <div className="rounded-xl border border-[var(--border)] p-3"><p className="text-xs text-[var(--muted)]">Pack status · expiry</p><p className="mt-1 font-semibold capitalize">{data.pack.status} · {new Date(data.pack.expiresAt).toLocaleDateString()}</p></div>
        </div>
      </header>

      {error ? <p role="alert" className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm">{error}</p> : null}
      {message ? <p role="status" className="mt-5 rounded-xl border border-[var(--border)] p-4 text-sm">{message}</p> : null}

      <ol className="mt-5 space-y-4">
        {data.items.map((item, index) => {
          const editable = canEdit && (item.status === "pending" || item.status === "rejected");
          return (
            <li key={item.id} className="placeholder-glass-card rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-[var(--muted)]">ITEM {index + 1} {item.required ? "· REQUIRED" : "· OPTIONAL"}</p>
                  <h2 className="mt-1 text-lg font-semibold">{item.label}</h2>
                </div>
                <span className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold capitalize">{item.status}</span>
              </div>
              {item.rejection_reason ? <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">Your adviser requested a correction: {item.rejection_reason}</p> : null}
              {item.response_text && !editable ? <p className="mt-3 whitespace-pre-wrap rounded-xl bg-[var(--surface)] p-3 text-sm">{item.response_text}</p> : null}
              {item.signedUrl ? <a href={item.signedUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm font-semibold text-[var(--accent)]">View your submitted file</a> : null}
              {editable ? (
                <div className="mt-4 space-y-3">
                  <label className="block text-sm font-semibold">Your response
                    <textarea maxLength={2000} value={responses[item.id] ?? ""} onChange={(event) => setResponses((current) => ({ ...current, [item.id]: event.target.value }))} className="mt-2 min-h-24 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] p-3 font-normal" />
                  </label>
                  <label className="block text-sm font-semibold">Supporting file <span className="font-normal text-[var(--muted)]">(PDF, JPG or PNG · up to 10 MB)</span>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(event) => setFiles((current) => ({ ...current, [item.id]: event.target.files?.[0] }))} className="mt-2 block w-full text-sm" />
                  </label>
                  <button type="button" disabled={busyItem === item.id || submitting || (!files[item.id] && !(responses[item.id] ?? "").trim())} onClick={() => void saveItem(item)} className="min-h-10 rounded-full bg-[var(--accent-fill)] px-5 text-sm font-bold text-[var(--button-text)] disabled:opacity-50">
                    {busyItem === item.id ? "Saving…" : "Save item"}
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
      {canEdit ? (
        <div className="placeholder-glass-card mt-5 rounded-2xl p-5">
          <button type="button" disabled={!allComplete || submitting} onClick={() => void submitPack()} className="min-h-12 w-full rounded-full bg-[var(--accent-fill)] px-5 text-sm font-bold text-[var(--button-text)] disabled:opacity-50">
            {submitting ? "Submitting…" : "Submit renewal pack"}
          </button>
          {!allComplete ? <p className="mt-2 text-center text-xs text-[var(--muted)]">Complete each required item to submit.</p> : null}
        </div>
      ) : (
        <p className="mt-5 rounded-2xl border border-[var(--border)] p-5 text-sm">
          {data.pack.status === "verified" ? "Your renewal pack has been verified." : "Your renewal pack was submitted and is waiting for adviser review."}
        </p>
      )}
      <p className="mt-5 text-center text-xs text-[var(--muted)]">This link is private. Do not forward it. Files are stored securely and the link expires automatically.</p>
    </main>
  );
}
