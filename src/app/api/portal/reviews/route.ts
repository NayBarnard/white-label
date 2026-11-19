import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { PortalDatabase } from "@/lib/supabase/portal";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceRoleKey) {
    return NextResponse.json({ error: "Reviews are not configured." }, { status: 503 });
  }
  try {
    const cookieStore = await cookies();
    const authClient = createServerClient<PortalDatabase>(url, anonKey, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    });
    const { data: userResult, error: userError } = await authClient.auth.getUser();
    if (userError || !userResult.user) {
      return NextResponse.json({ error: "Sign-in is required." }, { status: 401 });
    }
    const supabase = createClient<PortalDatabase>(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    const result = await supabase
      .from("adviser_reviews")
      .select("id,scheduled_at,completed_at,outcome,follow_up_at,status")
      .eq("client_user_id", userResult.user.id)
      .order("scheduled_at", { ascending: false })
      .limit(100);
    if (result.error) {
      console.error("Client reviews could not be loaded.", result.error);
      return NextResponse.json({ error: "Reviews could not be loaded." }, { status: 502 });
    }
    return NextResponse.json({ reviews: result.data });
  } catch (error) {
    console.error("Client reviews could not be loaded.", error);
    return NextResponse.json({ error: "Reviews could not be loaded." }, { status: 500 });
  }
}
