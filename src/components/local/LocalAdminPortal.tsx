"use client";

import { useMemo, useState } from "react";
import { demoClients, demoDocuments } from "@/data/demo";
import { resetLocalDemo, useLocalState } from "@/lib/local-store";

type Person = { id: string; name: string; email: string; role: "Client" | "Adviser" | "Admin"; active: boolean };

export function LocalAdminPortal() {
  const [people, setPeople] = useLocalState<Person[]>("example-wealth.admin.people", [
    ...demoClients.map((client): Person => ({ id: client.id, name: client.name, email: client.email, role: "Client", active: true })),
    { id: "staff-1", name: "Jamie Lee", email: "jamie.lee@example.test", role: "Adviser", active: true },
    { id: "staff-2", name: "Morgan Admin", email: "admin@example.test", role: "Admin", active: true },
  ]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const visible = useMemo(
    () => people.filter((person) => `${person.name} ${person.email} ${person.role}`.toLowerCase().includes(query.toLowerCase())),
    [query, people],
  );

  function addPerson() {
    setPeople((current) => [...current, { id: `person-${Date.now()}`, name: "New Demo Person", email: `person${current.length}@example.test`, role: "Client", active: true }]);
  }

  function reset() {
    resetLocalDemo();
    window.location.reload();
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-10 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold tracking-[0.18em] text-[var(--accent)]">LOCAL ADMINISTRATION DEMONSTRATION</p><h1 className="mt-2 text-3xl font-semibold">Administration</h1></div><button type="button" onClick={reset} className="min-h-11 rounded-full border border-[var(--border)] px-4 text-sm font-semibold">Reset demo data</button></div>
      <p className="mt-3 text-sm text-[var(--muted)]">Role selection and browser storage are not production authentication or security.</p>
      <div className="mt-7 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="glass rounded-3xl p-5">
          <div className="flex flex-wrap gap-3"><input aria-label="Search people" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people" className="min-h-11 flex-1 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm" /><button type="button" onClick={addPerson} className="min-h-11 rounded-full bg-[var(--accent-fill)] px-4 text-sm font-bold text-[var(--button-text)]">Add person</button></div>
          <div className="mt-4 divide-y divide-[var(--border)]">{visible.map((person) => <div key={person.id} className="grid gap-3 py-3 sm:grid-cols-[1fr_180px_auto] sm:items-center"><div><p className="font-semibold">{person.name}</p><p className="text-xs text-[var(--muted)]">{person.email}</p></div><select aria-label={`Role for ${person.name}`} value={person.role} onChange={(event) => setPeople((current) => current.map((item) => item.id === person.id ? { ...item, role: event.target.value as Person["role"] } : item))} className="min-h-10 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm"><option>Client</option><option>Adviser</option><option>Admin</option></select><button type="button" onClick={() => setPeople((current) => current.filter((item) => item.id !== person.id))} className="min-h-10 rounded-xl border border-[var(--border)] px-3 text-xs">Delete</button></div>)}</div>
        </section>
        <section className="glass rounded-3xl p-5"><h2 className="text-lg font-semibold">Document overview</h2><div className="mt-4 space-y-2">{demoDocuments.map((doc) => <button type="button" key={doc.id} onClick={() => setMessage(`${doc.name} selected; replacement and delete controls are demonstrated locally.`)} className="w-full rounded-xl border border-[var(--border)] p-3 text-left"><p className="text-sm font-semibold">{doc.name}</p><p className="mt-1 text-xs text-[var(--muted)]">{doc.category} · v{doc.version}</p></button>)}</div></section>
      </div>
      <section className="glass mt-5 rounded-3xl p-5"><h2 className="text-lg font-semibold">Compliance demonstrations</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{["Complaints", "Conflicts", "Gifts & hospitality", "Incidents"].map((name) => <button type="button" key={name} onClick={() => setMessage(`${name} register opened in demonstration mode.`)} className="min-h-20 rounded-xl border border-[var(--border)] p-4 text-left text-sm font-semibold">{name}<span className="mt-2 block text-xs font-normal text-[var(--muted)]">Local fictional records</span></button>)}</div></section>
      {message && <p role="status" className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--accent)]">{message}</p>}
    </main>
  );
}
