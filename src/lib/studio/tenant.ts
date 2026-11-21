const TENANT_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,62}$/;

export function getStudioTenantId(appMetadata: Record<string, unknown>): string | null {
  const tenantId = appMetadata.tenant_id;
  if (tenantId === undefined) return "default";
  return typeof tenantId === "string" && TENANT_ID_PATTERN.test(tenantId)
    ? tenantId
    : null;
}
