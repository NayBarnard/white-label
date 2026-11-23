import { describe, expect, it } from "vitest";
import { canStaff } from "./permissions";

describe("central staff permission map", () => {
  it("gives admin all sensitive areas", () => {
    expect(canStaff("admin", "people.manage")).toBe(true);
    expect(canStaff("admin", "registers.manage")).toBe(true);
  });

  it("limits advisers to adviser and platform-read areas", () => {
    expect(canStaff("adviser", "adviser.portal")).toBe(true);
    expect(canStaff("adviser", "platform.read")).toBe(true);
    expect(canStaff("adviser", "people.manage")).toBe(false);
  });

  it("limits compliance and operations to their approved areas", () => {
    expect(canStaff("compliance", "content.approve")).toBe(true);
    expect(canStaff("compliance", "people.manage")).toBe(false);
    expect(canStaff("operations", "documents.manage")).toBe(true);
    expect(canStaff("operations", "content.publish")).toBe(false);
  });

  it("separates platform operators from firm private administration", () => {
    expect(canStaff("platform_operator", "platform.edit")).toBe(true);
    expect(canStaff("platform_operator", "audit.read")).toBe(true);
    expect(canStaff("platform_operator", "people.manage")).toBe(false);
  });
});
