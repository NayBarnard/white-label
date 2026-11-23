"use client";

import { useState, type FormEvent } from "react";

type Firm = {
  id: string;
  name: string;
  trading_name: string;
  status: "pending" | "active" | "suspended";
  primary_domain: string | null;
  created_at: string;
};

export function PlatformFirmManager({ initialFirms }: { initialFirms: Firm[] }) {
  const [firms, setFirms] = useState(initialFirms);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function createFirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/platform/firms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: String(form.get("id") ?? "").trim(),
          name: String(form.get("name") ?? "").trim(),
          trading_name: String(form.get("trading_name") ?? "").trim(),
          primary_domain: String(form.get("domain") ?? "").trim() || null,
        }),
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "The firm could not be created.");
      setFirms((current) => [payload.firm, ...current]);
      setMessage("Firm created.");
      event.currentTarget.reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The firm could not be created.");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, status: "pending" | "active" | "suspended") {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/platform/firms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "The firm status could not be updated.");
      setFirms((current) => current.map((firm) => firm.id === id ? { ...firm, status } : firm));
      setMessage(`Firm ${status}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The firm status could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  async function inviteAdministrator(firmId: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/platform/firms/${firmId}/onboarding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(form.get("email") ?? "").trim(),
          role: "firm_administrator",
        }),
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "The administrator could not be invited.");
      setMessage("Firm administrator invitation created.");
      event.currentTarget.reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The administrator could not be invited.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <form onSubmit={createFirm} className="mt-6 grid gap-3 rounded-2xl border border-[var(--border)] p-5 sm:grid-cols-2">
        <label className="text-sm font-semibold">Firm ID
          <input name="id" required pattern="[a-z0-9][a-z0-9_-]{0,62}" className="mt-2 block min-h-11 w-full rounded-xl border border-[var(--border-strong)] px-3" />
        </label>
        <label className="text-sm font-semibold">Domain
          <input name="domain" type="text" className="mt-2 block min-h-11 w-full rounded-xl border border-[var(--border-strong)] px-3" />
        </label>
        <label className="text-sm font-semibold">Legal name
          <input name="name" required maxLength={160} className="mt-2 block min-h-11 w-full rounded-xl border border-[var(--border-strong)] px-3" />
        </label>
        <label className="text-sm font-semibold">Trading name
          <input name="trading_name" required maxLength={160} className="mt-2 block min-h-11 w-full rounded-xl border border-[var(--border-strong)] px-3" />
        </label>
        <button type="submit" disabled={busy} className="min-h-11 rounded-xl bg-[var(--accent-fill)] px-4 text-sm font-bold text-[var(--button-text)] sm:col-span-2">
          Create firm
        </button>
      </form>
      {message && <p role="status" className="mt-4 text-sm">{message}</p>}
      {firms.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-[var(--border)] p-6 text-sm text-[var(--muted)]">No firms have been created.</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--border)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--surface)]">
              <tr><th className="px-4 py-3">Firm</th><th className="px-4 py-3">Domain</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr>
            </thead>
            <tbody>
              {firms.map((firm) => (
                <tr key={firm.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-4 font-semibold">{firm.trading_name}</td>
                  <td className="px-4 py-4 text-[var(--muted)]">{firm.primary_domain ?? "Not configured"}</td>
                  <td className="px-4 py-4 capitalize">{firm.status}</td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      {firm.status !== "active" && <button type="button" disabled={busy} onClick={() => setStatus(firm.id, "active")} className="rounded-lg border px-3 py-2">Activate</button>}
                      {firm.status !== "suspended" && <button type="button" disabled={busy} onClick={() => setStatus(firm.id, "suspended")} className="rounded-lg border px-3 py-2">Suspend</button>}
                    </div>
                    <form onSubmit={(event) => inviteAdministrator(firm.id, event)} className="mt-3 flex max-w-md gap-2">
                      <label className="sr-only" htmlFor={`administrator-${firm.id}`}>Administrator email</label>
                      <input id={`administrator-${firm.id}`} name="email" type="email" required placeholder="Administrator email" className="min-h-11 min-w-0 flex-1 rounded-lg border border-[var(--border-strong)] px-3" />
                      <button type="submit" disabled={busy} className="rounded-lg border px-3 py-2 font-semibold">Invite</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
