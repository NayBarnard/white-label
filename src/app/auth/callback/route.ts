import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { PortalDatabase } from "@/lib/supabase/portal";
import { createClient } from "@supabase/supabase-js";

type PendingCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const otpType = requestUrl.searchParams.get("type");
  const destination = new URL("/portal", requestUrl.origin);

  if (!code && !tokenHash) {
    destination.pathname = "/portal/dashboard";
    destination.searchParams.set("authError", "verification");
    return NextResponse.redirect(destination);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase email verification callback is missing public project configuration.");
    destination.pathname = "/portal/dashboard";
    destination.searchParams.set("authError", "verification");
    return NextResponse.redirect(destination);
  }

  const cookieStore = await cookies();
  const pendingCookies: PendingCookie[] = [];
  const supabase = createServerClient<PortalDatabase>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        pendingCookies.push(...cookiesToSet);
      },
    },
  });

  const isRecovery = otpType === "recovery" || requestUrl.searchParams.get("flow") === "recovery";
  const result = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && otpType && ["signup", "invite", "magiclink", "recovery", "email", "email_change"].includes(otpType)
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType })
      : { error: new Error("The verification link is missing a valid email token type.") };
  const { error } = result;
  if (error) {
    console.error("Supabase email verification code exchange failed:", error.message);
    destination.pathname = "/portal/dashboard";
    destination.searchParams.set("authError", "verification");
  } else if (isRecovery) {
    destination.searchParams.set("authAction", "recovery");
  } else {
    const user = await supabase.auth.getUser();
    if (!user.error && user.data.user) {
      const metadata = user.data.user.app_metadata;
      const tenantId = typeof metadata.tenant_id === "string" ? metadata.tenant_id : null;
      const role = typeof metadata.role === "string" ? metadata.role : null;
      if (tenantId && ["platform_operator", "firm_administrator", "compliance_officer", "financial_adviser", "adviser_support", "client"].includes(role ?? "")) {
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (serviceRoleKey) {
          const admin = createClient<PortalDatabase>(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
          });
          await admin.from("wealth_os_tenant_memberships").upsert({
            tenant_id: tenantId,
            user_id: user.data.user.id,
            role: role as "platform_operator" | "firm_administrator" | "compliance_officer" | "financial_adviser" | "adviser_support" | "client",
            status: "active",
            accepted_at: new Date().toISOString(),
          }, { onConflict: "tenant_id,user_id" });
          await admin.from("wealth_os_firm_invitations")
            .update({ status: "accepted", accepted_at: new Date().toISOString() })
            .eq("tenant_id", tenantId)
            .ilike("email", user.data.user.email ?? "");
        }
        if (role === "firm_administrator") destination.pathname = "/admin";
        if (role === "platform_operator") destination.pathname = "/platform";
        if (role === "compliance_officer" || role === "financial_adviser" || role === "adviser_support") destination.pathname = "/advisor";
        if (role === "client") destination.pathname = "/portal";
      }
    }
  }

  const response = NextResponse.redirect(destination);
  for (const { name, value, options } of pendingCookies) {
    response.cookies.set(name, value, options);
  }
  return response;
}
