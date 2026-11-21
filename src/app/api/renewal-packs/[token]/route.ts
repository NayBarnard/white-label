import { NextResponse } from "next/server";
import {
  isAllowedRenewalFile,
  isRenewalSubmissionComplete,
  parseRenewalItemId,
  parseRenewalResponse,
} from "@/lib/renewal-packs/domain";
import {
  appendRenewalAudit,
  createRenewalAdminClient,
  getRequestIp,
  hashRenewalToken,
  RENEWAL_BUCKET,
} from "@/lib/renewal-packs/server";
import { readJsonBody } from "@/lib/server/rate-limit";

type RouteContext = { params: Promise<{ token: string }> };

async function findTokenPack(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return { supabase: null, pack: null, error: false };
  const supabase = createRenewalAdminClient();
  if (!supabase) return { supabase: null, pack: null, error: true };
  const result = await supabase.from("renewal_packs")
    .select("id,tenant_id,client_user_id,adviser_user_id,title,status,expires_at,submitted_at")
    .eq("token_hash", hashRenewalToken(token)).maybeSingle();
  if (result.error) return { supabase, pack: null, error: true };
  if (result.data) {
    const relationship = await supabase.from("adviser_client_relationships")
      .select("id")
      .eq("adviser_user_id", result.data.adviser_user_id)
      .eq("client_user_id", result.data.client_user_id)
      .eq("status", "active")
      .maybeSingle();
    if (relationship.error) return { supabase, pack: null, error: true };
    if (!relationship.data) return { supabase, pack: null, error: false };
  }
  return { supabase, pack: result.data, error: false };
}

function isExpired(expiresAt: string) {
  return new Date(expiresAt).getTime() <= Date.now();
}

function unavailable(pack: { status: string; expires_at: string } | null) {
  return !pack || pack.status === "revoked" || isExpired(pack.expires_at);
}

function fileSignatureMatches(type: string, bytes: Uint8Array) {
  if (type === "application/pdf") return new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  return type === "image/png" &&
    bytes.slice(0, 8).join(",") === "137,80,78,71,13,10,26,10";
}

async function readBoundedBody(request: Request, maximum: number) {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    length += chunk.value.byteLength;
    if (length > maximum) {
      await reader.cancel();
      return null;
    }
    chunks.push(chunk.value);
  }
  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export async function GET(request: Request, context: RouteContext) {
  const { token } = await context.params;
  const result = await findTokenPack(token);
  if (result.error) return NextResponse.json({ error: "The secure renewal link could not be opened." }, { status: 503 });
  if (!result.supabase) return NextResponse.json({ error: "This secure renewal link is invalid or expired." }, { status: 404 });
  const pack = result.pack;
  if (!pack) return NextResponse.json({ error: "This secure renewal link is invalid or expired." }, { status: 404 });
  if (unavailable(pack)) return NextResponse.json({ error: "This secure renewal link is invalid or expired." }, { status: 410 });

  try {
    const itemsResult = await result.supabase.from("renewal_pack_items")
      .select("id,type,label,required,status,response_text,rejection_reason,object_path,updated_at")
      .eq("pack_id", pack.id).eq("tenant_id", pack.tenant_id).order("created_at", { ascending: true });
    if (itemsResult.error) return NextResponse.json({ error: "The renewal checklist could not be loaded." }, { status: 502 });
    const items = await Promise.all((itemsResult.data ?? []).map(async (item: Record<string, unknown>) => {
      const objectPath = typeof item.object_path === "string" ? item.object_path : null;
      const signed = objectPath
        ? await result.supabase!.storage.from(RENEWAL_BUCKET).createSignedUrl(objectPath, 60)
        : null;
      if (signed?.error) throw new Error("Evidence link unavailable.");
      const safeItem = { ...item };
      delete safeItem.object_path;
      return { ...safeItem, signedUrl: signed?.data.signedUrl ?? null };
    }));
    const audited = await appendRenewalAudit(result.supabase, {
      tenantId: pack.tenant_id,
      packId: pack.id,
      actorId: pack.client_user_id,
      actorType: "client",
      action: "pack.client_opened",
      ipAddress: getRequestIp(request),
    });
    if (!audited) return NextResponse.json({ error: "The link opening could not be recorded." }, { status: 500 });
    return NextResponse.json({
      pack: {
        id: pack.id,
        title: pack.title,
        status: pack.status,
        expiresAt: pack.expires_at,
        submittedAt: pack.submitted_at,
      },
      items,
    }, { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  } catch {
    console.error("Renewal link could not be opened.");
    return NextResponse.json({ error: "The renewal checklist could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params;
  const result = await findTokenPack(token);
  if (result.error) return NextResponse.json({ error: "The secure renewal link could not be used." }, { status: 503 });
  if (!result.supabase) return NextResponse.json({ error: "This secure renewal link is invalid or expired." }, { status: 404 });
  const pack = result.pack;
  if (!pack) return NextResponse.json({ error: "This secure renewal link is invalid or expired." }, { status: 404 });
  if (unavailable(pack)) return NextResponse.json({ error: "This secure renewal link is invalid or expired." }, { status: 410 });
  if (pack.status !== "active") {
    return NextResponse.json({ error: "This renewal pack is not accepting changes." }, { status: 409 });
  }
  const supabase = result.supabase;
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.toLowerCase().includes("multipart/form-data")) {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 11 * 1024 * 1024) return NextResponse.json({ error: "The upload is larger than 10 MB." }, { status: 413 });
    const boundedBody = await readBoundedBody(request, 11 * 1024 * 1024);
    if (!boundedBody) return NextResponse.json({ error: "The upload is larger than 10 MB." }, { status: 413 });
    let form: FormData;
    try {
      form = await new Request(request.url, {
        method: "POST",
        headers: request.headers,
        body: boundedBody,
      }).formData();
    } catch {
      return NextResponse.json({ error: "The upload could not be read." }, { status: 400 });
    }
    const itemId = form.get("itemId");
    const file = form.get("file");
    if (typeof itemId !== "string" || !parseRenewalItemId(itemId) || !(file instanceof File)) {
      return NextResponse.json({ error: "Choose a valid checklist item and file." }, { status: 400 });
    }
    if (!isAllowedRenewalFile(file.type, file.size)) {
      return NextResponse.json({ error: "Upload a PDF, JPG or PNG no larger than 10 MB." }, { status: 400 });
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!fileSignatureMatches(file.type, bytes)) {
      return NextResponse.json({ error: "The file content does not match an allowed file type." }, { status: 400 });
    }
    try {
      const item = await supabase.from("renewal_pack_items").select("id,status,object_path")
        .eq("id", itemId).eq("pack_id", pack.id).eq("tenant_id", pack.tenant_id).maybeSingle();
      if (item.error) return NextResponse.json({ error: "The checklist item could not be loaded." }, { status: 502 });
      if (!item.data) return NextResponse.json({ error: "The checklist item could not be found." }, { status: 404 });
      if (item.data.status !== "pending" && item.data.status !== "rejected") {
        return NextResponse.json({ error: "Only pending or returned items can be changed." }, { status: 409 });
      }
      const extension = file.type === "application/pdf" ? "pdf" : file.type === "image/jpeg" ? "jpg" : "png";
      const path = `${pack.tenant_id}/${pack.client_user_id}/${pack.id}/${itemId}/${crypto.randomUUID()}.${extension}`;
      const uploaded = await supabase.storage.from(RENEWAL_BUCKET).upload(path, bytes, {
        contentType: file.type,
        cacheControl: "60",
        upsert: false,
      });
      if (uploaded.error) return NextResponse.json({ error: "The evidence file could not be uploaded." }, { status: 502 });
      const audited = await appendRenewalAudit(supabase, {
        tenantId: pack.tenant_id,
        packId: pack.id,
        actorId: pack.client_user_id,
        actorType: "client",
        action: "item.uploaded",
        ipAddress: getRequestIp(request),
        metadata: { itemId, mimeType: file.type, byteSize: file.size },
      });
      if (!audited) {
        await supabase.storage.from(RENEWAL_BUCKET).remove([path]);
        return NextResponse.json({ error: "The upload could not be recorded." }, { status: 500 });
      }
      const updated = await supabase.from("renewal_pack_items").update({
        object_path: path,
        response_text: null,
        status: "submitted",
        rejection_reason: null,
        updated_at: new Date().toISOString(),
      }).eq("id", itemId).eq("pack_id", pack.id).eq("tenant_id", pack.tenant_id)
        .in("status", ["pending", "rejected"]).select("id").maybeSingle();
      if (updated.error) {
        const cleanup = await supabase.storage.from(RENEWAL_BUCKET).remove([path]);
        if (cleanup.error) console.error("Temporary renewal upload cleanup failed.");
        return NextResponse.json({ error: "The checklist item could not be updated." }, { status: 502 });
      }
      if (!updated.data) {
        const cleanup = await supabase.storage.from(RENEWAL_BUCKET).remove([path]);
        if (cleanup.error) console.error("Temporary renewal upload cleanup failed.");
        return NextResponse.json({ error: "This checklist item has already changed." }, { status: 409 });
      }
      if (item.data.object_path) {
        const removed = await supabase.storage.from(RENEWAL_BUCKET).remove([item.data.object_path]);
        if (removed.error) console.error("Superseded renewal evidence cleanup failed.");
      }
      return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    } catch {
      console.error("Renewal evidence upload failed.");
      return NextResponse.json({ error: "The evidence file could not be uploaded." }, { status: 500 });
    }
  }

  const parsedBody = await readJsonBody(request, 8 * 1024);
  if (!parsedBody.ok) return NextResponse.json({ error: "The renewal action could not be read." }, { status: 400 });
  const body: unknown = parsedBody.value;
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "The renewal action is invalid." }, { status: 400 });
  }
  const action = (body as Record<string, unknown>).action;
  if (action === "respond") {
    const record = body as Record<string, unknown>;
    if (Object.keys(record).some((key) => !["action", "itemId", "response"].includes(key))) {
      return NextResponse.json({ error: "The renewal response is invalid." }, { status: 400 });
    }
    if (typeof record.itemId !== "string" || !parseRenewalItemId(record.itemId)) {
      return NextResponse.json({ error: "The checklist item reference is invalid." }, { status: 400 });
    }
    const responseText = parseRenewalResponse(record.response);
    if (!responseText) return NextResponse.json({ error: "Enter a response of up to 2,000 characters." }, { status: 400 });
    try {
      const item = await supabase.from("renewal_pack_items").select("id,status,object_path")
        .eq("id", record.itemId).eq("pack_id", pack.id).eq("tenant_id", pack.tenant_id).maybeSingle();
      if (item.error) return NextResponse.json({ error: "The checklist item could not be loaded." }, { status: 502 });
      if (!item.data) return NextResponse.json({ error: "The checklist item could not be found." }, { status: 404 });
      if (item.data.status !== "pending" && item.data.status !== "rejected") {
        return NextResponse.json({ error: "Only pending or returned items can be changed." }, { status: 409 });
      }
      const audited = await appendRenewalAudit(supabase, {
        tenantId: pack.tenant_id,
        packId: pack.id,
        actorId: pack.client_user_id,
        actorType: "client",
        action: "item.responded",
        ipAddress: getRequestIp(request),
        metadata: { itemId: record.itemId },
      });
      if (!audited) return NextResponse.json({ error: "The response could not be recorded." }, { status: 500 });
      const updated = await supabase.from("renewal_pack_items").update({
        response_text: responseText,
        object_path: null,
        status: "submitted",
        rejection_reason: null,
        updated_at: new Date().toISOString(),
      }).eq("id", record.itemId).eq("pack_id", pack.id).eq("tenant_id", pack.tenant_id)
        .in("status", ["pending", "rejected"]).select("id").maybeSingle();
      if (updated.error) return NextResponse.json({ error: "The response could not be saved." }, { status: 502 });
      if (!updated.data) return NextResponse.json({ error: "This checklist item has already changed." }, { status: 409 });
      if (item.data.object_path) {
        const removed = await supabase.storage.from(RENEWAL_BUCKET).remove([item.data.object_path]);
        if (removed.error) console.error("Superseded renewal evidence cleanup failed.");
      }
      return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    } catch {
      console.error("Renewal response could not be saved.");
      return NextResponse.json({ error: "The response could not be saved." }, { status: 500 });
    }
  }

  if (action === "submit" && Object.keys(body as Record<string, unknown>).length === 1) {
    try {
      const items = await supabase.from("renewal_pack_items")
        .select("required,status,response_text,object_path")
        .eq("pack_id", pack.id).eq("tenant_id", pack.tenant_id);
      if (items.error) return NextResponse.json({ error: "The renewal checklist could not be loaded." }, { status: 502 });
      if (!isRenewalSubmissionComplete(items.data ?? [])) {
        return NextResponse.json({ error: "Complete every required item before submitting." }, { status: 409 });
      }
      const audited = await appendRenewalAudit(supabase, {
        tenantId: pack.tenant_id,
        packId: pack.id,
        actorId: pack.client_user_id,
        actorType: "client",
        action: "pack.submitted",
        ipAddress: getRequestIp(request),
      });
      if (!audited) return NextResponse.json({ error: "The submission could not be recorded." }, { status: 500 });
      const updated = await supabase.from("renewal_packs").update({
        status: "submitted",
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", pack.id).eq("tenant_id", pack.tenant_id).eq("status", "active").select("id").maybeSingle();
      if (updated.error) return NextResponse.json({ error: "The renewal pack could not be submitted." }, { status: 502 });
      if (!updated.data) return NextResponse.json({ error: "This renewal pack has already changed." }, { status: 409 });
      return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    } catch {
      console.error("Renewal pack submission failed.");
      return NextResponse.json({ error: "The renewal pack could not be submitted." }, { status: 500 });
    }
  }
  return NextResponse.json({ error: "The renewal action is invalid." }, { status: 400 });
}
