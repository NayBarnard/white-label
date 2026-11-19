import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("canonical insight PDF downloads", () => {
  it("generates an adviser-ready PDF for the canonical article", async () => {
    const response = await GET(new Request("https://example.test/api/insights/building-resilient-portfolios/pdf?branding=co-branded"), {
      params: Promise.resolve({ slug: "building-resilient-portfolios" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain("adviser-ready.pdf");
    expect(Buffer.from(await response.arrayBuffer()).subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("rejects unsupported branding and unknown articles", async () => {
    const invalidBranding = await GET(new Request("https://example.test/api/insights/building-resilient-portfolios/pdf?branding=unknown"), {
      params: Promise.resolve({ slug: "building-resilient-portfolios" }),
    });
    const unknown = await GET(new Request("https://example.test/api/insights/unknown/pdf"), {
      params: Promise.resolve({ slug: "unknown" }),
    });

    expect(invalidBranding.status).toBe(400);
    expect(unknown.status).toBe(404);
  });
});
