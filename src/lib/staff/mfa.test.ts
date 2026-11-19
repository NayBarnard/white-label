import { describe, expect, it } from "vitest";
import { isAal2Claims, STAFF_ABSOLUTE_SESSION_MS, STAFF_IDLE_TIMEOUT_MS, STAFF_WARNING_DURATION_MS } from "./mfa";

describe("staff MFA and session constants", () => {
  it("requires aal2 rather than accepting aal1", () => {
    expect(isAal2Claims({ aal: "aal2" })).toBe(true);
    expect(isAal2Claims({ aal: "aal1" })).toBe(false);
    expect(isAal2Claims(null)).toBe(false);
  });

  it("uses the required named durations", () => {
    expect(STAFF_IDLE_TIMEOUT_MS).toBe(30 * 60 * 1000);
    expect(STAFF_WARNING_DURATION_MS).toBe(60 * 1000);
    expect(STAFF_ABSOLUTE_SESSION_MS).toBe(12 * 60 * 60 * 1000);
  });
});
