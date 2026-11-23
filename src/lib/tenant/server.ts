import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { PortalDatabase } from "@/lib/supabase/portal";
import { getTrustedTenantClaim, type TrustedTenantContext } from "@/lib/tenant/context";

type TenantAccess =
  | {
      ok: true;
      user: User;
      context: TrustedTenantContext;
      supabase: ReturnType<typeof createServerClient<PortalDatabase>>;
    }
  | { ok: false; response: NextResponse };

export async function authorizeTenantContext(): Promise<TenantAccess> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Tenant access is not configured." }, { status: 503 }),
    };
  }

  const cookieStore = await cookies();
  const supabase = createServerClient<PortalDatabase>(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });

  const session = await supabase.auth.getUser();
  if (session.error || !session.data.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Sign-in is required." }, { status: 401 }),
    };
  }

  const claim = getTrustedTenantClaim(session.data.user.app_metadata);
  if (!claim) {
    return {
      ok: false,
      response: NextResponse.json({ error: "An organisation membership is required." }, { status: 403 }),
    };
  }

  const membership = await supabase
    .from("wealth_os_tenant_memberships")
    .select("role,status")
    .eq("tenant_id", claim.tenantId)
    .eq("user_id", session.data.user.id)
    .eq("status", "active")
    .maybeSingle();

  if (membership.error) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Organisation membership could not be verified." }, { status: 503 }),
    };
  }
  if (!membership.data) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Active organisation membership is required." }, { status: 403 }),
    };
  }

  return {
    ok: true,
    user: session.data.user,
    context: {
      tenantId: claim.tenantId,
      role: membership.data.role,
      membershipStatus: "active",
    },
    supabase,
  };
}
