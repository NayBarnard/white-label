import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authorizePlatformApi } from "@/lib/platform/server";
import { PlatformFirmManager } from "@/components/platform/PlatformFirmManager";

export const metadata: Metadata = {
  title: "Tenant firms",
  description: "Platform operator tenant directory.",
  robots: { index: false, follow: false },
};

export default async function PlatformFirmsPage() {
  const access = await authorizePlatformApi();
  if (!access.ok) redirect("/platform/login");
  const { data: firms, error } = await access.supabase
    .from("wealth_os_tenants")
    .select("id,name,trading_name,status,primary_domain,created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-12 lg:px-8">
      <Link href="/platform" className="text-sm font-semibold text-[var(--accent)] underline underline-offset-4">
        Return to platform dashboard
      </Link>
      <h1 className="mt-4 text-3xl font-semibold">Firm directory</h1>
      {error ? (
        <p className="mt-6 rounded-xl border border-red-500/30 p-4 text-sm">The firm directory could not be loaded.</p>
      ) : (
        <PlatformFirmManager initialFirms={firms ?? []} />
      )}
    </main>
  );
}
