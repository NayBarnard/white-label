import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { PortalDatabase } from "@/lib/supabase/portal";
import { readJsonBody } from "@/lib/server/rate-limit";
import { isUuid } from "@/lib/admin/validation";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceRoleKey) {
    return NextResponse.json({ error: "Notifications are not configured." }, { status: 503 });
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
      .from("portal_notifications")
      .select("*")
      .eq("user_id", userResult.user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (result.error) {
      console.error("Portal notifications could not be loaded.", result.error);
      return NextResponse.json({ error: "Notifications could not be loaded." }, { status: 502 });
    }
    return NextResponse.json({ notifications: result.data });
  } catch (error) {
    console.error("Portal notifications could not be loaded.", error);
    return NextResponse.json({ error: "Notifications could not be loaded." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ error: "Notifications are not configured." }, { status: 503 });
  }
  const body = await readJsonBody(request, 4096);
  if (!body.ok) return NextResponse.json({ error: "The notification update could not be read." }, { status: 400 });
  const record = body.value as Record<string, unknown>;
  if (typeof record.notificationId !== "string" || !isUuid(record.notificationId)) {
    return NextResponse.json({ error: "The notification reference is invalid." }, { status: 400 });
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
    const updated = await authClient
      .from("portal_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", record.notificationId)
      .eq("user_id", userResult.user.id);
    if (updated.error) {
      console.error("Notification read state could not be updated.", updated.error);
      return NextResponse.json({ error: "Notification state could not be updated." }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Notification read state could not be updated.", error);
    return NextResponse.json({ error: "Notification state could not be updated." }, { status: 500 });
  }
}
