import { NextResponse } from "next/server";
import { authorizeWealthOsApi, isJsonObject } from "@/lib/wealth-intelligence/server";
import { enforceAuthenticatedRateLimit, readJsonBody } from "@/lib/server/rate-limit";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  const access = await authorizeWealthOsApi();
  if (!access.ok) return access.response;
  const { supabase, tenantId, user } = access;
  const limit = await enforceAuthenticatedRateLimit(user.id, "wealth-os-decisions-read", 60, 60);
  if (!limit.ok) return limit.response;
  const [decisions, events] = await Promise.all([
    supabase.from("wealth_decisions").select("id,title,status,created_at").eq("tenant_id", tenantId).eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("wealth_decision_events").select("id,decision_id,event_type,payload,created_at").eq("tenant_id", tenantId).eq("user_id", user.id).order("created_at", { ascending: true }),
  ]);
  if (decisions.error || events.error) return jsonError("Decision history could not be loaded.", 502);
  return NextResponse.json({ decisions: decisions.data, events: events.data });
}

export async function POST(request: Request) {
  const access = await authorizeWealthOsApi();
  if (!access.ok) return access.response;
  const { supabase, user } = access;
  const limit = await enforceAuthenticatedRateLimit(user.id, "wealth-os-decisions-write", 20, 60);
  if (!limit.ok) return limit.response;
  const body = await readJsonBody(request, 64 * 1024);
  if (!body.ok || !isJsonObject(body.value)) return jsonError("The decision request is invalid.", 400);
  const value = body.value;
  if (typeof value.title !== "string" || !value.title.trim()) {
    return jsonError("A decision title is required.", 400);
  }
  const allowedEventTypes = ["context", "alternative", "assumption", "comparison"] as const;
  const eventType = allowedEventTypes.find((type) => type === value.eventType);
  if (!eventType || !isJsonObject(value.payload)) {
    return jsonError("A valid append-only decision event is required.", 400);
  }
  const { data, error } = await supabase.rpc("record_wealth_decision", {
    p_title: value.title.trim().slice(0, 160),
    p_event_type: eventType,
    p_payload: JSON.parse(JSON.stringify(value.payload)),
  });
  if (error || !data) return jsonError("The decision and its context could not be saved.", 502);
  return NextResponse.json(data, { status: 201 });
}
