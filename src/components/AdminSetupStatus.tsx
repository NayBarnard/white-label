"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  statusClass,
  type EnvironmentCheck,
  type SetupCheck,
} from "@/lib/admin/setup-status";

type SetupData = {
  environment: EnvironmentCheck[];
  migrations: SetupCheck[];
  buckets: SetupCheck[];
  documents: SetupCheck[];
  features: (SetupCheck & { enabled: boolean; flagName: string })[];
  siteUrl: SetupCheck;
  demoAccounts: SetupCheck;
  content: SetupCheck[];
};

function CheckList({
  title,
  checks,
}: {
  title: string;
  checks: SetupCheck[];
}) {
  return (
    <section className="glass rounded-3xl p-5 sm:p-7">
      <h2 className="text-lg font-semibold">{title}</h2>
      <ul className="mt-4 space-y-3">
        {checks.map((check) => (
          <li key={check.id} className="glass-inset rounded-xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">{check.title}</h3>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(check.status)}`}>
                {check.status === "green" ? "Ready" : check.status === "red" ? "Action needed" : "Check"}
              </span>
            </div>
            <p className="mt-2 text-sm text-[var(--muted)]">{check.detail}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Next: {check.nextStep}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function AdminSetupStatus({
  initialEnvironment,
}: {
  initialEnvironment: EnvironmentCheck[];
}) {
  const [setup, setSetup] = useState<SetupData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void fetch("/api/admin/setup", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Setup checks could not be loaded.");
        return (await response.json()) as SetupData;
      })
      .then((result) => {
        if (active) setSetup(result);
      })
      .catch((error: unknown) => {
        console.error("Admin setup status could not be loaded.", error);
        if (active) setLoadError("Some setup checks are unavailable right now. Check the required environment variables and refresh.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const environment = setup?.environment ?? initialEnvironment;
  const features = setup?.features ?? [];

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-10 lg:px-8 lg:py-14">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-[var(--accent)]">ADMINISTRATION</p>
          <h1 className="mt-2 text-3xl font-semibold">Setup status</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            A private checklist for deployment, database, document, feature, and content setup.
          </p>
        </div>
        <Link href="/admin" className="text-sm font-semibold text-[var(--accent)] underline underline-offset-4">
          Return to administration
        </Link>
      </header>

      {loadError ? (
        <p role="status" className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-[var(--foreground)]">
          {loadError}
        </p>
      ) : null}
      {loading ? (
        <p role="status" className="mb-5 text-sm text-[var(--muted)]">Loading database and deployment checks…</p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <CheckList title="Required environment variables" checks={environment} />
        {setup ? <CheckList title="Database migrations" checks={setup.migrations} /> : null}
        {setup ? <CheckList title="Private storage buckets" checks={setup.buckets} /> : null}
        {setup ? <CheckList title="Real PDF documents" checks={setup.documents} /> : null}
        {setup ? (
          <CheckList
            title="Feature flags"
            checks={features.map((feature) => ({
              ...feature,
              title: `${feature.title} · ${feature.enabled ? "On" : "Off"}`,
            }))}
          />
        ) : null}
        {setup ? (
          <CheckList title="Site and demo configuration" checks={[setup.siteUrl, setup.demoAccounts]} />
        ) : null}
        {setup ? <CheckList title="Firm content" checks={setup.content} /> : null}
      </div>
    </main>
  );
}
