import type { Metadata } from "next";
import { AdvisorLoginForm } from "@/components/AdvisorLoginForm";

export const metadata: Metadata = {
  title: "Platform operator sign-in",
  description: "Secure sign-in for WEALTH OS platform operators.",
  robots: { index: false, follow: false },
};

export default function PlatformLoginPage() {
  return <AdvisorLoginForm allowedRole="platform_operator" />;
}
