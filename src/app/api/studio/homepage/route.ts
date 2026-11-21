import { NextResponse } from "next/server";
import { authorizeAdminApi } from "@/lib/admin/server";
import {
  defaultHomePageData,
  isHomePageData,
} from "@/components/home/HomePageEditorConfig";
import { readJsonBody } from "@/lib/server/rate-limit";
import { getStudioTenantId } from "@/lib/studio/tenant";
import { isStudioSupabaseStorageEnabled } from "@/lib/studio/mode";

const HOME_SLUG = "home";
const MAX_CONTENT_BYTES = 512 * 1024;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  if (!isStudioSupabaseStorageEnabled(process.env.STUDIO_STORAGE_MODE)) {
    return jsonError("Studio persistence is disabled in browser-only demo mode.", 410);
  }
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;

  const tenantId = getStudioTenantId(access.user.app_metadata);
  if (!tenantId) return jsonError("The administrator tenant assignment is invalid.", 403);
  const [draftResult, publishedResult, historyResult] = await Promise.all([
    access.supabase
      .from("site_studio_versions")
      .select("id, content, created_at")
      .eq("tenant_id", tenantId)
      .eq("slug", HOME_SLUG)
      .eq("status", "draft")
      .maybeSingle(),
    access.supabase
      .from("site_studio_versions")
      .select("id, content, published_at, published_by")
      .eq("tenant_id", tenantId)
      .eq("slug", HOME_SLUG)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    access.supabase
      .from("site_studio_versions")
      .select("id, content, created_at, created_by, published_at, published_by, source_version_id")
      .eq("tenant_id", tenantId)
      .eq("slug", HOME_SLUG)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(50),
  ]);

  if (draftResult.error || publishedResult.error || historyResult.error) {
    console.error("Studio versions could not be loaded.", {
      draft: draftResult.error,
      published: publishedResult.error,
      history: historyResult.error,
    });
    return jsonError("Website versions could not be loaded.", 502);
  }

  let legacyPage: { content: unknown; updated_at: string; updated_by: string | null } | null = null;
  if (!publishedResult.data) {
    const legacy = await access.supabase
      .from("site_pages")
      .select("content, updated_at, updated_by")
      .eq("slug", HOME_SLUG)
      .maybeSingle();
    if (legacy.error) {
      console.error("Legacy homepage content could not be loaded.", legacy.error);
      return jsonError("Existing homepage content could not be loaded.", 502);
    }
    legacyPage = legacy.data;
  }

  const legacyContent = legacyPage?.content ?? null;
  const draftContent = draftResult.data?.content ?? legacyContent ?? defaultHomePageData;
  if (!isHomePageData(draftContent) ||
      (publishedResult.data && !isHomePageData(publishedResult.data.content)) ||
      historyResult.data.some((version) => !isHomePageData(version.content))) {
    return jsonError("A saved homepage version is invalid and cannot be edited.", 422);
  }

  return NextResponse.json({
    draft: draftContent,
    draftId: draftResult.data?.id ?? null,
    draftSavedAt: draftResult.data?.created_at ?? null,
    published: publishedResult.data
      ? {
          id: publishedResult.data.id,
          content: publishedResult.data.content,
          publishedAt: publishedResult.data.published_at,
          publishedBy: publishedResult.data.published_by,
        }
      : legacyPage && isHomePageData(legacyPage.content)
        ? {
            id: "legacy-site-page",
            content: legacyPage.content,
            publishedAt: legacyPage.updated_at,
            publishedBy: legacyPage.updated_by,
          }
        : null,
    history: historyResult.data,
  });
}

export async function PUT(request: Request) {
  if (!isStudioSupabaseStorageEnabled(process.env.STUDIO_STORAGE_MODE)) {
    return jsonError("Studio persistence is disabled in browser-only demo mode.", 410);
  }
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;

  const body = await readJsonBody(request, MAX_CONTENT_BYTES);
  if (!body.ok) {
    return jsonError(
      body.reason === "too_large" ? "The homepage draft is too large." : "The draft request is invalid.",
      body.reason === "too_large" ? 413 : 400,
    );
  }
  if (!body.value || typeof body.value !== "object" || Array.isArray(body.value) ||
      !isHomePageData((body.value as Record<string, unknown>).content)) {
    return jsonError("The homepage draft is invalid.", 400);
  }

  const content = JSON.parse(JSON.stringify((body.value as { content: unknown }).content));
  const tenantId = getStudioTenantId(access.user.app_metadata);
  if (!tenantId) return jsonError("The administrator tenant assignment is invalid.", 403);
  const existing = await access.supabase
    .from("site_studio_versions")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("slug", HOME_SLUG)
    .eq("status", "draft")
    .maybeSingle();

  if (existing.error) {
    console.error("Studio draft could not be checked.", existing.error);
    return jsonError("The homepage draft could not be saved.", 502);
  }

  const result = existing.data
    ? await access.supabase
        .from("site_studio_versions")
        .update({ content, created_by: access.user.id, created_at: new Date().toISOString() })
        .eq("id", existing.data.id)
        .select("id, created_at")
        .single()
    : await access.supabase
        .from("site_studio_versions")
        .insert({
          tenant_id: tenantId,
          slug: HOME_SLUG,
          status: "draft",
          content,
          created_by: access.user.id,
        })
        .select("id, created_at")
        .single();

  if (result.error) {
    console.error("Studio draft could not be saved.", result.error);
    return jsonError("The homepage draft could not be saved. Please try again.", 502);
  }

  return NextResponse.json({ ok: true, draftId: result.data.id, savedAt: result.data.created_at });
}
