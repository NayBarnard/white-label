import { NextResponse } from "next/server";
import { authorizeAdminApi, writeAdminAudit } from "@/lib/admin/server";
import { isIsinChecksumValid, isIsinFormatValid, normalizeIsin, normalizeJseCode } from "@/lib/platforms";
import { readJsonBody } from "@/lib/server/rate-limit";

const MAX_JSON_BYTES = 64 * 1024;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const statusValues = ["verified_available", "verified_unavailable", "not_verified"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const result = value.trim();
  return result.length > 0 && result.length <= maxLength ? result : null;
}

function validSourceUrl(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 2048) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function optionalText(value: unknown, maxLength: number) {
  if (value === undefined || value === null || value === "") return null;
  return text(value, maxLength) ?? undefined;
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function databaseError(message: string) {
  return NextResponse.json({ error: message }, { status: 502 });
}

export async function GET() {
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;
  try {
    const [platforms, shareClasses, availability, history] = await Promise.all([
      access.supabase.from("platforms").select("*").order("name").limit(1000),
      access.supabase.from("fund_share_classes").select("*").order("fund_name").limit(5000),
      access.supabase.from("platform_availability").select("*").order("updated_at", { ascending: false }).limit(10000),
      access.supabase.from("platform_availability_history").select("*").order("changed_at", { ascending: false }).limit(10000),
    ]);
    const failure = platforms.error ?? shareClasses.error ?? availability.error ?? history.error;
    if (failure || !platforms.data || !shareClasses.data || !availability.data || !history.data) {
      console.error("Platform administration data could not be loaded.", failure);
      return databaseError("Platform availability data could not be loaded.");
    }
    return NextResponse.json({
      platforms: platforms.data.map((item) => ({
        id: item.id, name: item.name, isActive: item.is_active,
        createdAt: item.created_at, updatedAt: item.updated_at,
      })),
      shareClasses: shareClasses.data.map((item) => ({
        id: item.id, fundName: item.fund_name, shareClass: item.share_class,
        jseCode: item.jse_code, isin: item.isin, isActive: item.is_active,
        createdAt: item.created_at, updatedAt: item.updated_at,
      })),
      availability: availability.data.map((item) => ({
        id: item.id, shareClassId: item.share_class_id, platformId: item.platform_id,
        status: item.status, platformFundCode: item.platform_fund_code, source: item.source,
        sourceUrl: item.source_url, verifiedBy: item.verified_by, verifiedOn: item.verified_on,
        createdAt: item.created_at, updatedAt: item.updated_at,
      })),
      history: history.data.map((item) => ({
        id: item.id, availabilityId: item.availability_id, action: item.action,
        oldValues: item.old_values, newValues: item.new_values, changedAt: item.changed_at,
      })),
    });
  } catch (error) {
    console.error("Platform administration data could not be loaded.", error);
    return databaseError("Platform availability data could not be loaded.");
  }
}

export async function POST(request: Request) {
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;
  const parsedBody = await readJsonBody(request, MAX_JSON_BYTES);
  if (!parsedBody.ok || !isRecord(parsedBody.value)) {
    const tooLarge = parsedBody.ok === false && parsedBody.reason === "too_large";
    return NextResponse.json(
      { error: tooLarge ? "The platform request is too large." : "The request must be valid JSON." },
      { status: tooLarge ? 413 : 400 },
    );
  }
  const input = parsedBody.value;
  const action = input.action;

  if (action === "create_platform") {
    const name = text(input.name, 120);
    if (!name) return NextResponse.json({ error: "Enter a platform name." }, { status: 400 });
    const { data, error } = await access.supabase.from("platforms")
      .insert({ name }).select("id,name,is_active").single();
    if (error) {
      console.error("Platform creation failed.", error);
      return NextResponse.json({ error: error.code === "23505" ? "That platform already exists." : "The platform could not be saved." }, { status: error.code === "23505" ? 409 : 502 });
    }
    const audited = await writeAdminAudit(access.supabase, access.user.id, "platform.created", "platforms", data.id, { name });
    if (!audited) {
      const rollback = await access.supabase.from("platforms").delete().eq("id", data.id);
      if (rollback.error) console.error("Platform creation rollback failed.", rollback.error);
      return NextResponse.json({ error: "The platform was rolled back because its audit record could not be written." }, { status: 500 });
    }
    return NextResponse.json({ platform: { id: data.id, name: data.name, isActive: data.is_active } }, { status: 201 });
  }

  if (action === "create_share_class") {
    const fundName = text(input.fundName, 160);
    const shareClass = text(input.shareClass, 120);
    const jseCode = optionalText(input.jseCode, 32);
    const isin = input.isin === undefined || input.isin === null || input.isin === ""
      ? null : typeof input.isin === "string" ? normalizeIsin(input.isin) : undefined;
    if (!fundName || !shareClass || jseCode === undefined) {
      return NextResponse.json({ error: "Provide a fund name, share class, and valid optional JSE code or ISIN." }, { status: 400 });
    }
    if (isin === undefined || (isin !== null && !isIsinFormatValid(isin))) {
      return NextResponse.json({ error: "Provide a valid optional JSE code or ISIN." }, { status: 400 });
    }
    if (isin && !isIsinChecksumValid(isin) && input.confirmIsinChecksum !== true) {
      return NextResponse.json({ error: "This ISIN has an invalid check digit. Confirm the source document before saving it." }, { status: 400 });
    }
    const values = { fund_name: fundName, share_class: shareClass, jse_code: jseCode ? normalizeJseCode(jseCode) : null, isin };
    const { data, error } = await access.supabase.from("fund_share_classes")
      .insert(values).select("id,fund_name,share_class,jse_code,isin,is_active").single();
    if (error) {
      console.error("Share class creation failed.", error);
      return NextResponse.json({ error: error.code === "23505" ? "That fund share class already exists." : "The share class could not be saved." }, { status: error.code === "23505" ? 409 : 502 });
    }
    const audited = await writeAdminAudit(access.supabase, access.user.id, "platform_share_class.created", "fund_share_classes", data.id, { fund_name: fundName, share_class: shareClass });
    if (!audited) {
      const rollback = await access.supabase.from("fund_share_classes").delete().eq("id", data.id);
      if (rollback.error) console.error("Share class creation rollback failed.", rollback.error);
      return NextResponse.json({ error: "The share class was rolled back because its audit record could not be written." }, { status: 500 });
    }
    return NextResponse.json({ shareClass: data }, { status: 201 });
  }

  if (action === "save_availability") {
    const shareClassId = typeof input.shareClassId === "string" && uuidPattern.test(input.shareClassId) ? input.shareClassId : null;
    const platformId = typeof input.platformId === "string" && uuidPattern.test(input.platformId) ? input.platformId : null;
    const status = statusValues.find((value) => value === input.status);
    if (!shareClassId || !platformId || !status) {
      return NextResponse.json({ error: "Select a valid share class, platform, and status." }, { status: 400 });
    }
    const platformFundCode = input.platformFundCode === "" || input.platformFundCode === null
      ? null : text(input.platformFundCode, 80);
    if (input.platformFundCode && !platformFundCode) return NextResponse.json({ error: "The platform fund code is too long." }, { status: 400 });
    let source: string | null = null;
    let verifiedBy: string | null = null;
    let verifiedOn: string | null = null;
    let sourceUrl: string | null = null;
    if (status !== "not_verified") {
      source = text(input.source, 500);
      verifiedBy = text(input.verifiedBy, 120);
      verifiedOn = isIsoDate(input.verifiedOn) ? input.verifiedOn : null;
      const parsedSourceUrl = validSourceUrl(input.sourceUrl);
      if (!source || !verifiedBy || !verifiedOn || parsedSourceUrl === undefined) {
        return NextResponse.json({ error: "Verified statuses require a source, verified-by name, and verified-on date; source links must use HTTP or HTTPS." }, { status: 400 });
      }
      sourceUrl = parsedSourceUrl;
    }
    const values = {
      share_class_id: shareClassId,
      platform_id: platformId,
      status,
      platform_fund_code: platformFundCode,
      source,
      source_url: sourceUrl,
      verified_by: verifiedBy,
      verified_on: verifiedOn,
      updated_at: new Date().toISOString(),
    };
    const { data: previous, error: previousError } = await access.supabase.from("platform_availability")
      .select("*").eq("share_class_id", shareClassId).eq("platform_id", platformId).maybeSingle();
    if (previousError) {
      console.error("Platform availability lookup failed.", previousError);
      return databaseError("The platform availability entry could not be loaded.");
    }
    const mutation = previous
      ? await access.supabase.from("platform_availability").update(values).eq("id", previous.id).select("id").single()
      : await access.supabase.from("platform_availability").insert(values).select("id").single();
    if (mutation.error) {
      console.error("Platform availability save failed.", mutation.error);
      return databaseError("The platform availability entry could not be saved.");
    }
    const auditOk = await writeAdminAudit(access.supabase, access.user.id, previous ? "platform_availability.updated" : "platform_availability.created", "platform_availability", mutation.data.id, {
      share_class_id: shareClassId, platform_id: platformId, status,
    });
    if (!auditOk) {
      const rollback = previous
        ? await access.supabase.from("platform_availability").update({
            status: previous.status,
            platform_fund_code: previous.platform_fund_code,
            source: previous.source,
            source_url: previous.source_url,
            verified_by: previous.verified_by,
            verified_on: previous.verified_on,
            updated_at: previous.updated_at,
          }).eq("id", previous.id)
        : await access.supabase.from("platform_availability").delete().eq("id", mutation.data.id);
      if (rollback.error) console.error("Platform availability rollback failed.", rollback.error);
      return NextResponse.json({ error: rollback.error
        ? "The availability change could not be audited or reverted. Contact support."
        : "The availability change was reverted because its audit record could not be written." }, { status: 500 });
    }
    return NextResponse.json({ id: mutation.data.id });
  }

  return NextResponse.json({ error: "Choose a supported platform administration action." }, { status: 400 });
}

export async function PATCH(request: Request) {
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;
  const parsedBody = await readJsonBody(request, 16 * 1024);
  if (!parsedBody.ok || !isRecord(parsedBody.value)) {
    const tooLarge = parsedBody.ok === false && parsedBody.reason === "too_large";
    return NextResponse.json({ error: "The update request must be valid JSON." }, { status: tooLarge ? 413 : 400 });
  }
  const input = parsedBody.value;
  const id = typeof input.id === "string" && uuidPattern.test(input.id) ? input.id : null;
  if (!id) return NextResponse.json({ error: "The selected record was not found." }, { status: 404 });

  if (input.action === "update_platform") {
    const name = text(input.name, 120);
    if (!name || typeof input.isActive !== "boolean") {
      return NextResponse.json({ error: "Enter a valid platform name and active state." }, { status: 400 });
    }
    const { data: previous, error: lookupError } = await access.supabase.from("platforms").select("*").eq("id", id).maybeSingle();
    if (lookupError || !previous) return NextResponse.json({ error: "The platform was not found." }, { status: lookupError ? 502 : 404 });
    const { error } = await access.supabase.from("platforms").update({ name, is_active: input.isActive, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) {
      console.error("Platform update failed.", error);
      return NextResponse.json({ error: error.code === "23505" ? "That platform name already exists." : "The platform could not be updated." }, { status: error.code === "23505" ? 409 : 502 });
    }
    const audited = await writeAdminAudit(access.supabase, access.user.id, input.isActive ? "platform.updated" : "platform.deactivated", "platforms", id, { previous_name: previous.name, name });
    if (!audited) {
      const rollback = await access.supabase.from("platforms").update({ name: previous.name, is_active: previous.is_active, updated_at: previous.updated_at }).eq("id", id);
      if (rollback.error) console.error("Platform update rollback failed.", rollback.error);
      return NextResponse.json({ error: "The platform change was reverted because its audit record could not be written." }, { status: 500 });
    }
    return NextResponse.json({ id });
  }

  if (input.action === "update_share_class") {
    const fundName = text(input.fundName, 160);
    const shareClass = text(input.shareClass, 120);
    const jseCode = optionalText(input.jseCode, 32);
    const isin = input.isin === undefined || input.isin === null || input.isin === ""
      ? null : typeof input.isin === "string" ? normalizeIsin(input.isin) : undefined;
    if (!fundName || !shareClass || jseCode === undefined || typeof input.isActive !== "boolean") {
      return NextResponse.json({ error: "Provide valid fund and share-class details." }, { status: 400 });
    }
    if (isin === undefined || (isin !== null && !isIsinFormatValid(isin))) {
      return NextResponse.json({ error: "Provide valid fund and share-class details." }, { status: 400 });
    }
    if (isin && !isIsinChecksumValid(isin) && input.confirmIsinChecksum !== true) {
      return NextResponse.json({ error: "This ISIN has an invalid check digit. Confirm the source document before saving it." }, { status: 400 });
    }
    const { data: previous, error: lookupError } = await access.supabase.from("fund_share_classes").select("*").eq("id", id).maybeSingle();
    if (lookupError || !previous) return NextResponse.json({ error: "The share class was not found." }, { status: lookupError ? 502 : 404 });
    const values = {
      fund_name: fundName, share_class: shareClass,
      jse_code: jseCode ? normalizeJseCode(jseCode) : null,
      isin, is_active: input.isActive, updated_at: new Date().toISOString(),
    };
    const { error } = await access.supabase.from("fund_share_classes").update(values).eq("id", id);
    if (error) {
      console.error("Share class update failed.", error);
      return NextResponse.json({ error: error.code === "23505" ? "That fund share class already exists." : "The share class could not be updated." }, { status: error.code === "23505" ? 409 : 502 });
    }
    const audited = await writeAdminAudit(access.supabase, access.user.id, input.isActive ? "platform_share_class.updated" : "platform_share_class.deactivated", "fund_share_classes", id, { fund_name: fundName, share_class: shareClass });
    if (!audited) {
      const rollback = await access.supabase.from("fund_share_classes").update({
        fund_name: previous.fund_name, share_class: previous.share_class,
        jse_code: previous.jse_code, isin: previous.isin, is_active: previous.is_active,
        updated_at: previous.updated_at,
      }).eq("id", id);
      if (rollback.error) console.error("Share class update rollback failed.", rollback.error);
      return NextResponse.json({ error: "The share class change was reverted because its audit record could not be written." }, { status: 500 });
    }
    return NextResponse.json({ id });
  }

  return NextResponse.json({ error: "Choose a supported platform update action." }, { status: 400 });
}
