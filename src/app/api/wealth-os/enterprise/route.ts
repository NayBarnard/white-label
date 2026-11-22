import { NextResponse } from "next/server";
import { authorizeWealthOsApi, isJsonObject } from "@/lib/wealth-intelligence/server";
import { enforceAuthenticatedRateLimit, readJsonBody } from "@/lib/server/rate-limit";
import { orchestrateOpportunity, rehearseCrisis } from "@/lib/wealth-intelligence/enterprise";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function isNonnegativeAmount(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isOpportunityInput(value: Record<string, unknown>): value is {
  verifiedMonthlySurplusZar: number | null;
  targetShortfallZar: number | null;
  taxAllowanceRemainingZar: number | null;
} {
  return [
    value.verifiedMonthlySurplusZar,
    value.targetShortfallZar,
    value.taxAllowanceRemainingZar,
  ].every(isNonnegativeAmount);
}

function isCrisisAssumptions(value: unknown): value is {
  marketShockPercent: number;
  inflationShockPercent: number;
  currencyShockPercent: number;
  liquidityShockPercent: number;
} {
  if (!isJsonObject(value)) return false;
  return [
    value.marketShockPercent,
    value.inflationShockPercent,
    value.currencyShockPercent,
    value.liquidityShockPercent,
  ].every(isFiniteNumber);
}

export async function GET() {
  const access = await authorizeWealthOsApi();
  if (!access.ok) return access.response;
  const { supabase, tenantId, user } = access;
  const limit = await enforceAuthenticatedRateLimit(user.id, "wealth-os-enterprise-read", 60, 60);
  if (!limit.ok) return limit.response;
  const [opportunities, crises] = await Promise.all([
    supabase.from("wealth_opportunities").select("id,title,evidence,rationale,missing_information,benefits,risks,review_status,created_at").eq("tenant_id", tenantId).eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("wealth_crisis_scenarios").select("id,name,assumptions,estimated_exposure,methodology,created_at").eq("tenant_id", tenantId).eq("user_id", user.id).order("created_at", { ascending: false }),
  ]);
  if (opportunities.error || crises.error) return jsonError("Enterprise intelligence could not be loaded.", 502);
  return NextResponse.json({ opportunities: opportunities.data, crises: crises.data });
}

export async function POST(request: Request) {
  const access = await authorizeWealthOsApi();
  if (!access.ok) return access.response;
  const { supabase, tenantId, user } = access;
  const limit = await enforceAuthenticatedRateLimit(user.id, "wealth-os-enterprise-write", 20, 60);
  if (!limit.ok) return limit.response;
  const body = await readJsonBody(request, 64 * 1024);
  if (!body.ok || !isJsonObject(body.value)) return jsonError("The enterprise intelligence request is invalid.", 400);
  const value = body.value;
  if (!isJsonObject(value.input)) return jsonError("Enterprise intelligence input is required.", 400);
  if (value.kind === "opportunity") {
    const input = value.input;
    if (!isOpportunityInput(input)) {
      return jsonError("Opportunity inputs must be non-negative amounts or unknown.", 400);
    }
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
    const input = value.input;
    if (
      typeof input.portfolioZar !== "number" ||
      !Number.isFinite(input.portfolioZar) ||
      input.portfolioZar < 0 ||
      !isCrisisAssumptions(input.assumptions)
    ) {
      return jsonError("Crisis portfolio value and assumptions are invalid.", 400);
    }
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
