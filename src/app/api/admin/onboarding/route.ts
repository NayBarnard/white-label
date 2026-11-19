import { NextResponse } from "next/server";
import { authorizeAdminApi, writeAdminAudit } from "@/lib/admin/server";
import { readJsonBody } from "@/lib/server/rate-limit";
import { isUuid } from "@/lib/admin/validation";

const statuses = ["requested", "received", "under_review", "approved", "rejected"] as const;

export async function GET() {
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;
  const result = await access.supabase
    .from("onboarding_checklists")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(5000);
  if (result.error) {
    console.error("Onboarding review queue could not be loaded.", result.error);
    return NextResponse.json({ error: "The review queue could not be loaded." }, { status: 502 });
  }
  return NextResponse.json({ items: result.data });
}

export async function PATCH(request: Request) {
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;
  const body = await readJsonBody(request, 8192);
  if (!body.ok) return NextResponse.json({ error: "The review could not be read." }, { status: 400 });
  const record = body.value as Record<string, unknown>;
  if (!record || !isUuid(String(record.id ?? ""))) {
    return NextResponse.json({ error: "The onboarding review is invalid." }, { status: 400 });
  }
  const statusValue = record.status;
  if (typeof statusValue !== "string" ||
    !statuses.includes(statusValue as (typeof statuses)[number])) {
    return NextResponse.json({ error: "The onboarding review is invalid." }, { status: 400 });
  }
  const status = statusValue as (typeof statuses)[number];
  if (status === "rejected" &&
    (typeof record.rejectionReason !== "string" ||
      record.rejectionReason.trim().length < 1 ||
      record.rejectionReason.trim().length > 2000)) {
    return NextResponse.json({ error: "A rejection reason is required." }, { status: 400 });
  }
  const changed = await access.supabase.from("onboarding_checklists").update({
    status,
    rejection_reason: status === "rejected" ? String(record.rejectionReason).trim() : null,
    reviewer_user_id: access.user.id,
    reviewer_at: new Date().toISOString(),
  }).eq("id", String(record.id)).select("id").maybeSingle();
  if (changed.error) {
    console.error("Onboarding review could not be saved.", changed.error);
    return NextResponse.json({ error: "The review could not be saved." }, { status: 502 });
  }
  const rejectionReason =
    status === "rejected" && typeof record.rejectionReason === "string"
      ? record.rejectionReason.trim()
      : null;
  const audited = await writeAdminAudit(
    access.supabase,
    access.user.id,
    "onboarding.review",
    "onboarding",
    String(record.id),
    { status, rejectionReason },
  );
  if (!audited) {
    await access.supabase.from("onboarding_checklists").update({
      status: "under_review",
      rejection_reason: null,
      reviewer_user_id: null,
      reviewer_at: null,
    }).eq("id", String(record.id));
    return NextResponse.json({ error: "The review could not be audited." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
