import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HomePageStudio } from "@/components/home/HomePageStudio";
import { getAdminPageUser } from "@/lib/admin/server";

export const metadata: Metadata = {
  title: "Website studio",
  description: "Private homepage editing and publishing workspace.",
  openGraph: {
    title: "Website Studio",
    description: "Private homepage editing and publishing workspace.",
    url: "/studio",
    siteName: "Website Studio",
    type: "website",
  },
  robots: { index: false, follow: false },
};

export default async function StudioPage() {
  const user = await getAdminPageUser();
  if (!user) notFound();
  return <HomePageStudio administratorEmail={user.email ?? "Administrator"} />;
}
