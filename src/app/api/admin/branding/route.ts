import { NextResponse } from "next/server";
import { authorizeAdminApi } from "@/lib/admin/server";
import { isHexColor, isObject } from "@/lib/branding/config";
import { readJsonBody } from "@/lib/server/rate-limit";
import type { Json } from "@/lib/supabase/portal";

function isSafeAssetUrl(value: unknown): boolean {
  if (typeof value !== "string" || !value.trim()) return true;
  const text = value.trim();
  if (text.startsWith("/")) return !text.startsWith("//");
  try {
    const url = new URL(text);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isValidDomain(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(value.toLowerCase()) &&
    value.length <= 253;
}

function toJsonObject(value: unknown): Json {
  return JSON.parse(JSON.stringify(isObject(value) ? value : {})) as Json;
}

export async function GET() {
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;
  const tenantId = access.user.app_metadata.tenant_id;
  if (typeof tenantId !== "string") {
    return NextResponse.json({ error: "Organisation access could not be verified." }, { status: 403 });
  }
  const tenant = await access.supabase
    .from("wealth_os_tenants")
    .select("id,name,trading_name,primary_domain,logo_url,favicon_url,primary_color,secondary_color,accent_color,typography,contact_details,website_url,login_branding,email_branding,document_branding")
    .eq("id", tenantId)
    .maybeSingle();
  if (tenant.error) return NextResponse.json({ error: "Branding could not be loaded." }, { status: 502 });
  if (!tenant.data) return NextResponse.json({ error: "Organisation was not found." }, { status: 404 });
  return NextResponse.json({ branding: tenant.data });
}

export async function PUT(request: Request) {
  const access = await authorizeAdminApi();
  if (!access.ok) return access.response;
  const tenantId = access.user.app_metadata.tenant_id;
  if (typeof tenantId !== "string") {
    return NextResponse.json({ error: "Organisation access could not be verified." }, { status: 403 });
  }
  const body = await readJsonBody(request, 64 * 1024);
  if (!body.ok || !isObject(body.value)) {
    return NextResponse.json({ error: "The branding request is invalid." }, { status: 400 });
  }
  const value = body.value;
  if (typeof value.name !== "string" || !value.name.trim()) {
    return NextResponse.json({ error: "Firm name is required." }, { status: 400 });
  }
  if (typeof value.trading_name !== "string" || !value.trading_name.trim()) {
    return NextResponse.json({ error: "Trading name is required." }, { status: 400 });
  }
  if (value.primary_color !== undefined && !isHexColor(value.primary_color)) {
    return NextResponse.json({ error: "Primary colour must be a six-digit hex value." }, { status: 400 });
  }
  if (value.secondary_color !== undefined && !isHexColor(value.secondary_color)) {
    return NextResponse.json({ error: "Secondary colour must be a six-digit hex value." }, { status: 400 });
  }
  if (value.accent_color !== undefined && !isHexColor(value.accent_color)) {
    return NextResponse.json({ error: "Accent colour must be a six-digit hex value." }, { status: 400 });
  }
  if (value.logo_url !== undefined && !isSafeAssetUrl(value.logo_url)) {
    return NextResponse.json({ error: "Logo URL is invalid." }, { status: 400 });
  }
  if (value.favicon_url !== undefined && !isSafeAssetUrl(value.favicon_url)) {
    return NextResponse.json({ error: "Favicon URL is invalid." }, { status: 400 });
  }
  if (value.website_url !== undefined && value.website_url !== null) {
    try {
      const url = new URL(String(value.website_url));
      if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Invalid protocol");
    } catch {
      return NextResponse.json({ error: "Website URL is invalid." }, { status: 400 });
    }
  }
  if (value.primary_domain !== undefined && value.primary_domain !== null && !isValidDomain(value.primary_domain)) {
    return NextResponse.json({ error: "Primary domain is invalid." }, { status: 400 });
  }

  const allowedObjects = ["typography", "contact_details", "login_branding", "email_branding", "document_branding"];
  for (const key of allowedObjects) {
    if (value[key] !== undefined && !isObject(value[key])) {
      return NextResponse.json({ error: `${key} must be a JSON object.` }, { status: 400 });
    }
  }

  const update = await access.supabase
    .from("wealth_os_tenants")
    .update({
      name: value.name.trim().slice(0, 160),
      trading_name: value.trading_name.trim().slice(0, 160),
      primary_domain: typeof value.primary_domain === "string"
        ? value.primary_domain.toLowerCase()
        : null,
      logo_url: typeof value.logo_url === "string" ? value.logo_url.slice(0, 2048) : null,
      favicon_url: typeof value.favicon_url === "string" ? value.favicon_url.slice(0, 2048) : null,
      primary_color: typeof value.primary_color === "string" ? value.primary_color : null,
      secondary_color: typeof value.secondary_color === "string" ? value.secondary_color : null,
      accent_color: typeof value.accent_color === "string" ? value.accent_color : null,
      typography: toJsonObject(value.typography),
      contact_details: toJsonObject(value.contact_details),
      website_url: typeof value.website_url === "string" ? value.website_url.slice(0, 2048) : null,
      login_branding: toJsonObject(value.login_branding),
      email_branding: toJsonObject(value.email_branding),
      document_branding: toJsonObject(value.document_branding),
      updated_at: new Date().toISOString(),
      updated_by: access.user.id,
    })
    .eq("id", tenantId)
    .select("id,name,trading_name")
    .single();

  if (update.error) return NextResponse.json({ error: "Branding could not be saved." }, { status: 502 });

  if (typeof value.primary_domain === "string") {
    const existing = await access.supabase
      .from("wealth_os_domains")
      .select("tenant_id")
      .eq("domain", value.primary_domain.toLowerCase())
      .maybeSingle();
    if (existing.error) {
      return NextResponse.json({ error: "The primary domain could not be verified." }, { status: 502 });
    }
    if (existing.data?.tenant_id === tenantId) {
      return NextResponse.json({ branding: update.data });
    }
    if (existing.data) {
      return NextResponse.json({ error: "The primary domain is assigned to another firm." }, { status: 409 });
    }
    const domain = await access.supabase
      .from("wealth_os_domains")
      .insert({
        tenant_id: tenantId,
        domain: value.primary_domain.toLowerCase(),
        is_primary: true,
        verification_status: "pending",
      })
      .select("id")
      .maybeSingle();
    if (domain.error) {
      return NextResponse.json(
        { error: "The primary domain could not be persisted; verify it is not assigned to another firm." },
        { status: 409 },
      );
    }
  }

  return NextResponse.json({ branding: update.data });
}
