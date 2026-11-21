import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/admin/server";
import { createClient } from "@supabase/supabase-js";
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
  if (!url || !key) return jsonError("Supabase scenario storage is not configured.", 503);
  const supabase = createClient<PortalDatabase>(url, key);
  const tenantId = typeof user.app_metadata.tenant_id === "string" ? user.app_metadata.tenant_id : "default";
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
  const user = await getAuthenticatedUser(false).catch(() => null);
  if (!user) return jsonError("Sign-in is required.", 401);
  const body = await readJsonBody(request, 64 * 1024);
  if (!body.ok) return jsonError("The scenario request is invalid.", 400);
  const value = body.value as { name?: unknown; assumptions?: unknown; result?: unknown };
  if (typeof value.name !== "string" || !value.name.trim() ||
      !value.assumptions || typeof value.assumptions !== "object" ||
      !value.result || typeof value.result !== "object") {
    return jsonError("The scenario is incomplete.", 400);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return jsonError("Supabase scenario storage is not configured.", 503);
  const tenantId = typeof user.app_metadata.tenant_id === "string" ? user.app_metadata.tenant_id : "default";
  const supabase = createClient<PortalDatabase>(url, key);
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
