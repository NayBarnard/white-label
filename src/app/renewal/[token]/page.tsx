import type { Metadata } from "next";
import { RenewalPackClient } from "@/components/renewal-packs/RenewalPackClient";

export const metadata: Metadata = {
  title: "Secure Client Renewal",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function RenewalPackPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <RenewalPackClient token={token} />;
}
