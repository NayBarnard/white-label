import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { authorizeAdminApi } from "@/lib/admin/server";
import { getStudioTenantId } from "@/lib/studio/tenant";
import { enforceAuthenticatedRateLimit, readJsonBody } from "@/lib/server/rate-limit";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

export async function GET() {
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;
  const tenantId = getStudioTenantId(access.user.app_metadata);
  if (!tenantId) return NextResponse.json({ error: "Your firm assignment is invalid." }, { status: 403 });
  const supabase = getServiceClient();
  if (!supabase) return NextResponse.json({ error: "Allowance configuration is unavailable." }, { status: 503 });
  const { data, error } = await supabase
    .from("tax_allowance_rules")
    .select("id,tenant_id,product_code,tax_year_label,period_start,period_end,annual_limit,lifetime_limit,currency,over_contribution_penalty_rate")
    .eq("tenant_id", tenantId)
    .order("period_start", { ascending: false });
  if (error) {
    console.error("Allowance rules could not be loaded for configuration.", error);
    return NextResponse.json({ error: "Allowance rules could not be loaded." }, { status: 502 });
  }
  return NextResponse.json({ tenantId, rules: data });
}

export async function PUT(request: Request) {
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;
  const tenantId = getStudioTenantId(access.user.app_metadata);
  if (!tenantId) return NextResponse.json({ error: "Your firm assignment is invalid." }, { status: 403 });
  const limit = await enforceAuthenticatedRateLimit(access.user.id, "tax-allowance-rules-write", 20, 60);
  if (!limit.ok) return limit.response;

  const body = await readJsonBody(request, 8 * 1024);
  if (!body.ok || !body.value || typeof body.value !== "object" || Array.isArray(body.value)) {
    return NextResponse.json({ error: "The allowance rule could not be read." }, { status: 400 });
  }
  const input = body.value as Record<string, unknown>;
  const productCode = typeof input.productCode === "string" ? input.productCode : "";
  const taxYearLabel = typeof input.taxYearLabel === "string" ? input.taxYearLabel.trim() : "";
  const periodStart = typeof input.periodStart === "string" ? input.periodStart : "";
  const periodEnd = typeof input.periodEnd === "string" ? input.periodEnd : "";
  const annualLimit = Number(input.annualLimit);
  const lifetimeLimit = input.lifetimeLimit === null || input.lifetimeLimit === ""
    ? null
    : Number(input.lifetimeLimit);
  const penaltyRate = Number(input.overContributionPenaltyRate);
  const currency = typeof input.currency === "string" ? input.currency : "";
  const start = new Date(`${periodStart}T00:00:00Z`);
  const end = new Date(`${periodEnd}T00:00:00Z`);
  if (!/^[A-Z0-9_-]{1,24}$/.test(productCode) ||
      taxYearLabel.length < 4 || taxYearLabel.length > 16 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(periodStart) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(periodEnd) ||
      Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) ||
      start.toISOString().slice(0, 10) !== periodStart ||
      end.toISOString().slice(0, 10) !== periodEnd ||
      periodEnd < periodStart ||
      !Number.isFinite(annualLimit) || annualLimit <= 0 ||
      (lifetimeLimit !== null && (!Number.isFinite(lifetimeLimit) || lifetimeLimit <= 0)) ||
      !Number.isFinite(penaltyRate) || penaltyRate < 0 || penaltyRate > 1 ||
      !/^[A-Z]{3}$/.test(currency)) {
    return NextResponse.json({ error: "Enter valid tax-year dates, limits, currency, and penalty rate." }, { status: 400 });
  }

  const supabase = getServiceClient();
  if (!supabase) return NextResponse.json({ error: "Allowance configuration is unavailable." }, { status: 503 });
  const { data, error } = await supabase
    .from("tax_allowance_rules")
    .upsert({
      tenant_id: tenantId,
      product_code: productCode,
      tax_year_label: taxYearLabel,
      period_start: periodStart,
      period_end: periodEnd,
      annual_limit: annualLimit,
      lifetime_limit: lifetimeLimit,
      currency,
      over_contribution_penalty_rate: penaltyRate,
      updated_at: new Date().toISOString(),
    }, { onConflict: "tenant_id,product_code,tax_year_label" })
    .select("id,tenant_id,product_code,tax_year_label,period_start,period_end,annual_limit,lifetime_limit,currency,over_contribution_penalty_rate")
    .single();
  if (error) {
    console.error("Allowance rule could not be saved.", error);
    return NextResponse.json({ error: "Allowance rule could not be saved." }, { status: 502 });
  }
  return NextResponse.json({ rule: data });
}
