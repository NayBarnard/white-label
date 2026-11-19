import type { Metadata } from "next";
import { ClientDashboard } from "@/components/ClientDashboard";
import { Mail, Phone } from "lucide-react";
import { company } from "@/data/firmData";
import { LargeTitle } from "@/components/IOSKit";

export const metadata: Metadata = {
  title: "Client portal login",
  description: "Login to the PLACEHOLDER BRAND client portal to view secure account information.",
  openGraph: {
    title: "Client portal login | PLACEHOLDER BRAND",
    description: "Login to the PLACEHOLDER BRAND client portal to view secure account information.",
    url: "/portal/dashboard",
    siteName: "PLACEHOLDER BRAND",
    type: "website",
  },
  robots: { index: false, follow: false },
};

export default function PortalDashboardPage() {
  return (
    <main className="flex-1">
      <LargeTitle
        eyebrow="SECURE CLIENT ACCESS"
        title="Client Portal"
        description="Login to view your account, or request secure email access if you are a new client."
      >
        <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm">
          <li>
            <a
              href={`tel:${company.phone.replaceAll(" ", "")}`}
              className="inline-flex min-h-11 items-center gap-2 font-semibold text-[var(--foreground)] hover:text-[var(--accent)]"
            >
              <Phone size={15} className="text-[var(--accent)]" /> {company.phone}
            </a>
          </li>
          <li>
            <a
              href={`mailto:${company.email}`}
              className="inline-flex min-h-11 items-center gap-2 font-semibold text-[var(--foreground)] hover:text-[var(--accent)]"
            >
              <Mail size={15} className="text-[var(--accent)]" /> {company.email}
            </a>
          </li>
        </ul>
        <p className="mt-2 text-xs font-medium tracking-wide text-[var(--accent)]">
          GENUINELY DIVERSIFIED · COST-CONSCIOUS · RELATIONSHIP-DRIVEN
        </p>
      </LargeTitle>
      <ClientDashboard />
    </main>
  );
}
