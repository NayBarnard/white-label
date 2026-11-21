"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

type RenewalItem = {
  id: string;
  type: "document" | "confirmation" | "information";
  label: string;
  required: boolean;
  status: "pending" | "submitted" | "verified" | "rejected";
  response_text: string | null;
  rejection_reason: string | null;
  signedUrl: string | null;
};
type PackSummary = {
  id: string;
  title: string;
  status: string;
  expires_at: string;
  submitted_at: string | null;
  created_at: string;
};
type PackDetail = { pack: PackSummary; items: RenewalItem[] };
type NewItem = { label: string; type: RenewalItem["type"]; required: boolean };

const PRESETS: Record<string, { title: string; items: NewItem[] }> = {
  annual: {
    title: "Annual client review",
    items: [
      { label: "Confirm your contact details", type: "confirmation", required: true },
      { label: "Upload proof of address", type: "document", required: true },
      { label: "Confirm any changes to your income or employment", type: "information", required: true },
    ],
  },
  documents: {
    title: "Client evidence request",
    items: [
      { label: "Upload a current identity document", type: "document", required: true },
      { label: "Upload proof of address", type: "document", required: true },
    ],
  },
};

function messageFrom(response: Response, body: unknown) {
  return typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
    ? body.error
    : `Request failed (${response.status}).`;
}

export function RenewalPackManager({ clientId }: { clientId: string }) {
  const [packs, setPacks] = useState<PackSummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<PackDetail | null>(null);
  const [preset, setPreset] = useState("annual");
  const [title, setTitle] = useState(PRESETS.annual.title);
  const [items, setItems] = useState<NewItem[]>(PRESETS.annual.items);
  const [expiresInDays, setExpiresInDays] = useState(14);
  const [customLabel, setCustomLabel] = useState("");
  const [customType, setCustomType] = useState<NewItem["type"]>("document");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});

  const collectionUrl = useMemo(() => `/api/advisor/clients/${clientId}/renewal-packs`, [clientId]);
  const loadPacks = useCallback(async () => {
    setError("");
    const response = await fetch(collectionUrl, { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(messageFrom(response, body));
    setPacks(body.packs);
    if (selectedId && !body.packs.some((pack: PackSummary) => pack.id === selectedId)) {
      setSelectedId("");
      setDetail(null);
    }
  }, [collectionUrl, selectedId]);
  const loadDetail = useCallback(async (packId: string) => {
    setError("");
    const response = await fetch(`${collectionUrl}/${packId}`, { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(messageFrom(response, body));
    setDetail(body);
  }, [collectionUrl]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPacks().catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Renewal packs could not be loaded."));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadPacks]);

  useEffect(() => {
    if (!selectedId) return;
    const timer = window.setTimeout(() => {
      void loadDetail(selectedId).catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Renewal pack details could not be loaded."));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadDetail, selectedId]);

  function choosePreset(value: string) {
    setPreset(value);
    if (value !== "custom") {
      setTitle(PRESETS[value].title);
      setItems(PRESETS[value].items.map((item) => ({ ...item })));
    } else {
      setTitle("");
      setItems([]);
    }
  }

  function addCustomItem() {
    if (!customLabel.trim()) return;
    setItems((current) => [...current, { label: customLabel.trim(), type: customType, required: true }]);
    setCustomLabel("");
  }

  async function createPack(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(collectionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, expiresInDays, items }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(messageFrom(response, body));
      setLink(body.link);
      setMessage("Renewal link created. Copy it now; it is only shown at creation.");
      setSelectedId(body.pack.id);
      await loadPacks();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "The renewal pack could not be created.");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setMessage("Secure renewal link copied.");
    } catch {
      setError("The link could not be copied. Select and copy the displayed link.");
    }
  }

  async function reviewItem(item: RenewalItem, action: "verify" | "reject") {
    if (action === "reject" && !rejectionReasons[item.id]?.trim()) {
      setError("Enter a reason before returning an item to the client.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`${collectionUrl}/${selectedId}/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "reject"
          ? { action, reason: rejectionReasons[item.id] }
          : { action }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(messageFrom(response, body));
      setMessage(action === "verify" ? "Evidence verified." : "Item returned to the client for correction.");
      await loadDetail(selectedId);
      await loadPacks();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "The item review could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function revokePack(packId: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${collectionUrl}/${packId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke" }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(messageFrom(response, body));
      setMessage("The secure renewal link was revoked.");
      setLink("");
      await loadPacks();
      if (selectedId === packId) await loadDetail(packId);
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : "The renewal link could not be revoked.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="space-y-5">
        <form onSubmit={createPack} className="placeholder-glass-card space-y-4 rounded-2xl p-5">
          <div>
            <h2 className="text-lg font-semibold">Create a renewal pack</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Create a private checklist and one-time share link for this client.</p>
          </div>
          <label className="block text-sm font-semibold">Starting template
            <select value={preset} onChange={(event) => choosePreset(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3">
              <option value="annual">Annual client review</option>
              <option value="documents">Identity and address evidence</option>
              <option value="custom">Custom checklist</option>
            </select>
          </label>
          <label className="block text-sm font-semibold">Pack title
            <input required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3" />
          </label>
          {preset === "custom" ? (
            <div className="space-y-3 rounded-xl border border-[var(--border)] p-3">
              <label className="block text-sm">Checklist item
                <input maxLength={160} value={customLabel} onChange={(event) => setCustomLabel(event.target.value)} className="mt-2 min-h-10 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-3" />
              </label>
              <div className="flex gap-2">
                <select value={customType} onChange={(event) => setCustomType(event.target.value as NewItem["type"])} aria-label="Checklist item type" className="min-h-10 min-w-0 flex-1 rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-2">
                  <option value="document">Document upload</option>
                  <option value="confirmation">Confirmation</option>
                  <option value="information">Information</option>
                </select>
                <button type="button" onClick={addCustomItem} className="min-h-10 rounded-full border border-[var(--border)] px-4 text-sm font-semibold">Add item</button>
              </div>
            </div>
          ) : null}
          <ul className="space-y-2 text-sm">
            {items.map((item, index) => (
              <li key={`${item.label}-${index}`} className="flex items-start justify-between gap-3 rounded-xl bg-[var(--surface)] p-3">
                <span>{item.label}<span className="ml-2 text-xs text-[var(--muted)]">{item.type}</span></span>
                <button type="button" aria-label={`Remove ${item.label}`} onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="text-xs font-semibold text-[var(--accent)]">Remove</button>
              </li>
            ))}
          </ul>
          <label className="block text-sm font-semibold">Link expires in
            <select value={expiresInDays} onChange={(event) => setExpiresInDays(Number(event.target.value))} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3">
              {[7, 14, 30, 60, 90].map((days) => <option key={days} value={days}>{days} days</option>)}
            </select>
          </label>
          <button type="submit" disabled={busy || items.length === 0} className="min-h-11 w-full rounded-full bg-[var(--accent-fill)] px-5 text-sm font-bold text-[var(--button-text)] disabled:opacity-50">
            {busy ? "Working…" : "Create secure link"}
          </button>
        </form>

        {link ? (
          <div className="placeholder-glass-card rounded-2xl p-5">
            <p className="font-semibold">New secure client link</p>
            <label className="sr-only" htmlFor="renewal-share-link">Secure link</label>
            <input id="renewal-share-link" readOnly value={link} className="mt-3 min-h-11 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 text-sm" />
            <button type="button" onClick={() => void copyLink()} className="mt-3 min-h-10 rounded-full bg-[var(--accent-fill)] px-4 text-xs font-bold text-[var(--button-text)]">Copy share link</button>
          </div>
        ) : null}

        <div className="placeholder-glass-card rounded-2xl p-5">
          <h2 className="text-lg font-semibold">Renewal packs</h2>
          {packs.length ? (
            <ul className="mt-3 divide-y divide-[var(--border)]">
              {packs.map((pack) => (
                <li key={pack.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <button type="button" onClick={() => setSelectedId(pack.id)} className="min-w-0 text-left">
                    <span className="block font-semibold">{pack.title}</span>
                    <span className="text-xs text-[var(--muted)]">{pack.status} · expires {new Date(pack.expires_at).toLocaleDateString()}</span>
                  </button>
                  {pack.status !== "revoked" ? <button type="button" disabled={busy} onClick={() => void revokePack(pack.id)} className="text-xs font-semibold text-red-700">Revoke link</button> : null}
                </li>
              ))}
            </ul>
          ) : <p className="mt-3 text-sm text-[var(--muted)]">No renewal packs have been created.</p>}
        </div>
      </div>

      <div className="placeholder-glass-card min-h-40 rounded-2xl p-5">
        <h2 className="text-lg font-semibold">Evidence verification</h2>
        {!selectedId ? <p className="mt-3 text-sm text-[var(--muted)]">Select a renewal pack to inspect submitted evidence.</p> : null}
        {detail ? (
          <>
            <p className="mt-1 text-sm text-[var(--muted)]">{detail.pack.status} · expires {new Date(detail.pack.expires_at).toLocaleString()}</p>
            <ul className="mt-4 divide-y divide-[var(--border)]">
              {detail.items.map((item) => (
                <li key={item.id} className="space-y-3 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div><p className="font-semibold">{item.label}{item.required ? <span className="ml-2 text-xs text-[var(--muted)]">Required</span> : null}</p><p className="text-xs text-[var(--muted)]">{item.type} · {item.status}</p></div>
                    {item.status === "submitted" ? (
                      <div className="flex gap-2">
                        <button type="button" disabled={busy} onClick={() => void reviewItem(item, "verify")} className="min-h-9 rounded-full bg-[var(--accent-fill)] px-3 text-xs font-bold text-[var(--button-text)]">Verify</button>
                        <button type="button" disabled={busy} onClick={() => void reviewItem(item, "reject")} className="min-h-9 rounded-full border border-[var(--border)] px-3 text-xs font-semibold">Return</button>
                      </div>
                    ) : null}
                  </div>
                  {item.response_text ? <p className="whitespace-pre-wrap rounded-xl bg-[var(--surface)] p-3 text-sm">{item.response_text}</p> : null}
                  {item.signedUrl ? <a href={item.signedUrl} target="_blank" rel="noreferrer" className="inline-flex text-sm font-semibold text-[var(--accent)]">View evidence (expires shortly)</a> : null}
                  {item.status === "submitted" ? (
                    <label className="block text-xs font-semibold">Reason to return
                      <textarea maxLength={500} value={rejectionReasons[item.id] ?? ""} onChange={(event) => setRejectionReasons((current) => ({ ...current, [item.id]: event.target.value }))} className="mt-1 min-h-16 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] p-3" />
                    </label>
                  ) : null}
                  {item.rejection_reason ? <p className="text-sm text-red-700">Returned: {item.rejection_reason}</p> : null}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
      {error ? <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm lg:col-span-2">{error}</p> : null}
      {message ? <p role="status" className="rounded-xl border border-[var(--border)] p-3 text-sm lg:col-span-2">{message}</p> : null}
    </section>
  );
}
