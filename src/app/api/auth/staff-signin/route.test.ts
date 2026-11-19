import { describe, expect, it, vi } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/server/rate-limit", () => ({
  enforcePublicRateLimit: vi.fn(async () => ({ ok: true as const })),
  readJsonBody: vi.fn(async (request: Request) => {
    const value = JSON.parse(await request.text());
    return { ok: true as const, value };
  }),
}));

describe("staff sign-in preflight", () => {
  it("rejects malformed credentials without returning account details", async () => {
    const response = await POST(new Request("https://staff.example/api/auth/staff-signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "not-an-email", password: "x" }),
    }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).not.toMatch(/account|user|password/i);
  });

  it("fails closed when Supabase configuration is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    const response = await POST(new Request("https://staff.example/api/auth/staff-signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "staff@example.com", password: "password" }),
    }));
    expect(response.status).toBe(503);
    vi.unstubAllEnvs();
  });
});
