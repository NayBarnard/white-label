import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { PortalDatabase } from "@/lib/supabase/portal";
import { isAal2Claims } from "@/lib/staff/mfa";
import { canStaff } from "@/lib/staff/permissions";

type AdviserApiAccess =
  | {
      ok: true;
      user: User;
      supabase: ReturnType<typeof createServerClient<PortalDatabase>>;
    }
  | { ok: false; response: NextResponse };

async function createAuthenticatedClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  const cookieStore = await cookies();
  return createServerClient<PortalDatabase>(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });
}

export async function getAdviserPageUser() {
  const client = await createAuthenticatedClient();
  if (!client) return null;
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  const claims = await client.auth.getClaims();
  if (claims.error || !isAal2Claims(claims.data?.claims)) return null;
  return data.user;
}

export async function authorizeAdviserApi(): Promise<AdviserApiAccess> {
  const client = await createAuthenticatedClient();
  if (!client) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Adviser access is not configured." }, { status: 503 }),
    };
  }
  let user: User | null;
  try {
    const result = await client.auth.getUser();
    if (result.error) throw result.error;
    user = result.data.user;
  } catch (error) {
    console.error("Adviser session verification failed.", error);
    return {
      ok: false,
      response: NextResponse.json({ error: "Unable to verify your session. Please sign in again." }, { status: 401 }),
    };
  }
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Sign-in is required." }, { status: 401 }),
    };
  }
  if (!canStaff(user.app_metadata.role, "adviser.portal")) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Adviser access is required." }, { status: 403 }),
    };
  }
  const claims = await client.auth.getClaims();
  if (claims.error || !isAal2Claims(claims.data?.claims)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Additional sign-in verification is required." }, { status: 403 }),
    };
  }
  return { ok: true, user, supabase: client };
}
