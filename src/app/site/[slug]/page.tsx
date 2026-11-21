"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { validateProject, type StudioProject } from "@/lib/studio/universal-schema";

export default function StudioCustomPage() {
  const params = useParams<{ slug: string }>();
  const [project, setProject] = useState<StudioProject | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const activeId = localStorage.getItem("wealth-os.studio.active-project.v1") || "default";
        const raw = localStorage.getItem(`wealth-os.studio.published.${activeId}.v1`)
          ?? (activeId === "default" ? localStorage.getItem("wealth-os.studio.published.v1") : null);
        if (!raw) {
          setMissing(true);
          return;
        }
        const next = validateProject(JSON.parse(raw));
        setProject(next);
        setMissing(false);
      } catch {
        setMissing(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (missing) return <main className="mx-auto max-w-3xl px-5 py-20"><h1 className="text-3xl font-semibold">Page unavailable</h1><p className="mt-3 text-sm text-[var(--muted)]">This locally published WEALTH OS page is unavailable in this browser.</p><a className="mt-5 inline-flex min-h-11 items-center rounded-full border border-[var(--border)] px-5 text-sm" href="/studio">Open Studio</a></main>;
  if (!project) return <main className="grid min-h-[60vh] place-items-center text-sm text-[var(--muted)]">Loading local page…</main>;

  const slug = `/${decodeURIComponent(params.slug)}`;
  const page = project.pages.find((item) => item.slug === slug || item.slug === `/site${slug}`);
  if (!page) return <main className="mx-auto max-w-3xl px-5 py-20"><h1 className="text-3xl font-semibold">Page not found</h1><p className="mt-3 text-sm text-[var(--muted)]">No locally published WEALTH OS page matches this address.</p></main>;

  return (
    <div style={{ background: project.tokens.background, color: project.tokens.foreground, fontFamily: project.tokens.font }}>
      {project.header.visible && <nav className={`flex min-h-16 items-center justify-between px-5 lg:px-8 ${project.header.style === "floating" ? "mx-4 mt-3 rounded-2xl shadow-lg" : ""}`} style={{ background: project.header.transparent ? "transparent" : project.tokens.background }}><b>{project.tradingName}</b><div className="hidden gap-5 text-sm md:flex">{project.navigation.map((item) => <a key={`${item.label}-${item.href}`} href={item.href}>{item.label}</a>)}</div></nav>}
      {page.sections.filter((section) => !section.hidden).map((section) => (
        <section key={section.id} style={{ background: section.background || project.tokens.background, color: section.textColor || project.tokens.foreground, minHeight: section.height, padding: `${section.padding}px 7%`, textAlign: section.alignment }}>
          <p className="text-xs font-bold tracking-[0.18em]" style={{ color: section.accent || project.tokens.accent }}>{section.eyebrow}</p>
          <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">{section.title}</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 opacity-75">{section.body}</p>
        </section>
      ))}
      {project.footer.visible && <footer className="px-5 py-10 lg:px-8" style={{ background: project.tokens.foreground, color: project.tokens.background }}><b>{project.footer.text}</b><p className="mt-3 max-w-3xl text-xs opacity-70">{project.footer.disclosure}</p></footer>}
    </div>
  );
}
