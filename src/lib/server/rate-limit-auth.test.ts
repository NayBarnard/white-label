import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enforceAuthenticatedRateLimit } from "./rate-limit";

const state = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ rpc: state.rpc }),
}));

describe("enforceAuthenticatedRateLimit", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "server-only-test-key");
    state.rpc.mockReset();
  });

  afterEach(() => vi.unstubAllEnvs());

  it("uses the supplied authenticated policy and hashed identity", async () => {
    state.rpc.mockResolvedValue({
      data: [{ allowed: true, retry_after: 60 }],
      error: null,
    });
    const result = await enforceAuthenticatedRateLimit("adviser-user", "adviser-platforms", 30, 60);
    expect(result.ok).toBe(true);
    expect(state.rpc).toHaveBeenCalledWith("consume_api_rate_limit", {
      p_route_key: "adviser-platforms",
      p_ip_hash: expect.stringMatching(/^[0-9a-f]{64}$/),
      p_limit: 30,
      p_window_seconds: 60,
    });
  });

  it("returns a retryable rate-limit response when the authenticated policy is exhausted", async () => {
    state.rpc.mockResolvedValue({
      data: [{ allowed: false, retry_after: 17 }],
      error: null,
    });
    const result = await enforceAuthenticatedRateLimit("adviser-user", "adviser-platforms", 30, 60);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(429);
      expect(result.response.headers.get("Retry-After")).toBe("17");
    }
  });
});
