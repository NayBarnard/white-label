import { NextResponse } from "next/server";
import { authorizeAdminApi, writeAdminAudit } from "@/lib/admin/server";
import { readJsonBody } from "@/lib/server/rate-limit";

export async function GET() {
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;
  const result = await access.supabase
    .from("canned_replies")
    .select("*")
    .order("title")
    .limit(500);
  if (result.error) {
    console.error("Canned replies could not be loaded.", result.error);
    return NextResponse.json({ error: "Canned replies could not be loaded." }, { status: 502 });
  }
  return NextResponse.json({ replies: result.data });
}

export async function POST(request: Request) {
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;
  const body = await readJsonBody(request, 16 * 1024);
  if (!body.ok) return NextResponse.json({ error: "The reply could not be read." }, { status: 400 });
  const record = body.value as Record<string, unknown>;
  const title = typeof record.title === "string" ? record.title.trim() : "";
  const replyBody = typeof record.body === "string" ? record.body.trim() : "";
  if (title.length < 1 || title.length > 160 || replyBody.length < 1 || replyBody.length > 5000) {
    return NextResponse.json({ error: "The reply title or body is invalid." }, { status: 400 });
  }
  const inserted = await access.supabase.from("canned_replies").insert({
    title,
    body: replyBody,
    created_by: access.user.id,
  }).select("id").single();
  if (inserted.error) {
    console.error("Canned reply could not be saved.", inserted.error);
    return NextResponse.json({ error: "The canned reply could not be saved." }, { status: 502 });
  }
  const audited = await writeAdminAudit(
    access.supabase,
    access.user.id,
    "support.canned_reply.create",
    "canned_reply",
    inserted.data.id,
    { title },
  );
  if (!audited) {
    await access.supabase.from("canned_replies").delete().eq("id", inserted.data.id);
    return NextResponse.json({ error: "The reply could not be audited." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: inserted.data.id });
}
