import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { enforcePublicRateLimit } from "@/lib/server/rate-limit";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("public rate limiting", () => {
  it("returns a retryable 429 after the enquiry IP limit is exceeded", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const request = new Request("http://localhost/api/enquiry", {
      headers: { "x-real-ip": randomUUID() },
    });

    for (let index = 0; index < 5; index += 1) {
      expect(await enforcePublicRateLimit(request, "enquiry")).toEqual({ ok: true });
    }

    const result = await enforcePublicRateLimit(request, "enquiry");
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected the IP rate limit to be exceeded.");
    expect(result.response.status).toBe(429);
    expect(result.response.headers.get("retry-after")).toBeTruthy();
    await expect(result.response.json()).resolves.toMatchObject({
      status: "error",
      error: "Too many requests. Please try again later.",
    });
  });
});
