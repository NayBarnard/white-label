"use client";

import { Puck, Render, type Data } from "@puckeditor/core";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpRight,
  Eye,
  History,
  LayoutDashboard,
  LogOut,
  Monitor,
  Smartphone,
  Tablet,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  defaultHomePageData,
  homePageConfig,
  isHomePageData,
  type HomePageComponents,
} from "@/components/home/HomePageEditorConfig";
import { getPortalSupabaseClient } from "@/lib/supabase/portal";
import {
  isHomepageDraftRecoveryNewer,
  parseHomepageDraftRecovery,
} from "@/lib/studio/draft-recovery";

type HomePageData = Data<HomePageComponents>;
type StudioVersion = {
  id: string;
  content: HomePageData;
  created_at: string;
  created_by: string | null;
  published_at: string | null;
  published_by: string | null;
  source_version_id: string | null;
};
type StudioState = {
  draft: HomePageData;
  draftId: string | null;
  draftSavedAt: string | null;
  published: {
    id: string;
    content: HomePageData;
    publishedAt: string | null;
    publishedBy: string | null;
  } | null;
  history: StudioVersion[];
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
const recoveryStorageKey = "white-label-studio.homepage-recovery";

function formatDate(value: string | null | undefined) {
  if (!value) return "Not published yet";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const payload = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "The Studio request failed.");
  return payload;
}

export function HomePageStudio({ administratorEmail = "Administrator" }: { administratorEmail?: string } = {}) {
  const router = useRouter();
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

  const fetchStudioState = useCallback(async () => {
    const state = await requestJson<StudioState>("/api/studio/homepage");
    if (!isHomePageData(state.draft) ||
        (state.published && !isHomePageData(state.published.content)) ||
        !Array.isArray(state.history) ||
        state.history.some((version) => !isHomePageData(version.content))) {
      throw new Error("The saved Studio data is invalid and could not be opened.");
    }
    return state;
  }, []);

  const applyStudioState = useCallback((state: StudioState) => {
    let restoredContent = state.draft;
    try {
      const rawRecovery = window.localStorage.getItem(recoveryStorageKey);
      const recovery = parseHomepageDraftRecovery(rawRecovery);
      if (rawRecovery && !recovery) {
        window.localStorage.removeItem(recoveryStorageKey);
      } else if (recovery) {
        const sameAsSaved = JSON.stringify(recovery.content) === JSON.stringify(state.draft);
        if (sameAsSaved || !isHomepageDraftRecoveryNewer(recovery, state.draftSavedAt)) {
          window.localStorage.removeItem(recoveryStorageKey);
        } else if (window.confirm("A newer browser recovery copy was found. Restore those unsaved homepage edits?")) {
          restoredContent = recovery.content;
        } else {
          window.localStorage.removeItem(recoveryStorageKey);
        }
      }
    } catch (recoveryError) {
      console.error("The local Studio recovery copy could not be read.", recoveryError);
      setError("The browser recovery copy could not be accessed. Your saved server draft is still available.");
    }

    setStudio(state);
    setContent(restoredContent);
    setSavedContent(state.draft);
  }, []);

  const loadStudio = useCallback(async () => {
    try {
      const state = await fetchStudioState();
      applyStudioState(state);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Website data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [applyStudioState, fetchStudioState]);

  useEffect(() => {
    let active = true;
    void fetchStudioState()
      .then((state) => {
        if (!active) return;
        applyStudioState(state);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Website data could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [applyStudioState, fetchStudioState]);

  useEffect(() => {
    if (!studio || loading || !dirty) return;
    try {
      window.localStorage.setItem(
        recoveryStorageKey,
        JSON.stringify({ content, savedAt: new Date().toISOString() }),
      );
    } catch (recoveryError) {
      console.error("The local Studio recovery copy could not be saved.", recoveryError);
      setError("The browser could not save a local recovery copy. Save your draft to the server.");
    }
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
      const result = await requestJson<{ ok: true; draftId: string; savedAt: string }>(
        "/api/studio/homepage",
        { method: "PUT", body: JSON.stringify({ content: nextContent }) },
      );
      setSavedContent(nextContent);
      setStudio((current) => current
        ? { ...current, draft: nextContent, draftId: result.draftId, draftSavedAt: result.savedAt }
        : current);
      if (JSON.stringify(content) === JSON.stringify(nextContent)) {
        window.localStorage.removeItem(recoveryStorageKey);
      }
      setNotice(`${automatic ? "Draft autosaved" : "Draft saved"} at ${formatDate(result.savedAt)}.`);
    } catch (saveError) {
      lastFailedAutoSaveRef.current = JSON.stringify(nextContent);
      setError(saveError instanceof Error ? saveError.message : "The draft could not be saved.");
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

  async function publish(nextContent = content, restoreVersionId?: string) {
    if (!isHomePageData(nextContent)) {
      setError("The page structure is invalid. Nothing was published.");
      return;
    }
    const confirmation = restoreVersionId
      ? `${dirty ? "Unsaved edits will be replaced. " : ""}Restore this version by publishing it as the new live homepage?`
      : "Publish these changes to the public homepage?";
    if (!window.confirm(confirmation)) return;

    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await requestJson<{ ok: true; publishedAt: string; restored: boolean }>(
        "/api/studio/homepage/publish",
        {
          method: "POST",
          body: JSON.stringify(restoreVersionId
            ? { restoreVersionId }
            : { content: nextContent }),
        },
      );
      setContent(nextContent);
      setSavedContent(nextContent);
      window.localStorage.removeItem(recoveryStorageKey);
      setNotice(`${result.restored ? "Previous version restored and published" : "Homepage published"} at ${formatDate(result.publishedAt)}.`);
      await loadStudio();
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "The homepage could not be published.");
    } finally {
      setBusy(false);
    }
  }

  function changeView(nextView: WorkspaceView) {
    if (dirty && !window.confirm("You have unsaved edits. Leave the editor without saving them?")) return;
    setView(nextView);
  }

  async function signOut() {
    setBusy(true);
    setError("");
    try {
      const { error: signOutError } = await getPortalSupabaseClient().auth.signOut();
      if (signOutError) throw signOutError;
      router.replace("/advisor/login");
    } catch (signOutError) {
      console.error("Studio administrator sign-out failed.", signOutError);
      setError("You could not be signed out. Please try again.");
      setBusy(false);
    }
  }

  const currentStatus = dirty
    ? "Draft changes"
    : studio?.published
      ? JSON.stringify(studio.draft) === JSON.stringify(studio.published.content)
        ? "Published"
        : "Draft"
      : studio?.draftId
        ? "Draft"
        : "Unpublished";

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
          <p className="text-xs font-medium text-slate-300">Public website</p>
          <p className="mt-1 truncate text-[11px] text-slate-500">{administratorEmail}</p>
          <a href="/" target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-9 items-center gap-2 text-xs font-semibold text-amber-200 hover:text-amber-100">
            Open website <ArrowUpRight size={14} aria-hidden="true" />
          </a>
          <button type="button" onClick={() => void signOut()} disabled={busy} className="mt-3 flex min-h-9 items-center gap-2 text-xs font-medium text-slate-400 hover:text-white disabled:opacity-40">
            <LogOut size={14} aria-hidden="true" /> Sign out
          </button>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-[68px] shrink-0 items-center justify-between gap-3 border-b border-white/[0.08] bg-[#0b111e]/75 px-4 backdrop-blur-2xl sm:px-7">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{navigation.find((item) => item.id === view)?.label}</p>
            <p className="mt-1 hidden text-[11px] text-slate-500 sm:block">Manage the published public homepage</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={`hidden rounded-full border px-3 py-1.5 text-[11px] sm:inline-flex ${
              currentStatus === "Published"
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
            <button
              type="button"
              onClick={() => void publish()}
              disabled={busy || loading || !studio}
              className="min-h-9 rounded-full bg-gradient-to-b from-amber-200 to-amber-400 px-3 text-xs font-bold text-[#17130a] shadow-[0_5px_18px_rgba(212,175,55,0.15)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 sm:px-4"
            >
              Publish
            </button>
            <button type="button" onClick={() => void signOut()} disabled={busy} aria-label="Sign out" className="flex size-9 items-center justify-center rounded-full border border-white/10 text-slate-400 hover:bg-white/[0.07] hover:text-white disabled:opacity-40 lg:hidden"><LogOut size={15} /></button>
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

          {loading && <p className="p-8 text-sm text-slate-400">Loading your website workspace…</p>}
          {!loading && !studio && (
            <section className="m-auto max-w-lg px-6 text-center">
              <h1 className="text-xl font-semibold">Website data unavailable</h1>
              <p className="mt-3 text-sm leading-6 text-slate-400">The Studio could not load its saved configuration. Check the database setup and try again.</p>
              <button type="button" onClick={() => { setError(""); setLoading(true); void loadStudio(); }} className="mt-5 min-h-10 rounded-full border border-white/15 px-5 text-sm font-semibold hover:bg-white/[0.06]">Try again</button>
            </section>
          )}

          {!loading && studio && view === "overview" && (
            <div className="mx-auto w-full max-w-7xl space-y-7 p-4 sm:p-7 lg:p-9">
              <section className="relative overflow-hidden rounded-[28px] border border-white/[0.09] bg-[radial-gradient(ellipse_at_85%_0%,rgba(212,175,55,0.13),transparent_38%),linear-gradient(145deg,rgba(255,255,255,0.07),rgba(255,255,255,0.025))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.2)] sm:p-9">
                <div className="relative max-w-2xl">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-200/80">Your website workspace</p>
                  <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">A considered digital presence.</h1>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">Edit the homepage in the visual canvas, preview the responsive layout, and publish only when the changes are ready.</p>
                  <button type="button" onClick={() => changeView("editor")} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-amber-200 px-5 text-sm font-bold text-[#17130a] transition hover:-translate-y-0.5 hover:bg-amber-100">
                    Open visual editor <ArrowUpRight size={15} aria-hidden="true" />
                  </button>
                </div>
              </section>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Website status" value={currentStatus} detail={studio.published ? `Published ${formatDate(studio.published.publishedAt)}` : "No published homepage"} />
                <StatCard label="Managed pages" value="1" detail="Homepage · /" />
                <StatCard label="Editor components" value={String(Object.keys(homePageConfig.components).length)} detail="Reusable homepage sections" />
                <StatCard label="Published versions" value={String(studio.history.length)} detail={studio.history.length === 50 ? "Most recent 50 versions shown" : "Version snapshots"} />
              </div>

              <div className="grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
                <section className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div><h2 className="text-sm font-semibold">Published website</h2><p className="mt-1 text-xs text-slate-500">Live homepage configuration</p></div>
                    <button type="button" onClick={() => setPreviewOpen(true)} disabled={!studio.published} className="min-h-9 rounded-full border border-white/10 px-3 text-xs font-medium text-slate-300 hover:bg-white/[0.06] disabled:opacity-40">Preview</button>
                  </div>
                  <div className="mt-5 min-h-48 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#f7f8fb] p-2 text-slate-900">
                    {studio.published
                      ? <div className="max-h-64 overflow-auto"><Render config={homePageConfig} data={studio.published.content} /></div>
                      : <div className="flex min-h-48 items-center justify-center text-sm text-slate-500">Publish your first homepage to make it live.</div>}
                  </div>
                </section>

                <section className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-5 sm:p-6">
                  <h2 className="text-sm font-semibold">Recent publishing activity</h2>
                  <p className="mt-1 text-xs text-slate-500">Latest saved website snapshots</p>
                  <div className="mt-5 space-y-4">
                    {studio.history.slice(0, 4).map((version) => (
                      <div key={version.id} className="flex gap-3">
                        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-amber-200" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-200">{version.source_version_id ? "Restored version published" : "Homepage published"}</p>
                          <p className="mt-1 text-[11px] text-slate-500">{formatDate(version.published_at)}</p>
                        </div>
                      </div>
                    ))}
                    {studio.history.length === 0 && <p className="rounded-xl border border-dashed border-white/10 p-4 text-xs leading-5 text-slate-500">No publishing activity yet. The built-in public homepage remains available as a fallback.</p>}
                  </div>
                </section>
              </div>
              <p className="text-[11px] leading-5 text-slate-600">Website configuration is separate from client, adviser, portfolio, and document records.</p>
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
                    onPublish={(nextContent) => publish(nextContent)}
                  />
                </div>
              </div>
            </div>
          )}

          {!loading && studio && view === "pages" && (
            <div className="mx-auto w-full max-w-5xl p-4 sm:p-8">
              <div className="mb-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-200/80">Content</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight">Pages</h1>
                <p className="mt-2 text-sm text-slate-400">The current publishing system manages the existing homepage while preserving all established application routes.</p>
              </div>
              <article className="flex flex-col gap-4 rounded-3xl border border-white/[0.09] bg-white/[0.035] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="flex items-center gap-4">
                  <div className="flex size-11 items-center justify-center rounded-2xl border border-amber-200/15 bg-amber-200/[0.07] text-amber-100"><Monitor size={18} /></div>
                  <div><h2 className="text-sm font-semibold">Homepage</h2><p className="mt-1 text-xs text-slate-500">/ · {studio.published ? "Published" : "Fallback active"}</p></div>
                </div>
                <button type="button" onClick={() => changeView("editor")} className="min-h-10 rounded-full border border-white/10 px-4 text-xs font-semibold hover:bg-white/[0.06]">Edit homepage</button>
              </article>
              <p className="mt-5 rounded-2xl border border-amber-200/10 bg-amber-200/[0.04] p-4 text-xs leading-5 text-slate-400">Creating and routing additional customer pages is not enabled. This avoids dynamic routes shadowing protected business paths such as /portal, /advisor, /admin, and /studio.</p>
            </div>
          )}

          {!loading && studio && view === "publishing" && (
            <div className="mx-auto w-full max-w-5xl p-4 sm:p-8">
              <div className="mb-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-200/80">Release controls</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight">Publishing</h1>
                <p className="mt-2 text-sm text-slate-400">Draft edits stay private until an administrator explicitly publishes them.</p>
              </div>
              <section className="rounded-3xl border border-white/[0.09] bg-white/[0.035] p-5 sm:p-7">
                <div className="grid gap-5 sm:grid-cols-2">
                  <StatusPanel label="Live version" value={studio.published ? formatDate(studio.published.publishedAt) : "Built-in homepage fallback"} />
                  <StatusPanel label="Draft status" value={dirty ? "Unsaved editor changes" : studio.draftId ? `Saved ${formatDate(studio.draftSavedAt)}` : "No saved draft"} />
                </div>
                <div className="mt-6 flex flex-wrap gap-3 border-t border-white/[0.08] pt-5">
                  <button type="button" onClick={() => void saveDraft()} disabled={busy || !dirty} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 px-4 text-xs font-semibold hover:bg-white/[0.06] disabled:opacity-40"><ArrowDownToLine size={14} /> Save draft</button>
                  <button type="button" onClick={() => setPreviewOpen(true)} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 px-4 text-xs font-semibold hover:bg-white/[0.06]"><Eye size={14} /> Preview current changes</button>
                  <button type="button" onClick={() => void publish()} disabled={busy} className="min-h-10 rounded-full bg-amber-200 px-5 text-xs font-bold text-[#17130a] hover:bg-amber-100 disabled:opacity-45">Publish homepage</button>
                </div>
              </section>
            </div>
          )}

          {!loading && studio && view === "history" && (
            <div className="mx-auto w-full max-w-5xl p-4 sm:p-8">
              <div className="mb-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-200/80">Snapshots</p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight">Version history</h1>
                <p className="mt-2 text-sm text-slate-400">Each publish creates an immutable snapshot. Restoring publishes a new version and keeps the existing history.</p>
              </div>
              <div className="space-y-3">
                {studio.history.map((version, index) => (
                  <article key={version.id} className="flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-amber-100"><History size={15} /></div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{index === 0 ? "Current published version" : version.source_version_id ? "Restored snapshot" : "Published snapshot"}</p>
                        <p className="mt-1 text-xs text-slate-500">{formatDate(version.published_at)} · {version.published_by ? `Published by ${version.published_by}` : "Publisher unavailable"}</p>
                        <p className="mt-1 truncate font-mono text-[10px] text-slate-600">{version.id}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button type="button" onClick={() => {
                        if (dirty && !window.confirm("You have unsaved edits. Load this older version instead?")) return;
                        setContent(version.content);
                        setSavedContent(studio.draft);
                        setView("editor");
                      }} className="min-h-9 rounded-full border border-white/10 px-3 text-xs font-semibold hover:bg-white/[0.06]">Load for editing</button>
                      {index !== 0 && <button type="button" onClick={() => void publish(version.content, version.id)} disabled={busy} className="min-h-9 rounded-full border border-amber-200/20 px-3 text-xs font-semibold text-amber-100 hover:bg-amber-200/[0.07] disabled:opacity-40">Restore</button>}
                    </div>
                  </article>
                ))}
                {studio.history.length === 0 && <p className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-500">No published versions yet.</p>}
              </div>
              {studio.history.length === 50 && <p className="mt-4 text-xs text-slate-500">Showing the 50 most recent published versions.</p>}
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
            <div><h2 id="preview-title" className="text-sm font-semibold">Unpublished website preview</h2><p className="mt-1 text-[11px] text-slate-500">This preview is private and does not change the live website.</p></div>
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
            <button type="button" onClick={() => { setPreviewOpen(false); void publish(); }} disabled={busy} className="min-h-10 rounded-full bg-amber-200 px-5 text-xs font-bold text-[#17130a] disabled:opacity-40">Publish changes</button>
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
