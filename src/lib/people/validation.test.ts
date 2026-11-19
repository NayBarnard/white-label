import { describe, expect, it } from "vitest";
import { parseEmail, parsePeopleAction, parseUuid } from "./validation";

describe("People validation", () => {
  it("accepts a bounded invite", () => {
    expect(parsePeopleAction({
      action: "invite",
      email: " STAFF@Example.COM ",
      role: "adviser",
      fullName: "Staff Member",
    })).toEqual({
      action: "invite",
      email: "staff@example.com",
      role: "adviser",
      fullName: "Staff Member",
    });
  });

  it("rejects malformed emails, UUIDs and roles", () => {
    expect(parseEmail("bad")).toBeNull();
    expect(parseUuid("bad")).toBeNull();
    expect(parsePeopleAction({ action: "role", userId: "bad", role: "admin" })).toBeNull();
    expect(parsePeopleAction({ action: "invite", email: "staff@example.com", role: "owner", fullName: "Owner" })).toBeNull();
  });
});
