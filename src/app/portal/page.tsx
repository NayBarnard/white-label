import type { Metadata } from "next";
import { ClientDashboard } from "@/components/ClientDashboard";

export const metadata: Metadata = {
  title: "Client demonstration portal",
  description: "A local client portal demonstration using fictional browser-only data.",
  openGraph: {
    title: "Client demonstration portal | your firm",
    description: "A local client portal demonstration using fictional browser-only data.",
    url: "/portal",
    siteName: "your firm",
    type: "website",
  },
  robots: { index: false, follow: false },
};

export const instant = false;

export default function PortalPage() {
  return <ClientDashboard />;
}
