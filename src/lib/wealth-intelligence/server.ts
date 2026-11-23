import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isAal2Claims } from "@/lib/staff/mfa";
import { canStaff, isStaffRole } from "@/lib/staff/permissions";
import type { PortalDatabase } from "@/lib/supabase/portal";

type WealthOsAccess =
  | {
      ok: true;
      user: User;
      tenantId: string;
      supabase: ReturnType<typeof createServerClient<PortalDatabase>>;
    }
  | { ok: false; response: NextResponse };

export function getWealthOsTenantId(appMetadata: unknown) {
  if (!isJsonObject(appMetadata)) return null;
  const tenantId = appMetadata.tenant_id;
  if (
    typeof tenantId !== "string" ||
    tenantId === "default" ||
    !/^[a-z0-9][a-z0-9_-]{0,62}$/.test(tenantId)
  ) {
    return null;
  }
  return tenantId;
}

export function isJsonObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export async function authorizeWealthOsApi(): Promise<WealthOsAccess> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Financial intelligence storage is not configured." },
        { status: 503 },
      ),
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

  let user: User | null;
  try {
    const result = await supabase.auth.getUser();
    if (result.error) throw result.error;
    user = result.data.user;
  } catch (error) {
    console.error("Financial intelligence session verification failed.", error);
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Unable to verify your session. Please sign in again." },
        { status: 401 },
      ),
    };
  }

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Sign-in is required." }, { status: 401 }),
    };
  }

  const tenantId = getWealthOsTenantId(user.app_metadata);
  if (!tenantId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "An explicitly assigned organisation is required for financial intelligence." },
        { status: 403 },
      ),
    };
  }

  const membership = await supabase
    .from("wealth_os_tenant_memberships")
    .select("role,status")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (membership.error) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Organisation membership could not be verified." },
        { status: 503 },
      ),
    };
  }
  if (!membership.data) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Active organisation membership is required." },
        { status: 403 },
      ),
    };
  }

  if (isStaffRole(user.app_metadata.role)) {
    if (!canStaff(user.app_metadata.role, "adviser.portal")) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Adviser access is required." }, { status: 403 }),
      };
    }
    const claims = await supabase.auth.getClaims();
    if (claims.error) {
      console.error("Financial intelligence assurance verification failed.", claims.error);
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Additional sign-in verification could not be verified." },
          { status: 503 },
        ),
      };
    }
    if (!isAal2Claims(claims.data?.claims)) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Additional sign-in verification is required." },
          { status: 403 },
        ),
      };
    }
  }

  const { data: dataEnabled, error: readinessError } = await supabase.rpc(
    "wealth_os_tenant_data_enabled",
    { p_tenant_id: tenantId },
  );
  if (readinessError) {
    console.error("Financial intelligence readiness check failed.", readinessError);
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Financial intelligence readiness could not be verified." },
        { status: 503 },
      ),
    };
  }
  if (!dataEnabled) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Financial intelligence is disabled until this organisation passes its readiness review." },
        { status: 403 },
      ),
    };
  }

  return { ok: true, user, tenantId, supabase };
}
