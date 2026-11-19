import { NextResponse } from "next/server";
import { authorizeAdminApi, writeAdminAudit } from "@/lib/admin/server";
import { readJsonBody } from "@/lib/server/rate-limit";
import { isUuid } from "@/lib/admin/validation";
import type { PortalDatabase } from "@/lib/supabase/portal";

type DocumentStatus = PortalDatabase["public"]["Tables"]["site_documents"]["Row"]["status"];
type DocumentAction = "submit" | "approve" | "publish" | "archive";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;
  const { id } = await context.params;
  if (!isUuid(id)) return NextResponse.json({ error: "The document version is invalid." }, { status: 400 });

  const body = await readJsonBody(request, 4096);
  if (!body.ok) return NextResponse.json({ error: "The workflow request could not be read." }, { status: 400 });
  if (typeof body.value !== "object" || body.value === null || Array.isArray(body.value)) {
    return NextResponse.json({ error: "The workflow request is invalid." }, { status: 400 });
  }
  const input = body.value as Record<string, unknown>;
  if (Object.keys(input).some((key) => key !== "action" && key !== "complianceApproved") ||
    (input.action !== undefined && !["submit", "approve", "publish", "archive"].includes(String(input.action))) ||
    (input.complianceApproved !== undefined && input.complianceApproved !== true)) {
    return NextResponse.json({ error: "Choose a valid document workflow action." }, { status: 400 });
  }

  const document = await access.supabase.from("site_documents").select("*").eq("id", id).maybeSingle();
  if (document.error) {
    console.error("Document workflow state could not be loaded.", document.error);
    return NextResponse.json({ error: "The document version could not be loaded." }, { status: 502 });
  }
  if (!document.data) return NextResponse.json({ error: "The document version could not be found." }, { status: 404 });

  const action: DocumentAction | undefined = input.action as DocumentAction | undefined;
  const complianceApproved = input.complianceApproved === true;
  const nextAction = action ?? (
    document.data.status === "draft" ? "submit"
      : document.data.status === "internal_review" && complianceApproved ? "approve"
        : document.data.status === "approved" && complianceApproved ? "publish"
          : undefined
  );
  if (!nextAction) {
    return NextResponse.json({ error: "Compliance approval is required for this workflow transition." }, { status: 400 });
  }

  const transition = async (
    values: PortalDatabase["public"]["Tables"]["site_documents"]["Update"],
    expected: DocumentStatus,
  ) => {
    const changed = await access.supabase.from("site_documents")
      .update(values)
      .eq("id", id)
      .eq("status", expected)
      .select("id,status,version,slug,scheduled_at,published_at")
      .maybeSingle();
    if (changed.error) {
      console.error("Site document workflow transition failed.", changed.error);
      return { error: NextResponse.json({ error: "The document could not be updated." }, { status: 502 }) };
    }
    if (!changed.data) return { error: NextResponse.json({ error: "The document changed before this action could be applied." }, { status: 409 }) };
    return { data: changed.data };
  };

  if (nextAction === "submit") {
    if (document.data.status !== "draft") return NextResponse.json({ error: "Only draft documents can enter internal review." }, { status: 409 });
    const changed = await transition({ status: "internal_review" }, "draft");
    if (changed.error) return changed.error;
    const audited = await writeAdminAudit(access.supabase, access.user.id, "site_document.internal_review", "site_document", id, {
      slug: document.data.slug,
      version: document.data.version,
    });
    if (!audited) {
      const rollback = await access.supabase.from("site_documents").update({ status: "draft" }).eq("id", id).eq("status", "internal_review");
      if (rollback.error) console.error("Document review rollback failed.", rollback.error);
      return NextResponse.json({ error: "The review transition was rolled back because it could not be audited." }, { status: 500 });
    }
    return NextResponse.json({ document: changed.data });
  }

  if (nextAction === "approve") {
    if (!complianceApproved) return NextResponse.json({ error: "Compliance approval is required." }, { status: 400 });
    if (document.data.status !== "internal_review") return NextResponse.json({ error: "Only documents in internal review can be approved." }, { status: 409 });
    if (document.data.created_by === access.user.id) {
      const adminList = await access.supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (adminList.error) {
        console.error("Document approval reviewer count could not be checked.", adminList.error);
        return NextResponse.json({ error: "The reviewer could not be verified." }, { status: 502 });
      }
      const adminCount = adminList.data.users.filter((user) => user.app_metadata.role === "admin").length;
      if (adminCount !== 1) return NextResponse.json({ error: "The draft maker cannot approve this document." }, { status: 403 });
    }
    const approvedAt = new Date().toISOString();
    const changed = await transition({
      status: "approved",
      internal_review_by: access.user.id,
      internal_review_at: approvedAt,
      approved_by: access.user.id,
      approved_at: approvedAt,
    }, "internal_review");
    if (changed.error) return changed.error;
    const audited = await writeAdminAudit(access.supabase, access.user.id, "site_document.approved", "site_document", id, {
      slug: document.data.slug,
      version: document.data.version,
      approvedAt,
    });
    if (!audited) {
      const rollback = await access.supabase.from("site_documents").update({
        status: "internal_review",
        internal_review_by: null,
        internal_review_at: null,
        approved_by: null,
        approved_at: null,
      }).eq("id", id).eq("status", "approved");
      if (rollback.error) console.error("Document approval rollback failed.", rollback.error);
      return NextResponse.json({ error: "Approval was rolled back because it could not be audited." }, { status: 500 });
    }
    return NextResponse.json({ document: changed.data });
  }

  if (nextAction === "publish") {
    if (document.data.status !== "approved") return NextResponse.json({ error: "Only approved documents can be published." }, { status: 409 });
    if (document.data.scheduled_at && Date.parse(document.data.scheduled_at) > Date.now()) {
      const audited = await writeAdminAudit(access.supabase, access.user.id, "site_document.publication_scheduled", "site_document", id, {
        slug: document.data.slug,
        version: document.data.version,
        scheduledAt: document.data.scheduled_at,
      });
      if (!audited) return NextResponse.json({ error: "The scheduled publication could not be audited." }, { status: 500 });
      return NextResponse.json({ scheduled: true, scheduledAt: document.data.scheduled_at });
    }
    const publishedAt = new Date().toISOString();
    const changed = await transition({ status: "published", published_at: publishedAt }, "approved");
    if (changed.error) return changed.error;
    const audited = await writeAdminAudit(access.supabase, access.user.id, "site_document.publish", "site_document", id, {
      slug: document.data.slug,
      version: document.data.version,
      complianceApproved: true,
      approvedAt: document.data.approved_at,
      publishedAt,
    });
    if (!audited) {
      const rollback = await access.supabase.from("site_documents").update({ status: "approved", published_at: null }).eq("id", id).eq("status", "published");
      if (rollback.error) console.error("Document publication rollback failed.", rollback.error);
      return NextResponse.json({ error: "Publication was rolled back because it could not be audited." }, { status: 500 });
    }
    return NextResponse.json({ document: changed.data });
  }

  if (document.data.status !== "published") return NextResponse.json({ error: "Only published documents can be archived." }, { status: 409 });
  const archived = await transition({ status: "archived" }, "published");
  if (archived.error) return archived.error;
  const audited = await writeAdminAudit(access.supabase, access.user.id, "site_document.archived", "site_document", id, {
    slug: document.data.slug,
    version: document.data.version,
  });
  if (!audited) {
    const rollback = await access.supabase.from("site_documents").update({ status: "published" }).eq("id", id).eq("status", "archived");
    if (rollback.error) console.error("Document archive rollback failed.", rollback.error);
    return NextResponse.json({ error: "Archiving was rolled back because it could not be audited." }, { status: 500 });
  }
  return NextResponse.json({ document: archived.data });
}
