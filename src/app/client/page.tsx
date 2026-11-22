import type { Metadata } from "next";
import { ClientDashboard } from "@/components/ClientDashboard";

export const metadata: Metadata = {
  title: "Client experience",
  description: "Local fictional client wealth-management demonstration.",
  robots: { index: false, follow: false },
};

export default function ClientPage() {
  return <ClientDashboard />;
}
