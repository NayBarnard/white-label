import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminSetupStatus } from "@/components/AdminSetupStatus";
import { getAdminPageUser } from "@/lib/admin/server";
import { getEnvironmentChecks } from "@/lib/admin/setup-status";

export const metadata: Metadata = {
  title: "Setup status",
  description: "Private deployment and content setup checklist.",
  robots: { index: false, follow: false },
};

export default async function AdminSetupPage() {
  const user = await getAdminPageUser();
  if (!user) notFound();
  return <AdminSetupStatus initialEnvironment={getEnvironmentChecks()} />;
}
