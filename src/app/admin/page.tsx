import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminPageUser } from "@/lib/admin/server";

export const metadata: Metadata = {
  title: "Client administration",
  description: "Restricted client portfolio and document administration.",
  openGraph: {
    title: "Client administration | your firm",
    description: "Restricted client portfolio and document administration.",
    url: "/admin",
    siteName: "your firm",
    type: "website",
  },
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const user = await getAdminPageUser();
  if (!user) redirect("/admin/login");
  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-12 lg:px-8">
      <p className="text-xs font-bold tracking-[0.18em] text-[var(--accent)]">FIRM ADMINISTRATION</p>
      <h1 className="mt-2 text-3xl font-semibold">Administration dashboard</h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
        Manage your firm&apos;s people, documents, platforms and compliance records.
      </p>
      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ["People and access", "/admin/people"],
          ["Firm platforms", "/admin/platforms"],
          ["Documents", "/admin/manager-updates"],
          ["Firm setup", "/admin/setup"],
        ].map(([title, href]) => (
          <Link key={href} href={href} className="rounded-2xl border border-[var(--border)] p-5 font-semibold hover:border-[var(--accent)]">
            {title}
          </Link>
        ))}
      </div>
    </main>
  );
}
