import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { writeAdminAudit } from "@/lib/admin/server";
import type { PortalDatabase } from "@/lib/supabase/portal";

async function publishDueResearch(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return NextResponse.json({ error: "Scheduled publishing is not configured." }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    return NextResponse.json({ error: "Scheduled publishing is not configured." }, { status: 503 });
  }
  const supabase = createClient<PortalDatabase>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const now = new Date().toISOString();
  const { data: due, error } = await supabase
    .from("manager_updates")
    .select("id,created_by,approved_by,scheduled_at")
    .eq("status", "approved")
    .not("scheduled_at", "is", null)
    .lte("scheduled_at", now)
    .order("scheduled_at", { ascending: true })
    .limit(100);
  if (error) {
    console.error("Scheduled research items could not be loaded.", error);
    return NextResponse.json({ error: "Scheduled research could not be loaded." }, { status: 502 });
  }

  const published: string[] = [];
  for (const update of due) {
    const actorId = update.approved_by ?? update.created_by;
    if (!actorId) {
      console.error(`Scheduled research ${update.id} has no audit actor.`);
      return NextResponse.json({ error: "A scheduled research item has incomplete audit metadata." }, { status: 500 });
    }
    const { data: changed, error: publishError } = await supabase
      .from("manager_updates")
      .update({ status: "published", published_at: now })
      .eq("id", update.id)
      .eq("status", "approved")
      .lte("scheduled_at", now)
      .select("id");
    if (publishError) {
      console.error("A scheduled research item could not be published.", publishError);
      return NextResponse.json({ error: "A scheduled research item could not be published." }, { status: 502 });
    }
    if (!changed?.length) continue;
    const audited = await writeAdminAudit(supabase, actorId, "manager_update.published", "manager_updates", update.id, {
      published_at: now,
      scheduled: true,
    });
    if (!audited) {
      const rollback = await supabase.from("manager_updates").update({
        status: "approved",
        published_at: null,
      }).eq("id", update.id).eq("status", "published");
      if (rollback.error) console.error("Scheduled research publication rollback failed.", rollback.error);
      return NextResponse.json({ error: "Publication was rolled back because its audit record could not be written." }, { status: 500 });
    }
    published.push(update.id);
  }
  const { data: dueDocuments, error: documentLoadError } = await supabase
    .from("site_documents")
    .select("id,slug,version,approved_by,scheduled_at")
    .eq("status", "approved")
    .not("scheduled_at", "is", null)
    .lte("scheduled_at", now)
    .order("scheduled_at", { ascending: true })
    .limit(100);
  if (documentLoadError) {
    console.error("Scheduled documents could not be loaded.", documentLoadError);
    return NextResponse.json({ error: "Scheduled documents could not be loaded." }, { status: 502 });
  }
  const publishedDocuments: string[] = [];
  for (const document of dueDocuments) {
    const actorId = document.approved_by;
    if (!actorId) {
      console.error(`Scheduled document ${document.id} has no approval actor.`);
      return NextResponse.json({ error: "A scheduled document has incomplete audit metadata." }, { status: 500 });
    }
    const { data: changed, error: publishError } = await supabase
      .from("site_documents")
      .update({ status: "published", published_at: now })
      .eq("id", document.id)
      .eq("status", "approved")
      .lte("scheduled_at", now)
      .select("id");
    if (publishError) {
      console.error("A scheduled document could not be published.", publishError);
      return NextResponse.json({ error: "A scheduled document could not be published." }, { status: 502 });
    }
    if (!changed?.length) continue;
    const audited = await writeAdminAudit(supabase, actorId, "site_document.publish", "site_document", document.id, {
      slug: document.slug,
      version: document.version,
      publishedAt: now,
      scheduled: true,
    });
    if (!audited) {
      const rollback = await supabase.from("site_documents").update({ status: "approved", published_at: null }).eq("id", document.id).eq("status", "published");
      if (rollback.error) console.error("Scheduled document publication rollback failed.", rollback.error);
      return NextResponse.json({ error: "Document publication was rolled back because it could not be audited." }, { status: 500 });
    }
    publishedDocuments.push(document.id);
  }
  return NextResponse.json({ published: published.length, publishedDocuments: publishedDocuments.length });
}

export async function GET(request: Request) {
  return publishDueResearch(request);
}

export async function POST(request: Request) {
  return publishDueResearch(request);
}
