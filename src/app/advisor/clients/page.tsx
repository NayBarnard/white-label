import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdviserPageUser } from "@/lib/adviser/server";
import { AdviserClientDirectory } from "@/components/adviser/AdviserClientDirectory";

export const metadata: Metadata = {
  title: "My Clients",
  robots: { index: false, follow: false },
};

export default async function AdviserClientsPage() {
  const user = await getAdviserPageUser();
  if (!user) redirect("/advisor/login");
  return <AdviserClientDirectory />;
}
