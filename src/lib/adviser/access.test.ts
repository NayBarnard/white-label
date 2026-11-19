import { describe, expect, it } from "vitest";
import { canAccessAdviserPortal } from "./access";

describe("canAccessAdviserPortal", () => {
  it("allows advisers and administrators", () => {
    expect(canAccessAdviserPortal("adviser")).toBe(true);
    expect(canAccessAdviserPortal("admin")).toBe(true);
  });

  it("denies other or missing roles", () => {
    expect(canAccessAdviserPortal("client")).toBe(false);
    expect(canAccessAdviserPortal(undefined)).toBe(false);
  });
});
