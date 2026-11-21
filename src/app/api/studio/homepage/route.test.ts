import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/admin/server", () => ({
  authorizeAdminApi: vi.fn(),
}));

import { GET, PUT } from "./route";
import { authorizeAdminApi } from "@/lib/admin/server";
import { POST } from "./publish/route";

describe("browser-only Studio API mode", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.mocked(authorizeAdminApi).mockReset();
  });

  it("rejects Studio data reads, draft writes, and publishing before touching Supabase", async () => {
    vi.stubEnv("STUDIO_STORAGE_MODE", "browser");

    const readResponse = await GET();
    const draftResponse = await PUT(new Request("http://localhost/api/studio/homepage", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: {} }),
    }));
    const publishResponse = await POST(new Request("http://localhost/api/studio/homepage/publish", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: {} }),
    }));

    expect(readResponse.status).toBe(410);
    expect(draftResponse.status).toBe(410);
    expect(publishResponse.status).toBe(410);
    expect(authorizeAdminApi).not.toHaveBeenCalled();
  });
});
