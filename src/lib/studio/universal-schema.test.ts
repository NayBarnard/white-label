import { describe, expect, it } from "vitest";
import { makeProject, makeSection, validateProject } from "./universal-schema";

describe("WEALTH OS Studio schema", () => {
  it("creates a complete neutral project", () => {
    const project = makeProject();
    expect(project.schemaVersion).toBe(1);
    expect(project.pages.length).toBeGreaterThan(0);
    expect(project.header.visible).toBe(true);
    expect(project.footer.visible).toBe(true);
  });

  it("validates and normalizes imported JSON", () => {
    const project = makeProject();
    project.organization = "  Test Organisation  ";
    const normalized = validateProject(JSON.parse(JSON.stringify(project)));
    expect(normalized.organization).toBe("  Test Organisation  ");
  });

  it("rejects unsupported schemas", () => {
    expect(() => validateProject({ schemaVersion: 99 })).toThrow("Unsupported or incomplete");
  });

  it("creates responsive section defaults", () => {
    const section = makeSection("hero");
    expect(section.mobileLayout).toBe("stack");
    expect(section.mobilePadding).toBe(24);
    expect(section.height).toBeGreaterThanOrEqual(220);
  });
});
