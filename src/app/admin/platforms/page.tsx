import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminPlatformsPage } from "@/components/platforms/AdminPlatformsPage";
import { getAdminPageUser } from "@/lib/admin/server";

export const metadata: Metadata = {
  title: "Platform administration",
  description: "Restricted administration of platform availability and fund identifiers.",
  robots: { index: false, follow: false },
};

export default async function AdminPlatformsRoute() {
  const user = await getAdminPageUser();
  if (!user) notFound();
  return <AdminPlatformsPage />;
}
