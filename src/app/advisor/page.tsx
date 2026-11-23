import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdvisorPortalContent } from "@/components/AdvisorPortalContent";
import { getAdviserPageUser } from "@/lib/adviser/server";
import { LocalAdviserPortal } from "@/components/local/LocalAdviserPortal";
import { isStandaloneLocalMode } from "@/lib/deployment/routing";

export const metadata: Metadata = {
  title: "Adviser demonstration portal",
  description: "A local, fictional-data adviser portal demonstration for your firm.",
  robots: { index: false, follow: false },
};

export const instant = false;

export default async function AdvisorPage() {
  const standalone = isStandaloneLocalMode(
    process.env.APP_MODE,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  if (standalone) return <LocalAdviserPortal />;
  const user = await getAdviserPageUser();
  if (!user) redirect("/advisor/login");
  return <AdvisorPortalContent />;
}
