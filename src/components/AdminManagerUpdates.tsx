"use client";

import { useEffect, useState, type FormEvent } from "react";

type ManagerUpdate = {
  id: string;
  public_slug: string;
  title: string;
  body: string;
  kind: "text" | "audio" | "video";
  media_path: string | null;
  category: string;
  author_name: string | null;
  author_designation: string | null;
  author_bio: string | null;
  featured: boolean;
  scheduled_at: string | null;
  pdf_object_path: string | null;
  status: "draft" | "internal_review" | "approved" | "published" | "archived";
  published_at: string | null;
};

const fieldClass = "mt-1 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]";
const researchCategories = [
  "Market Commentary",
  "Investment Strategy",
  "Economic Insights",
  "Fund Updates",
  "Adviser Insights",
  "Investor Education",
] as const;

async function errorMessage(response: Response, fallback: string) {
  try {
    const body = await response.json() as { error?: unknown };
    return typeof body.error === "string" ? body.error : fallback;
  } catch {
    return fallback;
  }
}

export function AdminManagerUpdates() {
  const [updates, setUpdates] = useState<ManagerUpdate[]>([]);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<"text" | "audio" | "video">("text");
  const [file, setFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [category, setCategory] = useState<(typeof researchCategories)[number]>("Fund Updates");
  const [authorName, setAuthorName] = useState("");
  const [authorDesignation, setAuthorDesignation] = useState("");
  const [authorBio, setAuthorBio] = useState("");
  const [executiveSummary, setExecutiveSummary] = useState("");
  const [keyTakeaways, setKeyTakeaways] = useState("");
  const [perspective, setPerspective] = useState("");
  const [strategy, setStrategy] = useState<"your firm Balanced" | "your firm Cautious" | "Both">("Both");
  const [relatedSlugs, setRelatedSlugs] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [featured, setFeatured] = useState(false);
  const [approved, setApproved] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadUpdates() {
      try {
        const response = await fetch("/api/admin/manager-updates", { cache: "no-store" });
        if (!response.ok) throw new Error("load");
        const result = await response.json() as { updates?: ManagerUpdate[] };
        if (active) setUpdates(Array.isArray(result.updates) ? result.updates : []);
      } catch (loadError) {
        console.error("Manager updates could not be loaded.", loadError);
        if (active) setError("Manager updates could not be loaded. Please try again.");
      }
    }
    void loadUpdates();
    return () => {
      active = false;
    };
  }, [refreshVersion]);

  async function createDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      let mediaPath: string | null = null;
      let pdfObjectPath: string | null = null;
      if (kind !== "text") {
        if (!file) {
          setError("Select an audio or video file for this update.");
          return;
        }
        const formData = new FormData();
        formData.set("file", file);
        const uploadResponse = await fetch("/api/admin/manager-updates/media", {
          method: "POST",
          body: formData,
        });
        if (!uploadResponse.ok) throw new Error(await errorMessage(uploadResponse, "The media file could not be uploaded."));
        const uploadResult = await uploadResponse.json() as { mediaPath?: unknown };
        if (typeof uploadResult.mediaPath !== "string") throw new Error("The media file could not be uploaded.");
        mediaPath = uploadResult.mediaPath;
      }

      if (pdfFile) {
        const formData = new FormData();
        formData.set("file", pdfFile);
        const uploadResponse = await fetch("/api/admin/manager-updates/media/pdf", {
          method: "POST",
          body: formData,
        });
        if (!uploadResponse.ok) throw new Error(await errorMessage(uploadResponse, "The PDF could not be uploaded."));
        const uploadResult = await uploadResponse.json() as { pdfObjectPath?: unknown };
        if (typeof uploadResult.pdfObjectPath !== "string") throw new Error("The PDF could not be uploaded.");
        pdfObjectPath = uploadResult.pdfObjectPath;
      }

      const response = await fetch("/api/admin/manager-updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          kind,
          mediaPath,
          pdfObjectPath,
          category,
          authorName: authorName.trim() || null,
          authorDesignation: authorDesignation.trim() || null,
          authorBio: authorBio.trim() || null,
          executiveSummary: executiveSummary.trim(),
          keyTakeaways: keyTakeaways.split("\n").map((item) => item.trim()).filter(Boolean),
          perspective: perspective.trim(),
          strategy,
          relatedSlugs: relatedSlugs.split(",").map((item) => item.trim()).filter(Boolean),
          featured,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        }),
      });
      if (!response.ok) throw new Error(await errorMessage(response, "The manager update draft could not be saved."));
      setTitle("");
      setBody("");
      setFile(null);
      setPdfFile(null);
      setKind("text");
      setAuthorName("");
      setAuthorDesignation("");
      setAuthorBio("");
      setExecutiveSummary("");
      setKeyTakeaways("");
      setPerspective("");
      setStrategy("Both");
      setRelatedSlugs("");
      setScheduledAt("");
      setFeatured(false);
      setNotice("Draft saved. Review the content before publishing.");
      setRefreshVersion((version) => version + 1);
    } catch (submitError) {
      console.error("Manager update draft submission failed.", submitError);
      setError(submitError instanceof Error ? submitError.message : "The manager update draft could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function transitionUpdate(updateId: string, action: "submit" | "approve" | "publish" | "archive") {
    if (busy || (action === "approve" && !approved[updateId])) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = action === "approve"
        ? await fetch("/api/admin/compliance-signoff", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ managerUpdateId: updateId, complianceApproved: true }),
          })
        : await fetch(`/api/admin/manager-updates/${updateId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action }),
          });
      if (!response.ok) throw new Error(await errorMessage(response, "The manager update could not be updated."));
      const result = await response.json() as { scheduled?: boolean };
      const actionLabel = {
        submit: "submitted for internal review",
        approve: "approved",
        publish: "published",
        archive: "archived",
      }[action];
      setNotice(result.scheduled ? "Publication scheduled." : `Manager update ${actionLabel}.`);
      setApproved((current) => ({ ...current, [updateId]: false }));
      setRefreshVersion((version) => version + 1);
    } catch (publishError) {
      console.error("Manager update workflow action failed.", publishError);
      setError(publishError instanceof Error ? publishError.message : "The manager update could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-10 lg:px-8">
      <header className="mb-8">
        <p className="text-xs font-bold tracking-[0.18em] text-[var(--accent)]">RESTRICTED ACCESS</p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)]">Manager Updates</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Draft updates for compliance review before publication.</p>
      </header>
      {error ? <p role="alert" className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm">{error}</p> : null}
      {notice ? <p role="status" className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">{notice}</p> : null}
      <form onSubmit={(event) => void createDraft(event)} className="glass space-y-4 rounded-2xl p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Create a draft</h2>
        <label className="block text-xs font-semibold">Title
          <input required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} className={fieldClass} />
        </label>
        <label className="block text-xs font-semibold">Update
          <textarea required maxLength={10_000} rows={6} value={body} onChange={(event) => setBody(event.target.value)} className={fieldClass} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-semibold">Category
            <select value={category} onChange={(event) => setCategory(event.target.value as (typeof researchCategories)[number])} className={fieldClass}>
              {researchCategories.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="block text-xs font-semibold">Schedule publication (optional)
            <input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} className={fieldClass} />
          </label>
          <label className="block text-xs font-semibold">Author name
            <input maxLength={120} value={authorName} onChange={(event) => setAuthorName(event.target.value)} className={fieldClass} />
          </label>
          <label className="block text-xs font-semibold">Author designation
            <input maxLength={120} value={authorDesignation} onChange={(event) => setAuthorDesignation(event.target.value)} className={fieldClass} />
          </label>
          <label className="block text-xs font-semibold sm:col-span-2">Short author biography
            <textarea maxLength={500} rows={2} value={authorBio} onChange={(event) => setAuthorBio(event.target.value)} className={fieldClass} />
          </label>
          <label className="block text-xs font-semibold sm:col-span-2">Executive summary (2–3 sentences)
            <textarea required minLength={20} maxLength={1000} rows={3} value={executiveSummary} onChange={(event) => setExecutiveSummary(event.target.value)} className={fieldClass} />
          </label>
          <label className="block text-xs font-semibold sm:col-span-2">Key takeaways (3–5 lines)
            <textarea required minLength={30} maxLength={1600} rows={4} value={keyTakeaways} onChange={(event) => setKeyTakeaways(event.target.value)} className={fieldClass} placeholder={"One takeaway per line"} />
          </label>
          <label className="block text-xs font-semibold sm:col-span-2">your firm perspective
            <textarea required minLength={10} maxLength={1000} rows={3} value={perspective} onChange={(event) => setPerspective(event.target.value)} className={fieldClass} />
          </label>
          <label className="block text-xs font-semibold">Strategy
            <select value={strategy} onChange={(event) => setStrategy(event.target.value as typeof strategy)} className={fieldClass}>
              <option>Both</option><option>your firm Balanced</option><option>your firm Cautious</option>
            </select>
          </label>
          <label className="block text-xs font-semibold">Related research slugs (comma-separated)
            <input maxLength={500} value={relatedSlugs} onChange={(event) => setRelatedSlugs(event.target.value)} className={fieldClass} placeholder="building-resilient-portfolios" />
          </label>
        </div>
        <label className="block text-xs font-semibold">Format
          <select value={kind} onChange={(event) => setKind(event.target.value as typeof kind)} className={fieldClass}>
            <option value="text">Text</option>
            <option value="audio">Audio</option>
            <option value="video">Video</option>
          </select>
        </label>
        {kind !== "text" ? (
          <label className="block text-xs font-semibold">Media file
            <input
              required
              type="file"
              accept={kind === "audio" ? ".mp3,.m4a,audio/mpeg,audio/mp4" : ".mp4,video/mp4"}
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className={fieldClass}
            />
          </label>
        ) : null}
        <label className="block text-xs font-semibold">Research PDF (optional)
          <input type="file" accept="application/pdf,.pdf" onChange={(event) => setPdfFile(event.target.files?.[0] ?? null)} className={fieldClass} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={featured} onChange={(event) => setFeatured(event.target.checked)} />
          Feature this research item after publication
        </label>
        <button type="submit" disabled={busy} className="min-h-11 rounded-full bg-[var(--accent-fill)] px-5 text-sm font-bold text-[var(--button-text)] disabled:opacity-50">
          {busy ? "Saving…" : "Save draft"}
        </button>
      </form>

      <section className="mt-8 space-y-4" aria-labelledby="manager-update-list-heading">
        <h2 id="manager-update-list-heading" className="text-lg font-semibold">Updates</h2>
        {updates.length === 0 ? <p className="text-sm text-[var(--muted)]">No manager updates yet.</p> : null}
        {updates.map((update) => (
          <article key={update.id} className="glass rounded-2xl p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{update.title}</h3>
                <p className="mt-1 text-xs text-[var(--muted)]">{update.category} · {update.kind} · {update.status}</p>
              </div>
              {update.featured ? <span className="rounded-full border border-[var(--accent)] px-2.5 py-1 text-[10px] font-bold text-[var(--accent)]">FEATURED</span> : null}
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">
              {update.author_name || "your firm Investment Team"}
              {update.author_designation ? ` · ${update.author_designation}` : ""}
              {update.scheduled_at ? ` · Scheduled ${new Date(update.scheduled_at).toLocaleString("en-ZA")}` : ""}
            </p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">{update.body}</p>
            {update.pdf_object_path ? (
              <a href={`/api/insights/${update.public_slug}/pdf?branding=clean`} className="mt-3 inline-flex text-xs font-semibold text-[var(--accent)] hover:underline">Download attached PDF</a>
            ) : null}
            {update.status === "published" ? (
              <a href={`/insights/${update.public_slug}`} className="mt-3 inline-flex text-xs font-semibold text-[var(--accent)] hover:underline">View canonical research page</a>
            ) : null}
            {update.status !== "archived" ? (
              <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-[var(--border)] pt-4">
                {update.status === "draft" ? (
                  <button type="button" disabled={busy} onClick={() => void transitionUpdate(update.id, "submit")} className="min-h-10 rounded-full bg-[var(--accent-fill)] px-4 text-xs font-bold text-[var(--button-text)] disabled:opacity-50">Submit for internal review</button>
                ) : null}
                {update.status === "internal_review" ? (
                  <>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={Boolean(approved[update.id])} onChange={(event) => setApproved((current) => ({ ...current, [update.id]: event.target.checked }))} />
                      Compliance approval confirmed
                    </label>
                    <button type="button" disabled={busy || !approved[update.id]} onClick={() => void transitionUpdate(update.id, "approve")} className="min-h-10 rounded-full bg-[var(--accent-fill)] px-4 text-xs font-bold text-[var(--button-text)] disabled:opacity-50">Approve</button>
                  </>
                ) : null}
                {update.status === "approved" ? (
                  <button type="button" disabled={busy} onClick={() => void transitionUpdate(update.id, "publish")} className="min-h-10 rounded-full bg-[var(--accent-fill)] px-4 text-xs font-bold text-[var(--button-text)] disabled:opacity-50">
                    {update.scheduled_at ? "Publish / check schedule" : "Publish"}
                  </button>
                ) : null}
                {update.status === "published" ? (
                  <button type="button" disabled={busy} onClick={() => void transitionUpdate(update.id, "archive")} className="min-h-10 rounded-full border border-[var(--border-strong)] px-4 text-xs font-bold disabled:opacity-50">Archive</button>
                ) : null}
              </div>
            ) : null}
          </article>
        ))}
      </section>
    </main>
  );
}
