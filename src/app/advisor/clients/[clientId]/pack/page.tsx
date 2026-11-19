import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdviserPageUser } from "@/lib/adviser/server";
import { AdviserPackGenerator } from "@/components/adviser/AdviserPackGenerator";

export const metadata: Metadata = {
  title: "Adviser Pack Generator",
  robots: { index: false, follow: false },
};

export default async function AdviserPackPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const user = await getAdviserPageUser();
  if (!user) redirect("/advisor/login");
  const { clientId } = await params;
  return <AdviserPackGenerator clientId={clientId} />;
}
