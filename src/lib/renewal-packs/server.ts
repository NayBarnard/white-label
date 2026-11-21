import { createHash, randomBytes } from "node:crypto";
import { isIP } from "node:net";
import { createClient } from "@supabase/supabase-js";

export const RENEWAL_BUCKET = "renewal-pack-evidence";
// Renewal tables are intentionally kept outside the shared portal DB type.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RenewalAdminClient = ReturnType<typeof createClient<any>>;

export function createRenewalAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

export function getAdviserTenantId(user: { app_metadata: Record<string, unknown> }) {
  const tenantId = user.app_metadata.tenant_id;
  return typeof tenantId === "string" && /^[a-z0-9][a-z0-9_-]{0,62}$/.test(tenantId) ? tenantId : null;
}

export function createRenewalToken() {
  return randomBytes(32).toString("base64url");
}

export function hashRenewalToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getRequestIp(request: Request) {
  const candidate = request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "";
  return isIP(candidate) ? candidate : null;
}

export async function checkAdviserClientRelationship(
  supabase: RenewalAdminClient,
  adviserId: string,
  clientId: string,
) {
  return supabase
    .from("adviser_client_relationships")
    .select("id")
    .eq("adviser_user_id", adviserId)
    .eq("client_user_id", clientId)
    .eq("status", "active")
    .maybeSingle();
}

export async function appendRenewalAudit(
  supabase: RenewalAdminClient,
  input: {
    tenantId: string;
    packId: string;
    actorId: string;
    actorType: "adviser" | "client";
    action: string;
    ipAddress: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const result = await supabase.from("renewal_pack_audit").insert({
    tenant_id: input.tenantId,
    pack_id: input.packId,
    actor_user_id: input.actorId,
    actor_type: input.actorType,
    action: input.action,
    ip_address: input.ipAddress,
    metadata: input.metadata ?? {},
  });
  return !result.error;
}
