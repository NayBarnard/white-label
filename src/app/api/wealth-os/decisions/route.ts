import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedUser } from "@/lib/admin/server";
import type { PortalDatabase } from "@/lib/supabase/portal";
import { readJsonBody } from "@/lib/server/rate-limit";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  const user = await getAuthenticatedUser(false).catch(() => null);
  if (!user) return jsonError("Sign-in is required.", 401);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return jsonError("Supabase decision storage is not configured.", 503);
  const tenantId = typeof user.app_metadata.tenant_id === "string" ? user.app_metadata.tenant_id : "default";
  const supabase = createClient<PortalDatabase>(url, key);
  const [decisions, events] = await Promise.all([
    supabase.from("wealth_decisions").select("id,title,status,created_at").eq("tenant_id", tenantId).eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("wealth_decision_events").select("id,decision_id,event_type,payload,created_at").eq("tenant_id", tenantId).eq("user_id", user.id).order("created_at", { ascending: true }),
  ]);
  if (decisions.error || events.error) return jsonError("Decision history could not be loaded.", 502);
  return NextResponse.json({ decisions: decisions.data, events: events.data });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(false).catch(() => null);
  if (!user) return jsonError("Sign-in is required.", 401);
  const body = await readJsonBody(request, 64 * 1024);
  if (!body.ok) return jsonError("The decision request is invalid.", 400);
  const value = body.value as {
    title?: unknown;
    eventType?: unknown;
    payload?: unknown;
    status?: unknown;
  };
  if (typeof value.title !== "string" || !value.title.trim()) {
    return jsonError("A decision title is required.", 400);
  }
  if (
    typeof value.eventType !== "string" ||
    !["context", "alternative", "assumption", "approval", "outcome", "comparison", "correction"].includes(value.eventType) ||
    !value.payload || typeof value.payload !== "object"
  ) {
    return jsonError("A valid append-only decision event is required.", 400);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return jsonError("Supabase decision storage is not configured.", 503);
  const tenantId = typeof user.app_metadata.tenant_id === "string" ? user.app_metadata.tenant_id : "default";
  const supabase = createClient<PortalDatabase>(url, key);
  const status = value.status === "approved" || value.status === "declined" || value.status === "superseded"
    ? value.status
    : "open";
  const eventType = value.eventType as "context" | "alternative" | "assumption" | "approval" | "outcome" | "comparison" | "correction";
  const decision = await supabase
    .from("wealth_decisions")
    .insert({ tenant_id: tenantId, user_id: user.id, title: value.title.trim().slice(0, 160), status })
    .select("id,title,status,created_at")
    .single();
  if (decision.error) return jsonError("The decision could not be created.", 502);
  const event = await supabase
    .from("wealth_decision_events")
    .insert({
      tenant_id: tenantId,
      decision_id: decision.data.id,
      user_id: user.id,
      event_type: eventType,
      payload: JSON.parse(JSON.stringify(value.payload)),
    })
    .select("id,decision_id,event_type,payload,created_at")
    .single();
  if (event.error) return jsonError("The append-only decision event could not be saved.", 502);
  return NextResponse.json({ decision: decision.data, event: event.data }, { status: 201 });
}
