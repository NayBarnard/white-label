import { NextResponse } from "next/server";
import { authorizeAdminApi, writeAdminAudit } from "@/lib/admin/server";
import { isUuid, parseRequestStatus } from "@/lib/admin/validation";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;

  const { id } = await context.params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "The request ID is not valid." }, { status: 400 });
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "The request update is not valid JSON." }, { status: 400 });
  }
  const status = parseRequestStatus(input);
  if (!status) {
    return NextResponse.json({ error: "Choose a valid request status." }, { status: 400 });
  }

  try {
    const { data: existing, error: existingError } = await access.supabase
      .from("client_portal_requests")
      .select("id,user_id,status,request_type")
      .eq("id", id)
      .maybeSingle();
    if (existingError) {
      console.error("Admin request lookup failed.", existingError);
      return NextResponse.json({ error: "The request could not be loaded." }, { status: 502 });
    }
    if (!existing) {
      return NextResponse.json({ error: "The request was not found." }, { status: 404 });
    }
    if (status === "Completed" &&
      ["Contact Details Update", "Banking Details Change"].includes(existing.request_type)) {
      const verification = await access.supabase
        .from("personal_detail_verifications")
        .select("id")
        .eq("request_id", id)
        .limit(1)
        .maybeSingle();
      if (verification.error) {
        console.error("Request phone-verification lookup failed.", verification.error);
        return NextResponse.json({ error: "The verification record could not be checked." }, { status: 502 });
      }
      if (!verification.data) {
        return NextResponse.json(
          { error: "Phone verification is required before completing this request." },
          { status: 409 },
        );
      }
    }

    const { error } = await access.supabase
      .from("client_portal_requests")
      .update({ status })
      .eq("id", id);
    if (error) {
      console.error("Admin request update failed.", error);
      return NextResponse.json({ error: "The request status could not be updated." }, { status: 502 });
    }

    const audited = await writeAdminAudit(
      access.supabase,
      access.user.id,
      "portal_request.status_changed",
      "client_portal_requests",
      id,
      { client_user_id: existing.user_id, from: existing.status, to: status },
    );
    if (!audited) {
      const { error: rollbackError } = await access.supabase
        .from("client_portal_requests")
        .update({ status: existing.status })
        .eq("id", id)
        .eq("user_id", existing.user_id);
      if (rollbackError) console.error("Admin request status rollback failed.", rollbackError);
      return NextResponse.json(
        {
          error: rollbackError
            ? "The status changed but its audit record could not be saved or reverted. Contact support."
            : "The status change was reverted because its audit record could not be saved.",
        },
        { status: 500 },
      );
    }
    return NextResponse.json({ id, status });
  } catch (error) {
    console.error("Admin request update failed.", error);
    return NextResponse.json({ error: "The request status could not be updated." }, { status: 502 });
  }
}
