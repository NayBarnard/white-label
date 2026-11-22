import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdviserSearch } from "@/components/adviser/AdviserSearch";
import { getAdviserPageUser } from "@/lib/adviser/server";

export const metadata: Metadata = {
  title: "Universal search",
  description: "Search authorised adviser resources and client information.",
  robots: { index: false, follow: false },
};

export default async function AdviserSearchPage() {
  const user = await getAdviserPageUser();
  if (!user) redirect("/advisor/login");
  return <AdviserSearch />;
}
