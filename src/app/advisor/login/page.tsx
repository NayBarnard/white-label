import type { Metadata } from "next";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAal2Claims } from "@/lib/staff/mfa";
import { getPostLoginDestination } from "@/lib/staff/routing";
import { AdvisorLoginForm } from "@/components/AdvisorLoginForm";
import { canAccessAdviserPortal } from "@/lib/adviser/access";
import type { PortalDatabase } from "@/lib/supabase/portal";

export const metadata: Metadata = {
  title: "Staff sign-in",
  description: "Secure sign-in for authorised PLACEHOLDER BRAND staff.",
  robots: { index: false, follow: false },
};

export const instant = false;

export default async function AdvisorLoginPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return <AdvisorLoginForm />;
  }

  const cookieStore = await cookies();
  const supabase = createServerClient<PortalDatabase>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    },
  });
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error("Could not verify the advisor login session.", error);
  } else if (user && canAccessAdviserPortal(user.app_metadata.role)) {
    const claims = await supabase.auth.getClaims();
    if (!claims.error && isAal2Claims(claims.data?.claims)) {
      const destination = getPostLoginDestination(user.app_metadata.role);
      if (destination) redirect(destination);
    }
  }

  return <AdvisorLoginForm />;
}
