import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeProject, makeSection } from "./universal-schema";
import { makeReusableSection, readReusableSections, writeReusableSections } from "./reusable-sections";

describe("reusable Studio sections", () => {
  let values: Map<string, string>;
  beforeEach(() => {
    values = new Map();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("saves and restores reusable sections under an individual project", () => {
    const project = makeProject();
    const entry = makeReusableSection(makeSection("cta"), "Conversation callout");
    writeReusableSections(project.id, [entry]);

    expect(readReusableSections(project.id)).toHaveLength(1);
    expect(readReusableSections(project.id)[0].name).toBe("Conversation callout");
    expect(readReusableSections("another-project")).toEqual([]);
  });

  it("rejects malformed saved section data instead of silently discarding it", () => {
    localStorage.setItem("wealth-os.studio.reusable-sections.:bad.v1", "not-json");
    expect(() => readReusableSections(":bad")).toThrow("corrupted");
  });
});
