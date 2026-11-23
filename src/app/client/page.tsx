import type { Metadata } from "next";
import { LocalClientPortal } from "@/components/local/LocalClientPortal";

export const metadata: Metadata = {
  title: "Client experience",
  description: "Local fictional client wealth-management demonstration.",
  robots: { index: false, follow: false },
};

export default function ClientPage() {
  return <LocalClientPortal />;
}
