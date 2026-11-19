import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAdminPageUser } from "@/lib/admin/server";
import { PeopleScreen } from "@/components/PeopleScreen";

export const metadata: Metadata = {
  title: "People",
  robots: { index: false, follow: false },
};

export default async function PeoplePage() {
  const user = await getAdminPageUser();
  if (!user) notFound();
  return <PeopleScreen />;
}
