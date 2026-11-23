"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Overview = {
  clients: number;
  assignedClients: number;
  advisers: number;
  openTasks: number;
  unreadNotifications: number;
  onboardingStatus: string;
};

export function AdminDashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    void fetch("/api/admin/dashboard", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Firm overview could not be loaded.");
        return (await response.json()) as { overview: Overview };
      })
      .then((payload) => {
        if (active) setOverview(payload.overview);
      })
      .catch((error: unknown) => {
        if (active) setMessage(error instanceof Error ? error.message : "Firm overview could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-12 lg:px-8">
      <p className="text-xs font-bold tracking-[0.18em] text-[var(--accent)]">FIRM ADMINISTRATION</p>
      <h1 className="mt-2 text-3xl font-semibold">Administration dashboard</h1>
      {message ? <p role="alert" className="mt-4 rounded-xl border border-red-500/30 p-4 text-sm">{message}</p> : null}
      {overview ? (
        <section aria-label="Firm overview" className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Clients", overview.clients],
            ["Assigned clients", overview.assignedClients],
            ["Advisers", overview.advisers],
            ["Open tasks", overview.openTasks],
            ["Unread notifications", overview.unreadNotifications],
            ["Onboarding", overview.onboardingStatus.replaceAll("_", " ")],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl border border-[var(--border)] p-5">
              <p className="text-sm text-[var(--muted)]">{label}</p>
              <p className="mt-2 text-2xl font-semibold capitalize">{value}</p>
            </div>
          ))}
        </section>
      ) : (
        <p className="mt-7 text-sm text-[var(--muted)]">Loading firm overview…</p>
      )}
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
