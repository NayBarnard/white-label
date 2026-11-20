import type { Metadata } from "next";
import { LocalAdviserPortal } from "@/components/local/LocalAdviserPortal";

export const metadata: Metadata = {
  title: "Advisor Portal",
  description: "Published PLACEHOLDER BRAND fund information and resources for financial advisors.",
  robots: { index: false, follow: false },
};

export const instant = false;

export default function AdvisorPage() {
  return <LocalAdviserPortal />;
}
