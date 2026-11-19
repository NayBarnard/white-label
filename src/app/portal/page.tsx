import type { Metadata } from "next";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthenticatedClientPortal } from "@/components/AuthenticatedClientPortal";
import type { PortalDatabase } from "@/lib/supabase/portal";
import { getPostLoginDestination } from "@/lib/staff/routing";

export const metadata: Metadata = {
  title: "Client portal",
  description: "Secure access to client portfolio information and documents from PLACEHOLDER BRAND.",
  openGraph: {
    title: "Client portal | PLACEHOLDER BRAND",
    description: "Secure access to client portfolio information and documents from PLACEHOLDER BRAND.",
    url: "/portal",
    siteName: "PLACEHOLDER BRAND",
    type: "website",
  },
  robots: { index: false, follow: false },
};

export const instant = false;

export default async function PortalPage() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) redirect("/portal/dashboard");

  const supabase = createServerClient<PortalDatabase>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    },
  });
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error("Could not verify the client portal session.", error);
    redirect("/portal/dashboard");
  }
  if (!user) redirect("/portal/dashboard");
  const role = user.app_metadata?.role;
  const destination = getPostLoginDestination(role);
  if (destination && destination !== "/portal") redirect(destination);
  if (!destination) {
    await supabase.auth.signOut();
    redirect("/portal/dashboard");
  }

  return (
    <AuthenticatedClientPortal
      user={{
        id: user.id,
        email: user.email ?? "",
        name: typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : "",
      }}
    />
  );
}
