import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedUser } from "@/lib/admin/server";
import type { PortalDatabase } from "@/lib/supabase/portal";
import { readJsonBody } from "@/lib/server/rate-limit";
import { orchestrateOpportunity, rehearseCrisis } from "@/lib/wealth-intelligence/enterprise";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  const user = await getAuthenticatedUser(false).catch(() => null);
  if (!user) return jsonError("Sign-in is required.", 401);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return jsonError("Supabase enterprise intelligence storage is not configured.", 503);
  const tenantId = typeof user.app_metadata.tenant_id === "string" ? user.app_metadata.tenant_id : "default";
  const supabase = createClient<PortalDatabase>(url, key);
  const [opportunities, crises] = await Promise.all([
    supabase.from("wealth_opportunities").select("id,title,evidence,rationale,missing_information,benefits,risks,review_status,created_at").eq("tenant_id", tenantId).eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("wealth_crisis_scenarios").select("id,name,assumptions,estimated_exposure,methodology,created_at").eq("tenant_id", tenantId).eq("user_id", user.id).order("created_at", { ascending: false }),
  ]);
  if (opportunities.error || crises.error) return jsonError("Enterprise intelligence could not be loaded.", 502);
  return NextResponse.json({ opportunities: opportunities.data, crises: crises.data });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(false).catch(() => null);
  if (!user) return jsonError("Sign-in is required.", 401);
  const body = await readJsonBody(request, 64 * 1024);
  if (!body.ok) return jsonError("The enterprise intelligence request is invalid.", 400);
  const value = body.value as { kind?: unknown; input?: unknown };
  if (!value.input || typeof value.input !== "object") return jsonError("Enterprise intelligence input is required.", 400);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return jsonError("Supabase enterprise intelligence storage is not configured.", 503);
  const tenantId = typeof user.app_metadata.tenant_id === "string" ? user.app_metadata.tenant_id : "default";
  const supabase = createClient<PortalDatabase>(url, key);
  if (value.kind === "opportunity") {
    const input = value.input as { verifiedMonthlySurplusZar: number | null; targetShortfallZar: number | null; taxAllowanceRemainingZar: number | null };
    const opportunities = orchestrateOpportunity(input);
    if (!opportunities.length) return NextResponse.json({ opportunities: [] });
    const inserts = opportunities.map((opportunity) => ({
      tenant_id: tenantId,
      user_id: user.id,
      title: opportunity.title,
      evidence: opportunity.evidence,
      rationale: opportunity.rationale,
      missing_information: opportunity.missingInformation,
      benefits: opportunity.benefits,
      risks: opportunity.risks,
    }));
    const { data, error } = await supabase.from("wealth_opportunities").insert(inserts).select("id,title,evidence,rationale,missing_information,benefits,risks,review_status,created_at");
    if (error) return jsonError("Opportunities could not be saved.", 502);
    return NextResponse.json({ opportunities: data }, { status: 201 });
  }
  if (value.kind === "crisis") {
    const input = value.input as { portfolioZar: number; assumptions: { marketShockPercent: number; inflationShockPercent: number; currencyShockPercent: number; liquidityShockPercent: number }; name?: string };
    const result = rehearseCrisis(input.portfolioZar, input.assumptions);
    if (!result) return jsonError("Crisis assumptions are invalid.", 400);
    const { data, error } = await supabase
      .from("wealth_crisis_scenarios")
      .insert({
        tenant_id: tenantId,
        user_id: user.id,
        name: typeof input.name === "string" && input.name.trim() ? input.name.trim().slice(0, 120) : "Hypothetical crisis",
        assumptions: input.assumptions,
        estimated_exposure: { estimatedExposureZar: result.estimatedExposureZar, label: result.label, shocks: result.shocks },
        methodology: { deterministic: true, version: "crisis-linear-v1", limitations: ["Illustrative linear shocks", "No correlations or contagion modelled", "Not a production stress test"] },
      })
      .select("id,name,assumptions,estimated_exposure,methodology,created_at")
      .single();
    if (error) return jsonError("The crisis scenario could not be saved.", 502);
    return NextResponse.json({ crisis: data }, { status: 201 });
  }
  return jsonError("Unknown enterprise intelligence kind.", 400);
}
