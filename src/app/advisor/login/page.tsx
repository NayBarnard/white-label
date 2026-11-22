import type { Metadata } from "next";
import { AdvisorLoginForm } from "@/components/AdvisorLoginForm";

export const metadata: Metadata = {
  title: "Staff sign-in",
  description: "Secure sign-in for authorised your firm staff.",
  robots: { index: false, follow: false },
};

export const instant = false;

export default function AdvisorLoginPage() {
  return <AdvisorLoginForm allowedRole="adviser" />;
}
