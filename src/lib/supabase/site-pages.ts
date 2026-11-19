import { createClient } from "@supabase/supabase-js";
import type { PortalDatabase } from "@/lib/supabase/portal";

export async function getPublishedHomePage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const supabase = createClient<PortalDatabase>(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
  const { data, error } = await supabase
    .from("site_pages")
    .select("content")
    .eq("slug", "home")
    .maybeSingle();

  if (error) {
    console.error("Could not load published homepage content:", error.message);
    return null;
  }
  return data?.content ?? null;
}
