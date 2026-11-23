export const TENANT_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,62}$/;

export type TrustedTenantContext = {
  tenantId: string;
  role: string;
  membershipStatus: "active";
};

export function getTrustedTenantClaim(appMetadata: unknown):
  | { tenantId: string; role: string }
  | null {
  if (!appMetadata || typeof appMetadata !== "object" || Array.isArray(appMetadata)) return null;
  const metadata = appMetadata as Record<string, unknown>;
  if (
    typeof metadata.tenant_id !== "string" ||
    !TENANT_ID_PATTERN.test(metadata.tenant_id) ||
    metadata.tenant_id === "default"
  ) {
    return null;
  }
  if (typeof metadata.role !== "string" || !metadata.role.trim()) return null;
  return { tenantId: metadata.tenant_id, role: metadata.role };
}

export function getTenantIdFromHost(
  host: string | null,
  tenants: ReadonlyArray<{ id: string; primary_domain: string | null }>,
): string | null {
  if (!host) return null;
  const hostname = host.split(":")[0].toLowerCase().replace(/\.$/, "");
  const match = tenants.find(
    (tenant) =>
      tenant.primary_domain?.toLowerCase() === hostname ||
      tenant.primary_domain?.toLowerCase() === `www.${hostname}`,
  );
  return match?.id ?? null;
}
