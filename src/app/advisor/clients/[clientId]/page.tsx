import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdviserPageUser } from "@/lib/adviser/server";
import { AdviserClientProfile } from "@/components/adviser/AdviserClientProfile";

export const metadata: Metadata = {
  title: "Client Profile",
  robots: { index: false, follow: false },
};

export default async function AdviserClientProfilePage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const user = await getAdviserPageUser();
  if (!user) redirect("/advisor/login");
  const { clientId } = await params;
  return <AdviserClientProfile clientId={clientId} />;
}
