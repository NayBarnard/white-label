"use client";

import { useEffect, useState } from "react";

type Person = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  lastSignInAt: string | null;
  createdAt: string;
};

type CsvRow = {
  row: number;
  email: string;
  fullName: string;
  adviserEmail: string;
  errors: string[];
};

const inputClass = "mt-2 min-h-11 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]";

export function PeopleScreen() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [csv, setCsv] = useState("");
  const [preview, setPreview] = useState<CsvRow[]>([]);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/people", { cache: "no-store" });
      if (!response.ok) throw new Error("People records could not be loaded.");
      const data = await response.json();
      setPeople(Array.isArray(data.people) ? data.people : []);
    } catch (error) {
      console.error("People screen could not load.", error);
      setMessage("People records could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function act(userId: string, action: string, confirmEmailOrRole?: string) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "role"
            ? { action, userId, role: confirmEmailOrRole, confirmEmail: confirmEmailOrRole === "admin"
              ? window.prompt("Type the person's exact email to confirm admin access:")
              : undefined }
            : { action, userId, confirmEmail: confirmEmailOrRole },
        ),
      });
      if (!response.ok) throw new Error("The action could not be completed.");
      setMessage("People record updated.");
      await load();
    } catch (error) {
      console.error("People action failed.", error);
      setMessage("The action could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  async function previewCsv() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/people/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error("The CSV preview could not be loaded.");
      setPreview(Array.isArray(data.rows) ? data.rows : []);
    } catch (error) {
      console.error("CSV preview failed.", error);
      setMessage("The CSV preview could not be loaded.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmCsv() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/people/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv, confirmed: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error("The client import could not be completed.");
      setMessage(`${data.invitedCount ?? 0} client invitations sent.`);
      setPreview([]);
      setCsv("");
      await load();
    } catch (error) {
      console.error("CSV import failed.", error);
      setMessage("The client import could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  const visible = people.filter((person) => {
    const matchesSearch = `${person.fullName} ${person.email}`.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || person.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-10 lg:px-8">
      <header>
        <p className="text-xs font-bold tracking-[0.18em] text-[var(--accent)]">STAFF AND CLIENT ADMINISTRATION</p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--foreground)]">People</h1>
      </header>

      {message && <p role="status" className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm">{message}</p>}

      <section className="glass mt-6 rounded-3xl p-5 sm:p-7">
        <h2 className="text-lg font-semibold">Invite person</h2>
        <form
          className="mt-4 grid gap-3 md:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            void fetch("/api/admin/people", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "invite",
                email: String(form.get("email") ?? ""),
                fullName: String(form.get("fullName") ?? ""),
                role: String(form.get("role") ?? "client"),
                confirmEmail: String(form.get("confirmEmail") ?? ""),
              }),
            }).then(async (response) => {
              if (!response.ok) throw new Error("Invitation could not be sent.");
              setMessage("Invitation sent.");
              event.currentTarget.reset();
              await load();
            }).catch((error) => {
              console.error("Invitation failed.", error);
              setMessage("Invitation could not be sent.");
            });
          }}
        >
          <label className="text-sm">Email<input name="email" type="email" required maxLength={254} className={inputClass} /></label>
          <label className="text-sm">Full name<input name="fullName" required maxLength={160} className={inputClass} /></label>
          <label className="text-sm">Role
            <select name="role" className={inputClass} defaultValue="client">
              <option value="client">Client</option>
              <option value="adviser">Adviser</option>
              <option value="compliance">Compliance</option>
              <option value="operations">Operations</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <label className="text-sm">Type email again for an admin<input name="confirmEmail" type="email" className={inputClass} /></label>
          <button type="submit" disabled={busy} className="min-h-11 rounded-full bg-[var(--accent-fill)] px-5 text-sm font-bold text-[var(--button-text)] md:col-span-4">Send invitation</button>
        </form>
      </section>

      <section className="glass mt-6 rounded-3xl p-5 sm:p-7">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Search<input value={search} onChange={(event) => setSearch(event.target.value)} className={inputClass} /></label>
          <label className="text-sm">Role
            <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className={inputClass}>
              <option value="all">All roles</option>
              {["client", "adviser", "admin", "compliance", "operations"].map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
          </label>
        </div>
        {loading ? <p className="mt-5 text-sm text-[var(--muted)]">Loading people…</p> : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead><tr className="border-b border-[var(--border)]"><th className="py-3">Person</th><th>Role</th><th>Status</th><th>Last sign-in</th><th>Actions</th></tr></thead>
              <tbody>
                {visible.map((person) => (
                  <tr key={person.id} className="border-b border-[var(--border)]">
                    <td className="py-3"><p className="font-semibold">{person.fullName || person.email}</p><p className="text-xs text-[var(--muted)]">{person.email}</p></td>
                    <td>
                      <select
                        value={person.role}
                        disabled={busy}
                        aria-label={`Role for ${person.fullName || person.email}`}
                        onChange={(event) => void act(person.id, "role", event.target.value)}
                        className="min-h-9 rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-2 text-xs"
                      >
                        {["client", "adviser", "admin", "compliance", "operations"].map((role) => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </td>
                    <td>{person.isActive ? "Active" : "Deactivated"}</td>
                    <td>{person.lastSignInAt ? new Date(person.lastSignInAt).toLocaleString() : "Never"}</td>
                    <td>
                      <div className="flex flex-wrap gap-2 py-2">
                        <button type="button" disabled={busy} onClick={() => void act(person.id, person.isActive ? "deactivate" : "reactivate")} className="min-h-9 rounded-full border border-[var(--border-strong)] px-3 text-xs">{person.isActive ? "Deactivate" : "Reactivate"}</button>
                        <button type="button" disabled={busy} onClick={() => void act(person.id, "reset_password")} className="min-h-9 rounded-full border border-[var(--border-strong)] px-3 text-xs">Reset password email</button>
                        <button type="button" disabled={busy} onClick={() => void act(person.id, "reset_mfa")} className="min-h-9 rounded-full border border-[var(--border-strong)] px-3 text-xs">Reset MFA</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="glass mt-6 rounded-3xl p-5 sm:p-7">
        <h2 className="text-lg font-semibold">CSV client import preview</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">Maximum 500 rows. Header: email,full name,adviser email.</p>
        <textarea value={csv} onChange={(event) => setCsv(event.target.value)} rows={8} className={`${inputClass} font-mono`} />
        <button type="button" disabled={busy || !csv.trim()} onClick={() => void previewCsv()} className="mt-3 min-h-11 rounded-full border border-[var(--border-strong)] px-4 text-sm font-semibold">Preview</button>
        {preview.length > 0 && (
          <div className="mt-4">
            <ul className="max-h-64 overflow-auto text-sm">
              {preview.map((row) => <li key={row.row} className="border-b border-[var(--border)] py-2">Row {row.row}: {row.email || "missing email"} {row.errors.length ? `— ${row.errors.join(", ")}` : "— valid"}</li>)}
            </ul>
            <button type="button" disabled={busy} onClick={() => void confirmCsv()} className="mt-4 min-h-11 rounded-full bg-[var(--accent-fill)] px-5 text-sm font-bold text-[var(--button-text)]">Confirm and send invitations</button>
          </div>
        )}
      </section>
    </main>
  );
}
