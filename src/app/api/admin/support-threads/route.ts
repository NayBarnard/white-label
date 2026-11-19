import { NextResponse } from "next/server";
import { authorizeAdminApi, writeAdminAudit } from "@/lib/admin/server";
import { readJsonBody } from "@/lib/server/rate-limit";
import { isUuid } from "@/lib/admin/validation";

export async function GET() {
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;
  const result = await access.supabase
    .from("support_threads")
    .select("*,support_thread_messages(id,author_user_id,sender_role,body,internal_note,created_at)")
    .order("updated_at", { ascending: false })
    .limit(500);
  if (result.error) {
    console.error("Support threads could not be loaded.", result.error);
    return NextResponse.json({ error: "Support threads could not be loaded." }, { status: 502 });
  }
  return NextResponse.json({ threads: result.data });
}

export async function POST(request: Request) {
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;
  const body = await readJsonBody(request, 16 * 1024);
  if (!body.ok) return NextResponse.json({ error: "The thread request could not be read." }, { status: 400 });
  const record = body.value as Record<string, unknown>;
  if (!record || typeof record.clientUserId !== "string" || !isUuid(record.clientUserId)) {
    return NextResponse.json({ error: "The client is invalid." }, { status: 400 });
  }
  const subject = typeof record.subject === "string" ? record.subject.trim() : "";
  if (subject.length < 1 || subject.length > 160) {
    return NextResponse.json({ error: "The thread subject is required." }, { status: 400 });
  }
  const inserted = await access.supabase.from("support_threads").insert({
    client_user_id: record.clientUserId,
    subject,
  }).select("id").single();
  if (inserted.error) {
    console.error("Support thread could not be created.", inserted.error);
    return NextResponse.json({ error: "The support thread could not be created." }, { status: 502 });
  }
  const audited = await writeAdminAudit(
    access.supabase,
    access.user.id,
    "support.thread.create",
    "support_thread",
    inserted.data.id,
    { clientUserId: record.clientUserId, subject },
  );
  if (!audited) {
    await access.supabase.from("support_threads").delete().eq("id", inserted.data.id);
    return NextResponse.json({ error: "The thread could not be audited." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: inserted.data.id });
}
