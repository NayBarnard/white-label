import { describe, expect, it } from "vitest";
import { getStudioTenantId } from "./tenant";

describe("getStudioTenantId", () => {
  it("rejects a missing tenant claim instead of assuming the default tenant", () => {
    expect(getStudioTenantId({ role: "admin" })).toBeNull();
  });

  it("accepts a valid trusted tenant claim", () => {
    expect(getStudioTenantId({ tenant_id: "firm_2" })).toBe("firm_2");
  });

  it("rejects malformed or non-string tenant claims", () => {
    expect(getStudioTenantId({ tenant_id: "Invalid tenant" })).toBeNull();
    expect(getStudioTenantId({ tenant_id: 42 })).toBeNull();
  });
});
