import type { User } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { authorizeAdviserApi } from "@/lib/adviser/server";
import { isUuid } from "@/lib/admin/validation";
import type { PortalDatabase } from "@/lib/supabase/portal";
import { writeAdminAudit } from "@/lib/admin/server";
import { readJsonBody } from "@/lib/server/rate-limit";

export async function GET(
  _request: Request,
  context: { params: Promise<{ clientId: string }> },
) {
  const access = await authorizeAdviserApi();
  if (!access.ok) return access.response;
  const { clientId } = await context.params;
  if (!isUuid(clientId)) {
    return NextResponse.json({ error: "The client reference is invalid." }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    return NextResponse.json({ error: "The client profile is not configured." }, { status: 503 });
  }
  try {
    const supabase = createClient<PortalDatabase>(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    const relationship = await supabase
      .from("adviser_client_relationships")
      .select("id,status")
      .eq("adviser_user_id", access.user.id)
      .eq("client_user_id", clientId)
      .eq("status", "active")
      .maybeSingle();
    if (relationship.error) {
      console.error("Adviser/client relationship could not be checked.", relationship.error);
      return NextResponse.json({ error: "The client relationship could not be verified." }, { status: 502 });
    }
    if (!relationship.data) {
      return NextResponse.json({ error: "You do not have access to this client." }, { status: 403 });
    }

    const [target, portfolios, transactions, documents, requests, notes, tasks] = await Promise.all([
      supabase.auth.admin.getUserById(clientId),
      supabase.from("client_portfolios").select("*").eq("user_id", clientId).order("created_at", { ascending: false }),
      supabase.from("client_transactions").select("*").eq("user_id", clientId).order("transacted_at", { ascending: false }).limit(100),
      supabase.from("client_documents").select("*").eq("user_id", clientId).order("issued_at", { ascending: false }).limit(100),
      supabase.from("client_portal_requests").select("*").eq("user_id", clientId).order("created_at", { ascending: false }).limit(100),
      supabase.from("client_crm_notes").select("*").eq("client_user_id", clientId).order("created_at", { ascending: false }).limit(500),
      supabase.from("client_crm_tasks").select("*").eq("client_user_id", clientId).order("updated_at", { ascending: false }).limit(500),
    ]);
    if (target.error || !target.data.user) {
      return NextResponse.json({ error: "The client could not be found." }, { status: 404 });
    }
    const dataError = [portfolios.error, transactions.error, documents.error, requests.error, notes.error, tasks.error]
      .find((error) => error);
    if (dataError) {
      console.error("Adviser client profile data could not be loaded.", dataError);
      return NextResponse.json({ error: "Some client profile records could not be loaded." }, { status: 502 });
    }
    const user = target.data.user as User;
    return NextResponse.json({
      client: {
        id: user.id,
        email: user.email ?? "",
        name: typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : "",
        isActive: !user.banned_until || new Date(user.banned_until).getTime() <= Date.now(),
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at ?? null,
      },
      portfolios: portfolios.data ?? [],
      transactions: transactions.data ?? [],
      documents: documents.data ?? [],
      requests: requests.data ?? [],
      notes: notes.data ?? [],
      tasks: tasks.data ?? [],
    });
  } catch (error) {
    console.error("Adviser client profile could not be loaded.", error);
    return NextResponse.json({ error: "The client profile could not be loaded." }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ clientId: string }> },
) {
  const access = await authorizeAdviserApi();
  if (!access.ok) return access.response;
  const { clientId } = await context.params;
  if (!isUuid(clientId)) {
    return NextResponse.json({ error: "The client reference is invalid." }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    return NextResponse.json({ error: "The client workflow is not configured." }, { status: 503 });
  }
  const body = await readJsonBody(request, 16 * 1024);
  if (!body.ok) return NextResponse.json({ error: "The action could not be read." }, { status: 400 });
  const record = body.value as Record<string, unknown>;
  if (!record || (record.kind !== "note" && record.kind !== "task")) {
    return NextResponse.json({ error: "The action type is invalid." }, { status: 400 });
  }

  try {
    const supabase = createClient<PortalDatabase>(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    const relationship = await supabase
      .from("adviser_client_relationships")
      .select("id")
      .eq("adviser_user_id", access.user.id)
      .eq("client_user_id", clientId)
      .eq("status", "active")
      .maybeSingle();
    if (relationship.error) {
      console.error("Adviser/client relationship could not be checked.", relationship.error);
      return NextResponse.json({ error: "The client relationship could not be verified." }, { status: 502 });
    }
    if (!relationship.data) {
      return NextResponse.json({ error: "You do not have access to this client." }, { status: 403 });
    }

    if (record.kind === "note") {
      const note = typeof record.note === "string" ? record.note.trim() : "";
      if (note.length < 1 || note.length > 5000) {
        return NextResponse.json({ error: "The private note is missing or too long." }, { status: 400 });
      }
      const inserted = await supabase.from("client_crm_notes").insert({
        client_user_id: clientId,
        author_user_id: access.user.id,
        note,
      }).select("id").single();
      if (inserted.error) {
        console.error("Adviser private note could not be saved.", inserted.error);
        return NextResponse.json({ error: "The private note could not be saved." }, { status: 502 });
      }
      const audited = await writeAdminAudit(
        supabase,
        access.user.id,
        "crm.note.create",
        "client",
        clientId,
        { noteId: inserted.data.id },
      );
      if (!audited) {
        await supabase.from("client_crm_notes").delete().eq("id", inserted.data.id);
        return NextResponse.json({ error: "The private note could not be audited." }, { status: 500 });
      }
      return NextResponse.json({ ok: true, id: inserted.data.id });
    }

    const title = typeof record.title === "string" ? record.title.trim() : "";
    if (title.length < 1 || title.length > 160) {
      return NextResponse.json({ error: "The task title is missing or too long." }, { status: 400 });
    }
    const inserted = await supabase.from("client_crm_tasks").insert({
      client_user_id: clientId,
      owner_user_id: access.user.id,
      title,
      status: "open",
      tags: [],
      complaints_flag: false,
    }).select("id").single();
    if (inserted.error) {
      console.error("Adviser follow-up task could not be saved.", inserted.error);
      return NextResponse.json({ error: "The follow-up task could not be saved." }, { status: 502 });
    }
    const audited = await writeAdminAudit(
      supabase,
      access.user.id,
      "crm.task.create",
      "client",
      clientId,
      { taskId: inserted.data.id, title },
    );
    if (!audited) {
      await supabase.from("client_crm_tasks").delete().eq("id", inserted.data.id);
      return NextResponse.json({ error: "The follow-up task could not be audited." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, id: inserted.data.id });
  } catch (error) {
    console.error("Adviser client workflow action failed.", error);
    return NextResponse.json({ error: "The client workflow action could not be completed." }, { status: 500 });
  }
}
