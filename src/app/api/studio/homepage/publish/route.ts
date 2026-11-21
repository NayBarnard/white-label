import { NextResponse } from "next/server";
import { authorizeAdminApi } from "@/lib/admin/server";
import { isHomePageData } from "@/components/home/HomePageEditorConfig";
import { readJsonBody } from "@/lib/server/rate-limit";
import { getStudioTenantId } from "@/lib/studio/tenant";
import { isStudioSupabaseStorageEnabled } from "@/lib/studio/mode";

const HOME_SLUG = "home";
const MAX_CONTENT_BYTES = 512 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  if (!isStudioSupabaseStorageEnabled(process.env.STUDIO_STORAGE_MODE)) {
    return jsonError("Publishing is disabled in browser-only demo mode.", 410);
  }
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;

  const body = await readJsonBody(request, MAX_CONTENT_BYTES);
  if (!body.ok) {
    return jsonError(
      body.reason === "too_large" ? "The homepage version is too large." : "The publish request is invalid.",
      body.reason === "too_large" ? 413 : 400,
    );
  }
  if (!body.value || typeof body.value !== "object" || Array.isArray(body.value)) {
    return jsonError("The publish request is invalid.", 400);
  }

  const input = body.value as Record<string, unknown>;
  const restoreVersionId = input.restoreVersionId;
  const tenantId = getStudioTenantId(access.user.app_metadata);
  if (!tenantId) return jsonError("The administrator tenant assignment is invalid.", 403);
  let content: unknown;

  if (restoreVersionId !== undefined) {
    if (typeof restoreVersionId !== "string" || !UUID_PATTERN.test(restoreVersionId)) {
      return jsonError("The selected version is invalid.", 400);
    }
    const source = await access.supabase
      .from("site_studio_versions")
      .select("id, content")
      .eq("id", restoreVersionId)
      .eq("tenant_id", tenantId)
      .eq("slug", HOME_SLUG)
      .eq("status", "published")
      .maybeSingle();
    if (source.error) {
      console.error("Studio restore version could not be loaded.", source.error);
      return jsonError("The selected version could not be loaded.", 502);
    }
    if (!source.data) return jsonError("The selected version is no longer available.", 404);
    content = source.data.content;
  } else {
    content = input.content;
  }

  if (!isHomePageData(content)) return jsonError("The homepage configuration is invalid.", 400);
  const serializedContent = JSON.parse(JSON.stringify(content));
  const now = new Date().toISOString();

  const savedDraft = await access.supabase
    .from("site_studio_versions")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("slug", HOME_SLUG)
    .eq("status", "draft")
    .maybeSingle();
  if (savedDraft.error) {
    console.error("Studio draft could not be loaded for publishing.", savedDraft.error);
    return jsonError("The homepage could not be published.", 502);
  }

  const draftResult = savedDraft.data
    ? await access.supabase
        .from("site_studio_versions")
        .update({
          content: serializedContent,
          created_by: access.user.id,
          created_at: now,
        })
        .eq("id", savedDraft.data.id)
    : await access.supabase.from("site_studio_versions").insert({
        tenant_id: tenantId,
        slug: HOME_SLUG,
        status: "draft",
        content: serializedContent,
        created_by: access.user.id,
      });
  if (draftResult.error) {
    console.error("Studio draft could not be saved before publishing.", draftResult.error);
    return jsonError("The homepage could not be published because its draft could not be saved.", 502);
  }

  const published = await access.supabase
    .from("site_studio_versions")
    .insert({
      tenant_id: tenantId,
      slug: HOME_SLUG,
      status: "published",
      content: serializedContent,
      created_by: access.user.id,
      published_by: access.user.id,
      published_at: now,
      source_version_id: typeof restoreVersionId === "string" ? restoreVersionId : null,
    })
    .select("id, published_at")
    .single();

  if (published.error) {
    console.error("Studio homepage publishing failed.", published.error);
    return jsonError("The homepage could not be published. Your draft is still saved.", 502);
  }

  return NextResponse.json({
    ok: true,
    versionId: published.data.id,
    publishedAt: published.data.published_at,
    restored: restoreVersionId !== undefined,
  });
}
