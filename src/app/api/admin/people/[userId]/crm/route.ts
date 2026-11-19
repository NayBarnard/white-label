import { NextResponse } from "next/server";
import { authorizeAdminApi, writeAdminAudit } from "@/lib/admin/server";
import { readJsonBody } from "@/lib/server/rate-limit";
import { parseUuid } from "@/lib/people/validation";

function isoDate(value: unknown): string | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? undefined : value;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;
  const { userId } = await context.params;
  if (!parseUuid(userId)) return NextResponse.json({ error: "The client is invalid." }, { status: 400 });

  const [notes, tasks] = await Promise.all([
    access.supabase.from("client_crm_notes").select("*").eq("client_user_id", userId).order("created_at", { ascending: false }).limit(500),
    access.supabase.from("client_crm_tasks").select("*").eq("client_user_id", userId).order("updated_at", { ascending: false }).limit(500),
  ]);
  if (notes.error || tasks.error) {
    console.error("CRM records could not be loaded.", notes.error ?? tasks.error);
    return NextResponse.json({ error: "CRM records could not be loaded." }, { status: 502 });
  }
  return NextResponse.json({ notes: notes.data, tasks: tasks.data });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;
  const { userId } = await context.params;
  if (!parseUuid(userId)) return NextResponse.json({ error: "The client is invalid." }, { status: 400 });

  const body = await readJsonBody(request, 16 * 1024);
  if (!body.ok) return NextResponse.json({ error: "The CRM record could not be read." }, { status: 400 });
  const record = body.value as Record<string, unknown>;
  if (!record || typeof record !== "object") {
    return NextResponse.json({ error: "The CRM record could not be read." }, { status: 400 });
  }

  if (record.kind === "note") {
    if (typeof record.note !== "string" || record.note.trim().length < 1 || record.note.trim().length > 5000) {
      return NextResponse.json({ error: "The note is missing or too long." }, { status: 400 });
    }
    const result = await access.supabase.from("client_crm_notes").insert({
      client_user_id: userId,
      author_user_id: access.user.id,
      note: record.note.trim(),
    }).select("id").single();
    if (result.error) {
      return NextResponse.json({ error: "The note could not be saved." }, { status: 502 });
    }
    const audited = await writeAdminAudit(
      access.supabase, access.user.id, "crm.note.create", "client", userId,
      { noteId: result.data.id },
    );
    if (!audited) {
      await access.supabase.from("client_crm_notes").delete().eq("id", result.data.id);
      return NextResponse.json({ error: "The change could not be audited." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, id: result.data.id });
  }

  if (record.kind === "task") {
    const title = typeof record.title === "string" ? record.title.trim() : "";
    if (title.length < 1 || title.length > 160) {
      return NextResponse.json({ error: "The task title is missing or too long." }, { status: 400 });
    }
    const followUp = isoDate(record.followUpOn);
    const review = isoDate(record.reviewOn);
    if (followUp === undefined || review === undefined) {
      return NextResponse.json({ error: "The follow-up or review date is invalid." }, { status: 400 });
    }
    const tags = Array.isArray(record.tags)
      ? record.tags.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean).slice(0, 20)
      : [];
    const result = await access.supabase.from("client_crm_tasks").insert({
      client_user_id: userId,
      owner_user_id: typeof record.ownerUserId === "string" ? record.ownerUserId : access.user.id,
      title,
      details: typeof record.details === "string" && record.details.trim() ? record.details.trim().slice(0, 5000) : null,
      follow_up_on: followUp,
      review_on: review,
      status: "open",
      tags,
      complaints_flag: record.complaintsFlag === true,
    }).select("id").single();
    if (result.error) {
      console.error("CRM task could not be saved.", result.error);
      return NextResponse.json({ error: "The task could not be saved." }, { status: 502 });
    }
    const audited = await writeAdminAudit(
      access.supabase, access.user.id, "crm.task.create", "client", userId,
      { taskId: result.data.id, title },
    );
    if (!audited) {
      await access.supabase.from("client_crm_tasks").delete().eq("id", result.data.id);
      return NextResponse.json({ error: "The change could not be audited." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, id: result.data.id });
  }

  return NextResponse.json({ error: "The CRM record type is invalid." }, { status: 400 });
}
