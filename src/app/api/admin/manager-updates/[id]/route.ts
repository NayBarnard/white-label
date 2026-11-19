import { NextResponse } from "next/server";
import { authorizeAdminApi, writeAdminAudit } from "@/lib/admin/server";
import { disabledFeatureResponse } from "@/lib/features/route-guard";
import { isUuid } from "@/lib/manager-updates/validation";
import { nextManagerUpdateStatus } from "@/lib/manager-updates/workflow";
import { readJsonBody } from "@/lib/server/rate-limit";
import type { PortalDatabase } from "@/lib/supabase/portal";

type ManagerUpdateStatus = PortalDatabase["public"]["Tables"]["manager_updates"]["Row"]["status"];

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const disabled = disabledFeatureResponse("managerUpdates");
  if (disabled) return disabled;
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;
  const { id } = await context.params;
  if (!isUuid(id)) return NextResponse.json({ error: "Manager update not found." }, { status: 404 });

  const parsedBody = await readJsonBody(request, 1024);
  if (!parsedBody.ok) {
    return NextResponse.json({ error: "The workflow request must be valid JSON." }, { status: 400 });
  }
  const input = parsedBody.value;
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return NextResponse.json({ error: "The workflow request is invalid." }, { status: 400 });
  }
  const record = input as Record<string, unknown>;
  const action = record.action;
  if (
    Object.keys(record).some((key) => key !== "action" && key !== "complianceApproved") ||
    (action !== "submit" && action !== "approve" && action !== "publish" && action !== "archive") ||
    (action === "approve" && record.complianceApproved !== true) ||
    (action !== "approve" && record.complianceApproved !== undefined)
  ) {
    return NextResponse.json({ error: "Choose a valid workflow action and complete its required approval." }, { status: 400 });
  }

  try {
    const existing = await access.supabase
      .from("manager_updates")
      .select("id,status,created_by,scheduled_at")
      .eq("id", id)
      .maybeSingle();
    if (existing.error) {
      console.error("Manager update workflow state could not be loaded.", existing.error);
      return NextResponse.json({ error: "The manager update could not be loaded." }, { status: 502 });
    }
    if (!existing.data) return NextResponse.json({ error: "Manager update not found." }, { status: 404 });

    const update = async (
      values: PortalDatabase["public"]["Tables"]["manager_updates"]["Update"],
      expectedStatus: ManagerUpdateStatus,
    ) => {
      const { data, error } = await access.supabase
        .from("manager_updates")
        .update(values)
        .eq("id", id)
        .eq("status", expectedStatus)
        .select("id,public_slug,status,internal_review_by,internal_review_at,approved_by,approved_at,published_at,scheduled_at")
        .maybeSingle();
      if (error) {
        console.error("Manager update workflow transition failed.", error);
        return { error: NextResponse.json({ error: "The manager update could not be updated." }, { status: 502 }) };
      }
      if (!data) return { error: NextResponse.json({ error: "The manager update changed before this action could be applied." }, { status: 409 }) };
      return { data };
    };

    if (action === "submit") {
      if (nextManagerUpdateStatus(existing.data.status, "submit") !== "internal_review") {
        return NextResponse.json({ error: "Only draft updates can enter internal review." }, { status: 409 });
      }
      const changed = await update({ status: "internal_review" }, "draft");
      if (changed.error) return changed.error;
      const audited = await writeAdminAudit(access.supabase, access.user.id, "manager_update.internal_review", "manager_updates", id, {
        status: "internal_review",
      });
      if (!audited) {
        const rollback = await access.supabase.from("manager_updates").update({ status: "draft" }).eq("id", id).eq("status", "internal_review");
        if (rollback.error) console.error("Manager update review rollback failed.", rollback.error);
        return NextResponse.json({ error: "The review transition was rolled back because it could not be audited." }, { status: 500 });
      }
      return NextResponse.json({ update: changed.data });
    }

    if (action === "approve") {
      if (nextManagerUpdateStatus(existing.data.status, "approve") !== "approved") {
        return NextResponse.json({ error: "Only updates in internal review can be approved." }, { status: 409 });
      }
      if (existing.data.created_by === access.user.id) {
        return NextResponse.json({ error: "The draft author cannot approve their own update." }, { status: 403 });
      }
      const approvedAt = new Date().toISOString();
      const changed = await update({
        status: "approved",
        internal_review_by: access.user.id,
        internal_review_at: approvedAt,
        approved_by: access.user.id,
        approved_at: approvedAt,
      }, "internal_review");
      if (changed.error) return changed.error;
      const audited = await writeAdminAudit(access.supabase, access.user.id, "manager_update.approved", "manager_updates", id, {
        internal_review_at: approvedAt,
        compliance_approved: true,
      });
      if (!audited) {
        const rollback = await access.supabase.from("manager_updates").update({
          status: "internal_review",
          internal_review_by: null,
          internal_review_at: null,
          approved_by: null,
          approved_at: null,
        }).eq("id", id).eq("status", "approved");
        if (rollback.error) console.error("Manager update approval rollback failed.", rollback.error);
        return NextResponse.json({ error: "Approval was rolled back because its audit record could not be written." }, { status: 500 });
      }
      return NextResponse.json({ update: changed.data });
    }

    if (action === "publish") {
      if (nextManagerUpdateStatus(existing.data.status, "publish") !== "published") {
        return NextResponse.json({ error: "Only approved updates can be published." }, { status: 409 });
      }
      const scheduledAt = existing.data.scheduled_at;
      if (scheduledAt && Date.parse(scheduledAt) > Date.now()) {
        const audited = await writeAdminAudit(access.supabase, access.user.id, "manager_update.publication_scheduled", "manager_updates", id, {
          scheduled_at: scheduledAt,
        });
        if (!audited) return NextResponse.json({ error: "The scheduled publication could not be audited." }, { status: 500 });
        return NextResponse.json({ update: existing.data, scheduled: true });
      }
      const publishedAt = new Date().toISOString();
      const changed = await update({ status: "published", published_at: publishedAt }, "approved");
      if (changed.error) return changed.error;
      const audited = await writeAdminAudit(access.supabase, access.user.id, "manager_update.published", "manager_updates", id, {
        published_at: publishedAt,
        scheduled: false,
      });
      if (!audited) {
        const rollback = await access.supabase.from("manager_updates").update({
          status: "approved",
          published_at: null,
        }).eq("id", id).eq("status", "published");
        if (rollback.error) console.error("Manager update publication rollback failed.", rollback.error);
        return NextResponse.json({ error: "Publication was rolled back because its audit record could not be written." }, { status: 500 });
      }
      return NextResponse.json({ update: changed.data });
    }

    if (nextManagerUpdateStatus(existing.data.status, "archive") !== "archived") {
      return NextResponse.json({ error: "Only published updates can be archived." }, { status: 409 });
    }
    const changed = await update({ status: "archived" }, "published");
    if (changed.error) return changed.error;
    const audited = await writeAdminAudit(access.supabase, access.user.id, "manager_update.archived", "manager_updates", id, {});
    if (!audited) {
      const rollback = await access.supabase.from("manager_updates").update({ status: "published" }).eq("id", id).eq("status", "archived");
      if (rollback.error) console.error("Manager update archive rollback failed.", rollback.error);
      return NextResponse.json({ error: "Archiving was rolled back because its audit record could not be written." }, { status: 500 });
    }
    return NextResponse.json({ update: changed.data });
  } catch (error) {
    console.error("Manager update workflow action failed.", error);
    return NextResponse.json({ error: "The manager update could not be updated." }, { status: 502 });
  }
}
