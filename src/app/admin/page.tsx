import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminBackOffice } from "@/components/AdminBackOffice";
import { getAdminPageUser } from "@/lib/admin/server";

export const metadata: Metadata = {
  title: "Client administration",
  description: "Restricted client portfolio and document administration.",
  openGraph: {
    title: "Client administration | PLACEHOLDER BRAND",
    description: "Restricted client portfolio and document administration.",
    url: "/admin",
    siteName: "PLACEHOLDER BRAND",
    type: "website",
  },
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const user = await getAdminPageUser();
  if (!user) notFound();
  return <AdminBackOffice />;
}
