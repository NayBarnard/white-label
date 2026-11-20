import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Client portal login",
  description: "Open the local demonstration client portal.",
  openGraph: {
    title: "Client portal login | PLACEHOLDER BRAND",
    description: "Open the local demonstration client portal.",
    url: "/portal/dashboard",
    siteName: "PLACEHOLDER BRAND",
    type: "website",
  },
  robots: { index: false, follow: false },
};

export default function PortalDashboardPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-5 py-16 text-center">
      <p className="text-xs font-bold tracking-[0.18em] text-[var(--accent)]">LOCAL DEMONSTRATION</p>
      <h1 className="mt-3 text-4xl font-semibold">Client Portal</h1>
      <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--muted)]">
        No sign-in or database is required. This standalone demo uses fictional account
        data stored in your browser.
      </p>
      <Link
        href="/portal"
        className="mt-7 inline-flex min-h-12 items-center rounded-full bg-[var(--accent-fill)] px-6 text-sm font-bold text-[var(--button-text)]"
      >
        Open demo portal
      </Link>
    </main>
  );
}
