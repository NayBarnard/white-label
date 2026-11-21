"use client";

import { Puck, Render, type Data } from "@puckeditor/core";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpRight,
  Eye,
  History,
  LayoutDashboard,
  Monitor,
  Smartphone,
  Tablet,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  defaultHomePageData,
  homePageConfig,
  isHomePageData,
  type HomePageComponents,
} from "@/components/home/HomePageEditorConfig";
import {
  isHomepageDraftRecoveryNewer,
  parseHomepageDraftRecovery,
} from "@/lib/studio/draft-recovery";

type HomePageData = Data<HomePageComponents>;
type StudioState = {
  draft: HomePageData;
  draftId: string | null;
  draftSavedAt: string | null;
};
type WorkspaceView = "overview" | "editor" | "pages" | "publishing" | "history";
type PreviewDevice = "desktop" | "tablet" | "mobile";

const navigation: { id: WorkspaceView; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "editor", label: "Visual editor", icon: Eye },
  { id: "pages", label: "Pages", icon: Monitor },
  { id: "publishing", label: "Publishing", icon: Upload },
  { id: "history", label: "Version history", icon: History },
];

const deviceWidths: Record<PreviewDevice, string> = {
  desktop: "min(100%, 1440px)",
  tablet: "min(100%, 820px)",
  mobile: "min(100%, 390px)",
};
const recoveryStorageKey = "white-label-studio.placeholder-demo.recovery";
const draftStorageKey = "white-label-studio.placeholder-demo.draft";

function formatDate(value: string | null | undefined) {
  if (!value) return "Not published yet";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function HomePageStudio() {
  const [view, setView] = useState<WorkspaceView>("overview");
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [studio, setStudio] = useState<StudioState | null>(null);
  const [content, setContent] = useState<HomePageData>(defaultHomePageData);
  const [savedContent, setSavedContent] = useState<HomePageData>(defaultHomePageData);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const lastFailedAutoSaveRef = useRef("");

  const dirty = useMemo(
    () => JSON.stringify(content) !== JSON.stringify(savedContent),
    [content, savedContent],
  );

  const loadStudio = useCallback(() => {
    setLoading(true);
    let draft = defaultHomePageData;
    let draftId: string | null = null;
    let draftSavedAt: string | null = null;
    try {
      const savedDraft = parseHomepageDraftRecovery(window.localStorage.getItem(draftStorageKey));
      if (savedDraft) {
        draft = savedDraft.content;
        draftId = "local-browser-draft";
        draftSavedAt = savedDraft.savedAt;
      } else {
        window.localStorage.removeItem(draftStorageKey);
      }

      const rawRecovery = window.localStorage.getItem(recoveryStorageKey);
      const recovery = parseHomepageDraftRecovery(rawRecovery);
      if (rawRecovery && !recovery) {
        window.localStorage.removeItem(recoveryStorageKey);
      } else if (recovery) {
        const sameAsSaved = JSON.stringify(recovery.content) === JSON.stringify(draft);
        if (sameAsSaved || !isHomepageDraftRecoveryNewer(recovery, draftSavedAt)) {
          window.localStorage.removeItem(recoveryStorageKey);
        } else if (window.confirm("A newer browser recovery copy was found. Restore those unsaved homepage edits?")) {
          draft = recovery.content;
        } else {
          window.localStorage.removeItem(recoveryStorageKey);
        }
      }
    } catch (recoveryError) {
      console.error("The local Studio draft could not be read.", recoveryError);
      setError("The browser could not load its saved draft. The example placeholder page is available.");
    }

    const state: StudioState = {
      draft: draftId ? draft : defaultHomePageData,
      draftId,
      draftSavedAt,
    };
    setStudio(state);
    setContent(draft);
    setSavedContent(state.draft);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(loadStudio, 0);
    return () => window.clearTimeout(timer);
  }, [loadStudio]);

  useEffect(() => {
    if (!studio || loading || !dirty) return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          recoveryStorageKey,
          JSON.stringify({ content, savedAt: new Date().toISOString() }),
        );
      } catch (recoveryError) {
        console.error("The local Studio recovery copy could not be saved.", recoveryError);
        setError("The browser could not save a recovery copy. Use Save draft before leaving.");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [content, dirty, loading, studio]);

  useEffect(() => {
    if (!dirty) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [dirty]);

  const saveDraft = useCallback(async (nextContent = content, automatic = false) => {
    if (!isHomePageData(nextContent)) {
      setError("The page structure is invalid. The draft was not saved.");
      return;
    }
    if (!automatic) lastFailedAutoSaveRef.current = "";
    setBusy(true);
    setError("");
    if (!automatic) setNotice("");
    try {
      const savedAt = new Date().toISOString();
      window.localStorage.setItem(
        draftStorageKey,
        JSON.stringify({ content: nextContent, savedAt }),
      );
      setSavedContent(nextContent);
      setStudio((current) => current
        ? { ...current, draft: nextContent, draftId: "local-browser-draft", draftSavedAt: savedAt }
        : current);
      if (JSON.stringify(content) === JSON.stringify(nextContent)) {
        window.localStorage.removeItem(recoveryStorageKey);
      }
      setNotice(`${automatic ? "Draft autosaved" : "Draft saved"} in this browser at ${formatDate(savedAt)}. It is not published.`);
    } catch (saveError) {
      lastFailedAutoSaveRef.current = JSON.stringify(nextContent);
      console.error("The local Studio draft could not be saved.", saveError);
      setError("The browser could not save this draft. Copy your changes before leaving this page.");
    } finally {
      setBusy(false);
    }
  }, [content]);

  useEffect(() => {
    if (!studio || loading || !dirty || busy) return;
    const snapshot = JSON.stringify(content);
    if (lastFailedAutoSaveRef.current === snapshot) return;
    const timer = window.setTimeout(() => {
      void saveDraft(content, true);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [busy, content, dirty, loading, saveDraft, studio]);

  function changeView(nextView: WorkspaceView) {
    if (dirty && !window.confirm("You have unsaved edits. Leave the editor without saving them?")) return;
    setView(nextView);
  }

  const currentStatus = dirty
    ? "Unsaved edits"
    : studio?.draftId
      ? "Saved locally"
      : "Example placeholders";

  return (
    <main className="fixed inset-0 z-[200] flex overflow-hidden bg-[#080d18] text-slate-100">
      <aside className="hidden w-[260px] shrink-0 flex-col border-r border-white/[0.08] bg-[#0b111e]/90 p-5 backdrop-blur-2xl lg:flex">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="flex size-10 items-center justify-center rounded-2xl border border-amber-200/20 bg-amber-200/[0.08] text-sm font-bold text-amber-200 shadow-[0_0_26px_rgba(212,175,55,0.12)]">W</div>
          <div>
            <p className="text-sm font-semibold tracking-wide">White Label</p>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">Website Studio</p>
          </div>
        </div>

        <p className="mb-3 mt-10 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Workspace</p>
        <nav aria-label="Studio navigation" className="space-y-1">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => changeView(id)}
              aria-current={view === id ? "page" : undefined}
              className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition ${
                view === id
                  ? "border border-white/10 bg-white/[0.09] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                  : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
              }`}
            >
              <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
              {label}
              {id === "editor" && dirty && <span className="ml-auto size-1.5 rounded-full bg-amber-300" />}
            </button>
          ))}
        </nav>

        <div className="mt-auto rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
          <p className="text-xs font-medium text-slate-300">Placeholder demo</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">Edits stay in this browser. Nothing is published or sent to a database.</p>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-[68px] shrink-0 items-center justify-between gap-3 border-b border-white/[0.08] bg-[#0b111e]/75 px-4 backdrop-blur-2xl sm:px-7">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{navigation.find((item) => item.id === view)?.label}</p>
            <p className="mt-1 hidden text-[11px] text-slate-500 sm:block">Edit generic placeholders · browser-only demo</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={`hidden rounded-full border px-3 py-1.5 text-[11px] sm:inline-flex ${
              currentStatus === "Saved locally"
                ? "border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-200"
                : "border-amber-200/20 bg-amber-200/[0.07] text-amber-100"
            }`}>
              {currentStatus}
            </span>
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              disabled={!studio}
              className="flex size-9 items-center justify-center gap-2 rounded-full border border-white/10 text-xs font-medium text-slate-300 transition hover:bg-white/[0.07] disabled:opacity-40 sm:h-9 sm:w-auto sm:px-3"
            >
              <Eye size={14} aria-hidden="true" /><span className="hidden sm:inline">Preview</span>
            </button>
            <button
              type="button"
              onClick={() => void saveDraft()}
              disabled={busy || loading || !dirty}
              className="min-h-9 rounded-full border border-white/10 px-3 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-40 sm:px-4"
            >
              {busy ? "Working…" : "Save draft"}
            </button>
            <span className="rounded-full border border-white/10 px-3 py-2 text-[10px] font-semibold text-slate-400">Preview only</span>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-auto">
          {error && (
            <div role="alert" className="mx-4 mt-4 flex items-start justify-between gap-4 rounded-2xl border border-rose-300/20 bg-rose-300/[0.07] px-4 py-3 text-sm text-rose-100 sm:mx-7">
              <span>{error}</span>
              <button type="button" aria-label="Dismiss error" onClick={() => setError("")}><X size={16} /></button>
            </div>
          )}
          {notice && <p role="status" aria-live="polite" className="mx-4 mt-4 rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.06] px-4 py-3 text-sm text-emerald-100 sm:mx-7">{notice}</p>}

          {loading && <p className="p-8 text-sm text-slate-400">Loading the placeholder workspace…</p>}
          {!loading && !studio && (
            <section className="m-auto max-w-lg px-6 text-center">
              <h1 className="text-xl font-semibold">Placeholder workspace unavailable</h1>
              <p className="mt-3 text-sm leading-6 text-slate-400">The browser-only workspace could not be opened. Try again to reload the generic example content.</p>
              <button type="button" onClick={() => { setError(""); setLoading(true); void loadStudio(); }} className="mt-5 min-h-10 rounded-full border border-white/15 px-5 text-sm font-semibold hover:bg-white/[0.06]">Try again</button>
            </section>
          )}

          {!loading && studio && view === "overview" && (
            <div className="mx-auto w-full max-w-7xl space-y-7 p-4 sm:p-7 lg:p-9">
              <section className="relative overflow-hidden rounded-[28px] border border-white/[0.09] bg-[radial-gradient(ellipse_at_85%_0%,rgba(212,175,55,0.13),transparent_38%),linear-gradient(145deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.2)] sm:p-9">
                <div className="relative max-w-2xl">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-200/80">Local placeholder workspace</p>
                  <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Explore your website design.</h1>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">Edit generic example content, preview responsive layouts, and save a draft in this browser. No real business or customer data is loaded, and publishing is disabled.</p>
                  <button type="button" onClick={() => changeView("editor")} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-amber-200 px-5 text-sm font-bold text-[#17130a] transition hover:-translate-y-0.5 hover:bg-amber-100">
                    Open visual editor <ArrowUpRight size={15} aria-hidden="true" />
                  </button>
                </div>
              </section>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Draft status" value={currentStatus} detail="Browser-only placeholder demo" />
                <StatCard label="Managed pages" value="1" detail="Example homepage · /" />
                <StatCard label="Editor components" value={String(Object.keys(homePageConfig.components).length)} detail="Reusable homepage sections" />
                <StatCard label="Publishing" value="Disabled" detail="No public changes are made" />
              </div>

              <div className="grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
                <section className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div><h2 className="text-sm font-semibold">Example page preview</h2><p className="mt-1 text-xs text-slate-500">Local and unpublished</p></div>
                    <button type="button" onClick={() => setPreviewOpen(true)} className="min-h-9 rounded-full border border-white/10 px-3 text-xs font-medium text-slate-300 hover:bg-white/[0.06]">Preview</button>
                  </div>
                  <div className="mt-5 min-h-48 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#f7f8fb] p-2 text-slate-900">
                    <div className="max-h-64 overflow-auto"><Render config={homePageConfig} data={content} /></div>
                  </div>
                </section>

                <section className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-5 sm:p-6">
                  <h2 className="text-sm font-semibold">Demo boundaries</h2>
                  <p className="mt-1 text-xs text-slate-500">This workspace does not connect to live website content.</p>
                  <p className="mt-5 rounded-xl border border-dashed border-white/10 p-4 text-xs leading-5 text-slate-400">Drafts are stored only in this browser. Publishing, version history, customer records, and real firm information are not available in this demo.</p>
                </section>
              </div>
              <p className="text-[11px] leading-5 text-slate-600">Placeholder content only. Nothing here changes the public website or accesses customer records.</p>
            </div>
          )}

          {!loading && studio && view === "editor" && (
            <div className="flex min-h-[640px] flex-1 flex-col">
              <div className="flex min-h-12 shrink-0 items-center justify-between border-b border-white/[0.07] px-4 sm:px-6">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">Homepage · /</p>
                  <p className="mt-0.5 truncate text-[10px] text-slate-500">Drag sections to reorder · select a section to edit its properties</p>
                </div>
                <div className="flex shrink-0 items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.035] p-1" aria-label="Preview width">
                  <DeviceButton label="Desktop" active={device === "desktop"} onClick={() => setDevice("desktop")}><Monitor size={14} /></DeviceButton>
                  <DeviceButton label="Tablet" active={device === "tablet"} onClick={() => setDevice("tablet")}><Tablet size={14} /></DeviceButton>
                  <DeviceButton label="Mobile" active={device === "mobile"} onClick={() => setDevice("mobile")}><Smartphone size={14} /></DeviceButton>
                </div>
              </div>
              <div className="min-h-[580px] flex-1 overflow-hidden bg-[#0a101d]">
                <div className="mx-auto h-full transition-[width] duration-300" style={{ width: deviceWidths[device], maxWidth: "100%" }}>
                  <Puck
                    config={homePageConfig}
                    data={content}
                    headerPath="/"
                    headerTitle="Homepage"
                    height="100%"
                    onChange={(nextContent) => setContent(nextContent)}
                  />
                </div>
              </div>
            </div>
          )}

          {!loading && studio && view === "pages" && (
            <div className="mx-auto w-full max-w-5xl p-4 sm:p-8">
              <div className="mb-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-200/80">Example content</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight">Pages</h1>
                <p className="mt-2 text-sm text-slate-400">This demo includes one generic homepage layout. No live website routes or content are loaded.</p>
              </div>
              <article className="flex flex-col gap-4 rounded-3xl border border-white/[0.09] bg-white/[0.035] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="flex items-center gap-4">
                  <div className="flex size-11 items-center justify-center rounded-2xl border border-amber-200/15 bg-amber-200/[0.07] text-amber-100"><Monitor size={18} /></div>
                  <div><h2 className="text-sm font-semibold">Example homepage</h2><p className="mt-1 text-xs text-slate-500">/ · local placeholder</p></div>
                </div>
                <button type="button" onClick={() => changeView("editor")} className="min-h-10 rounded-full border border-white/10 px-4 text-xs font-semibold hover:bg-white/[0.06]">Edit homepage</button>
              </article>
              <p className="mt-5 rounded-2xl border border-amber-200/10 bg-amber-200/[0.04] p-4 text-xs leading-5 text-slate-400">Additional pages and routing are not enabled in the placeholder demo. Protected application paths such as /portal, /advisor, /admin, and /studio are never editable here.</p>
            </div>
          )}

          {!loading && studio && view === "publishing" && (
            <div className="mx-auto w-full max-w-5xl p-4 sm:p-8">
              <div className="mb-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-200/80">Release controls</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight">Publishing</h1>
                <p className="mt-2 text-sm text-slate-400">Publishing is intentionally disabled in this browser-only placeholder demo.</p>
              </div>
              <section className="rounded-3xl border border-white/[0.09] bg-white/[0.035] p-5 sm:p-7">
                <div className="grid gap-5 sm:grid-cols-2">
                  <StatusPanel label="Publishing" value="Unavailable in local demo" />
                  <StatusPanel label="Browser draft" value={dirty ? "Unsaved edits" : studio.draftId ? `Saved ${formatDate(studio.draftSavedAt)}` : "Example placeholders"} />
                </div>
                <div className="mt-6 flex flex-wrap gap-3 border-t border-white/[0.08] pt-5">
                  <button type="button" onClick={() => void saveDraft()} disabled={busy || !dirty} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 px-4 text-xs font-semibold hover:bg-white/[0.06] disabled:opacity-40"><ArrowDownToLine size={14} /> Save draft</button>
                  <button type="button" onClick={() => setPreviewOpen(true)} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 px-4 text-xs font-semibold hover:bg-white/[0.06]"><Eye size={14} /> Preview current changes</button>
                  <span className="inline-flex min-h-10 items-center rounded-full border border-white/10 px-4 text-xs font-semibold text-slate-500">Publishing disabled</span>
                </div>
              </section>
            </div>
          )}

          {!loading && studio && view === "history" && (
            <div className="mx-auto w-full max-w-5xl p-4 sm:p-8">
              <div className="mb-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-200/80">Snapshots</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight">Version history</h1>
                <p className="mt-2 text-sm text-slate-400">The browser-only demo does not publish or create version history.</p>
              </div>
              <p className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-400">No published versions exist in this demo. You can save the current placeholder draft locally.</p>
            </div>
          )}
        </div>

        <nav aria-label="Compact Studio navigation" className="grid shrink-0 grid-cols-5 border-t border-white/[0.08] bg-[#0b111e]/95 px-1 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur-2xl lg:hidden">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => changeView(id)} aria-current={view === id ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[9px] ${view === id ? "text-amber-100" : "text-slate-500"}`}>
              <Icon size={17} aria-hidden="true" /><span>{label === "Version history" ? "History" : label === "Visual editor" ? "Editor" : label}</span>
            </button>
          ))}
        </nav>
      </section>

      {previewOpen && studio && (
        <div role="dialog" aria-modal="true" aria-labelledby="preview-title" className="fixed inset-0 z-[220] flex flex-col bg-[#070b12]/95 p-3 backdrop-blur-xl sm:p-6">
          <header className="mx-auto flex w-full max-w-[1500px] items-center justify-between gap-4 py-2">
            <div><h2 id="preview-title" className="text-sm font-semibold">Placeholder website preview</h2><p className="mt-1 text-[11px] text-slate-500">Local-only preview. It does not change a public website.</p></div>
            <div className="flex items-center gap-1 rounded-full border border-white/[0.08] p-1">
              <DeviceButton label="Desktop" active={device === "desktop"} onClick={() => setDevice("desktop")}><Monitor size={14} /></DeviceButton>
              <DeviceButton label="Tablet" active={device === "tablet"} onClick={() => setDevice("tablet")}><Tablet size={14} /></DeviceButton>
              <DeviceButton label="Mobile" active={device === "mobile"} onClick={() => setDevice("mobile")}><Smartphone size={14} /></DeviceButton>
            </div>
            <button type="button" onClick={() => setPreviewOpen(false)} aria-label="Close preview" className="flex size-9 items-center justify-center rounded-full border border-white/10 text-slate-300 hover:bg-white/[0.07]"><X size={17} /></button>
          </header>
          <div className="mx-auto mt-3 flex w-full flex-1 justify-center overflow-auto rounded-2xl border border-white/10 bg-[#151b26] p-2">
            <div className="min-h-full bg-[#f7f8fb] text-slate-900 shadow-2xl" style={{ width: deviceWidths[device], maxWidth: "100%" }}>
              <Render config={homePageConfig} data={content} />
            </div>
          </div>
          <div className="mx-auto flex w-full max-w-[1500px] justify-between gap-3 pt-3">
            <button type="button" onClick={() => setPreviewOpen(false)} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 px-4 text-xs font-semibold hover:bg-white/[0.06]"><ArrowLeft size={14} /> Back to editor</button>
            <button type="button" onClick={() => { setPreviewOpen(false); void saveDraft(); }} disabled={busy || !dirty} className="min-h-10 rounded-full border border-white/10 px-5 text-xs font-bold disabled:opacity-40">Save local draft</button>
          </div>
        </div>
      )}
    </main>
  );
}

function StatCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 sm:p-5">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-2 truncate text-xl font-semibold tracking-tight text-slate-100">{value}</p>
      <p className="mt-1 truncate text-[10px] text-slate-600">{detail}</p>
    </article>
  );
}

function StatusPanel({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-black/10 p-4">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-200">{value}</p>
    </div>
  );
}

function DeviceButton({ label, active, onClick, children }: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={`${label} preview`}
      aria-pressed={active}
      onClick={onClick}
      className={`flex size-8 items-center justify-center rounded-full transition ${active ? "bg-white/10 text-amber-100" : "text-slate-500 hover:text-slate-200"}`}
    >
      {children}
    </button>
  );
}
