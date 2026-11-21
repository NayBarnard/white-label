import { NextResponse } from "next/server";
import { authorizeAdminApi } from "@/lib/admin/server";
import { readJsonBody } from "@/lib/server/rate-limit";
import { isStudioSupabaseStorageEnabled } from "@/lib/studio/mode";
import { validateProject } from "@/lib/studio/universal-schema";

export async function GET() {
  if (!isStudioSupabaseStorageEnabled(process.env.STUDIO_STORAGE_MODE)) {
    return NextResponse.json({ error: "Supabase Studio storage is disabled." }, { status: 410 });
  }
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;
  const tenantId = access.user.app_metadata.tenant_id;
  const resolvedTenant = typeof tenantId === "string" ? tenantId : "default";
  const { data, error } = await access.supabase
    .from("wealth_os_projects")
    .select("id, tenant_id, status, configuration, published_at, created_at, updated_at")
    .eq("tenant_id", resolvedTenant)
    .order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Projects could not be loaded." }, { status: 502 });
  return NextResponse.json({ projects: data });
}

export async function PUT(request: Request) {
  if (!isStudioSupabaseStorageEnabled(process.env.STUDIO_STORAGE_MODE)) {
    return NextResponse.json({ error: "Supabase Studio storage is disabled." }, { status: 410 });
  }
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;
  const body = await readJsonBody(request, 1024 * 1024);
  if (!body.ok) return NextResponse.json({ error: "Invalid project request." }, { status: 400 });
  try {
    const value = body.value as { project?: unknown; status?: "draft" | "published" };
    if (!value.project) throw new Error("A project is required.");
    const project = validateProject(value.project);
    const tenantId = typeof access.user.app_metadata.tenant_id === "string"
      ? access.user.app_metadata.tenant_id
      : "default";
    const status = value.status ?? "draft";
    const now = new Date().toISOString();
    const { data, error } = await access.supabase
      .from("wealth_os_projects")
      .upsert({
        id: project.id,
        tenant_id: tenantId,
        status,
        configuration: JSON.parse(JSON.stringify(project)),
        published_at: status === "published" ? now : null,
        updated_at: now,
        updated_by: access.user.id,
      }, { onConflict: "id" })
      .select("id, status, published_at, updated_at")
      .single();
    if (error) return NextResponse.json({ error: "The project could not be saved." }, { status: 502 });
    return NextResponse.json({ project: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid project." }, { status: 400 });
  }
}
