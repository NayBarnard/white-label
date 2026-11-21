import { afterEach, describe, expect, it, vi } from "vitest";
import { getPublishedHomePage } from "./site-pages";

describe("published Studio homepage", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("does not query Supabase in browser-only Studio mode", async () => {
    vi.stubEnv("STUDIO_STORAGE_MODE", "browser");
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await expect(getPublishedHomePage()).resolves.toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
