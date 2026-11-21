import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HomePageStudio } from "@/components/home/HomePageStudio";
import { getAdminPageUser } from "@/lib/admin/server";
import { isStandaloneLocalMode } from "@/lib/deployment/routing";
import { isLocalStudioDemoAllowed } from "@/lib/studio/mode";

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
  const standaloneLocalMode = isStandaloneLocalMode(
    process.env.APP_MODE,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  const localDemo = isLocalStudioDemoAllowed(process.env.NODE_ENV, process.env.STUDIO_DEMO_MODE) || standaloneLocalMode;
  if (!localDemo && !(await getAdminPageUser())) notFound();
  return <HomePageStudio />;
}
