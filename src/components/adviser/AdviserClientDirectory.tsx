"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ClientRow = {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  portfolios: Array<{ id: string; label: string; valuation_zar: number | null }>;
};

export function AdviserClientDirectory() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/advisor/clients", { cache: "no-store" });
        if (!response.ok) throw new Error("Client records could not be loaded.");
        const data = await response.json();
        if (active) setClients(Array.isArray(data.clients) ? data.clients : []);
      } catch (loadError) {
        console.error("Adviser client directory could not be loaded.", loadError);
        if (active) setError("Authorised client records could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return clients.filter((client) => {
      const matchesQuery = `${client.name} ${client.email}`.toLowerCase().includes(normalized);
      const matchesStatus = status === "all" || (status === "active" ? client.isActive : !client.isActive);
      return matchesQuery && matchesStatus;
    });
  }, [clients, query, status]);

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-10 lg:px-8">
      <header>
        <p className="text-xs font-bold tracking-[0.18em] text-[var(--accent)]">AUTHORISER CLIENT DIRECTORY</p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)]">My Clients</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Only clients with an active adviser relationship are shown.</p>
      </header>

      {error ? <p role="alert" className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm">{error}</p> : null}

      <section className="placeholder-glass-card mt-6 rounded-3xl p-5 sm:p-7">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Search
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name or email"
              className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 text-sm"
            />
          </label>
          <label className="text-sm font-medium">
            Status
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 text-sm"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        </div>

        {loading ? (
          <p role="status" className="mt-6 text-sm text-[var(--muted)]">Loading authorised clients…</p>
        ) : visible.length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed border-[var(--border-strong)] p-5 text-sm text-[var(--muted)]">
            No authorised clients match these filters.
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs text-[var(--muted)]">
                  <th className="py-3">Client</th>
                  <th>Status</th>
                  <th>Investment accounts</th>
                  <th>Reported value</th>
                  <th>Profile</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((client) => {
                  const reported = client.portfolios
                    .map((portfolio) => portfolio.valuation_zar)
                    .filter((value): value is number => value !== null)
                    .reduce((total, value) => total + value, 0);
                  const hasValues = client.portfolios.some((portfolio) => portfolio.valuation_zar !== null);
                  return (
                    <tr key={client.id} className="border-b border-[var(--border)]">
                      <td className="py-4">
                        <p className="font-semibold">{client.name || client.email}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">{client.email}</p>
                      </td>
                      <td>{client.isActive ? "Active" : "Inactive"}</td>
                      <td>{client.portfolios.length}</td>
                      <td>{hasValues ? new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(reported) : "Not reported"}</td>
                      <td>
                        <Link href={`/advisor/clients/${client.id}`} className="inline-flex min-h-9 items-center rounded-full border border-[var(--border-strong)] px-3 font-semibold text-[var(--accent)]">
                          Open profile
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
