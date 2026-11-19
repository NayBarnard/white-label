import { NextResponse } from "next/server";
import { authorizeAdminApi, writeAdminAudit } from "@/lib/admin/server";
import { isUuid } from "@/lib/admin/validation";
import { readJsonBody } from "@/lib/server/rate-limit";

export async function POST(request: Request) {
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;
  const body = await readJsonBody(request, 4096);
  if (!body.ok) return NextResponse.json({ error: "The sign-off could not be read." }, { status: 400 });
  if (typeof body.value !== "object" || body.value === null || Array.isArray(body.value)) {
    return NextResponse.json({ error: "The sign-off request is invalid." }, { status: 400 });
  }
  const record = body.value as Record<string, unknown>;
  if (record.managerUpdateId !== undefined) {
    if (Object.keys(record).some((key) => key !== "managerUpdateId" && key !== "note" && key !== "complianceApproved") ||
      typeof record.managerUpdateId !== "string" ||
      !isUuid(record.managerUpdateId) ||
      record.complianceApproved !== true) {
      return NextResponse.json({ error: "The manager update sign-off is invalid." }, { status: 400 });
    }
    const update = await access.supabase.from("manager_updates")
      .select("id,status,created_by")
      .eq("id", record.managerUpdateId)
      .maybeSingle();
    if (update.error) {
      console.error("Manager update compliance state could not be loaded.", update.error);
      return NextResponse.json({ error: "The manager update could not be loaded." }, { status: 502 });
    }
    if (!update.data) return NextResponse.json({ error: "Manager update not found." }, { status: 404 });
    if (update.data.status !== "internal_review") {
      return NextResponse.json({ error: "Only updates in internal review can receive compliance sign-off." }, { status: 409 });
    }
    if (update.data.created_by === access.user.id) {
      return NextResponse.json({ error: "The draft author cannot sign off their own update." }, { status: 403 });
    }
    const approvedAt = new Date().toISOString();
    const changed = await access.supabase.from("manager_updates").update({
      status: "approved",
      internal_review_by: access.user.id,
      internal_review_at: approvedAt,
      approved_by: access.user.id,
      approved_at: approvedAt,
    }).eq("id", record.managerUpdateId).eq("status", "internal_review").select("id,public_slug,status,approved_at").maybeSingle();
    if (changed.error) {
      console.error("Manager update compliance sign-off failed.", changed.error);
      return NextResponse.json({ error: "The manager update could not be approved." }, { status: 502 });
    }
    if (!changed.data) return NextResponse.json({ error: "The manager update changed before sign-off." }, { status: 409 });

    const detail = typeof record.note === "string" ? record.note.trim().slice(0, 2000) : null;
    const approvalAudit = await writeAdminAudit(access.supabase, access.user.id, "manager_update.approved", "manager_updates", record.managerUpdateId, {
      complianceApproved: true,
      approvedAt,
      note: detail,
    });
    const signoffAudit = approvalAudit && await writeAdminAudit(
      access.supabase,
      access.user.id,
      "compliance_register.manager_update_signoff",
      "manager_updates",
      record.managerUpdateId,
      { publicSlug: changed.data.public_slug, approvedAt },
    );
    if (!approvalAudit || !signoffAudit) {
      const rollback = await access.supabase.from("manager_updates").update({
        status: "internal_review",
        internal_review_by: null,
        internal_review_at: null,
        approved_by: null,
        approved_at: null,
      }).eq("id", record.managerUpdateId).eq("status", "approved");
      if (rollback.error) console.error("Manager update sign-off rollback failed.", rollback.error);
      return NextResponse.json({ error: "Sign-off was rolled back because its audit event could not be written." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, update: changed.data });
  }

  if (typeof record.registerType !== "string" ||
    typeof record.reviewMonth !== "string" ||
    !/^\d{4}-\d{2}-01$/.test(record.reviewMonth)) {
    return NextResponse.json({ error: "The register and review month are required." }, { status: 400 });
  }
  const note = typeof record.note === "string" ? record.note.trim().slice(0, 2000) : null;
  const inserted = await access.supabase.from("compliance_monthly_signoffs").insert({
    register_type: record.registerType,
    review_month: record.reviewMonth,
    reviewed_by: access.user.id,
    note,
  }).select("id").single();
  if (inserted.error) {
    console.error("Compliance monthly sign-off could not be saved.", inserted.error);
    return NextResponse.json({ error: "The monthly sign-off could not be saved." }, { status: 502 });
  }
  const audited = await writeAdminAudit(
    access.supabase,
    access.user.id,
    "compliance_register.monthly_signoff",
    "compliance_register",
    inserted.data.id,
    { registerType: record.registerType, reviewMonth: record.reviewMonth },
  );
  if (!audited) {
    await access.supabase.from("compliance_monthly_signoffs").delete().eq("id", inserted.data.id);
    return NextResponse.json({ error: "The sign-off could not be audited." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: inserted.data.id });
}
