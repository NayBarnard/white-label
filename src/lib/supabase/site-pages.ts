import { createClient } from "@supabase/supabase-js";
import { isHomePageData } from "@/components/home/HomePageEditorConfig";
import type { PortalDatabase } from "@/lib/supabase/portal";
import { isStudioSupabaseStorageEnabled } from "@/lib/studio/mode";

export async function getPublishedHomePage() {
  if (!isStudioSupabaseStorageEnabled(process.env.STUDIO_STORAGE_MODE)) return null;
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
    .from("site_studio_versions")
    .select("content")
    .eq("tenant_id", "default")
    .eq("slug", "home")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Could not load the published Studio homepage:", error.message);
  } else if (data?.content && isHomePageData(data.content)) {
    return data.content;
  } else if (data?.content) {
    console.error("Published Studio homepage is invalid; trying the legacy homepage.");
  }

  const legacy = await supabase
    .from("site_pages")
    .select("content")
    .eq("slug", "home")
    .maybeSingle();

  if (legacy.error) {
    console.error("Could not load legacy published homepage content:", legacy.error.message);
    return null;
  }
  return legacy.data?.content ?? null;
}
