import type { Metadata } from "next";
import { LocalAdviserPortal } from "@/components/local/LocalAdviserPortal";

export const metadata: Metadata = {
  title: "Adviser demonstration portal",
  description: "A local, fictional-data adviser portal demonstration for PLACEHOLDER BRAND.",
  robots: { index: false, follow: false },
};

export const instant = false;

export default function AdvisorPage() {
  return <LocalAdviserPortal />;
}
