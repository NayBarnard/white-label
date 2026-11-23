import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { defaultHomePageData, homePageConfig, isHomePageData } from "./HomePageEditorConfig";

function getSectionProps(data: unknown, type: string): Record<string, unknown> | null {
  if (typeof data !== "object" || data === null || !("content" in data) || !Array.isArray(data.content)) {
    return null;
  }
  const section = data.content.find((item) =>
    typeof item === "object" &&
    item !== null &&
    "type" in item &&
    item.type === type &&
    "props" in item &&
    typeof item.props === "object" &&
    item.props !== null,
  );
  return section && "props" in section ? section.props as Record<string, unknown> : null;
}

describe("homepage editor data validation", () => {
  it("accepts the built-in page and valid editable sections", () => {
    expect(isHomePageData(defaultHomePageData)).toBe(true);
  });

  it("uses editable generic placeholders instead of firm or customer data", () => {
    const serialized = JSON.stringify(defaultHomePageData);

    expect(serialized).toContain("Your company name");
    expect(serialized).toContain("Add a verified metric");
    expect(serialized).not.toContain("FSP");
    expect(serialized).not.toContain("622");
    expect(serialized).not.toContain("@");
  });

  it("links the homepage portfolio action to the portfolios route", () => {
    const hero = homePageConfig.components.Hero;
    const markup = renderToStaticMarkup(hero.render(hero.defaultProps));

    expect(markup).toContain('href="/portfolios"');
    expect(markup).not.toContain('href="#funds"');
  });

  it("rejects unknown component types and duplicate section identifiers", () => {
    const unknownComponent: unknown = structuredClone(defaultHomePageData);
    if (unknownComponent && typeof unknownComponent === "object" && "content" in unknownComponent) {
      const content = unknownComponent.content;
      if (Array.isArray(content) && content[0] && typeof content[0] === "object") {
        content[0].type = "UntrustedMarkup";
      }
    }
    expect(isHomePageData(unknownComponent)).toBe(false);

    const duplicateId: unknown = structuredClone(defaultHomePageData);
    if (duplicateId && typeof duplicateId === "object" && "content" in duplicateId) {
      const content = duplicateId.content;
      if (Array.isArray(content) && content[0] && content[1]) {
        content[1].props.id = content[0].props.id;
      }
    }
    expect(isHomePageData(duplicateId)).toBe(false);
  });

  it("rejects malformed editable placeholder collections", () => {
    const invalidPerformance: unknown = structuredClone(defaultHomePageData);
    const invalidStrategies: unknown = structuredClone(defaultHomePageData);
    const performanceProps = getSectionProps(invalidPerformance, "Performance");
    const strategyProps = getSectionProps(invalidStrategies, "Strategies");
    if (performanceProps) performanceProps.items = [{ name: "Example", label: 42 }];
    if (strategyProps) strategyProps.items = [];

    expect(isHomePageData(invalidPerformance)).toBe(false);
    expect(isHomePageData(invalidStrategies)).toBe(false);
  });

  it("rejects empty or excessively large section lists", () => {
    const emptyPage: unknown = { ...structuredClone(defaultHomePageData), content: [] };
    const oversizedPage: unknown = {
      ...structuredClone(defaultHomePageData),
      content: Array.from({ length: 51 }, (_, index) => ({
        ...structuredClone(defaultHomePageData.content[0]),
        props: { ...defaultHomePageData.content[0].props, id: `section-${index}` },
      })),
    };

    expect(isHomePageData(emptyPage)).toBe(false);
    expect(isHomePageData(oversizedPage)).toBe(false);
  });
});
