import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authorizeAdviserApi } from "./server";

const state = vi.hoisted(() => ({
  user: null as { id: string; app_metadata: { role: string; tenant_id?: string } } | null,
  getUser: vi.fn(),
  getClaims: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser: state.getUser, getClaims: state.getClaims },
    from: () => {
      const query = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        in: vi.fn(() => query),
        maybeSingle: vi.fn(async () => ({
          data: { role: "financial_adviser", status: "active" },
          error: null,
        })),
      };
      return query;
    },
  }),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: vi.fn() }),
}));

describe("authorizeAdviserApi", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-test-key");
    state.user = null;
    state.getUser.mockReset().mockImplementation(async () => ({
      data: { user: state.user },
      error: null,
    }));
    state.getClaims.mockReset().mockResolvedValue({
      data: { claims: { aal: "aal2" } },
      error: null,
    });
  });

  afterEach(() => vi.unstubAllEnvs());

  it("allows adviser and admin app-metadata roles", async () => {
    for (const role of ["adviser", "admin"]) {
      state.user = {
        id: "staff-user",
        app_metadata: { role, tenant_id: "firm_a" },
      };
      const access = await authorizeAdviserApi();
      expect(access.ok).toBe(true);
    }
  });

  it("denies client accounts", async () => {
    state.user = { id: "client-user", app_metadata: { role: "client" } };
    const access = await authorizeAdviserApi();
    expect(access.ok).toBe(false);
    if (!access.ok) expect(access.response.status).toBe(403);
  });

  it("denies signed-out callers", async () => {
    const access = await authorizeAdviserApi();
    expect(access.ok).toBe(false);
    if (!access.ok) expect(access.response.status).toBe(401);
  });
});
