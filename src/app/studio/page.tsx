import type { Metadata } from "next";
import { LocalContentStudio } from "@/components/local/LocalContentStudio";

export const metadata: Metadata = {
  title: "Website studio",
  description: "Restricted PLACEHOLDER BRAND homepage editing studio.",
  openGraph: {
    title: "Website studio | PLACEHOLDER BRAND",
    description: "Restricted PLACEHOLDER BRAND homepage editing studio.",
    url: "/studio",
    siteName: "PLACEHOLDER BRAND",
    type: "website",
  },
  robots: { index: false, follow: false },
};

export default function StudioPage() {
  return <LocalContentStudio />;
}
