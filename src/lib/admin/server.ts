import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { Json, PortalDatabase } from "@/lib/supabase/portal";
import { isAal2Claims } from "@/lib/staff/mfa";
import { canStaff } from "@/lib/staff/permissions";

type AdminApiAccess =
  | {
      ok: true;
      user: User;
      supabase: SupabaseClient<PortalDatabase>;
    }
  | {
      ok: false;
      response: NextResponse;
    };

async function getAuthenticatedUser(allowCookieWrites: boolean) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const cookieStore = await cookies();
  const authClient = createServerClient<PortalDatabase>(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        if (!allowCookieWrites) return;
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });
  const { data, error } = await authClient.auth.getUser();
  if (error) throw error;
  return data.user;
}

export async function getAdminPageUser() {
  const user = await getAuthenticatedUser(false);
  if (!user || !canStaff(user.app_metadata.role, "people.manage")) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  const cookieStore = await cookies();
  const authClient = createServerClient<PortalDatabase>(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    },
  });
  const claims = await authClient.auth.getClaims();
  if (claims.error || !isAal2Claims(claims.data?.claims)) return null;
  return user;
}

export async function authorizeAdminApi(): Promise<AdminApiAccess> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Admin access is not configured." },
        { status: 503 },
      ),
    };
  }

  let user: User | null;
  try {
    user = await getAuthenticatedUser(true);
  } catch (authError) {
    console.error("Admin session verification failed.", authError);
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
  if (!canStaff(user.app_metadata.role, "people.manage")) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Administrator access is required." }, { status: 403 }),
    };
  }
  const cookieStore = await cookies();
  const authClient = createServerClient<PortalDatabase>(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    },
  });
  const claims = await authClient.auth.getClaims();
  if (claims.error || !isAal2Claims(claims.data?.claims)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Additional sign-in verification is required." },
        { status: 403 },
      ),
    };
  }
  if (!serviceRoleKey) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "The admin data service is not configured." },
        { status: 503 },
      ),
    };
  }

  return {
    ok: true,
    user,
    supabase: createClient<PortalDatabase>(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    }),
  };
}

export async function writeAdminAudit(
  supabase: SupabaseClient<PortalDatabase>,
  actorUserId: string,
  action: string,
  targetType: string,
  targetId: string | null,
  details: Json = {},
) {
  const { error } = await supabase.from("admin_audit_logs").insert({
    actor_user_id: actorUserId,
    action,
    target_type: targetType,
    target_id: targetId,
    details,
  });
  if (!error) return true;
  console.error("Failed to write admin audit log.", error);
  return false;
}
