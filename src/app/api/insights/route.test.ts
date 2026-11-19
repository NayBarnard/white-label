import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

afterEach(() => vi.unstubAllEnvs());

describe("canonical insights API", () => {
  it("returns an existing article from its canonical slug", async () => {
    const response = await GET(new Request("https://example.test/api/insights?slug=building-resilient-portfolios"));
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.canonicalUrl).toBe("/insights/building-resilient-portfolios");
    expect(result.article.title).toBe("Building resilient portfolios through diversification");
    expect(result.article.body).toContain("Diversification is a core part");
  });

  it("rejects unknown and malformed canonical slugs", async () => {
    const unknown = await GET(new Request("https://example.test/api/insights?slug=unknown-article"));
    const malformed = await GET(new Request("https://example.test/api/insights?slug=../../private"));

    expect(unknown.status).toBe(404);
    expect(malformed.status).toBe(400);
  });

  it("returns the canonical research catalog without external RSS requests", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const response = await GET(new Request("https://example.test/api/insights?type=research"));
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.articles).toHaveLength(4);
    expect(result.articles.some((article: { slug: string }) => article.slug === "building-resilient-portfolios")).toBe(true);
  });
});
