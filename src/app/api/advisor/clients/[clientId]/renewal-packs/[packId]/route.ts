import { NextResponse } from "next/server";
import { authorizeAdviserApi } from "@/lib/adviser/server";
import { isUuid } from "@/lib/admin/validation";
import {
  appendRenewalAudit,
  checkAdviserClientRelationship,
  createRenewalAdminClient,
  getAdviserTenantId,
  getRequestIp,
  RENEWAL_BUCKET,
} from "@/lib/renewal-packs/server";
import { readJsonBody } from "@/lib/server/rate-limit";

export async function GET(
  request: Request,
  context: { params: Promise<{ clientId: string; packId: string }> },
) {
  const access = await authorizeAdviserApi();
  if (!access.ok) return access.response;
  const { clientId, packId } = await context.params;
  if (!isUuid(clientId) || !isUuid(packId)) {
    return NextResponse.json({ error: "The renewal pack reference is invalid." }, { status: 400 });
  }
  const tenantId = getAdviserTenantId(access.user);
  const supabase = createRenewalAdminClient();
  if (!tenantId || !supabase) {
    return NextResponse.json({ error: "Renewal packs are not configured for this adviser." }, { status: 503 });
  }
  try {
    const relationship = await checkAdviserClientRelationship(supabase, access.user.id, clientId);
    if (relationship.error) return NextResponse.json({ error: "The client relationship could not be verified." }, { status: 502 });
    if (!relationship.data) return NextResponse.json({ error: "You do not have access to this client." }, { status: 403 });

    const [packResult, itemsResult] = await Promise.all([
      supabase.from("renewal_packs")
        .select("id,title,status,expires_at,submitted_at,created_at")
        .eq("id", packId).eq("tenant_id", tenantId)
        .eq("adviser_user_id", access.user.id).eq("client_user_id", clientId).maybeSingle(),
      supabase.from("renewal_pack_items")
        .select("id,pack_id,type,label,required,status,response_text,object_path,rejection_reason,updated_at")
        .eq("pack_id", packId).eq("tenant_id", tenantId).order("created_at", { ascending: true }),
    ]);
    if (packResult.error || itemsResult.error) {
      console.error("Renewal pack details could not be loaded.");
      return NextResponse.json({ error: "Renewal pack details could not be loaded." }, { status: 502 });
    }
    if (!packResult.data) return NextResponse.json({ error: "The renewal pack could not be found." }, { status: 404 });

    const items = await Promise.all((itemsResult.data ?? []).map(async (item: Record<string, unknown>) => {
      const objectPath = typeof item.object_path === "string" ? item.object_path : null;
      const signed = objectPath
        ? await supabase.storage.from(RENEWAL_BUCKET).createSignedUrl(objectPath, 60)
        : null;
      if (signed?.error) throw new Error("Renewal evidence download could not be prepared.");
      const safeItem = { ...item };
      delete safeItem.object_path;
      return { ...safeItem, signedUrl: signed?.data.signedUrl ?? null };
    }));
    await appendRenewalAudit(supabase, {
      tenantId,
      packId,
      actorId: access.user.id,
      actorType: "adviser",
      action: "pack.adviser_opened",
      ipAddress: getRequestIp(request),
    });
    return NextResponse.json({ pack: packResult.data, items });
  } catch {
    console.error("Renewal pack details could not be loaded.");
    return NextResponse.json({ error: "Renewal pack details could not be loaded." }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ clientId: string; packId: string }> },
) {
  const access = await authorizeAdviserApi();
  if (!access.ok) return access.response;
  const { clientId, packId } = await context.params;
  if (!isUuid(clientId) || !isUuid(packId)) {
    return NextResponse.json({ error: "The renewal pack reference is invalid." }, { status: 400 });
  }
  const tenantId = getAdviserTenantId(access.user);
  const supabase = createRenewalAdminClient();
  if (!tenantId || !supabase) {
    return NextResponse.json({ error: "Renewal packs are not configured for this adviser." }, { status: 503 });
  }
  const parsedBody = await readJsonBody(request, 8 * 1024);
  if (!parsedBody.ok) return NextResponse.json({ error: "The renewal pack action could not be read." }, { status: 400 });
  const body: unknown = parsedBody.value;
  if (
    typeof body !== "object" || body === null || Array.isArray(body) ||
    (body as Record<string, unknown>).action !== "revoke" ||
    Object.keys(body).some((key) => key !== "action")
  ) return NextResponse.json({ error: "The renewal pack action is invalid." }, { status: 400 });

  try {
    const relationship = await checkAdviserClientRelationship(supabase, access.user.id, clientId);
    if (relationship.error) return NextResponse.json({ error: "The client relationship could not be verified." }, { status: 502 });
    if (!relationship.data) return NextResponse.json({ error: "You do not have access to this client." }, { status: 403 });

    const existing = await supabase.from("renewal_packs").select("id,status")
      .eq("id", packId).eq("tenant_id", tenantId)
      .eq("adviser_user_id", access.user.id).eq("client_user_id", clientId).maybeSingle();
    if (existing.error) return NextResponse.json({ error: "The renewal pack could not be loaded." }, { status: 502 });
    if (!existing.data) return NextResponse.json({ error: "The renewal pack could not be found." }, { status: 404 });
    if (existing.data.status === "revoked") return NextResponse.json({ error: "This renewal link has already been revoked." }, { status: 409 });

    const audited = await appendRenewalAudit(supabase, {
      tenantId,
      packId,
      actorId: access.user.id,
      actorType: "adviser",
      action: "pack.revoked",
      ipAddress: getRequestIp(request),
    });
    if (!audited) return NextResponse.json({ error: "The revocation could not be audited." }, { status: 500 });
    const updated = await supabase.from("renewal_packs")
      .update({ status: "revoked", revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", packId).eq("tenant_id", tenantId)
      .eq("adviser_user_id", access.user.id).eq("client_user_id", clientId);
    if (updated.error) return NextResponse.json({ error: "The renewal link could not be revoked." }, { status: 502 });
    return NextResponse.json({ ok: true });
  } catch {
    console.error("Renewal link could not be revoked.");
    return NextResponse.json({ error: "The renewal link could not be revoked." }, { status: 500 });
  }
}
