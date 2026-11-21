import { makeId, makeSection, type StudioSection } from "@/lib/studio/universal-schema";

export type ReusableSection = {
  id: string;
  name: string;
  section: StudioSection;
};

function storageKey(projectId: string) {
  return `wealth-os.studio.reusable-sections.${projectId}.v1`;
}

export function readReusableSections(projectId: string): ReusableSection[] {
  const raw = localStorage.getItem(storageKey(projectId));
  if (!raw) return [];
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("Saved reusable sections are corrupted.");
  }
  if (!Array.isArray(value)) throw new Error("Saved reusable sections have an invalid format.");
  return value.slice(0, 100).map((entry) => {
    if (!entry || typeof entry !== "object" || !("section" in entry)) throw new Error("A reusable section is invalid.");
    const candidate = entry as { id?: unknown; name?: unknown; section?: Partial<StudioSection> };
    const type = candidate.section?.type;
    const validTypes: StudioSection["type"][] = ["hero", "about", "services", "stats", "cta", "faq", "team", "testimonials", "disclaimer"];
    if (!type || !validTypes.includes(type)) throw new Error("A reusable section has an unsupported component type.");
    return {
      id: String(candidate.id ?? makeId("reusable")).replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 120),
      name: String(candidate.name ?? candidate.section?.title ?? "Reusable section").slice(0, 100),
      section: { ...makeSection(type), ...candidate.section, id: makeId("section") },
    };
  });
}

export function writeReusableSections(projectId: string, sections: ReusableSection[]) {
  localStorage.setItem(storageKey(projectId), JSON.stringify(sections.slice(0, 100)));
}

export function makeReusableSection(section: StudioSection, name: string): ReusableSection {
  return {
    id: makeId("reusable"),
    name: name.trim().slice(0, 100) || section.title.slice(0, 100),
    section: { ...section, id: makeId("section") },
  };
}
