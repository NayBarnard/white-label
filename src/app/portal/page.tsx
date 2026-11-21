import type { Metadata } from "next";
import { LocalClientPortal } from "@/components/local/LocalClientPortal";

export const metadata: Metadata = {
  title: "Client demonstration portal",
  description: "A local client portal demonstration using fictional browser-only data.",
  openGraph: {
    title: "Client demonstration portal | PLACEHOLDER BRAND",
    description: "A local client portal demonstration using fictional browser-only data.",
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
