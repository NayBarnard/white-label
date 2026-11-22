import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Client portal",
  description: "Secure client portal sign-in.",
  openGraph: {
    title: "Client portal login",
    description: "Secure client portal sign-in.",
    url: "/portal/dashboard",
    siteName: "your firm",
    type: "website",
  },
  robots: { index: false, follow: false },
};

export default function PortalDashboardPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-5 py-16 text-center">
      <p className="text-xs font-bold tracking-[0.18em] text-[var(--accent)]">SECURE CLIENT ACCESS</p>
      <h1 className="mt-3 text-4xl font-semibold">Client Portal</h1>
      <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--muted)]">
        Sign in to access your authorised accounts, documents and adviser communication.
      </p>
      <Link
        href="/portal"
        className="mt-7 inline-flex min-h-12 items-center rounded-full bg-[var(--accent-fill)] px-6 text-sm font-bold text-[var(--button-text)]"
      >
        Open client portal
      </Link>
    </main>
  );
}
