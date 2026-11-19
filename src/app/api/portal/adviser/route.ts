import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { PortalDatabase } from "@/lib/supabase/portal";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceRoleKey) {
    return NextResponse.json({ error: "Adviser details are not configured." }, { status: 503 });
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
    const relationship = await supabase
      .from("adviser_client_relationships")
      .select("adviser_user_id,status")
      .eq("client_user_id", userResult.user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (relationship.error) {
      console.error("Client adviser relationship could not be loaded.", relationship.error);
      return NextResponse.json({ error: "Adviser details could not be loaded." }, { status: 502 });
    }
    if (!relationship.data) return NextResponse.json({ adviser: null });
    const adviser = await supabase.auth.admin.getUserById(relationship.data.adviser_user_id);
    if (adviser.error || !adviser.data.user) {
      return NextResponse.json({ adviser: null });
    }
    const metadata = adviser.data.user.user_metadata;
    return NextResponse.json({
      adviser: {
        id: adviser.data.user.id,
        name: typeof metadata.full_name === "string" ? metadata.full_name : "",
        email: adviser.data.user.email ?? "",
        phone: typeof metadata.phone === "string" ? metadata.phone : "",
      },
    });
  } catch (error) {
    console.error("Client adviser relationship lookup failed.", error);
    return NextResponse.json({ error: "Adviser details could not be loaded." }, { status: 500 });
  }
}
