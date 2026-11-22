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
  const limit = await enforceAuthenticatedRateLimit(user.id, "wealth-os-scenarios-read", 60, 60);
  if (!limit.ok) return limit.response;
  const { data, error } = await supabase
    .from("wealth_os_scenarios")
    .select("id, name, assumptions, result, created_at, updated_at")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return jsonError("Scenarios could not be loaded.", 502);
  return NextResponse.json({ scenarios: data });
}

export async function POST(request: Request) {
  const access = await authorizeWealthOsApi();
  if (!access.ok) return access.response;
  const { supabase, tenantId, user } = access;
  const limit = await enforceAuthenticatedRateLimit(user.id, "wealth-os-scenarios", 20, 60);
  if (!limit.ok) return limit.response;
  const body = await readJsonBody(request, 64 * 1024);
  if (!body.ok || !isJsonObject(body.value)) return jsonError("The scenario request is invalid.", 400);
  const value = body.value;
  if (typeof value.name !== "string" || !value.name.trim() ||
      !isJsonObject(value.assumptions) || !isJsonObject(value.result)) {
    return jsonError("The scenario is incomplete.", 400);
  }
  const { data, error } = await supabase
    .from("wealth_os_scenarios")
    .insert({
      tenant_id: tenantId,
      user_id: user.id,
      name: value.name.trim().slice(0, 120),
      assumptions: JSON.parse(JSON.stringify(value.assumptions)),
      result: JSON.parse(JSON.stringify(value.result)),
    })
    .select("id, name, assumptions, result, created_at")
    .single();
  if (error) return jsonError("The scenario could not be saved.", 502);
  return NextResponse.json({ scenario: data }, { status: 201 });
}
