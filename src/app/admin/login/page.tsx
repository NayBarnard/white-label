import type { Metadata } from "next";
import { AdvisorLoginForm } from "@/components/AdvisorLoginForm";

export const metadata: Metadata = {
  title: "Administrator sign-in",
  description: "Secure sign-in for authorised firm administrators.",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return <AdvisorLoginForm allowedRole="admin" />;
}
