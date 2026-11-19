import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { authorizeAdviserApi } from "@/lib/adviser/server";
import { writeAdminAudit } from "@/lib/admin/server";
import { readJsonBody } from "@/lib/server/rate-limit";
import { isUuid } from "@/lib/admin/validation";
import type { PortalDatabase } from "@/lib/supabase/portal";

export async function GET(
  _request: Request,
  context: { params: Promise<{ clientId: string }> },
) {
  const access = await authorizeAdviserApi();
  if (!access.ok) return access.response;
  const { clientId } = await context.params;
  if (!isUuid(clientId)) return NextResponse.json({ error: "The client reference is invalid." }, { status: 400 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return NextResponse.json({ error: "Reviews are not configured." }, { status: 503 });
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
  if (!relationship.data) return NextResponse.json({ error: "You do not have access to this client." }, { status: 403 });
  const reviews = await supabase
    .from("adviser_reviews")
    .select("*")
    .eq("adviser_user_id", access.user.id)
    .eq("client_user_id", clientId)
    .order("scheduled_at", { ascending: false })
    .limit(500);
  if (reviews.error) {
    console.error("Adviser reviews could not be loaded.", reviews.error);
    return NextResponse.json({ error: "Reviews could not be loaded." }, { status: 502 });
  }
  return NextResponse.json({ reviews: reviews.data });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ clientId: string }> },
) {
  const access = await authorizeAdviserApi();
  if (!access.ok) return access.response;
  const { clientId } = await context.params;
  if (!isUuid(clientId)) return NextResponse.json({ error: "The client reference is invalid." }, { status: 400 });
  const body = await readJsonBody(request, 8192);
  if (!body.ok) return NextResponse.json({ error: "The review could not be read." }, { status: 400 });
  const record = body.value as Record<string, unknown>;
  if (typeof record.scheduledAt !== "string") {
    return NextResponse.json({ error: "A review date and time are required." }, { status: 400 });
  }
  const scheduledAt = new Date(record.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "The review date must be in the future." }, { status: 400 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return NextResponse.json({ error: "Reviews are not configured." }, { status: 503 });
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
  if (!relationship.data) return NextResponse.json({ error: "You do not have access to this client." }, { status: 403 });
  const inserted = await supabase.from("adviser_reviews").insert({
    adviser_user_id: access.user.id,
    client_user_id: clientId,
    scheduled_at: scheduledAt.toISOString(),
    status: "scheduled",
  }).select("id").single();
  if (inserted.error) {
    console.error("Adviser review could not be scheduled.", inserted.error);
    return NextResponse.json({ error: "The review could not be scheduled." }, { status: 502 });
  }
  const audited = await writeAdminAudit(
    supabase,
    access.user.id,
    "adviser.review.schedule",
    "client",
    clientId,
    { reviewId: inserted.data.id, scheduledAt: scheduledAt.toISOString() },
  );
  if (!audited) {
    await supabase.from("adviser_reviews").delete().eq("id", inserted.data.id);
    return NextResponse.json({ error: "The review could not be audited." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: inserted.data.id });
}
