import { NextResponse } from "next/server";
import { authorizeAdminApi, writeAdminAudit } from "@/lib/admin/server";
import { readJsonBody } from "@/lib/server/rate-limit";
import type { Json } from "@/lib/supabase/portal";

const registerTypes = [
  "complaints",
  "conflicts",
  "gifts_entertainment",
  "fit_proper",
  "compliance_calendar",
  "policy_document",
  "incident_breach",
] as const;

export async function GET(request: Request) {
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;
  const registerType = new URL(request.url).searchParams.get("type");
  let query = access.supabase
    .from("compliance_register_entries")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(5000);
  if (registerType) query = query.eq("register_type", registerType);
  const result = await query;
  if (result.error) {
    console.error("Compliance register could not be loaded.", result.error);
    return NextResponse.json({ error: "The compliance register could not be loaded." }, { status: 502 });
  }
  return NextResponse.json({ entries: result.data });
}

export async function POST(request: Request) {
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;
  const body = await readJsonBody(request, 32 * 1024);
  if (!body.ok) return NextResponse.json({ error: "The register entry could not be read." }, { status: 400 });
  const record = body.value as Record<string, unknown>;
  const registerType = record.registerType;
  const title = typeof record.title === "string" ? record.title.trim() : "";
  if (typeof registerType !== "string" ||
    !registerTypes.includes(registerType as (typeof registerTypes)[number]) ||
    title.length < 1 || title.length > 160 ||
    !record.details || typeof record.details !== "object" || Array.isArray(record.details)) {
    return NextResponse.json({ error: "The register entry is invalid." }, { status: 400 });
  }
  const objectPath = typeof record.objectPath === "string" ? record.objectPath.trim() : null;
  if (objectPath && !/^compliance-private\/[a-z0-9._/-]+$/i.test(objectPath)) {
    return NextResponse.json({ error: "The attachment path is invalid." }, { status: 400 });
  }
  const inserted = await access.supabase.from("compliance_register_entries").insert({
    register_type: registerType,
    title,
    details: record.details as Json,
    object_path: objectPath,
    created_by: access.user.id,
  }).select("id").single();
  if (inserted.error) {
    console.error("Compliance register entry could not be saved.", inserted.error);
    return NextResponse.json({ error: "The register entry could not be saved." }, { status: 502 });
  }
  const audited = await writeAdminAudit(
    access.supabase,
    access.user.id,
    "compliance_register.entry.create",
    "compliance_register",
    inserted.data.id,
    { registerType, title },
  );
  if (!audited) {
    await access.supabase.from("compliance_register_entries").delete().eq("id", inserted.data.id);
    return NextResponse.json({ error: "The register entry could not be audited." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: inserted.data.id });
}
