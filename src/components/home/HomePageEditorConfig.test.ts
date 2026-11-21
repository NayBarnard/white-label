import { describe, expect, it } from "vitest";
import { defaultHomePageData, isHomePageData } from "./HomePageEditorConfig";

describe("homepage editor data validation", () => {
  it("accepts the built-in page and valid editable sections", () => {
    expect(isHomePageData(defaultHomePageData)).toBe(true);
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
