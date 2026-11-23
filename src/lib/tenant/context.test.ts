import { describe, expect, it } from "vitest";
import { getTenantIdFromHost, getTrustedTenantClaim } from "./context";

describe("tenant context", () => {
  it("accepts only explicit valid non-default tenant claims", () => {
    expect(getTrustedTenantClaim({
      tenant_id: "firm_2",
      role: "firm_administrator",
    })).toEqual({ tenantId: "firm_2", role: "firm_administrator" });
    expect(getTrustedTenantClaim({ tenant_id: "default", role: "admin" })).toBeNull();
    expect(getTrustedTenantClaim({ tenant_id: "invalid firm", role: "admin" })).toBeNull();
  });

  it("matches tenant domains by exact hostname", () => {
    const tenants = [
      { id: "firm_a", primary_domain: "a.example.com" },
      { id: "firm_b", primary_domain: "b.example.com" },
    ];
    expect(getTenantIdFromHost("a.example.com:3000", tenants)).toBe("firm_a");
    expect(getTenantIdFromHost("unknown.example.com", tenants)).toBeNull();
  });
});
