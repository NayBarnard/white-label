import { NextResponse } from "next/server";
import { authorizePlatformApi } from "@/lib/platform/server";
import { readJsonBody } from "@/lib/server/rate-limit";

const tenantIdPattern = /^[a-z0-9][a-z0-9_-]{0,62}$/;
const domainPattern = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;

export async function GET() {
  const access = await authorizePlatformApi();
  if (!access.ok) return access.response;
  const { data, error } = await access.supabase
    .from("wealth_os_tenants")
    .select("id,name,trading_name,status,primary_domain,created_at,updated_at")
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: "Tenant overview could not be loaded." }, { status: 502 });
  }
  return NextResponse.json({ firms: data });
}

export async function POST(request: Request) {
  const access = await authorizePlatformApi();
  if (!access.ok) return access.response;
  const body = await readJsonBody(request, 16 * 1024);
  if (!body.ok || !body.value || typeof body.value !== "object") {
    return NextResponse.json({ error: "The firm request is invalid." }, { status: 400 });
  }
  const value = body.value as Record<string, unknown>;
  if (
    typeof value.id !== "string" ||
    !tenantIdPattern.test(value.id) ||
    typeof value.name !== "string" ||
    !value.name.trim() ||
    typeof value.trading_name !== "string" ||
    !value.trading_name.trim()
  ) {
    return NextResponse.json({ error: "A valid firm ID, name and trading name are required." }, { status: 400 });
  }
  if (value.primary_domain !== undefined && value.primary_domain !== null &&
      (typeof value.primary_domain !== "string" || !domainPattern.test(value.primary_domain.toLowerCase()))) {
    return NextResponse.json({ error: "The primary domain is invalid." }, { status: 400 });
  }
  const primaryDomain = typeof value.primary_domain === "string"
    ? value.primary_domain.toLowerCase()
    : null;
  const tenant = await access.supabase.from("wealth_os_tenants").insert({
    id: value.id,
    name: value.name.trim().slice(0, 160),
    trading_name: value.trading_name.trim().slice(0, 160),
    status: "pending",
    primary_domain: primaryDomain,
    configuration: {},
  }).select("id,name,trading_name,status,primary_domain").single();
  if (tenant.error) {
    return NextResponse.json({ error: "The firm could not be created." }, { status: 502 });
  }
  if (primaryDomain) {
    const domain = await access.supabase.from("wealth_os_domains").insert({
      tenant_id: value.id,
      domain: primaryDomain,
      is_primary: true,
      verification_status: "pending",
    });
    if (domain.error) {
      await access.supabase.from("wealth_os_tenants").delete().eq("id", value.id);
      return NextResponse.json({ error: "The firm domain could not be persisted." }, { status: 409 });
    }
  }
  return NextResponse.json({ firm: tenant.data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const access = await authorizePlatformApi();
  if (!access.ok) return access.response;
  const body = await readJsonBody(request, 4096);
  if (!body.ok || !body.value || typeof body.value !== "object") {
    return NextResponse.json({ error: "The firm status request is invalid." }, { status: 400 });
  }
  const value = body.value as Record<string, unknown>;
  if (
    typeof value.id !== "string" ||
    !tenantIdPattern.test(value.id) ||
    (value.status !== "active" && value.status !== "pending" && value.status !== "suspended")
  ) {
    return NextResponse.json({ error: "A valid firm ID and status are required." }, { status: 400 });
  }
  const updated = await access.supabase
    .from("wealth_os_tenants")
    .update({ status: value.status, updated_at: new Date().toISOString(), updated_by: access.user.id })
    .eq("id", value.id)
    .select("id,status")
    .maybeSingle();
  if (updated.error) return NextResponse.json({ error: "The firm status could not be updated." }, { status: 502 });
  if (!updated.data) return NextResponse.json({ error: "The firm was not found." }, { status: 404 });
  return NextResponse.json({ firm: updated.data });
}
