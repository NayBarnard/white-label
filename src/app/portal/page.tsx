import type { Metadata } from "next";
import { LocalClientPortal } from "@/components/local/LocalClientPortal";

export const metadata: Metadata = {
  title: "Client portal",
  description: "Secure access to client portfolio information and documents from PLACEHOLDER BRAND.",
  openGraph: {
    title: "Client portal | PLACEHOLDER BRAND",
    description: "Secure access to client portfolio information and documents from PLACEHOLDER BRAND.",
    url: "/portal",
    siteName: "PLACEHOLDER BRAND",
    type: "website",
  },
  robots: { index: false, follow: false },
};

export const instant = false;

export default function PortalPage() {
  return <LocalClientPortal />;
}
