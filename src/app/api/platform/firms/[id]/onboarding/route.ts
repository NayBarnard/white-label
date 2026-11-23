import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { PortalDatabase } from "@/lib/supabase/portal";
import { authorizePlatformApi } from "@/lib/platform/server";
import { readJsonBody } from "@/lib/server/rate-limit";

const tenantIdPattern = /^[a-z0-9][a-z0-9_-]{0,62}$/;
const invitationRoles = ["firm_administrator", "compliance_officer", "financial_adviser", "adviser_support"] as const;

function isEmail(value: unknown): value is string {
  return typeof value === "string" &&
    value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await authorizePlatformApi();
  if (!access.ok) return access.response;
  const { id } = await context.params;
  if (!tenantIdPattern.test(id)) return NextResponse.json({ error: "Invalid firm ID." }, { status: 400 });
  const [onboarding, invitations] = await Promise.all([
    access.supabase.from("wealth_os_firm_onboarding").select("*").eq("tenant_id", id).maybeSingle(),
    access.supabase.from("wealth_os_firm_invitations").select("*").eq("tenant_id", id).order("created_at", { ascending: false }),
  ]);
  if (onboarding.error || invitations.error) {
    return NextResponse.json({ error: "Firm onboarding could not be loaded." }, { status: 502 });
  }
  return NextResponse.json({ onboarding: onboarding.data, invitations: invitations.data });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const access = await authorizePlatformApi();
  if (!access.ok) return access.response;
  const { id } = await context.params;
  if (!tenantIdPattern.test(id)) return NextResponse.json({ error: "Invalid firm ID." }, { status: 400 });
  const body = await readJsonBody(request, 4096);
  if (!body.ok || !body.value || typeof body.value !== "object") {
    return NextResponse.json({ error: "The onboarding request is invalid." }, { status: 400 });
  }
  const value = body.value as Record<string, unknown>;
  if (!isEmail(value.email)) return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
  if (!invitationRoles.includes(value.role as (typeof invitationRoles)[number])) {
    return NextResponse.json({ error: "A valid invitation role is required." }, { status: 400 });
  }
  const role = value.role as (typeof invitationRoles)[number];
  const tenant = await access.supabase
    .from("wealth_os_tenants")
    .select("id,status")
    .eq("id", id)
    .maybeSingle();
  if (tenant.error) return NextResponse.json({ error: "The firm could not be verified." }, { status: 502 });
  if (!tenant.data) return NextResponse.json({ error: "The firm was not found." }, { status: 404 });

  const onboarding = await access.supabase
    .from("wealth_os_firm_onboarding")
    .upsert({
      tenant_id: id,
      status: "administrator_invited",
      administrator_invited_at: new Date().toISOString(),
      updated_by: access.user.id,
    }, { onConflict: "tenant_id" })
    .select("tenant_id,status")
    .single();
  if (onboarding.error) return NextResponse.json({ error: "Onboarding status could not be updated." }, { status: 502 });

  const invitation = await access.supabase
    .from("wealth_os_firm_invitations")
    .insert({
      tenant_id: id,
      email: value.email.toLowerCase(),
      role,
      status: "pending",
      invited_by: access.user.id,
    })
    .select("id,email,role,status,expires_at")
    .single();
  if (invitation.error) return NextResponse.json({ error: "The invitation could not be saved." }, { status: 502 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && serviceRoleKey) {
    const admin = createClient<PortalDatabase>(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    const invited = await admin.auth.admin.inviteUserByEmail(value.email, {
      redirectTo: new URL("/auth/callback", process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").toString(),
      data: { tenant_id: id, role },
    });
    if (invited.error) {
      await access.supabase.from("wealth_os_firm_invitations").update({
        status: "revoked",
        revoked_at: new Date().toISOString(),
      }).eq("id", invitation.data.id);
      return NextResponse.json({ error: "The secure invitation email could not be sent." }, { status: 502 });
    }
    if (invited.data.user) {
      const appMetadata = await admin.auth.admin.updateUserById(invited.data.user.id, {
        app_metadata: { tenant_id: id, role },
      });
      if (appMetadata.error) {
        await access.supabase.from("wealth_os_firm_invitations").update({
          status: "revoked",
          revoked_at: new Date().toISOString(),
        }).eq("id", invitation.data.id);
        return NextResponse.json({ error: "The invitation access metadata could not be configured." }, { status: 502 });
      }
    }
  }

  return NextResponse.json({ onboarding: onboarding.data, invitation: invitation.data }, { status: 201 });
}
