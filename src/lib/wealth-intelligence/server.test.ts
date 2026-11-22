import { describe, expect, it } from "vitest";
import { getWealthOsTenantId } from "./server";

function metadataWithTenant(tenantId?: unknown) {
  return tenantId === undefined ? {} : { tenant_id: tenantId };
}

describe("wealth intelligence tenant identity", () => {
  it("accepts only an explicitly assigned non-demo tenant", () => {
    expect(getWealthOsTenantId(metadataWithTenant("firm-42"))).toBe("firm-42");
    expect(getWealthOsTenantId(metadataWithTenant("default"))).toBeNull();
    expect(getWealthOsTenantId(metadataWithTenant())).toBeNull();
  });

  it("rejects malformed or non-string tenant claims", () => {
    expect(getWealthOsTenantId(metadataWithTenant("Firm 42"))).toBeNull();
    expect(getWealthOsTenantId(metadataWithTenant("../other-tenant"))).toBeNull();
    expect(getWealthOsTenantId(metadataWithTenant(42))).toBeNull();
    expect(getWealthOsTenantId(null)).toBeNull();
  });
});
