"use client";

import {
  ArrowDown, ArrowUp, Copy, Download, Eye, Import,
  Layers3, LayoutGrid, Monitor, Palette, PanelLeft,
  Plus, Redo2, Save, Settings2, Smartphone, Tablet, Trash2,
  Undo2, Upload, X, ImagePlus, Sparkles, CircleCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  makeId,
  makeProject,
  makeSection,
  themes,
  validateProject,
  type StudioPage,
  type StudioAsset,
  type StudioProject,
  type StudioSection,
  type StudioVersion,
} from "@/lib/studio/universal-schema";
import { exportStaticWebsiteZip } from "@/lib/studio/static-site-export";
import { IndexedDbAssetStore } from "@/lib/storage";
import {
  applyWebsiteTemplate,
  createBuiltInWebsiteTemplates,
  makeCustomTemplate,
  readCustomTemplates,
  saveCustomTemplates,
  validateWebsiteTemplate,
  type WebsiteTemplate,
} from "@/lib/studio/templates";
import {
  makeReusableSection,
  readReusableSections,
  writeReusableSections,
  type ReusableSection,
} from "@/lib/studio/reusable-sections";

const draftKey = "wealth-os.studio.project.v1";
const versionKey = "wealth-os.studio.versions.v1";
const mediaStore = new IndexedDbAssetStore();
const projectIndexKey = "wealth-os.studio.projects.v1";
const activeProjectKey = "wealth-os.studio.active-project.v1";
const draftStorageKey = (id: string) => `wealth-os.studio.project.${id}.v1`;
const versionStorageKey = (id: string) => `wealth-os.studio.versions.${id}.v1`;
const publishedStorageKey = (id: string) => `wealth-os.studio.published.${id}.v1`;
const builtInTemplates = createBuiltInWebsiteTemplates();
type LeftTab = "pages" | "layers" | "components" | "templates" | "styles" | "navigation" | "assets" | "quality" | "assistant";
type Device = "desktop" | "tablet" | "mobile";

const sectionTypes: StudioSection["type"][] = ["hero", "about", "services", "stats", "cta", "faq", "team", "testimonials", "disclaimer"];

function readVersions(key = versionKey): StudioVersion[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function mediaKey(project: StudioProject, assetId: string, blobKey = assetId) {
  return `${project.id}:${blobKey}`;
}

function dataUrlToBlob(value: string) {
  const match = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/.exec(value);
  if (!match) throw new Error("Unsupported embedded media format.");
  const mime = match[1] || "application/octet-stream";
  if (match[2]) {
    const binary = atob(match[3]);
    return new Blob([Uint8Array.from(binary, (character) => character.charCodeAt(0))], { type: mime });
  }
  return new Blob([decodeURIComponent(match[3])], { type: mime });
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Media could not be read."));
    reader.readAsDataURL(blob);
  });
}

async function prepareProjectMedia(sourceProject: StudioProject) {
  let project = JSON.parse(JSON.stringify(sourceProject)) as StudioProject;
  const urls: Record<string, string> = {};
  const legacyDataUrls = new Map<string, string>();
  const assets: StudioAsset[] = [];
  for (const asset of project.assets) {
    let dataUrl = asset.dataUrl;
    let blobKey = asset.blobKey || asset.id;
    if (dataUrl.startsWith("data:")) {
      blobKey = asset.id;
      await mediaStore.set(mediaKey(project, asset.id, blobKey), dataUrlToBlob(dataUrl));
      legacyDataUrls.set(dataUrl, `asset:${asset.id}`);
      dataUrl = "";
    }
    const stored = dataUrl ? null : await mediaStore.get(mediaKey(project, asset.id, blobKey));
    const source = stored ? URL.createObjectURL(stored) : dataUrl;
    if (source) urls[asset.id] = source;
    assets.push({ ...asset, blobKey, dataUrl });
  }
  project = {
    ...project,
    assets,
    logo: legacyDataUrls.get(project.logo) ?? project.logo,
    pages: project.pages.map((page) => ({
      ...page,
      sections: page.sections.map((section) => ({ ...section, image: legacyDataUrls.get(section.image) ?? section.image })),
    })),
  };
  return { project, urls, migrated: legacyDataUrls.size > 0 };
}

function applyOnboardingDetails(project: StudioProject, value: unknown) {
  if (!value || typeof value !== "object") return project;
  const onboarding = value as { businessName?: unknown; themeId?: unknown };
  const name = typeof onboarding.businessName === "string" ? onboarding.businessName.trim().slice(0, 120) : "";
  if (name) {
    project.organization = name;
    project.tradingName = name;
    project.pages = project.pages.map((page, index) => ({ ...page, title: `${index === 0 ? "Home" : page.name} | ${name}` }));
    project.footer.text = name;
  }
  const theme = themes.find((item) => item.id === onboarding.themeId);
  if (theme) {
    project.tokens = theme.tokens;
    project.header.style = theme.tokens.mode === "dark" ? "floating" : "standard";
  }
  return project;
}

export function UniversalStudio() {
  const [project, setProject] = useState<StudioProject>(makeProject);
  const [saved, setSaved] = useState<StudioProject>(makeProject);
  const [ready, setReady] = useState(false);
  const [leftTab, setLeftTab] = useState<LeftTab>("pages");
  const [device, setDevice] = useState<Device>("desktop");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [notice, setNotice] = useState("Local browser workspace");
  const [undo, setUndo] = useState<StudioProject[]>([]);
  const [redo, setRedo] = useState<StudioProject[]>([]);
  const [versions, setVersions] = useState<StudioVersion[]>([]);
  const [projectEntries, setProjectEntries] = useState<{ id: string; name: string; updatedAt: string }[]>([]);
  const importRef = useRef<HTMLInputElement>(null);
  const assetRef = useRef<HTMLInputElement>(null);
  const templateImportRef = useRef<HTMLInputElement>(null);
  const [assetNotice, setAssetNotice] = useState("");
  const [assistantText, setAssistantText] = useState("");
  const [assetUrls, setAssetUrls] = useState<Record<string, string>>({});
  const [replaceAssetId, setReplaceAssetId] = useState<string | null>(null);
  const [assistantProposal, setAssistantProposal] = useState<{ project: StudioProject; summary: string } | null>(null);
  const [customTemplates, setCustomTemplates] = useState<WebsiteTemplate[]>([]);
  const [templateProposal, setTemplateProposal] = useState<{ template: WebsiteTemplate; project: StudioProject } | null>(null);
  const [reusableSections, setReusableSections] = useState<ReusableSection[]>([]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      void (async () => {
        let next = makeProject();
        let selectedId = localStorage.getItem(activeProjectKey) || "default";
        try {
          setCustomTemplates(readCustomTemplates());
        } catch (error) {
          setNotice(error instanceof Error ? error.message : "Saved templates could not be restored.");
        }
        let storageKey = draftStorageKey(selectedId);
        let raw: string | null = null;
        try {
          const onboardingRaw = localStorage.getItem("wealth-os.product.onboarding.v1");
          const onboarding = onboardingRaw ? JSON.parse(onboardingRaw) as { businessName?: unknown } : null;
          if (typeof onboarding?.businessName === "string" && onboarding.businessName.trim()) {
            next = applyOnboardingDetails(makeProject(), onboarding);
            next.id = makeId("project");
            selectedId = next.id;
            storageKey = draftStorageKey(selectedId);
            raw = JSON.stringify(next);
          } else {
            raw = localStorage.getItem(storageKey) ?? (selectedId === "default" ? localStorage.getItem(draftKey) : null);
            if (raw) next = validateProject(JSON.parse(raw));
          }
          next.id = selectedId;
        } catch (error) {
          if (active) setNotice(error instanceof Error ? error.message : "The saved project could not be restored.");
        }
        try {
          const prepared = await prepareProjectMedia(next);
          next = prepared.project;
          try {
            setReusableSections(readReusableSections(next.id));
          } catch (error) {
            setNotice(error instanceof Error ? error.message : "Reusable sections could not be restored.");
          }
          if (!active) {
            Object.values(prepared.urls).filter((url) => url.startsWith("blob:")).forEach(URL.revokeObjectURL);
            return;
          }
          setAssetUrls(prepared.urls);
          setProject(next);
          setSaved(next);
          if (raw && (prepared.migrated || !localStorage.getItem(storageKey))) {
            localStorage.setItem(storageKey, JSON.stringify(next));
            setNotice("Media migrated to browser file storage.");
          }
          const savedIndex = JSON.parse(localStorage.getItem(projectIndexKey) ?? "[]");
          const entries: { id: string; name: string; updatedAt: string }[] = Array.isArray(savedIndex) ? savedIndex : [];
          const currentEntry = { id: next.id, name: next.tradingName, updatedAt: next.updatedAt };
          const nextEntries = entries.some((entry) => entry.id === next.id)
            ? entries.map((entry) => entry.id === next.id ? currentEntry : entry)
            : [currentEntry, ...entries];
          localStorage.setItem(projectIndexKey, JSON.stringify(nextEntries));
          localStorage.setItem(activeProjectKey, next.id);
          localStorage.removeItem("wealth-os.product.onboarding.v1");
          setProjectEntries(nextEntries);
        } catch (error) {
          if (active) {
            setProject(next);
            setSaved(next);
            setAssetUrls(Object.fromEntries(next.assets.filter((asset) => asset.dataUrl).map((asset) => [asset.id, asset.dataUrl])));
            setNotice(error instanceof Error ? `Media storage could not be initialized: ${error.message}` : "Media storage could not be initialized.");
            const currentEntry = { id: next.id, name: next.tradingName, updatedAt: next.updatedAt };
            const entries = [currentEntry];
            setProjectEntries(entries);
          }
        }
        if (active) {
          const currentVersions = readVersions(versionStorageKey(next.id));
          const restoredVersions = currentVersions.length || next.id !== "default" ? currentVersions : readVersions();
          setVersions(restoredVersions);
          if (restoredVersions.length && !currentVersions.length) {
            localStorage.setItem(versionStorageKey(next.id), JSON.stringify(restoredVersions));
          }
          setReady(true);
        }
      })();
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => () => {
    Object.values(assetUrls).filter((url) => url.startsWith("blob:")).forEach(URL.revokeObjectURL);
  }, [assetUrls]);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(draftStorageKey(project.id), JSON.stringify(project));
        const stored = JSON.parse(localStorage.getItem(projectIndexKey) ?? "[]");
        const currentEntries: { id: string; name: string; updatedAt: string }[] = Array.isArray(stored) ? stored : [];
        const entries = currentEntries.map((entry) => entry.id === project.id
          ? { ...entry, name: project.tradingName, updatedAt: project.updatedAt }
          : entry);
        if (!entries.some((entry) => entry.id === project.id)) entries.unshift({ id: project.id, name: project.tradingName, updatedAt: project.updatedAt });
        if (JSON.stringify(entries) !== JSON.stringify(currentEntries)) {
          localStorage.setItem(projectIndexKey, JSON.stringify(entries));
          setProjectEntries(entries);
        }
      } catch {
        setNotice("Browser storage is unavailable. Export a backup before leaving.");
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [project, ready]);

  const activePage = useMemo(
    () => project.pages.find((page) => page.id === project.activePageId) ?? project.pages[0],
    [project],
  );
  const selected = useMemo(
    () => activePage?.sections.find((section) => section.id === selectedId) ?? null,
    [activePage, selectedId],
  );
  const dirty = JSON.stringify(project) !== JSON.stringify(saved);

  const commit = useCallback((next: StudioProject) => {
    setUndo((stack) => [...stack.slice(-39), project]);
    setRedo([]);
    setProject({ ...next, updatedAt: new Date().toISOString() });
  }, [project]);

  function persistProjectIndex(current: StudioProject, entries = projectEntries) {
    const updatedEntry = { id: current.id, name: current.tradingName, updatedAt: current.updatedAt };
    const updated = entries.some((entry) => entry.id === current.id)
      ? entries.map((entry) => entry.id === current.id ? updatedEntry : entry)
      : [updatedEntry, ...entries];
    localStorage.setItem(projectIndexKey, JSON.stringify(updated));
    setProjectEntries(updated);
    return updated;
  }

  async function switchProject(id: string) {
    if (id === project.id) return;
    try {
      localStorage.setItem(draftStorageKey(project.id), JSON.stringify(project));
      persistProjectIndex(project);
      const raw = localStorage.getItem(draftStorageKey(id));
      if (!raw) throw new Error("The selected project could not be found in this browser.");
      const prepared = await prepareProjectMedia(validateProject(JSON.parse(raw)));
      localStorage.setItem(activeProjectKey, id);
      setProject(prepared.project);
      setSaved(prepared.project);
      setAssetUrls(prepared.urls);
      setVersions(readVersions(versionStorageKey(id)));
      try {
        setReusableSections(readReusableSections(id));
      } catch (error) {
        setReusableSections([]);
        setNotice(error instanceof Error ? error.message : "Reusable sections could not be restored.");
      }
      setUndo([]);
      setRedo([]);
      setSelectedId(null);
      setNotice(`Opened ${prepared.project.tradingName} in this browser.`);
    } catch (error) {
      setNotice(error instanceof Error ? `Could not open project: ${error.message}` : "Could not open project.");
    }
  }

  function createProject() {
    try {
      localStorage.setItem(draftStorageKey(project.id), JSON.stringify(project));
      const next = makeProject();
      next.id = makeId("project");
      let businessName = "New Wealth Business";
      try {
        const onboarding = JSON.parse(localStorage.getItem("wealth-os.product.onboarding.v1") ?? "null");
        if (typeof onboarding?.businessName === "string" && onboarding.businessName.trim()) businessName = onboarding.businessName.trim().slice(0, 120);
        const onboardingTheme = themes.find((theme) => theme.id === onboarding?.themeId);
        if (onboardingTheme) {
          next.tokens = onboardingTheme.tokens;
          next.header.style = onboardingTheme.tokens.mode === "dark" ? "floating" : "standard";
        }
      } catch {
        setNotice("Onboarding details could not be read; using the default project identity.");
      }
      next.organization = businessName;
      next.tradingName = businessName;
      next.pages[0].title = `Home | ${businessName}`;
      next.pages[1].title = `About | ${businessName}`;
      next.footer.text = businessName;
      localStorage.setItem(draftStorageKey(next.id), JSON.stringify(next));
      localStorage.setItem(activeProjectKey, next.id);
      const entry = { id: next.id, name: next.tradingName, updatedAt: next.updatedAt };
      const entries = [entry, ...projectEntries.filter((item) => item.id !== project.id), { id: project.id, name: project.tradingName, updatedAt: project.updatedAt }];
      localStorage.setItem(projectIndexKey, JSON.stringify(entries));
      localStorage.removeItem("wealth-os.product.onboarding.v1");
      setProjectEntries(entries);
      setProject(next);
      setSaved(next);
      setVersions([]);
      setReusableSections([]);
      setUndo([]);
      setRedo([]);
      setAssetUrls({});
      setSelectedId(null);
      setNotice("New independent website project created locally.");
    } catch (error) {
      setNotice(error instanceof Error ? `Could not create project: ${error.message}` : "Could not create project.");
    }
  }

  async function deleteCurrentProject() {
    if (projectEntries.length <= 1) {
      setNotice("Keep at least one project in this browser workspace.");
      return;
    }
    if (!window.confirm(`Permanently delete ${project.tradingName} and its local media?`)) return;
    try {
      const historicalAssets = [
        ...project.assets,
        ...versions.flatMap((version) => version.project.assets),
      ];
      const historicalKeys = new Map<string, [string, string]>();
      for (const asset of historicalAssets) {
        const key = [asset.id, asset.blobKey || asset.id] as [string, string];
        historicalKeys.set(JSON.stringify(key), key);
      }
      for (const [assetId, blobKey] of historicalKeys.values()) await mediaStore.remove(mediaKey(project, assetId, blobKey));
      localStorage.removeItem(draftStorageKey(project.id));
      localStorage.removeItem(versionStorageKey(project.id));
      localStorage.removeItem(publishedStorageKey(project.id));
      const remaining = projectEntries.filter((entry) => entry.id !== project.id);
      localStorage.setItem(projectIndexKey, JSON.stringify(remaining));
      setProjectEntries(remaining);
      const raw = localStorage.getItem(draftStorageKey(remaining[0].id));
      if (!raw) throw new Error("The next project in the workspace could not be found.");
      const prepared = await prepareProjectMedia(validateProject(JSON.parse(raw)));
      localStorage.setItem(activeProjectKey, remaining[0].id);
      setProject(prepared.project);
      setSaved(prepared.project);
      setAssetUrls(prepared.urls);
      setVersions(readVersions(versionStorageKey(remaining[0].id)));
      try {
        setReusableSections(readReusableSections(remaining[0].id));
      } catch (error) {
        setReusableSections([]);
        setNotice(error instanceof Error ? error.message : "Reusable sections could not be restored.");
      }
      setUndo([]);
      setRedo([]);
      setSelectedId(null);
      setNotice("Project and its media were deleted from this browser.");
    } catch (error) {
      setNotice(error instanceof Error ? `Could not delete project: ${error.message}` : "Could not delete project.");
    }
  }

  function save() {
    try {
      localStorage.setItem(draftStorageKey(project.id), JSON.stringify(project));
      setSaved(project);
      const version: StudioVersion = {
        id: makeId("version"), savedAt: new Date().toISOString(), label: "Manual save",
        project: JSON.parse(JSON.stringify(project)),
      };
      const nextVersions = [version, ...versions].slice(0, 30);
      localStorage.setItem(versionStorageKey(project.id), JSON.stringify(nextVersions));
      setVersions(nextVersions);
      setNotice("Draft saved locally");
      if (process.env.NEXT_PUBLIC_STUDIO_STORAGE_MODE === "supabase") {
        void fetch("/api/wealth-os/projects", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project, status: "draft" }),
        }).then(async (response) => {
          if (response.ok) setNotice("Draft saved locally and synchronized with Supabase");
          else setNotice("Draft saved locally; Supabase synchronization is unavailable");
        }).catch(() => setNotice("Draft saved locally; Supabase synchronization is unavailable"));
      }
    } catch {
      setNotice("Could not save in this browser");
    }
  }

  function undoAction() {
    const previous = undo.at(-1);
    if (!previous) return;
    setRedo((stack) => [project, ...stack]);
    setUndo((stack) => stack.slice(0, -1));
    setProject(previous);
  }

  function redoAction() {
    const next = redo[0];
    if (!next) return;
    setUndo((stack) => [...stack, project]);
    setRedo((stack) => stack.slice(1));
    setProject(next);
  }

  function updateActivePage(updater: (page: StudioPage) => StudioPage) {
    commit({
      ...project,
      pages: project.pages.map((page) => page.id === activePage.id ? updater(page) : page),
    });
  }

  function updateSection(id: string, patch: Partial<StudioSection>) {
    updateActivePage((page) => ({
      ...page,
      sections: page.sections.map((section) => section.id === id ? { ...section, ...patch } : section),
    }));
  }

  function addSection(type: StudioSection["type"]) {
    const section = makeSection(type);
    updateActivePage((page) => ({ ...page, sections: [...page.sections, section] }));
    setSelectedId(section.id);
  }

  function moveSection(id: string, direction: -1 | 1) {
    updateActivePage((page) => {
      const index = page.sections.findIndex((section) => section.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= page.sections.length) return page;
      const sections = [...page.sections];
      [sections[index], sections[target]] = [sections[target], sections[index]];
      return { ...page, sections };
    });
  }

  function duplicateSection(section: StudioSection) {
    const copy = { ...section, id: makeId("section") };
    updateActivePage((page) => {
      const index = page.sections.findIndex((item) => item.id === section.id);
      const sections = [...page.sections];
      sections.splice(index + 1, 0, copy);
      return { ...page, sections };
    });
    setSelectedId(copy.id);
  }

  function deleteSection(id: string) {
    updateActivePage((page) => ({ ...page, sections: page.sections.filter((section) => section.id !== id) }));
    setSelectedId(null);
  }

  function addPage() {
    const page: StudioPage = {
      id: makeId("page"), name: "New page", slug: `/site/page-${project.pages.length + 1}`,
      title: "New page | " + project.tradingName, description: "", sections: [makeSection("hero")],
    };
    commit({ ...project, pages: [...project.pages, page], activePageId: page.id });
  }

  function duplicatePage(page: StudioPage) {
    const copy: StudioPage = {
      ...page, id: makeId("page"), name: `${page.name} copy`,
      slug: `${page.slug === "/" ? "/home" : page.slug}-copy`,
      sections: page.sections.map((section) => ({ ...section, id: makeId("section") })),
    };
    commit({ ...project, pages: [...project.pages, copy], activePageId: copy.id });
  }

  function publish() {
    const next = { ...project, published: true, publishedAt: new Date().toISOString() };
    try {
      localStorage.setItem(publishedStorageKey(project.id), JSON.stringify(next));
      localStorage.setItem(draftStorageKey(project.id), JSON.stringify(next));
      const version: StudioVersion = {
        id: makeId("version"), savedAt: next.publishedAt!, label: "Published locally",
        project: JSON.parse(JSON.stringify(next)),
      };
      const nextVersions = [version, ...versions].slice(0, 30);
      localStorage.setItem(versionStorageKey(project.id), JSON.stringify(nextVersions));
      setVersions(nextVersions);
      setProject(next);
      setSaved(next);
      setNotice("Published locally. This is exportable and visible in this browser only.");
      if (process.env.NEXT_PUBLIC_STUDIO_STORAGE_MODE === "supabase") {
        void fetch("/api/wealth-os/projects", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project: next, status: "published" }),
        }).then(async (response) => {
          if (response.ok) setNotice("Published and synchronized with Supabase");
          else setNotice("Published locally; Supabase publishing is unavailable");
        }).catch(() => setNotice("Published locally; Supabase publishing is unavailable"));
      }
    } catch {
      setNotice("Could not publish locally. Browser storage is unavailable.");
    }
  }

  function exportWebsite() {
    void (async () => {
      try {
        const portableProject = JSON.parse(JSON.stringify(project)) as StudioProject;
        for (const asset of portableProject.assets) {
          if (asset.dataUrl) continue;
          const blob = await mediaStore.get(mediaKey(portableProject, asset.id, asset.blobKey || asset.id));
          if (!blob) throw new Error(`The stored file for ${asset.name} is unavailable.`);
          asset.dataUrl = await blobToDataUrl(blob);
        }
        const archive = exportStaticWebsiteZip(portableProject);
      const blob = new Blob([archive], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${project.tradingName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "wealth-os"}-website.zip`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice("Standalone website ZIP exported. Upload its contents to static hosting.");
      } catch (error) {
        setNotice(error instanceof Error ? `Website export failed: ${error.message}` : "Website export failed.");
      }
    })();
  }

  async function importProject(file: File) {
    try {
      let next = validateProject(JSON.parse(await file.text()));
      const legacyDataUrls = new Map<string, string>();
      const urls: Record<string, string> = {};
      const assets: StudioAsset[] = [];
      for (const asset of next.assets) {
        let dataUrl = asset.dataUrl;
        let blobKey = asset.blobKey || asset.id;
        if (dataUrl.startsWith("data:")) {
          blobKey = asset.id;
          await mediaStore.set(mediaKey(next, asset.id, blobKey), dataUrlToBlob(dataUrl));
          legacyDataUrls.set(dataUrl, `asset:${asset.id}`);
          dataUrl = "";
        }
        const blob = dataUrl ? null : await mediaStore.get(mediaKey(next, asset.id, blobKey));
        const source = blob ? URL.createObjectURL(blob) : dataUrl;
        if (source) urls[asset.id] = source;
        assets.push({ ...asset, blobKey, dataUrl });
      }
      next = {
        ...next,
        assets,
        logo: legacyDataUrls.get(next.logo) ?? next.logo,
        pages: next.pages.map((page) => ({
          ...page,
          sections: page.sections.map((section) => ({ ...section, image: legacyDataUrls.get(section.image) ?? section.image })),
        })),
      };
      commit(next);
      setAssetUrls(urls);
      setNotice("Configuration imported");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The import file is invalid.");
    }
  }

  function restoreVersion(version: StudioVersion) {
    commit(validateProject(JSON.parse(JSON.stringify(version.project))));
    setNotice(`Restored ${version.label}`);
  }

  async function uploadAsset(file: File) {
    if (file.size > 2 * 1024 * 1024) {
      setAssetNotice("Choose a file smaller than 2 MB.");
      return;
    }
    const supportedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "application/pdf"];
    if (!supportedTypes.includes(file.type)) {
      setAssetNotice("Choose a PNG, JPEG, WebP, GIF, AVIF or PDF file.");
      return;
    }
    const totalSize = project.assets.reduce((total, asset) => total + asset.size, 0);
    const replacedSize = project.assets.find((asset) => asset.id === replaceAssetId)?.size ?? 0;
    if (totalSize - replacedSize + file.size > 50 * 1024 * 1024) {
      setAssetNotice("This project has a 50 MB media limit. Delete unused files before adding more.");
      return;
    }
    const id = replaceAssetId ?? makeId("asset");
    const blobKey = replaceAssetId ? `${id}-${makeId("revision")}` : id;
    try {
      await mediaStore.set(mediaKey(project, id, blobKey), file);
      const nextAsset: StudioAsset = {
        id,
        blobKey,
        name: file.name.replace(/[^\w.-]/g, "-").slice(0, 120),
        type: file.type.startsWith("image/") ? "image" : "document",
        dataUrl: "",
        size: file.size,
        createdAt: new Date().toISOString(),
      };
      const nextAssets = replaceAssetId
        ? project.assets.map((asset) => asset.id === id ? nextAsset : asset)
        : [...project.assets, nextAsset];
      commit({ ...project, assets: nextAssets });
      setAssetUrls((current) => ({ ...current, [id]: URL.createObjectURL(file) }));
      setAssetNotice(replaceAssetId ? `${file.name} replaced in the local media library.` : `${file.name} added to the local media library.`);
    } catch (error) {
      setAssetNotice(error instanceof Error ? `Could not store this file: ${error.message}` : "Could not store this file.");
    } finally {
      setReplaceAssetId(null);
    }
  }

  async function deleteAsset(asset: StudioAsset) {
    if (!window.confirm(`Delete ${asset.name} and remove its page references?`)) return;
    try {
      const historicalBlobKeys = new Set([
        asset.blobKey || asset.id,
        ...versions.flatMap((version) => version.project.assets.filter((item) => item.id === asset.id).map((item) => item.blobKey || item.id)),
      ]);
      for (const blobKey of historicalBlobKeys) await mediaStore.remove(mediaKey(project, asset.id, blobKey));
      const withoutAsset = (value: StudioProject): StudioProject => ({
        ...value,
        assets: value.assets.filter((item) => item.id !== asset.id),
        logo: value.logo === `asset:${asset.id}` ? "" : value.logo,
        pages: value.pages.map((page) => ({
          ...page,
          sections: page.sections.map((section) => ({ ...section, image: section.image === `asset:${asset.id}` ? "" : section.image })),
        })),
      });
      const reusableWithoutAsset = reusableSections.map((item) => ({
        ...item,
        section: { ...item.section, image: item.section.image === `asset:${asset.id}` ? "" : item.section.image },
      }));
      writeReusableSections(project.id, reusableWithoutAsset);
      setReusableSections(reusableWithoutAsset);
      setUndo((stack) => stack.map(withoutAsset));
      setRedo((stack) => stack.map(withoutAsset));
      setVersions((current) => {
        const updated = current.map((version) => ({ ...version, project: withoutAsset(version.project) }));
        localStorage.setItem(versionStorageKey(project.id), JSON.stringify(updated));
        return updated;
      });
      setProject({ ...withoutAsset(project), updatedAt: new Date().toISOString() });
      setSaved((current) => withoutAsset(current));
      const savedPublication = localStorage.getItem(publishedStorageKey(project.id));
      if (savedPublication) localStorage.setItem(publishedStorageKey(project.id), JSON.stringify(withoutAsset(JSON.parse(savedPublication))));
      setAssetUrls((current) => {
        const next = { ...current };
        delete next[asset.id];
        return next;
      });
      setAssetNotice(`${asset.name} deleted and references removed.`);
    } catch (error) {
      setAssetNotice(error instanceof Error ? `Could not delete this file: ${error.message}` : "Could not delete this file.");
    }
  }

  function previewWebsiteTemplate(template: WebsiteTemplate) {
    setTemplateProposal({ template, project: applyWebsiteTemplate(project, template) });
  }

  function saveCurrentAsTemplate() {
    const name = window.prompt("Name this reusable website template:", `${project.tradingName} template`);
    if (!name?.trim()) return;
    try {
      const template = makeCustomTemplate(project, name.trim(), "Saved locally from this website project.");
      const next = [template, ...customTemplates].slice(0, 30);
      saveCustomTemplates(next);
      setCustomTemplates(next);
      setNotice("Reusable template saved locally. Uploaded media is excluded.");
    } catch (error) {
      setNotice(error instanceof Error ? `Could not save template: ${error.message}` : "Could not save template.");
    }
  }

  function saveSelectedAsReusableSection() {
    if (!selected) return;
    const name = window.prompt("Name this reusable section:", selected.title || selected.type);
    if (!name?.trim()) return;
    try {
      const entry = makeReusableSection(selected, name);
      const next = [entry, ...reusableSections].slice(0, 100);
      writeReusableSections(project.id, next);
      setReusableSections(next);
      setNotice("Reusable section saved to this project.");
    } catch (error) {
      setNotice(error instanceof Error ? `Could not save section: ${error.message}` : "Could not save section.");
    }
  }

  function insertReusableSection(entry: ReusableSection) {
    const section = { ...entry.section, id: makeId("section") };
    updateActivePage((page) => ({ ...page, sections: [...page.sections, section] }));
    setSelectedId(section.id);
  }

  function deleteReusableSection(id: string) {
    try {
      const next = reusableSections.filter((item) => item.id !== id);
      writeReusableSections(project.id, next);
      setReusableSections(next);
    } catch (error) {
      setNotice(error instanceof Error ? `Could not delete section: ${error.message}` : "Could not delete section.");
    }
  }

  function duplicateTemplate(template: WebsiteTemplate) {
    try {
      const copy = makeCustomTemplate(template.project, `${template.name} copy`, template.description);
      const next = [copy, ...customTemplates].slice(0, 30);
      saveCustomTemplates(next);
      setCustomTemplates(next);
      setNotice(`${template.name} duplicated to your local templates.`);
    } catch (error) {
      setNotice(error instanceof Error ? `Could not duplicate template: ${error.message}` : "Could not duplicate template.");
    }
  }

  function exportTemplate(template: WebsiteTemplate) {
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${template.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "wealth-os"}-template.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importTemplate(file: File) {
    try {
      const template = validateWebsiteTemplate(JSON.parse(await file.text()));
      template.builtIn = false;
      const next = [template, ...customTemplates].slice(0, 30);
      saveCustomTemplates(next);
      setCustomTemplates(next);
      setNotice(`${template.name} imported to the local template library.`);
    } catch (error) {
      setNotice(error instanceof Error ? `Template import failed: ${error.message}` : "Template import failed.");
    }
  }

  function runAssistant() {
    const command = assistantText.trim().toLowerCase();
    if (!command) return;
    if (command.includes("luxury") || command.includes("private wealth")) {
      const theme = themes.find((item) => item.id === "luxury")!;
      const next = {
        ...project,
        tokens: theme.tokens,
        header: { ...project.header, style: "floating" as const },
        pages: project.pages.map((page) => ({
          ...page,
          sections: page.sections.map((section) => ({
            ...section,
            layout: section.type === "hero" ? "split" as const : section.layout,
            padding: section.type === "hero" ? 88 : section.padding,
            radius: section.type === "hero" ? 24 : section.radius,
          })),
        })),
      };
      setAssistantProposal({ project: next, summary: "Apply the luxury palette, floating glass header and refined hero spacing across this project." });
      setAssistantText("");
      return;
    }
    if (command.includes("retirement") || command.includes("new page")) {
      const page: StudioPage = {
        id: makeId("page"), name: "Retirement planning", slug: "/site/retirement-planning",
        title: "Retirement planning | " + project.tradingName, description: "Transparent retirement planning illustrations.",
        sections: [makeSection("hero"), makeSection("services"), makeSection("cta"), makeSection("disclaimer")],
      };
      setAssistantProposal({ project: { ...project, pages: [...project.pages, page], activePageId: page.id }, summary: "Add an editable retirement-planning page with services, contact and disclosure sections." });
      setAssistantText("");
      return;
    }
    if (command.includes("mobile")) {
      setAssistantProposal({
        project: {
          ...project,
          pages: project.pages.map((page) => page.id === activePage.id
            ? { ...page, sections: page.sections.map((section) => ({ ...section, mobileLayout: "stack", mobilePadding: 24 })) }
            : page),
        },
        summary: "Set every section on the active page to a stacked layout with comfortable mobile spacing.",
      });
      setAssistantText("");
      return;
    }
    if (command.includes("portal") || command.includes("client")) {
      setAssistantProposal({
        project: { ...project, tokens: { ...project.tokens, mode: "light", primary: "#b99a5b", accent: "#805c0a", radius: 18 } },
        summary: "Align the current project with a restrained client-facing palette and softer interface corners.",
      });
      setAssistantText("");
      return;
    }
    setAssistantProposal({
      project: { ...project, tokens: { ...project.tokens, radius: 16, shadow: "medium" }, header: { ...project.header, style: "floating" } },
      summary: "Apply restrained glass styling and more consistent rounded surfaces.",
    });
    setAssistantText("");
  }

  const qualityFindings = useMemo(() => {
    const findings: { level: "error" | "warning" | "info"; text: string }[] = [];
    if (!project.tradingName.trim()) findings.push({ level: "error", text: "Trading name is missing." });
    if (!project.logo) findings.push({ level: "warning", text: "Logo or text identity has not been selected." });
    if (!project.footer.disclosure.trim()) findings.push({ level: "error", text: "Financial or legal disclosure text is missing." });
    if (!project.contact.email || !project.contact.phone) findings.push({ level: "warning", text: "Business contact details are incomplete." });
    project.pages.forEach((page) => {
      if (!page.title.trim()) findings.push({ level: "warning", text: `${page.name}: page title is missing.` });
      if (!page.description.trim()) findings.push({ level: "info", text: `${page.name}: SEO description is missing.` });
      if (!page.sections.length) findings.push({ level: "error", text: `${page.name}: page contains no sections.` });
      page.sections.forEach((section) => {
        if (!section.title.trim()) findings.push({ level: "warning", text: `${page.name}: a ${section.type} section has no title.` });
        if (section.hidden) findings.push({ level: "info", text: `${page.name}: ${section.type} is hidden.` });
      });
    });
    if (!findings.length) findings.push({ level: "info", text: "No immediate quality issues detected." });
    return findings;
  }, [project]);

  const canvasWidth = device === "mobile" ? "390px" : device === "tablet" ? "768px" : "100%";

  if (!ready) return <main className="fixed inset-0 z-[300] grid place-items-center bg-[#090d16] text-slate-100">Loading Studio…</main>;

  return (
    <main className="fixed inset-0 z-[300] flex overflow-hidden bg-[#090d16] text-slate-100">
      <aside className={`${leftPanelOpen ? "flex" : "hidden"} absolute bottom-0 left-0 top-14 z-[420] w-[208px] shrink-0 border-r border-white/10 bg-[#0d1320] md:relative md:top-auto md:flex md:flex-col`}>
        <div className="flex h-14 items-center gap-2 border-b border-white/10 px-4">
          <div className="grid size-8 place-items-center rounded-lg bg-[#d4af37] text-xs font-black text-[#101726]">W</div>
          <div><p className="text-xs font-bold">WEALTH OS</p><p className="text-[9px] uppercase tracking-[0.16em] text-slate-500">Studio</p></div>
          <button type="button" className="studio-icon ml-auto md:hidden" onClick={() => setLeftPanelOpen(false)} aria-label="Close panels"><X size={14} /></button>
        </div>
        <div className="flex gap-1 border-b border-white/10 p-2">
          <label className="sr-only" htmlFor="studio-project-picker">Website project</label>
          <select id="studio-project-picker" aria-label="Website project" value={project.id} onChange={(event) => void switchProject(event.target.value)} className="studio-input min-w-0 flex-1 truncate">
            {projectEntries.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
          </select>
          <button type="button" onClick={createProject} className="studio-icon" aria-label="Create website project" title="Create website project"><Plus size={15} /></button>
          {projectEntries.length > 1 && <button type="button" onClick={() => void deleteCurrentProject()} className="studio-icon text-red-300" aria-label="Delete current website project" title="Delete current website project"><Trash2 size={14} /></button>}
        </div>
        <nav className="flex-1 p-2" aria-label="Studio sections">
          {([
            ["pages", "Pages", Layers3], ["layers", "Layers", LayoutGrid], ["components", "Components", Plus],
            ["templates", "Templates", PanelLeft], ["assets", "Media", ImagePlus], ["styles", "Global styles", Palette],
            ["navigation", "Navigation", Settings2], ["quality", "Quality", CircleCheck], ["assistant", "Creative AI", Sparkles],
          ] as [LeftTab, string, typeof Layers3][]).map(([id, label, Icon]) => (
            <button key={id} type="button" onClick={() => setLeftTab(id)} className={`mb-1 flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-xs ${leftTab === id ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5"}`}><Icon size={15} />{label}</button>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3"><p className="truncate text-[10px] text-slate-500">{notice}</p><p className="mt-2 text-[9px] leading-4 text-slate-600">No real business or customer data is loaded.</p><p className="mt-2 flex justify-between text-[9px] text-slate-600"><span>Browser authentication</span><span>Disabled</span></p></div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-white/10 bg-[#0d1320] px-3">
          <button type="button" className="grid size-9 place-items-center rounded-lg border border-white/10 md:hidden" onClick={() => setLeftPanelOpen((open) => !open)} aria-label="Open panels"><PanelLeft size={16} /></button>
          <div className="hidden min-w-0 items-center gap-1 sm:flex">
            <button type="button" onClick={undoAction} disabled={!undo.length} className="studio-icon" aria-label="Undo"><Undo2 size={15} /></button>
            <button type="button" onClick={redoAction} disabled={!redo.length} className="studio-icon" aria-label="Redo"><Redo2 size={15} /></button>
          </div>
          <div className="mx-auto hidden items-center gap-1 rounded-lg border border-white/10 p-1 sm:flex">
            <button type="button" onClick={() => setDevice("desktop")} className={`studio-icon ${device === "desktop" ? "bg-white/10" : ""}`} aria-label="Desktop"><Monitor size={15} /></button>
            <button type="button" onClick={() => setDevice("tablet")} className={`studio-icon ${device === "tablet" ? "bg-white/10" : ""}`} aria-label="Tablet"><Tablet size={15} /></button>
            <button type="button" onClick={() => setDevice("mobile")} className={`studio-icon ${device === "mobile" ? "bg-white/10" : ""}`} aria-label="Mobile"><Smartphone size={15} /></button>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <button type="button" onClick={() => setPreview(true)} className="studio-toolbar-button"><Eye size={15} /><span className="hidden lg:inline">Preview</span></button>
            <button type="button" onClick={save} className="studio-toolbar-button"><Save size={15} /><span className="hidden lg:inline">{dirty ? "Save" : "Saved"}</span></button>
            <button type="button" onClick={publish} className="studio-toolbar-button bg-[#d4af37] text-[#101726]"><Upload size={15} /><span className="hidden lg:inline">Publish</span></button>
            <button type="button" onClick={() => setRightPanelOpen((open) => !open)} className="studio-icon xl:hidden" aria-label="Properties"><Settings2 size={15} /></button>
            <button type="button" onClick={exportWebsite} className="studio-toolbar-button" aria-label="Export standalone website ZIP"><Download size={15} /><span className="hidden lg:inline">Export site</span></button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <aside className="hidden w-[228px] shrink-0 overflow-y-auto border-r border-white/10 bg-[#101725] p-3 lg:block">
            {leftTab === "pages" && (
              <><div className="mb-3 flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Pages</p><button type="button" onClick={addPage} className="studio-icon" aria-label="Add page"><Plus size={14} /></button></div>
              {project.pages.map((page) => (
                <div key={page.id} className={`mb-1 flex min-h-10 items-center rounded-lg px-2 ${page.id === activePage.id ? "bg-white/10" : "text-slate-400 hover:bg-white/5"}`}>
                  <button type="button" onClick={() => { commit({ ...project, activePageId: page.id }); setSelectedId(null); }} className="min-h-10 flex-1 text-left text-xs">{page.name}</button>
                  <button type="button" onClick={() => duplicatePage(page)} className="studio-icon" aria-label={`Duplicate ${page.name}`}><Copy size={13} /></button>
                  {project.pages.length > 1 && <button type="button" onClick={() => {
                    if (!window.confirm(`Delete ${page.name}? This can be undone.`)) return;
                    const pages = project.pages.filter((item) => item.id !== page.id);
                    commit({ ...project, pages, activePageId: page.id === project.activePageId ? pages[0].id : project.activePageId });
                  }} className="studio-icon text-red-300" aria-label={`Delete ${page.name}`}><Trash2 size={13} /></button>}
                </div>
              ))}
              <label className="mt-3 block text-xs text-slate-400">Page URL<input value={activePage.slug} onChange={(event) => updateActivePage((page) => ({ ...page, slug: event.target.value.startsWith("/") ? event.target.value : `/${event.target.value}` }))} className="studio-input mt-2" /></label>
              <label className="mt-5 block text-xs text-slate-400">SEO title<input value={activePage.title} onChange={(event) => updateActivePage((page) => ({ ...page, title: event.target.value }))} className="studio-input mt-2" /></label>
              <label className="mt-3 block text-xs text-slate-400">Meta description<textarea value={activePage.description} onChange={(event) => updateActivePage((page) => ({ ...page, description: event.target.value }))} rows={3} className="studio-input mt-2 resize-none" /></label></>
            )}
            {leftTab === "layers" && (
              <><p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Layers</p>{activePage.sections.map((section, index) => <button type="button" key={section.id} onClick={() => setSelectedId(section.id)} className={`mb-1 flex min-h-10 w-full items-center gap-2 rounded-lg px-3 text-xs ${selectedId === section.id ? "bg-white/10" : "text-slate-400"}`}><span className="text-slate-600">{index + 1}</span>{section.type} · {section.title.slice(0, 18)}</button>)}</>
            )}
            {leftTab === "components" && (
              <>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Components</p>
                <div className="grid grid-cols-2 gap-2">{sectionTypes.map((type) => <button type="button" key={type} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", type)} onClick={() => addSection(type)} className="min-h-16 rounded-xl border border-white/10 bg-white/[0.03] p-2 text-left text-[11px] capitalize hover:border-[#d4af37]/50"><span className="mb-2 block text-[#d4af37]">□</span>{type}</button>)}</div>
                {reusableSections.length > 0 && <div className="mt-6"><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Reusable sections</p>{reusableSections.map((entry) => <div key={entry.id} className="mb-2 flex items-center gap-1 rounded-lg border border-white/10 p-2"><button type="button" onClick={() => insertReusableSection(entry)} className="min-h-9 min-w-0 flex-1 truncate text-left text-[10px] text-slate-300">{entry.name}</button><button type="button" onClick={() => deleteReusableSection(entry.id)} className="studio-icon text-red-300" aria-label={`Delete reusable section ${entry.name}`}><Trash2 size={12} /></button></div>)}</div>}
              </>
            )}
            {leftTab === "templates" && (
              <><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Website template library</p><p className="mb-3 text-[10px] leading-5 text-slate-500">Premium starter sites stored only in this browser.</p><div className="mb-4 grid gap-2"><button type="button" onClick={saveCurrentAsTemplate} className="min-h-9 rounded-lg bg-[#d4af37] text-[10px] font-bold text-[#101726]">Save current as template</button><button type="button" onClick={() => templateImportRef.current?.click()} className="min-h-9 rounded-lg border border-white/10 text-[10px]">Import template JSON</button><input ref={templateImportRef} type="file" accept="application/json" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importTemplate(file); event.target.value = ""; }} /></div><div className="grid gap-2">{[...builtInTemplates, ...customTemplates].map((template) => <article key={template.id} className="rounded-xl border border-white/10 p-3"><span className="mb-3 flex gap-2"><i className="size-6 rounded-full border border-white/20" style={{ background: template.project.tokens.primary }} /><i className="size-6 rounded-full border border-white/20" style={{ background: template.project.tokens.background }} /></span><p className="text-xs font-semibold">{template.name}</p><p className="mt-1 text-[10px] leading-4 text-slate-500">{template.description}</p><p className="mt-2 text-[9px] text-slate-600">{template.project.pages.length} page{template.project.pages.length === 1 ? "" : "s"} · {template.project.tokens.font}</p><button type="button" onClick={() => previewWebsiteTemplate(template)} className="mt-3 min-h-9 w-full rounded-lg border border-white/10 text-[11px] hover:border-[#d4af37]/50">Preview template</button><div className="mt-2 flex justify-between">{!template.builtIn && <button type="button" onClick={() => duplicateTemplate(template)} className="text-[9px] text-slate-400">Duplicate</button>}<button type="button" onClick={() => exportTemplate(template)} className="text-[9px] text-slate-400">Export JSON</button>{!template.builtIn && <button type="button" onClick={() => { const next = customTemplates.filter((item) => item.id !== template.id); saveCustomTemplates(next); setCustomTemplates(next); }} className="text-[9px] text-red-300">Delete</button>}</div></article>)}</div></>
            )}
            {leftTab === "styles" && (
              <><p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Design tokens</p><label className="text-xs text-slate-400">Theme name<input value={project.tokens.name} onChange={(event) => commit({ ...project, tokens: { ...project.tokens, name: event.target.value } })} className="studio-input mt-2" /></label><label className="mt-3 block text-xs text-slate-400">Primary colour<input type="color" value={project.tokens.primary} onChange={(event) => commit({ ...project, tokens: { ...project.tokens, primary: event.target.value } })} className="mt-2 h-10 w-full" /></label><label className="mt-3 block text-xs text-slate-400">Accent colour<input type="color" value={project.tokens.accent} onChange={(event) => commit({ ...project, tokens: { ...project.tokens, accent: event.target.value } })} className="mt-2 h-10 w-full" /></label><label className="mt-3 block text-xs text-slate-400">Background<input type="color" value={project.tokens.background} onChange={(event) => commit({ ...project, tokens: { ...project.tokens, background: event.target.value } })} className="mt-2 h-10 w-full" /></label><label className="mt-3 block text-xs text-slate-400">Typography<select value={project.tokens.font} onChange={(event) => commit({ ...project, tokens: { ...project.tokens, font: event.target.value as typeof project.tokens.font } })} className="studio-input mt-2"><option>Georgia</option><option>Inter</option><option>Arial</option></select></label><div className="mt-5 border-t border-white/10 pt-4"><p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Header &amp; footer</p><label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={project.header.visible} onChange={(event) => commit({ ...project, header: { ...project.header, visible: event.target.checked } })} /> Header visible</label><label className="mt-3 block text-xs text-slate-400">Header style<select value={project.header.style} onChange={(event) => commit({ ...project, header: { ...project.header, style: event.target.value as typeof project.header.style } })} className="studio-input mt-2"><option value="standard">Standard</option><option value="floating">Floating glass</option><option value="minimal">Minimal</option></select></label><label className="mt-3 flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={project.header.transparent} onChange={(event) => commit({ ...project, header: { ...project.header, transparent: event.target.checked } })} /> Transparent header</label><label className="mt-3 flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={project.footer.visible} onChange={(event) => commit({ ...project, footer: { ...project.footer, visible: event.target.checked } })} /> Footer visible</label><label className="mt-3 block text-xs text-slate-400">Footer name<input value={project.footer.text} onChange={(event) => commit({ ...project, footer: { ...project.footer, text: event.target.value } })} className="studio-input mt-2" /></label><label className="mt-3 block text-xs text-slate-400">Disclosure<textarea value={project.footer.disclosure} onChange={(event) => commit({ ...project, footer: { ...project.footer, disclosure: event.target.value } })} rows={3} className="studio-input mt-2 resize-none" /></label></div></>
            )}
            {leftTab === "navigation" && (
              <><div className="mb-3 flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Navigation</p><button type="button" onClick={() => commit({ ...project, navigation: [...project.navigation, { label: "New link", href: "/" }] })} className="studio-icon" aria-label="Add navigation item"><Plus size={14} /></button></div>{project.navigation.map((item, index) => <div key={`${item.href}-${index}`} className="mb-2 rounded-lg border border-white/10 p-2"><input value={item.label} onChange={(event) => commit({ ...project, navigation: project.navigation.map((nav, navIndex) => navIndex === index ? { ...nav, label: event.target.value } : nav) })} className="studio-input" aria-label="Navigation label" /><input value={item.href} onChange={(event) => commit({ ...project, navigation: project.navigation.map((nav, navIndex) => navIndex === index ? { ...nav, href: event.target.value } : nav) })} className="studio-input mt-1" aria-label="Navigation link" /><button type="button" onClick={() => commit({ ...project, navigation: project.navigation.filter((_, navIndex) => navIndex !== index) })} className="mt-1 text-[10px] text-red-300">Remove</button></div>)}</>
            )}
            {leftTab === "assets" && (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Media library</p>
                  <button type="button" onClick={() => { setReplaceAssetId(null); assetRef.current?.click(); }} className="studio-icon" aria-label="Upload asset"><Upload size={14} /></button>
                </div>
                <input ref={assetRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/avif,application/pdf" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAsset(file); event.target.value = ""; }} />
                <p className="mb-3 text-[10px] leading-5 text-slate-500">IndexedDB-backed local files. Maximum 2 MB per upload and 50 MB per project.</p>
                {assetNotice && <p role="status" className="mb-3 rounded-lg border border-white/10 p-2 text-[10px] text-[#d4af37]">{assetNotice}</p>}
                <div className="grid gap-2">
                  {project.assets.map((asset) => (
                    <div key={asset.id} className="rounded-xl border border-white/10 p-2">
                      <div className="h-20 overflow-hidden rounded-lg bg-white/[0.04]">
                        {asset.type === "image" ? <div role="img" aria-label={asset.name} className="h-full bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url("${(assetUrls[asset.id] || asset.dataUrl).replaceAll('"', "%22")}")` }} /> : <div className="grid h-full place-items-center text-xs text-slate-500">PDF</div>}
                      </div>
                      <p className="mt-2 truncate text-[10px]">{asset.name}</p>
                      <p className="mt-1 text-[9px] text-slate-600">{(asset.size / 1024).toFixed(0)} KB</p>
                      <div className="mt-2 flex flex-wrap gap-3">
                        {asset.type === "image" && <button type="button" onClick={() => commit({ ...project, logo: `asset:${asset.id}` })} className="text-[10px] text-slate-400">{project.logo === `asset:${asset.id}` ? "Current logo" : "Use as logo"}</button>}
                        <button type="button" onClick={() => { updateActivePage((page) => ({ ...page, sections: page.sections.map((section, index) => index === page.sections.length - 1 ? { ...section, image: `asset:${asset.id}` } : section) })); setNotice("Media assigned to the final section."); }} className="text-[10px] text-[#d4af37]">Use on page</button>
                        <button type="button" onClick={() => { setReplaceAssetId(asset.id); assetRef.current?.click(); }} className="text-[10px] text-slate-400">Replace</button>
                        <button type="button" onClick={() => void deleteAsset(asset)} className="text-[10px] text-red-300">Delete</button>
                      </div>
                    </div>
                  ))}
                  {!project.assets.length && <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-[10px] text-slate-500">No uploaded media.</p>}
                </div>
              </>
            )}
            {leftTab === "quality" && (
              <><p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Quality &amp; compliance</p><p className="mb-3 text-[10px] leading-5 text-slate-500">Local deterministic checks. Results are not legal certification.</p><div className="space-y-2">{qualityFindings.map((finding, index) => <div key={`${finding.text}-${index}`} className={`rounded-xl border p-3 text-[10px] leading-5 ${finding.level === "error" ? "border-red-400/30 text-red-200" : finding.level === "warning" ? "border-amber-400/30 text-amber-200" : "border-white/10 text-slate-400"}`}><b className="mr-2 uppercase">{finding.level}</b>{finding.text}</div>)}</div></>
            )}
            {leftTab === "assistant" && (
              <><p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Creative intelligence</p><p className="mb-3 text-[10px] leading-5 text-slate-500">Deterministic local rules—no external AI model is running.</p><textarea value={assistantText} onChange={(event) => setAssistantText(event.target.value)} rows={5} placeholder={'Try "Transform my website into luxury private wealth"'} className="studio-input resize-none" /><button type="button" onClick={runAssistant} disabled={!assistantText.trim()} className="mt-3 min-h-10 w-full rounded-lg bg-[#d4af37] text-xs font-bold text-[#101726] disabled:opacity-40">Apply suggestion</button><div className="mt-4 space-y-2">{["Create a retirement planning page", "Make the mobile experience stack", "Transform my website into luxury private wealth"].map((suggestion) => <button type="button" key={suggestion} onClick={() => setAssistantText(suggestion)} className="w-full rounded-lg border border-white/10 p-2 text-left text-[10px] text-slate-400">{suggestion}</button>)}</div></>
            )}
          </aside>

          <section className="relative min-w-0 flex-1 overflow-auto bg-[#181d27] p-2 sm:p-5" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const type = event.dataTransfer.getData("text/plain") as StudioSection["type"]; if (sectionTypes.includes(type)) addSection(type); }}>
            <div className="mx-auto min-h-[calc(100%-40px)] overflow-hidden bg-white text-slate-950 shadow-2xl transition-all" style={{ width: canvasWidth, maxWidth: "100%", fontFamily: project.tokens.font }}>
              {project.header.visible && <nav className={`flex min-h-16 items-center justify-between px-6 ${project.header.style === "floating" ? "mx-4 mt-3 rounded-2xl shadow-lg" : ""}`} style={{ borderBottom: project.header.style === "minimal" ? "0" : `1px solid ${project.tokens.primary}22`, background: project.header.transparent ? "transparent" : project.tokens.background }}>
                <div className="flex items-center gap-2">{project.logo.startsWith("asset:") && assetUrls[project.logo.slice(6)] ? <div role="img" aria-label={`${project.tradingName} logo`} className="size-8 rounded-full bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url("${assetUrls[project.logo.slice(6)]}")` }} /> : <div className="grid size-8 place-items-center rounded-full text-xs font-bold" style={{ background: project.tokens.primary }}>{project.tradingName.slice(0, 1)}</div>}<b contentEditable suppressContentEditableWarning onBlur={(event) => commit({ ...project, tradingName: event.currentTarget.textContent ?? project.tradingName })}>{project.tradingName}</b></div>
                <div className="hidden gap-5 text-xs md:flex">{project.navigation.slice(0, 5).map((item) => <span key={item.label}>{item.label}</span>)}</div>
              </nav>}
              {activePage.sections.map((section) => !section.hidden && (
                <article key={section.id} draggable onDragStart={(event) => { event.dataTransfer.setData("application/x-wealth-section", section.id); event.dataTransfer.effectAllowed = "move"; }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
                  event.preventDefault();
                  const draggedId = event.dataTransfer.getData("application/x-wealth-section");
                  if (!draggedId || draggedId === section.id) return;
                  updateActivePage((page) => {
                    const from = page.sections.findIndex((item) => item.id === draggedId);
                    const to = page.sections.findIndex((item) => item.id === section.id);
                    if (from < 0 || to < 0) return page;
                    const sections = [...page.sections];
                    const [moved] = sections.splice(from, 1);
                    sections.splice(to, 0, moved);
                    return { ...page, sections };
                  });
                }} onClick={() => setSelectedId(section.id)} className={`relative cursor-pointer border-2 ${selectedId === section.id ? "border-[#d4af37]" : "border-transparent"} transition-colors`}
                  style={{ background: section.background || (section.type === "cta" ? project.tokens.primary : project.tokens.background), color: section.textColor || project.tokens.foreground, padding: `${device === "mobile" ? (selected?.id === section.id ? section.mobilePadding : section.mobilePadding) : section.padding}px ${device === "mobile" ? 24 : 56}px`, minHeight: section.height ?? (section.type === "hero" ? 420 : 220), borderRadius: section.radius }}>
                  {selectedId === section.id && <div className="absolute right-2 top-2 z-10 flex gap-1 rounded-lg bg-[#111827] p-1 text-white" onClick={(event) => event.stopPropagation()}>
                    <button type="button" onClick={() => moveSection(section.id, -1)} className="studio-icon" aria-label="Move up"><ArrowUp size={12} /></button><button type="button" onClick={() => moveSection(section.id, 1)} className="studio-icon" aria-label="Move down"><ArrowDown size={12} /></button>
                    <button type="button" onClick={() => duplicateSection(section)} className="studio-icon" aria-label="Duplicate"><Copy size={12} /></button><button type="button" onClick={() => deleteSection(section.id)} className="studio-icon" aria-label="Delete"><Trash2 size={12} /></button>
                  </div>}
                  <div className={device === "mobile" ? (section.mobileLayout === "grid" ? "grid gap-4" : section.mobileLayout === "split" ? "grid gap-6" : "") : section.layout === "split" ? "grid items-center gap-10 md:grid-cols-2" : section.layout === "grid" ? "grid gap-5 sm:grid-cols-2 lg:grid-cols-3" : ""}>
                    <div style={{ textAlign: section.alignment }}>
                      <p contentEditable suppressContentEditableWarning onBlur={(event) => updateSection(section.id, { eyebrow: event.currentTarget.textContent ?? "" })} className="text-[10px] font-bold tracking-[0.18em]" style={{ color: section.accent || project.tokens.accent }}>{section.eyebrow}</p>
                      <h2 contentEditable suppressContentEditableWarning onBlur={(event) => updateSection(section.id, { title: event.currentTarget.textContent ?? "" })} className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">{section.title}</h2>
                      <p contentEditable suppressContentEditableWarning onBlur={(event) => updateSection(section.id, { body: event.currentTarget.textContent ?? "" })} className="mt-5 max-w-xl text-sm leading-7 opacity-75">{section.body}</p>
                      {section.type === "hero" && <button type="button" className="mt-7 min-h-11 rounded-full px-5 text-xs font-bold" style={{ background: project.tokens.primary, color: project.tokens.background }}>Speak with our team</button>}
                    </div>
                    {section.layout === "grid" && section.type !== "stats" && [1, 2, 3].map((item) => <div key={item} className="mt-6 min-h-28 rounded-xl border p-5" style={{ borderColor: `${project.tokens.primary}44` }}><b>Sample proposition {item}</b><p className="mt-2 text-xs leading-6 opacity-70">Editable demonstration copy. Add approved content before use.</p></div>)}
                    {section.layout === "split" && section.image ? <div role="img" aria-label="Section image" className="h-72 w-full rounded-2xl bg-cover bg-center" style={{ backgroundImage: `url("${(section.image.startsWith("asset:") ? assetUrls[section.image.slice(6)] || "" : section.image).replaceAll('"', "%22")}")` }} /> : section.layout === "split" ? <div className="grid h-72 place-items-center rounded-2xl border border-dashed" style={{ borderColor: `${project.tokens.primary}66` }}><span className="text-xs opacity-60">Replace image</span></div> : null}
                  </div>
                </article>
              ))}
              {project.footer.visible && <footer className="px-6 py-8 text-xs" style={{ background: project.tokens.foreground, color: project.tokens.background }}><b>{project.footer.text}</b><p className="mt-3 max-w-2xl opacity-70">{project.footer.disclosure}</p></footer>}
            </div>
          </section>

          <aside className={`${rightPanelOpen ? "flex" : "hidden"} absolute bottom-0 right-0 top-14 z-[430] w-[256px] shrink-0 flex-col overflow-y-auto border-l border-white/10 bg-[#101725] p-4 xl:relative xl:top-auto xl:flex xl:flex-col`}>
            <button type="button" onClick={() => setRightPanelOpen(false)} className="studio-icon mb-2 self-end xl:hidden" aria-label="Close properties"><X size={14} /></button>
            {selected ? <>
              <div className="mb-4 flex items-center justify-between"><p className="text-xs font-bold capitalize">{selected.type} properties</p><button type="button" onClick={() => setSelectedId(null)} className="studio-icon" aria-label="Close properties"><X size={13} /></button></div>
              <button type="button" onClick={saveSelectedAsReusableSection} className="mb-3 min-h-9 w-full rounded-lg border border-white/10 text-[10px] text-slate-300">Save as reusable section</button>
              <label className="block text-xs text-slate-400">Eyebrow<input value={selected.eyebrow} onChange={(event) => updateSection(selected.id, { eyebrow: event.target.value })} className="studio-input mt-2" /></label>
              <label className="mt-3 block text-xs text-slate-400">Title<input value={selected.title} onChange={(event) => updateSection(selected.id, { title: event.target.value })} className="studio-input mt-2" /></label>
              <label className="mt-3 block text-xs text-slate-400">Body<textarea value={selected.body} onChange={(event) => updateSection(selected.id, { body: event.target.value })} rows={4} className="studio-input mt-2 resize-none" /></label>
              <label className="mt-3 block text-xs text-slate-400">Layout<select value={selected.layout} onChange={(event) => updateSection(selected.id, { layout: event.target.value as StudioSection["layout"] })} className="studio-input mt-2"><option value="stack">Stack</option><option value="columns">Columns</option><option value="split">Split screen</option><option value="grid">Grid</option></select></label>
              <label className="mt-3 block text-xs text-slate-400">Alignment<select value={selected.alignment} onChange={(event) => updateSection(selected.id, { alignment: event.target.value as StudioSection["alignment"] })} className="studio-input mt-2"><option value="left">Left</option><option value="center">Centre</option><option value="right">Right</option></select></label>
              <label className="mt-3 block text-xs text-slate-400">Padding<input type="range" min={16} max={160} value={selected.padding} onChange={(event) => updateSection(selected.id, { padding: Number(event.target.value) })} className="mt-2 w-full" /></label>
              <label className="mt-3 block text-xs text-slate-400">Section height<input type="range" min={120} max={1200} step={10} value={selected.height ?? 220} onChange={(event) => updateSection(selected.id, { height: Number(event.target.value) })} className="mt-2 w-full" /></label>
              <label className="mt-3 block text-xs text-slate-400">Mobile padding<input type="range" min={8} max={160} value={selected.mobilePadding ?? 24} onChange={(event) => updateSection(selected.id, { mobilePadding: Number(event.target.value) })} className="mt-2 w-full" /></label>
              <label className="mt-3 block text-xs text-slate-400">Mobile layout<select value={selected.mobileLayout ?? "stack"} onChange={(event) => updateSection(selected.id, { mobileLayout: event.target.value as StudioSection["layout"] })} className="studio-input mt-2"><option value="stack">Stack</option><option value="columns">Columns</option><option value="split">Split</option><option value="grid">Grid</option></select></label>
              <label className="mt-3 block text-xs text-slate-400">Corner radius<input type="range" min={0} max={48} value={selected.radius} onChange={(event) => updateSection(selected.id, { radius: Number(event.target.value) })} className="mt-2 w-full" /></label>
              <label className="mt-3 block text-xs text-slate-400">Background<input type="color" value={selected.background || project.tokens.background} onChange={(event) => updateSection(selected.id, { background: event.target.value })} className="mt-2 h-9 w-full" /></label>
              <label className="mt-3 block text-xs text-slate-400">Text colour<input type="color" value={selected.textColor || project.tokens.foreground} onChange={(event) => updateSection(selected.id, { textColor: event.target.value })} className="mt-2 h-9 w-full" /></label>
              <label className="mt-3 block text-xs text-slate-400">Accent<input type="color" value={selected.accent || project.tokens.accent} onChange={(event) => updateSection(selected.id, { accent: event.target.value })} className="mt-2 h-9 w-full" /></label>
              <label className="mt-3 block text-xs text-slate-400">Image URL<input value={selected.image} onChange={(event) => updateSection(selected.id, { image: event.target.value })} className="studio-input mt-2" placeholder="https://..." /></label>
              <label className="mt-4 flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={!selected.hidden} onChange={(event) => updateSection(selected.id, { hidden: !event.target.checked })} /> Visible on this page</label>
            </> : <div><p className="text-xs font-bold">Properties</p><p className="mt-3 text-xs leading-5 text-slate-500">Select a section on the canvas to edit it. Use the Components panel to add new sections.</p><div className="mt-5 border-t border-white/10 pt-4"><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Version history</p>{versions.length ? versions.slice(0, 8).map((version) => <button type="button" key={version.id} onClick={() => restoreVersion(version)} className="mb-1 w-full rounded-lg px-2 py-2 text-left text-[11px] text-slate-400 hover:bg-white/5"><b className="block text-slate-300">{version.label}</b>{new Date(version.savedAt).toLocaleString()}</button>) : <p className="text-[11px] text-slate-500">Save to create a version.</p>}</div><button type="button" onClick={() => importRef.current?.click()} className="mt-4 flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-white/10 text-xs"><Import size={13} />Import configuration</button><input ref={importRef} type="file" accept="application/json" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importProject(file); event.target.value = ""; }} /></div>}
          </aside>
        </div>
      </div>

      {preview && <div className="fixed inset-0 z-[500] overflow-auto bg-white text-slate-950" style={{ fontFamily: project.tokens.font }}>
        {project.header.visible && <header className={`sticky top-0 z-10 flex min-h-16 items-center justify-between border-b px-5 ${project.header.style === "floating" ? "mx-4 mt-3 rounded-2xl shadow-lg" : ""}`} style={{ background: project.header.transparent ? "transparent" : project.tokens.background }}>
          <b>{project.tradingName}</b><button type="button" onClick={() => setPreview(false)} className="min-h-10 rounded-full border px-4 text-sm">Close preview</button>
        </header>}
        {activePage.sections.filter((section) => !section.hidden).map((section) => <section key={section.id} style={{ background: section.background || project.tokens.background, color: section.textColor || project.tokens.foreground, minHeight: section.height, padding: `${section.padding}px 7%`, textAlign: section.alignment }}><p className="text-xs font-bold" style={{ color: section.accent || project.tokens.accent }}>{section.eyebrow}</p><h2 className="mt-3 text-4xl font-semibold">{section.title}</h2><p className="mx-auto mt-5 max-w-2xl text-sm leading-7 opacity-75">{section.body}</p></section>)}
        {project.footer.visible && <footer className="px-5 py-10" style={{ background: project.tokens.foreground, color: project.tokens.background }}><b>{project.footer.text}</b><p className="mt-3 text-xs opacity-70">{project.footer.disclosure}</p></footer>}
      </div>}

      {assistantProposal && <div className="fixed inset-0 z-[600] grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="creative-preview-title">
        <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-[#111827] p-6 shadow-2xl">
          <div className="flex items-start gap-3"><Sparkles className="mt-1 text-[#d4af37]" size={18} /><div><h2 id="creative-preview-title" className="text-base font-semibold">Review creative suggestion</h2><p className="mt-2 text-xs leading-6 text-slate-400">{assistantProposal.summary}</p></div></div>
          <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs">
            <div><p className="text-[9px] uppercase tracking-widest text-slate-500">Current</p><p className="mt-2">{project.tradingName}</p><p className="mt-1 text-slate-500">{project.pages.length} pages · {project.tokens.name}</p></div>
            <div><p className="text-[9px] uppercase tracking-widest text-slate-500">Proposed</p><p className="mt-2">{assistantProposal.project.tradingName}</p><p className="mt-1 text-slate-500">{assistantProposal.project.pages.length} pages · {assistantProposal.project.tokens.name}</p></div>
          </div>
          <p className="mt-4 text-[10px] leading-5 text-slate-500">This suggestion is generated locally from deterministic presets. Review it before applying; it does not use an external AI service.</p>
          <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setAssistantProposal(null)} className="min-h-10 rounded-lg border border-white/10 px-4 text-xs">Cancel</button><button type="button" onClick={() => { commit(assistantProposal.project); setAssistantProposal(null); setNotice("Local creative suggestion applied. Undo is available."); }} className="min-h-10 rounded-lg bg-[#d4af37] px-4 text-xs font-bold text-[#101726]">Apply changes</button></div>
        </div>
      </div>}

      {templateProposal && <div className="fixed inset-0 z-[610] grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="template-preview-title">
        <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/15 bg-[#111827] shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 p-5"><div><p className="text-[9px] uppercase tracking-[0.18em] text-[#d4af37]">Local template preview</p><h2 id="template-preview-title" className="mt-1 text-lg font-semibold">{templateProposal.template.name}</h2><p className="mt-1 text-xs text-slate-400">{templateProposal.template.description}</p></div><button type="button" onClick={() => setTemplateProposal(null)} className="studio-icon" aria-label="Close template preview"><X size={15} /></button></div>
          <div className="m-4 overflow-hidden rounded-xl border border-white/10" style={{ background: templateProposal.project.tokens.background, color: templateProposal.project.tokens.foreground }}>
            <header className="flex items-center justify-between border-b border-black/10 px-4 py-3 text-xs"><b>{project.tradingName}</b><span>{templateProposal.project.pages.length} pages · {templateProposal.project.tokens.font}</span></header>
            <div className="p-6 sm:p-10" style={{ background: templateProposal.project.pages[0]?.sections[0]?.background || templateProposal.project.tokens.background }}>
              <p className="text-[9px] font-bold tracking-widest" style={{ color: templateProposal.project.tokens.accent }}>{templateProposal.project.pages[0]?.sections[0]?.eyebrow}</p>
              <h3 className="mt-3 max-w-xl text-2xl font-semibold sm:text-4xl">{templateProposal.project.pages[0]?.sections[0]?.title}</h3>
              <p className="mt-3 max-w-xl text-xs leading-6 opacity-75">{templateProposal.project.pages[0]?.sections[0]?.body}</p>
              <div className="mt-7 flex flex-wrap gap-2">{templateProposal.project.pages[0]?.sections.slice(1, 4).map((section) => <div key={section.id} className="min-w-[110px] flex-1 rounded-xl border border-current/10 p-3 text-[10px]"><b>{section.eyebrow}</b><p className="mt-2 opacity-70">{section.title}</p></div>)}</div>
            </div>
          </div>
          <p className="px-5 text-[10px] leading-5 text-slate-500">Applying replaces this project’s pages, navigation and design tokens, but preserves your business identity, contact details, logo and media library. Undo is available.</p>
          <div className="flex justify-end gap-2 p-5"><button type="button" onClick={() => setTemplateProposal(null)} className="min-h-10 rounded-lg border border-white/10 px-4 text-xs">Cancel</button><button type="button" onClick={() => { commit(templateProposal.project); setTemplateProposal(null); setNotice(`${templateProposal.template.name} applied to this project.`); }} className="min-h-10 rounded-lg bg-[#d4af37] px-4 text-xs font-bold text-[#101726]">Apply template</button></div>
        </div>
      </div>}

      <style jsx>{`
        :global(.studio-icon) { display: inline-grid; width: 36px; min-height: 36px; place-items: center; border-radius: 8px; color: inherit; }
        :global(.studio-icon:hover:not(:disabled)) { background: rgba(255,255,255,.08); }
        :global(.studio-icon:disabled) { opacity: .35; }
        :global(.studio-toolbar-button) { display: inline-flex; min-height: 36px; align-items: center; gap: 7px; border-radius: 8px; border: 1px solid rgba(255,255,255,.1); padding: 0 10px; font-size: 12px; }
        :global(.studio-input) { width: 100%; min-height: 40px; border: 1px solid rgba(255,255,255,.1); border-radius: 8px; background: rgba(255,255,255,.04); padding: 8px 10px; color: #e2e8f0; font-size: 12px; }
      `}</style>
    </main>
  );
}
