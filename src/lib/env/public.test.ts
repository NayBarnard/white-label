import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MissingPublicEnvironmentError,
  requirePublicEnv,
} from "@/lib/env/public";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("requirePublicEnv", () => {
  it("returns only requested client-safe values", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", " https://example.supabase.co ");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", " public-anon-key ");

    expect(
      requirePublicEnv("NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    ).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon-key",
    });
  });

  it("reports all missing public keys without requiring credentials at module load", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    expect(() =>
      requirePublicEnv("NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    ).toThrowError(
      new MissingPublicEnvironmentError([
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      ]),
    );
  });
});
