import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminManagerUpdates } from "@/components/AdminManagerUpdates";
import { features } from "@/config/features";
import { getAdminPageUser } from "@/lib/admin/server";

export const metadata: Metadata = {
  title: "Manager Updates administration",
  robots: { index: false, follow: false },
};

export default async function AdminManagerUpdatesPage() {
  if (!features.managerUpdates) notFound();
  const user = await getAdminPageUser();
  if (!user) notFound();
  return <AdminManagerUpdates />;
}
