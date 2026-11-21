"use client";

import { useEffect, useState } from "react";
import { validateProject, type StudioProject } from "@/lib/studio/universal-schema";

export function LocalStudioHomepage() {
  const [project, setProject] = useState<StudioProject | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const activeId = localStorage.getItem("wealth-os.studio.active-project.v1") || "default";
        const raw = localStorage.getItem(`wealth-os.studio.published.${activeId}.v1`)
          ?? (activeId === "default" ? localStorage.getItem("wealth-os.studio.published.v1") : null);
        if (raw) setProject(validateProject(JSON.parse(raw)));
      } catch {
        setProject(null);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (!project) return null;

  return (
    <div className="fixed inset-0 z-[50] overflow-auto" style={{ background: project.tokens.background, color: project.tokens.foreground, fontFamily: project.tokens.font }}>
      {project.header.visible && <nav className={`mx-auto flex min-h-16 max-w-7xl items-center justify-between px-5 lg:px-8 ${project.header.style === "floating" ? "mt-3 rounded-2xl shadow-lg" : ""}`} style={{ background: project.header.transparent ? "transparent" : project.tokens.background }} aria-label="Published Studio navigation">
        <strong>{project.tradingName}</strong>
        <div className="hidden gap-5 text-sm md:flex">
          {project.navigation.map((item) => <a key={`${item.label}-${item.href}`} href={item.href} className="hover:underline">{item.label}</a>)}
        </div>
      </nav>}
      {project.pages.find((page) => page.id === project.activePageId)?.sections.filter((section) => !section.hidden).map((section) => (
        <section key={section.id} style={{ background: section.background || project.tokens.background, color: section.textColor || project.tokens.foreground, padding: `${section.padding}px 7%`, textAlign: section.alignment }}>
          {section.eyebrow && <p className="text-xs font-bold tracking-[0.18em]" style={{ color: section.accent || project.tokens.accent }}>{section.eyebrow}</p>}
          <h1 className="mt-3 text-4xl font-semibold leading-tight sm:text-5xl">{section.title}</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 opacity-75">{section.body}</p>
          {section.type === "cta" && <a href="/contact" className="mt-7 inline-flex min-h-11 items-center rounded-full px-5 text-sm font-bold" style={{ background: project.tokens.primary, color: project.tokens.background }}>Enquire</a>}
        </section>
      ))}
      {project.footer.visible && <footer className="px-5 py-10 lg:px-8" style={{ background: project.tokens.foreground, color: project.tokens.background }}><b>{project.footer.text}</b><p className="mt-3 max-w-3xl text-xs opacity-70">{project.footer.disclosure}</p></footer>}
    </div>
  );
}
