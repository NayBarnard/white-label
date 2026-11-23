import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { authorizePlatformApi } from "@/lib/platform/server";

export const metadata: Metadata = {
  title: "WEALTH OS platform administration",
  description: "Platform operator tenant and operational controls.",
  robots: { index: false, follow: false },
};

export default async function PlatformPage() {
  const access = await authorizePlatformApi();
  if (!access.ok) redirect("/platform/login");
  const { data: firms } = await access.supabase
    .from("wealth_os_tenants")
    .select("id,name,status,primary_domain,created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  const activeCount = firms?.filter((firm) => firm.status === "active").length ?? 0;
  const pendingCount = firms?.filter((firm) => firm.status === "pending").length ?? 0;
  const suspendedCount = firms?.filter((firm) => firm.status === "suspended").length ?? 0;

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-12 lg:px-8">
      <p className="text-xs font-bold tracking-[0.18em] text-[var(--accent)]">WEALTH OS PLATFORM</p>
      <h1 className="mt-2 text-3xl font-semibold">Platform operator dashboard</h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
        Manage tenant onboarding, activation, suspension and platform audit information.
      </p>
      <section aria-label="Tenant overview" className="mt-7 grid gap-4 sm:grid-cols-3">
        {[
          ["Active firms", activeCount],
          ["Pending firms", pendingCount],
          ["Suspended firms", suspendedCount],
        ].map(([label, count]) => (
          <div key={String(label)} className="rounded-2xl border border-[var(--border)] p-5">
            <p className="text-sm text-[var(--muted)]">{label}</p>
            <p className="mt-2 text-3xl font-semibold">{count}</p>
          </div>
        ))}
      </section>
      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <a href="/platform/firms" className="rounded-2xl border border-[var(--border)] p-5 font-semibold hover:border-[var(--accent)]">
          View all firms
        </a>
      </div>
    </main>
  );
}
