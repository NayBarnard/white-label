import { createClient } from "@supabase/supabase-js";
import type { PortalDatabase } from "@/lib/supabase/portal";
import {
  DEFAULT_TENANT_BRANDING,
  resolveTenantBranding,
  type TenantBranding,
} from "@/lib/branding/config";

export async function loadTenantBranding(host: string | null): Promise<TenantBranding> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey || !host) return DEFAULT_TENANT_BRANDING;

  const hostname = host.split(":")[0].toLowerCase().replace(/\.$/, "");
  const supabase = createClient<PortalDatabase>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const domain = await supabase
    .from("wealth_os_domains")
    .select("tenant_id")
    .eq("domain", hostname)
    .eq("verification_status", "verified")
    .maybeSingle();
  if (domain.error || !domain.data) return DEFAULT_TENANT_BRANDING;

  const tenant = await supabase
    .from("wealth_os_tenants")
    .select("name,trading_name,logo_url,favicon_url,primary_color,secondary_color,accent_color,typography,contact_details,website_url,login_branding,email_branding,document_branding,status")
    .eq("id", domain.data.tenant_id)
    .eq("status", "active")
    .maybeSingle();
  if (tenant.error || !tenant.data) return DEFAULT_TENANT_BRANDING;

  return resolveTenantBranding(tenant.data);
}
