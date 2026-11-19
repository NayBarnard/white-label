import { describe, expect, it } from "vitest";
import { articles } from "@/data/firmData";
import { researchCatalog, researchCategories } from "./catalog";

describe("canonical research catalog", () => {
  it("extends each existing article record without copying its body", () => {
    expect(new Set(researchCatalog.map((article) => article.slug)).size).toBe(researchCatalog.length);
    for (const article of articles) {
      expect(researchCatalog.find((item) => item.slug === article.slug)?.body).toBe(article.body);
    }
    expect(researchCatalog.map((article) => article.category)).toEqual([
      "Investment Strategy",
      "Adviser Insights",
      "Investor Education",
      "Market Commentary",
    ]);
  });

  it("provides every requested hub category", () => {
    expect(researchCategories).toEqual([
      "Market Commentary",
      "Investment Strategy",
      "Economic Insights",
      "Fund Updates",
      "Adviser Insights",
      "Investor Education",
    ]);
  });
});
