import type { Metadata } from "next";
import { LocalAdminPortal } from "@/components/local/LocalAdminPortal";

export const metadata: Metadata = {
  title: "Client administration",
  description: "Restricted client portfolio and document administration.",
  openGraph: {
    title: "Client administration | PLACEHOLDER BRAND",
    description: "Restricted client portfolio and document administration.",
    url: "/admin",
    siteName: "PLACEHOLDER BRAND",
    type: "website",
  },
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <LocalAdminPortal />;
}
