import { describe, expect, it } from "vitest";
import { getPostLoginDestination } from "./routing";

describe("post-login role routing", () => {
  it("routes each trusted role to its workspace", () => {
    expect(getPostLoginDestination("client")).toBe("/portal");
    expect(getPostLoginDestination("adviser")).toBe("/advisor");
    expect(getPostLoginDestination("admin")).toBe("/admin");
  });

  it("treats missing role as client but refuses unknown roles", () => {
    expect(getPostLoginDestination(undefined)).toBe("/portal");
    expect(getPostLoginDestination(null)).toBe("/portal");
    expect(getPostLoginDestination("owner")).toBeNull();
  });
});
