import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authorizeAdviserApi } from "@/lib/adviser/server";
import { calculateAllowance, resolveAllowanceRules, type AllowanceContribution, type AllowanceRule } from "@/lib/tax/allowance";
import { getStudioTenantId } from "@/lib/studio/tenant";
import { enforceAuthenticatedRateLimit, readJsonBody } from "@/lib/server/rate-limit";
import { getSouthAfricanDate } from "@/lib/tax/tax-year";

type AuthenticatedUser = { id: string; app_metadata: Record<string, unknown> };
type TaxRuleRow = AllowanceRule & { id: string; tenant_id: string };
type ExternalLogRow = {
  id: string;
  product_code: string;
  tax_year_label: string;
  amount: number;
  contribution_date: string;
  source: "EXTERNAL_DECLARED";
  notes: string | null;
};

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

async function getClientUser(): Promise<AuthenticatedUser | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  const cookieStore = await cookies();
  const authClient = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
      },
    },
  });
  const { data, error } = await authClient.auth.getUser();
  if (error || !data.user) return null;
  return data.user as AuthenticatedUser;
}

async function resolveTarget(request: Request) {
  const clientId = new URL(request.url).searchParams.get("clientId");
  if (clientId) {
    const access = await authorizeAdviserApi();
    if (!access.ok) return { response: access.response } as const;
    const adviserTenant = getStudioTenantId(access.user.app_metadata);
    if (!adviserTenant) {
      return { response: NextResponse.json({ error: "Your firm assignment is invalid." }, { status: 403 }) } as const;
    }
    const supabase = getServiceClient();
    if (!supabase) {
      return { response: NextResponse.json({ error: "Allowance tracking is not configured." }, { status: 503 }) } as const;
    }
    const [relationship, target] = await Promise.all([
      supabase.from("adviser_client_relationships")
        .select("id")
        .eq("adviser_user_id", access.user.id)
        .eq("client_user_id", clientId)
        .eq("status", "active")
        .maybeSingle(),
      supabase.auth.admin.getUserById(clientId),
    ]);
    if (relationship.error || target.error) {
      console.error("Allowance client access could not be verified.", relationship.error ?? target.error);
      return { response: NextResponse.json({ error: "The client access could not be verified." }, { status: 502 }) } as const;
    }
    if (!relationship.data || !target.data.user) {
      return { response: NextResponse.json({ error: "You do not have access to this client." }, { status: 403 }) } as const;
    }
    const clientTenant = getStudioTenantId(target.data.user.app_metadata);
    if (!clientTenant || clientTenant !== adviserTenant) {
      return { response: NextResponse.json({ error: "You do not have access to this client." }, { status: 403 }) } as const;
    }
    return { clientId, tenantId: adviserTenant, role: "adviser" as const };
  }

  const user = await getClientUser();
  if (!user) {
    return { response: NextResponse.json({ error: "Sign-in is required." }, { status: 401 }) } as const;
  }
  const tenantId = getStudioTenantId(user.app_metadata);
  if (!tenantId) {
    return { response: NextResponse.json({ error: "Your firm assignment is invalid." }, { status: 403 }) } as const;
  }
  return { clientId: user.id, tenantId, role: "client" as const };
}

export async function GET(request: Request) {
  const target = await resolveTarget(request);
  if ("response" in target) return target.response;
  const supabase = getServiceClient();
  if (!supabase) return NextResponse.json({ error: "Allowance tracking is not configured." }, { status: 503 });

  const { data: rawRules, error: rulesError } = await supabase
    .from("tax_allowance_rules")
    .select("id,tenant_id,product_code,tax_year_label,period_start,period_end,annual_limit,lifetime_limit,currency,over_contribution_penalty_rate")
    .in("tenant_id", target.tenantId === "default" ? ["default"] : [target.tenantId, "default"]);
  if (rulesError) {
    console.error("Tax allowance rules could not be loaded.", rulesError);
    return NextResponse.json({ error: "Tax allowance rules could not be loaded." }, { status: 502 });
  }
  const rules = resolveAllowanceRules(target.tenantId, (rawRules ?? []).map((row: TaxRuleRow) => ({
    ...row,
    annual_limit: Number(row.annual_limit),
    lifetime_limit: row.lifetime_limit === null ? null : Number(row.lifetime_limit),
    over_contribution_penalty_rate: Number(row.over_contribution_penalty_rate),
  })));
  if (!rules.length) return NextResponse.json({ error: "No allowance rules are configured for this firm." }, { status: 404 });

  const url = new URL(request.url);
  const requestedProduct = url.searchParams.get("product");
  const requestedYear = url.searchParams.get("year");
  const productRules = rules.filter((candidate) =>
    !requestedProduct || candidate.product_code === requestedProduct,
  );
  const rule = productRules.find((candidate) => candidate.tax_year_label === requestedYear) ?? productRules[0];
  if (!rule) return NextResponse.json({ error: "No allowance rules are configured for this product." }, { status: 404 });

  const productCodes = [...new Set(rules.map(({ product_code }) => product_code))];
  const [externalResult, internalResult] = await Promise.all([
    supabase.from("client_contribution_logs")
      .select("id,product_code,tax_year_label,amount,contribution_date,source,notes")
      .eq("tenant_id", target.tenantId)
      .eq("client_id", target.clientId)
      .eq("source", "EXTERNAL_DECLARED")
      .in("product_code", productCodes)
      .order("contribution_date", { ascending: false }),
    supabase.from("client_transactions")
      .select("amount,transacted_at,account_type,status")
      .eq("user_id", target.clientId)
      .eq("status", "Completed")
      .in("account_type", productCodes),
  ]);
  if (externalResult.error || internalResult.error) {
    console.error("Client contributions could not be loaded.", externalResult.error ?? internalResult.error);
    return NextResponse.json({ error: "Client contributions could not be loaded." }, { status: 502 });
  }

  const contributions: (AllowanceContribution & { product_code: string })[] = [
    ...(externalResult.data ?? []).map((row: ExternalLogRow) => ({
      amount: Number(row.amount),
      contribution_date: row.contribution_date,
      source: "EXTERNAL_DECLARED" as const,
      product_code: row.product_code,
    })),
    ...(internalResult.data ?? []).map((row: { amount: number; transacted_at: string; account_type: string | null }) => ({
      amount: Number(row.amount),
      contribution_date: getSouthAfricanDate(row.transacted_at) ?? "",
      source: "INTERNAL_PORTFOLIO" as const,
      product_code: row.account_type ?? "",
    })),
  ];
  const selectedContributions = contributions
    .filter(({ product_code }) => product_code === rule.product_code)
    .map(({ amount, contribution_date, source }) => ({ amount, contribution_date, source }));
  const summary = calculateAllowance(rule, selectedContributions);
  const selectedLogs = (externalResult.data ?? [])
    .filter((row: ExternalLogRow) => row.product_code === rule.product_code && row.tax_year_label === rule.tax_year_label)
    .map((row: ExternalLogRow) => ({ ...row, amount: Number(row.amount) }));

  return NextResponse.json({
    rule,
    rules,
    summary,
    externalLogs: selectedLogs,
    internalAnnualContributed: summary.internal_annual_contributed,
    externalAnnualContributed: summary.external_annual_contributed,
    role: target.role,
  }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const body = await readJsonBody(request, 8 * 1024);
  if (!body.ok || !body.value || typeof body.value !== "object" || Array.isArray(body.value)) {
    return NextResponse.json({ error: "The contribution entry could not be read." }, { status: 400 });
  }
  const record = body.value as Record<string, unknown>;
  const target = await resolveTarget(request);
  if ("response" in target) return target.response;
  const rateLimit = await enforceAuthenticatedRateLimit(target.clientId, "tax-allowance-write", 20, 60);
  if (!rateLimit.ok) return rateLimit.response;
  const productCode = typeof record.productCode === "string" ? record.productCode : "";
  const taxYearLabel = typeof record.taxYearLabel === "string" ? record.taxYearLabel : "";
  const contributionDate = typeof record.contributionDate === "string" ? record.contributionDate : "";
  const amount = typeof record.amount === "number" ? record.amount : Number(record.amount);
  const notes = typeof record.notes === "string" ? record.notes.trim() : "";
  const id = typeof record.id === "string" ? record.id : null;
  if (!/^[A-Z0-9_-]{1,24}$/.test(productCode) ||
      taxYearLabel.length < 4 || taxYearLabel.length > 16 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(contributionDate) ||
      !Number.isFinite(amount) || amount <= 0 || amount > 999_999_999.99 ||
      notes.length > 500 || (id && !/^[0-9a-f-]{36}$/i.test(id))) {
    return NextResponse.json({ error: "Enter a valid product, tax year, date, and positive amount." }, { status: 400 });
  }
  const supabase = getServiceClient();
  if (!supabase) return NextResponse.json({ error: "Allowance tracking is not configured." }, { status: 503 });
  const ruleResult = await supabase.from("tax_allowance_rules")
    .select("id,period_start,period_end")
    .eq("tenant_id", target.tenantId)
    .eq("product_code", productCode)
    .eq("tax_year_label", taxYearLabel)
    .maybeSingle();
  const fallbackRule = ruleResult.data ? ruleResult : await supabase.from("tax_allowance_rules")
    .select("id,period_start,period_end")
    .eq("tenant_id", "default")
    .eq("product_code", productCode)
    .eq("tax_year_label", taxYearLabel)
    .maybeSingle();
  if (ruleResult.error || fallbackRule.error) {
    console.error("Tax allowance period could not be verified.", ruleResult.error ?? fallbackRule.error);
    return NextResponse.json({ error: "The selected tax year could not be verified." }, { status: 502 });
  }
  if (!fallbackRule.data ||
      contributionDate < fallbackRule.data.period_start ||
      contributionDate > fallbackRule.data.period_end ||
      contributionDate > (getSouthAfricanDate(new Date().toISOString()) ?? new Date().toISOString().slice(0, 10))) {
    return NextResponse.json({ error: "Enter a date within the selected tax year that is not in the future." }, { status: 400 });
  }
  const write = {
    tenant_id: target.tenantId,
    client_id: target.clientId,
    product_code: productCode,
    tax_year_label: taxYearLabel,
    amount,
    contribution_date: contributionDate,
    source: "EXTERNAL_DECLARED",
    notes: notes || null,
    updated_at: new Date().toISOString(),
  };
  const result = id
    ? await supabase.from("client_contribution_logs")
      .update(write)
      .eq("id", id)
      .eq("tenant_id", target.tenantId)
      .eq("client_id", target.clientId)
      .eq("source", "EXTERNAL_DECLARED")
      .select("id")
      .maybeSingle()
    : await supabase.from("client_contribution_logs")
      .insert(write)
      .select("id")
      .single();
  if (result.error || !result.data) {
    console.error("External contribution could not be saved.", result.error);
    return NextResponse.json({ error: "The external contribution could not be saved." }, { status: result.error ? 502 : 404 });
  }
  return NextResponse.json({ ok: true, id: result.data.id }, { status: id ? 200 : 201 });
}
