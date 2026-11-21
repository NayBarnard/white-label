import { NextResponse } from "next/server";
import { authorizeAdviserApi } from "@/lib/adviser/server";
import { isUuid } from "@/lib/admin/validation";
import { parseRenewalPackInput } from "@/lib/renewal-packs/domain";
import {
  appendRenewalAudit,
  checkAdviserClientRelationship,
  createRenewalAdminClient,
  createRenewalToken,
  getAdviserTenantId,
  getRequestIp,
  hashRenewalToken,
} from "@/lib/renewal-packs/server";
import { readJsonBody } from "@/lib/server/rate-limit";

export async function GET(
  _request: Request,
  context: { params: Promise<{ clientId: string }> },
) {
  const access = await authorizeAdviserApi();
  if (!access.ok) return access.response;
  const { clientId } = await context.params;
  if (!isUuid(clientId)) return NextResponse.json({ error: "The client reference is invalid." }, { status: 400 });
  const tenantId = getAdviserTenantId(access.user);
  const supabase = createRenewalAdminClient();
  if (!tenantId || !supabase) {
    return NextResponse.json({ error: "Renewal packs are not configured for this adviser." }, { status: 503 });
  }
  try {
    const relationship = await checkAdviserClientRelationship(supabase, access.user.id, clientId);
    if (relationship.error) {
      return NextResponse.json({ error: "The client relationship could not be verified." }, { status: 502 });
    }
    if (!relationship.data) return NextResponse.json({ error: "You do not have access to this client." }, { status: 403 });

    const result = await supabase
      .from("renewal_packs")
      .select("id,title,status,expires_at,submitted_at,created_at")
      .eq("tenant_id", tenantId)
      .eq("adviser_user_id", access.user.id)
      .eq("client_user_id", clientId)
      .order("created_at", { ascending: false });
    if (result.error) {
      console.error("Renewal packs could not be loaded.");
      return NextResponse.json({ error: "Renewal packs could not be loaded." }, { status: 502 });
    }
    return NextResponse.json({ packs: result.data });
  } catch {
    console.error("Renewal packs could not be loaded.");
    return NextResponse.json({ error: "Renewal packs could not be loaded." }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ clientId: string }> },
) {
  const access = await authorizeAdviserApi();
  if (!access.ok) return access.response;
  const { clientId } = await context.params;
  if (!isUuid(clientId)) return NextResponse.json({ error: "The client reference is invalid." }, { status: 400 });
  const tenantId = getAdviserTenantId(access.user);
  const supabase = createRenewalAdminClient();
  if (!tenantId || !supabase) {
    return NextResponse.json({ error: "Renewal packs are not configured for this adviser." }, { status: 503 });
  }
  const body = await readJsonBody(request, 32 * 1024);
  if (!body.ok) return NextResponse.json({ error: "The renewal pack details could not be read." }, { status: 400 });
  const input = parseRenewalPackInput(body.value);
  if (!input) return NextResponse.json({ error: "The renewal pack details are invalid." }, { status: 400 });

  try {
    const relationship = await checkAdviserClientRelationship(supabase, access.user.id, clientId);
    if (relationship.error) {
      return NextResponse.json({ error: "The client relationship could not be verified." }, { status: 502 });
    }
    if (!relationship.data) return NextResponse.json({ error: "You do not have access to this client." }, { status: 403 });

    const token = createRenewalToken();
    const inserted = await supabase.from("renewal_packs").insert({
      tenant_id: tenantId,
      adviser_user_id: access.user.id,
      client_user_id: clientId,
      title: input.title,
      token_hash: hashRenewalToken(token),
      expires_at: new Date(Date.now() + input.expiresInDays * 86400000).toISOString(),
    }).select("id,title,status,expires_at,submitted_at,created_at").single();
    if (inserted.error) {
      console.error("Renewal pack could not be created.");
      return NextResponse.json({ error: "The renewal pack could not be created." }, { status: 502 });
    }

    const items = await supabase.from("renewal_pack_items").insert(input.items.map((item) => ({
      pack_id: inserted.data.id,
      tenant_id: tenantId,
      type: item.type,
      label: item.label,
      required: item.required,
    })));
    if (items.error) {
      await supabase.from("renewal_packs").update({ status: "revoked", revoked_at: new Date().toISOString() })
        .eq("id", inserted.data.id).eq("tenant_id", tenantId)
        .eq("adviser_user_id", access.user.id).eq("client_user_id", clientId);
      console.error("Renewal pack checklist could not be created.");
      return NextResponse.json({ error: "The renewal pack checklist could not be created." }, { status: 502 });
    }

    const audited = await appendRenewalAudit(supabase, {
      tenantId,
      packId: inserted.data.id,
      actorId: access.user.id,
      actorType: "adviser",
      action: "pack.created",
      ipAddress: getRequestIp(request),
      metadata: { itemCount: input.items.length },
    });
    if (!audited) {
      await supabase.from("renewal_packs").update({ status: "revoked", revoked_at: new Date().toISOString() })
        .eq("id", inserted.data.id).eq("tenant_id", tenantId)
        .eq("adviser_user_id", access.user.id).eq("client_user_id", clientId);
      console.error("Renewal pack creation could not be audited.");
      return NextResponse.json({ error: "The renewal pack could not be audited." }, { status: 500 });
    }
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || new URL(request.url).origin;
    return NextResponse.json({
      pack: inserted.data,
      link: `${baseUrl}/renewal/${token}`,
    }, { status: 201 });
  } catch {
    console.error("Renewal pack could not be created.");
    return NextResponse.json({ error: "The renewal pack could not be created." }, { status: 500 });
  }
}
