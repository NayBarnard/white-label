import { NextResponse } from "next/server";
import { authorizeAdminApi, writeAdminAudit } from "@/lib/admin/server";
import { readJsonBody } from "@/lib/server/rate-limit";

export async function POST(request: Request) {
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;
  const body = await readJsonBody(request, 32 * 1024);
  if (!body.ok) return NextResponse.json({ error: "The announcement could not be read." }, { status: 400 });
  const record = body.value as Record<string, unknown>;
  const title = typeof record.title === "string" ? record.title.trim() : "";
  const announcementBody = typeof record.body === "string" ? record.body.trim() : "";
  if (title.length < 1 || title.length > 160 || announcementBody.length < 1 || announcementBody.length > 10000) {
    return NextResponse.json({ error: "The announcement title or body is invalid." }, { status: 400 });
  }
  if (record.complianceApproved !== true) {
    return NextResponse.json({ error: "Compliance approval is required." }, { status: 400 });
  }
  const inserted = await access.supabase.from("staff_announcements").insert({
    title,
    body: announcementBody,
    status: "approved",
    approved_by: access.user.id,
    approved_at: new Date().toISOString(),
    created_by: access.user.id,
  }).select("id").single();
  if (inserted.error) {
    console.error("Announcement draft could not be saved.", inserted.error);
    return NextResponse.json({ error: "The announcement could not be saved." }, { status: 502 });
  }
  const audited = await writeAdminAudit(
    access.supabase,
    access.user.id,
    "announcement.approve",
    "announcement",
    inserted.data.id,
    { title, complianceApproved: true },
  );
  if (!audited) {
    await access.supabase.from("staff_announcements").delete().eq("id", inserted.data.id);
    return NextResponse.json({ error: "The announcement could not be audited." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: inserted.data.id });
}
