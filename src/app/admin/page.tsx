import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminPageUser } from "@/lib/admin/server";
import { AdminDashboard } from "@/components/AdminDashboard";
import { LocalAdminPortal } from "@/components/local/LocalAdminPortal";
import { isStandaloneLocalMode } from "@/lib/deployment/routing";

export const metadata: Metadata = {
  title: "Client administration",
  description: "Restricted client portfolio and document administration.",
  openGraph: {
    title: "Client administration | your firm",
    description: "Restricted client portfolio and document administration.",
    url: "/admin",
    siteName: "your firm",
    type: "website",
  },
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const standalone = isStandaloneLocalMode(
    process.env.APP_MODE,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  if (standalone) return <LocalAdminPortal />;
  const user = await getAdminPageUser();
  if (!user) redirect("/admin/login");
  return <AdminDashboard />;
}
