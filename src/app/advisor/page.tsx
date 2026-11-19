import type { Metadata } from "next";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdvisorPortalContent } from "@/components/AdvisorPortalContent";
import { canAccessAdviserPortal } from "@/lib/adviser/access";
import { isAal2Claims } from "@/lib/staff/mfa";
import type { PortalDatabase } from "@/lib/supabase/portal";

export const metadata: Metadata = {
  title: "Advisor Portal",
  description: "Published PLACEHOLDER BRAND fund information and resources for financial advisors.",
  robots: { index: false, follow: false },
};

export const instant = false;

export default async function AdvisorPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) redirect("/advisor/login");

  const cookieStore = await cookies();
  const supabase = createServerClient<PortalDatabase>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    },
  });
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error("Could not verify the advisor portal session.", error);
    redirect("/advisor/login");
  }
  if (!user) redirect("/advisor/login");
  if (!canAccessAdviserPortal(user.app_metadata.role)) {
    await supabase.auth.signOut();
    redirect("/advisor/login");
  }
  const claims = await supabase.auth.getClaims();
  if (claims.error || !isAal2Claims(claims.data?.claims)) {
    redirect("/advisor/login");
  }

  return <AdvisorPortalContent />;
}
