import { describe, expect, it } from "vitest";
import { makeProject } from "./universal-schema";
import {
  applyWebsiteTemplate,
  createBuiltInWebsiteTemplates,
  makeCustomTemplate,
  validateWebsiteTemplate,
} from "./templates";

describe("local website template library", () => {
  it("provides multiple complete wealth-management starter sites", () => {
    const templates = createBuiltInWebsiteTemplates();
    expect(templates.length).toBeGreaterThanOrEqual(3);
    expect(templates.every((template) => template.project.pages.length > 0 && template.project.pages[0].sections.length > 0)).toBe(true);
    expect(templates.map((template) => template.name)).toContain("Private Office");
  });

  it("applies the selected design without replacing the business identity or media", () => {
    const project = makeProject();
    project.id = "firm-a";
    project.tradingName = "Firm A";
    project.logo = "asset:firm-logo";
    project.assets = [{ id: "firm-logo", name: "logo.png", type: "image", dataUrl: "", size: 12, createdAt: new Date().toISOString() }];
    const template = createBuiltInWebsiteTemplates()[0];

    const applied = applyWebsiteTemplate(project, template);
    expect(applied.id).toBe("firm-a");
    expect(applied.tradingName).toBe("Firm A");
    expect(applied.logo).toBe("asset:firm-logo");
    expect(applied.assets).toHaveLength(1);
    expect(applied.pages[0].title).toContain("Firm A");
    expect(applied.pages[0].id).not.toBe(template.project.pages[0].id);
  });

  it("saves reusable project templates without browser-bound media references", () => {
    const project = makeProject();
    project.assets = [{ id: "image", name: "image.png", type: "image", dataUrl: "", size: 5, createdAt: new Date().toISOString() }];
    project.logo = "asset:image";
    project.pages[0].sections[0].image = "asset:image";
    const saved = makeCustomTemplate(project, "Custom", "Reusable");

    expect(saved.project.assets).toEqual([]);
    expect(saved.project.logo).toBe("");
    expect(saved.project.pages[0].sections[0].image).toBe("");
    expect(validateWebsiteTemplate(JSON.parse(JSON.stringify(saved))).name).toBe("Custom");
  });

  it("rejects incomplete or invalid template imports", () => {
    expect(() => validateWebsiteTemplate({ id: "bad" })).toThrow("incomplete");
    expect(() => validateWebsiteTemplate({ name: "Bad", description: "", project: { schemaVersion: 99 } })).toThrow("Unsupported");
  });
});
