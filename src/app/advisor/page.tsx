import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdvisorPortalContent } from "@/components/AdvisorPortalContent";
import { getAdviserPageUser } from "@/lib/adviser/server";

export const metadata: Metadata = {
  title: "Adviser demonstration portal",
  description: "A local, fictional-data adviser portal demonstration for your firm.",
  robots: { index: false, follow: false },
};

export const instant = false;

export default async function AdvisorPage() {
  const user = await getAdviserPageUser();
  if (!user) redirect("/advisor/login");
  return <AdvisorPortalContent />;
}
