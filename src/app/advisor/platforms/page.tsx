import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdviserPlatformsPage } from "@/components/platforms/AdviserPlatformsPage";
import { canAccessAdviserPortal } from "@/lib/adviser/access";
import { getAdviserPageUser } from "@/lib/adviser/server";

export const metadata: Metadata = {
  title: "Platform Matrix",
  description: "Authorised adviser platform availability and fund-code lookup.",
  robots: { index: false, follow: false },
};

export default async function AdviserPlatformsRoute() {
  const user = await getAdviserPageUser();
  if (!user) redirect("/advisor/login");
  if (!canAccessAdviserPortal(user.app_metadata.role)) redirect("/advisor/login");
  return <AdviserPlatformsPage />;
}
