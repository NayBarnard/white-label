import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { authorizeAdminApi, writeAdminAudit } from "@/lib/admin/server";
import { disabledFeatureResponse } from "@/lib/features/route-guard";
import { parseManagerUpdateInput } from "@/lib/manager-updates/validation";
import { readJsonBody } from "@/lib/server/rate-limit";

const MAX_JSON_BYTES = 16 * 1024;

export async function GET() {
  const disabled = disabledFeatureResponse("managerUpdates");
  if (disabled) return disabled;
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;

  try {
    const { data, error } = await access.supabase
      .from("manager_updates")
      .select("id,public_slug,title,body,kind,media_path,category,author_name,author_designation,author_bio,executive_summary,key_takeaways,placeholder_perspective,related_slugs,strategy,featured,scheduled_at,pdf_object_path,created_by,internal_review_by,internal_review_at,status,approved_by,approved_at,published_at,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      console.error("Manager update list failed.", error);
      return NextResponse.json({ error: "Manager updates could not be loaded." }, { status: 502 });
    }
    return NextResponse.json({ updates: data });
  } catch (error) {
    console.error("Manager update list failed.", error);
    return NextResponse.json({ error: "Manager updates could not be loaded." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const disabled = disabledFeatureResponse("managerUpdates");
  if (disabled) return disabled;
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;

  const parsedBody = await readJsonBody(request, MAX_JSON_BYTES);
  if (!parsedBody.ok) {
    return NextResponse.json(
      { error: parsedBody.reason === "too_large" ? "The update is too large." : "The update request must be valid JSON." },
      { status: parsedBody.reason === "too_large" ? 413 : 400 },
    );
  }
  const input = parsedBody.value;
  const parsed = parseManagerUpdateInput(input);
  if (!parsed) {
    return NextResponse.json(
      { error: "Provide a title, update text, type, and valid media file when required." },
      { status: 400 },
    );
  }

  try {
    const { data, error } = await access.supabase
      .from("manager_updates")
      .insert({
        public_slug: `manager-update-${randomUUID()}`,
        title: parsed.title,
        body: parsed.body,
        kind: parsed.kind,
        media_path: parsed.mediaPath,
        category: parsed.category ?? "Fund Updates",
        author_name: parsed.authorName ?? null,
        author_designation: parsed.authorDesignation ?? null,
        author_bio: parsed.authorBio ?? null,
        executive_summary: parsed.executiveSummary ?? null,
        key_takeaways: parsed.keyTakeaways ?? [],
        placeholder_perspective: parsed.perspective ?? null,
        related_slugs: parsed.relatedSlugs ?? [],
        strategy: parsed.strategy ?? "Both",
        featured: parsed.featured ?? false,
        scheduled_at: parsed.scheduledAt ?? null,
        pdf_object_path: parsed.pdfObjectPath ?? null,
        created_by: access.user.id,
        status: "draft",
      })
      .select("id,public_slug,title,body,kind,media_path,category,author_name,author_designation,author_bio,executive_summary,key_takeaways,placeholder_perspective,related_slugs,strategy,featured,scheduled_at,pdf_object_path,created_by,internal_review_by,internal_review_at,status,approved_by,approved_at,published_at,created_at")
      .single();
    if (error) {
      console.error("Manager update draft creation failed.", error);
      return NextResponse.json({ error: "The manager update draft could not be saved." }, { status: 502 });
    }

    const audited = await writeAdminAudit(
      access.supabase,
      access.user.id,
      "manager_update.draft_created",
      "manager_updates",
      data.id,
      { kind: data.kind, title: data.title },
    );
    if (!audited) {
      const { error: rollbackError } = await access.supabase.from("manager_updates").delete().eq("id", data.id);
      if (rollbackError) console.error("Manager update draft rollback failed.", rollbackError);
      return NextResponse.json(
        { error: "The draft was rolled back because its audit record could not be written." },
        { status: 500 },
      );
    }
    return NextResponse.json({ update: data }, { status: 201 });
  } catch (error) {
    console.error("Manager update draft creation failed.", error);
    return NextResponse.json({ error: "The manager update draft could not be saved." }, { status: 502 });
  }
}
