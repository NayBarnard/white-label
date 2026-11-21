import { describe, expect, it } from "vitest";
import {
  isLocalStudioDemoAllowed,
  isStudioSupabaseStorageEnabled,
} from "./mode";

describe("Studio runtime modes", () => {
  it("allows the unauthenticated placeholder workspace only in explicit local development mode", () => {
    expect(isLocalStudioDemoAllowed("development", "true")).toBe(true);
    expect(isLocalStudioDemoAllowed("production", "true")).toBe(false);
    expect(isLocalStudioDemoAllowed("development", "false")).toBe(false);
    expect(isLocalStudioDemoAllowed("development", undefined)).toBe(false);
  });

  it("keeps Supabase persistence disabled unless explicitly selected", () => {
    expect(isStudioSupabaseStorageEnabled(undefined)).toBe(false);
    expect(isStudioSupabaseStorageEnabled("browser")).toBe(false);
    expect(isStudioSupabaseStorageEnabled("supabase")).toBe(true);
  });
});
