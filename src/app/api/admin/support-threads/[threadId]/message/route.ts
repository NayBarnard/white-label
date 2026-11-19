import { NextResponse } from "next/server";
import { authorizeAdminApi, writeAdminAudit } from "@/lib/admin/server";
import { readJsonBody } from "@/lib/server/rate-limit";
import { isUuid } from "@/lib/admin/validation";

export async function POST(
  request: Request,
  context: { params: Promise<{ threadId: string }> },
) {
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;
  const { threadId } = await context.params;
  if (!isUuid(threadId)) return NextResponse.json({ error: "The thread is invalid." }, { status: 400 });
  const body = await readJsonBody(request, 16 * 1024);
  if (!body.ok) return NextResponse.json({ error: "The message could not be read." }, { status: 400 });
  const record = body.value as Record<string, unknown>;
  const bodyText = typeof record.body === "string" ? record.body.trim() : "";
  if (bodyText.length < 1 || bodyText.length > 5000) {
    return NextResponse.json({ error: "The message is missing or too long." }, { status: 400 });
  }
  const inserted = await access.supabase.from("support_thread_messages").insert({
    thread_id: threadId,
    author_user_id: access.user.id,
    sender_role: "staff",
    body: bodyText,
    internal_note: record.internalNote === true,
  }).select("id").single();
  if (inserted.error) {
    console.error("Support message could not be saved.", inserted.error);
    return NextResponse.json({ error: "The message could not be saved." }, { status: 502 });
  }
  const audited = await writeAdminAudit(
    access.supabase,
    access.user.id,
    record.internalNote === true ? "support.note.add" : "support.reply.add",
    "support_thread",
    threadId,
    { messageId: inserted.data.id },
  );
  if (!audited) {
    await access.supabase.from("support_thread_messages").delete().eq("id", inserted.data.id);
    return NextResponse.json({ error: "The message could not be audited." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: inserted.data.id });
}
