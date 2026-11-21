import { NextResponse } from "next/server";
import { authorizeAdviserApi } from "@/lib/adviser/server";
import { isUuid } from "@/lib/admin/validation";
import {
  appendRenewalAudit,
  checkAdviserClientRelationship,
  createRenewalAdminClient,
  getAdviserTenantId,
  getRequestIp,
} from "@/lib/renewal-packs/server";
import { readJsonBody } from "@/lib/server/rate-limit";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ clientId: string; packId: string; itemId: string }> },
) {
  const access = await authorizeAdviserApi();
  if (!access.ok) return access.response;
  const { clientId, packId, itemId } = await context.params;
  if (![clientId, packId, itemId].every(isUuid)) {
    return NextResponse.json({ error: "The renewal item reference is invalid." }, { status: 400 });
  }
  const tenantId = getAdviserTenantId(access.user);
  const supabase = createRenewalAdminClient();
  if (!tenantId || !supabase) {
    return NextResponse.json({ error: "Renewal packs are not configured for this adviser." }, { status: 503 });
  }
  const parsedBody = await readJsonBody(request, 8 * 1024);
  if (!parsedBody.ok) return NextResponse.json({ error: "The verification action could not be read." }, { status: 400 });
  const body: unknown = parsedBody.value;
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "The verification action is invalid." }, { status: 400 });
  }
  const record = body as Record<string, unknown>;
  const action = record.action;
  const reason = typeof record.reason === "string" ? record.reason.trim() : "";
  if (
    (action !== "verify" && action !== "reject") ||
    Object.keys(record).some((key) => key !== "action" && key !== "reason") ||
    (action === "reject" && (reason.length < 1 || reason.length > 500)) ||
    (action === "verify" && record.reason !== undefined)
  ) return NextResponse.json({ error: "The verification action is invalid." }, { status: 400 });

  try {
    const relationship = await checkAdviserClientRelationship(supabase, access.user.id, clientId);
    if (relationship.error) return NextResponse.json({ error: "The client relationship could not be verified." }, { status: 502 });
    if (!relationship.data) return NextResponse.json({ error: "You do not have access to this client." }, { status: 403 });

    const pack = await supabase.from("renewal_packs").select("id,status")
      .eq("id", packId).eq("tenant_id", tenantId)
      .eq("adviser_user_id", access.user.id).eq("client_user_id", clientId).maybeSingle();
    if (pack.error) return NextResponse.json({ error: "The renewal pack could not be loaded." }, { status: 502 });
    if (!pack.data) return NextResponse.json({ error: "The renewal pack could not be found." }, { status: 404 });
    if (pack.data.status !== "submitted") {
      return NextResponse.json({ error: "The renewal pack must be submitted before verification." }, { status: 409 });
    }

    const item = await supabase.from("renewal_pack_items").select("id,status")
      .eq("id", itemId).eq("pack_id", packId).eq("tenant_id", tenantId).maybeSingle();
    if (item.error) return NextResponse.json({ error: "The renewal item could not be loaded." }, { status: 502 });
    if (!item.data) return NextResponse.json({ error: "The renewal item could not be found." }, { status: 404 });
    if (item.data.status !== "submitted") {
      return NextResponse.json({ error: "Only submitted items can be verified or rejected." }, { status: 409 });
    }

    const audited = await appendRenewalAudit(supabase, {
      tenantId,
      packId,
      actorId: access.user.id,
      actorType: "adviser",
      action: action === "verify" ? "item.verified" : "item.rejected",
      ipAddress: getRequestIp(request),
      metadata: { itemId },
    });
    if (!audited) return NextResponse.json({ error: "The verification action could not be audited." }, { status: 500 });

    const updated = await supabase.from("renewal_pack_items").update({
      status: action === "verify" ? "verified" : "rejected",
      rejection_reason: action === "reject" ? reason : null,
      updated_at: new Date().toISOString(),
    }).eq("id", itemId).eq("pack_id", packId).eq("tenant_id", tenantId)
      .eq("status", "submitted").select("id").maybeSingle();
    if (updated.error) return NextResponse.json({ error: "The renewal item could not be updated." }, { status: 502 });
    if (!updated.data) return NextResponse.json({ error: "This renewal item has already changed." }, { status: 409 });

    if (action === "reject") {
      const reopened = await supabase.from("renewal_packs")
        .update({ status: "active", submitted_at: null, updated_at: new Date().toISOString() })
        .eq("id", packId).eq("tenant_id", tenantId)
        .eq("adviser_user_id", access.user.id).eq("client_user_id", clientId)
        .eq("status", "submitted").select("id").maybeSingle();
      if (reopened.error || !reopened.data) {
        return NextResponse.json({ error: "The renewal pack could not be reopened for correction." }, { status: 502 });
      }
    } else {
      const remaining = await supabase.from("renewal_pack_items").select("id")
        .eq("pack_id", packId).eq("tenant_id", tenantId)
        .or("required.eq.true,status.eq.submitted").neq("status", "verified").limit(1);
      if (remaining.error) return NextResponse.json({ error: "The renewal pack status could not be refreshed." }, { status: 502 });
      if (!remaining.data?.length) {
        const verified = await supabase.from("renewal_packs")
          .update({ status: "verified", updated_at: new Date().toISOString() })
          .eq("id", packId).eq("tenant_id", tenantId)
          .eq("adviser_user_id", access.user.id).eq("client_user_id", clientId)
          .eq("status", "submitted").select("id").maybeSingle();
        if (verified.error || !verified.data) {
          return NextResponse.json({ error: "The renewal pack status could not be refreshed." }, { status: 502 });
        }
      }
    }
    return NextResponse.json({ ok: true });
  } catch {
    console.error("Renewal item verification action failed.");
    return NextResponse.json({ error: "The renewal item could not be updated." }, { status: 500 });
  }
}
