import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { PortalDatabase } from "@/lib/supabase/portal";
import { isAal2Claims } from "@/lib/staff/mfa";

type PlatformAccess =
  | { ok: true; user: User; supabase: ReturnType<typeof createServerClient<PortalDatabase>> }
  | { ok: false; response: NextResponse };

export async function authorizePlatformApi(): Promise<PlatformAccess> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Platform administration is not configured." }, { status: 503 }),
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
  if (session.data.user.app_metadata.role !== "platform_operator") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Platform operator access is required." }, { status: 403 }),
    };
  }
  const claims = await supabase.auth.getClaims();
  if (claims.error || !isAal2Claims(claims.data?.claims)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Additional sign-in verification is required." }, { status: 403 }),
    };
  }
  const membership = await supabase
    .from("wealth_os_tenant_memberships")
    .select("role,status")
    .eq("user_id", session.data.user.id)
    .eq("role", "platform_operator")
    .eq("status", "active")
    .maybeSingle();
  if (membership.error) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Platform membership could not be verified." }, { status: 503 }),
    };
  }
  if (!membership.data) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Active platform operator membership is required." }, { status: 403 }),
    };
  }
  return { ok: true, user: session.data.user, supabase };
}
