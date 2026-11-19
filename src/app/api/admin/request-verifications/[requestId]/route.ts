import { NextResponse } from "next/server";
import { authorizeAdminApi, writeAdminAudit } from "@/lib/admin/server";
import { readJsonBody } from "@/lib/server/rate-limit";
import { isUuid } from "@/lib/admin/validation";

export async function POST(
  request: Request,
  context: { params: Promise<{ requestId: string }> },
) {
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;
  const { requestId } = await context.params;
  if (!isUuid(requestId)) return NextResponse.json({ error: "The request is invalid." }, { status: 400 });
  const body = await readJsonBody(request, 4096);
  if (!body.ok) return NextResponse.json({ error: "The verification record could not be read." }, { status: 400 });
  const record = body.value as Record<string, unknown>;
  if (record.method !== "phone" ||
    typeof record.verifiedAt !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T/.test(record.verifiedAt)) {
    return NextResponse.json({ error: "Phone verification details are required." }, { status: 400 });
  }
  const note = typeof record.note === "string" ? record.note.trim().slice(0, 2000) : null;
  const inserted = await access.supabase.from("personal_detail_verifications").insert({
    request_id: requestId,
    verified_by: access.user.id,
    verification_method: "phone",
    verified_at: record.verifiedAt,
    note,
  }).select("id").single();
  if (inserted.error) {
    console.error("Personal-detail verification could not be saved.", inserted.error);
    return NextResponse.json({ error: "The verification record could not be saved." }, { status: 502 });
  }
  const audited = await writeAdminAudit(
    access.supabase,
    access.user.id,
    "request.phone_verification",
    "client_request",
    requestId,
    { verificationId: inserted.data.id, method: "phone", verifiedAt: record.verifiedAt },
  );
  if (!audited) {
    await access.supabase.from("personal_detail_verifications").delete().eq("id", inserted.data.id);
    return NextResponse.json({ error: "The verification could not be audited." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: inserted.data.id });
}
