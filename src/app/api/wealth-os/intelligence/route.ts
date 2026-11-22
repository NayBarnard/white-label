import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedUser } from "@/lib/admin/server";
import type { PortalDatabase } from "@/lib/supabase/portal";
import { readJsonBody } from "@/lib/server/rate-limit";
import { simulateFinancialTwin, validateTwinAssumptions } from "@/lib/wealth-intelligence/twin";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  const user = await getAuthenticatedUser(false).catch(() => null);
  if (!user) return jsonError("Sign-in is required.", 401);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return jsonError("Supabase financial intelligence storage is not configured.", 503);
  const tenantId = typeof user.app_metadata.tenant_id === "string" ? user.app_metadata.tenant_id : "default";
  const supabase = createClient<PortalDatabase>(url, key);
  const { data, error } = await supabase
    .from("wealth_financial_twins")
    .select("id, name, calculation_version, seed, assumptions, observed_data, result, methodology, created_at")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return jsonError("Financial twin runs could not be loaded.", 502);
  return NextResponse.json({ runs: data });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(false).catch(() => null);
  if (!user) return jsonError("Sign-in is required.", 401);
  const body = await readJsonBody(request, 64 * 1024);
  if (!body.ok) return jsonError("The financial intelligence request is invalid.", 400);
  const value = body.value as {
    name?: unknown;
    assumptions?: unknown;
    observedData?: unknown;
  };
  const assumptions = validateTwinAssumptions(value.assumptions);
  if (typeof value.name !== "string" || !value.name.trim() || !assumptions) {
    return jsonError("The financial twin assumptions are incomplete or invalid.", 400);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return jsonError("Supabase financial intelligence storage is not configured.", 503);
  const tenantId = typeof user.app_metadata.tenant_id === "string" ? user.app_metadata.tenant_id : "default";
  const observedData = value.observedData && typeof value.observedData === "object" ? value.observedData : {};
  const result = simulateFinancialTwin(assumptions);
  const supabase = createClient<PortalDatabase>(url, key);
  const { data, error } = await supabase
    .from("wealth_financial_twins")
    .insert({
      tenant_id: tenantId,
      user_id: user.id,
      name: value.name.trim().slice(0, 120),
      calculation_version: "twin-deterministic-monte-carlo-v1",
      seed: assumptions.seed,
      assumptions: JSON.parse(JSON.stringify(assumptions)),
      observed_data: JSON.parse(JSON.stringify(observedData)),
      result: JSON.parse(JSON.stringify(result)),
      methodology: {
        engine: "seeded monthly geometric scenario simulation",
        confidence: "illustrative",
        limitations: [
          "No taxes or fees are modelled",
          "Returns are generated as a normal shock around the assumed monthly return",
          "Life events are adviser-entered assumptions unless marked verified",
          "This is not a guarantee or personalised financial advice",
        ],
      },
    })
    .select("id, name, calculation_version, seed, assumptions, observed_data, result, methodology, created_at")
    .single();
  if (error) return jsonError("The financial twin run could not be saved.", 502);
  return NextResponse.json({ run: data }, { status: 201 });
}
