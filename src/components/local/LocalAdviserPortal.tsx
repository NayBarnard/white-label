"use client";

import { useMemo, useState } from "react";
import { demoClients } from "@/data/demo";
import { useLocalState } from "@/lib/local-store";

type Task = { id: string; title: string; client: string; done: boolean };

export function LocalAdviserPortal() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(demoClients[0]);
  const [tasks, setTasks] = useLocalState<Task[]>("example-wealth.adviser.tasks", [
    { id: "task-1", title: "Annual portfolio review", client: "Alex Morgan", done: false },
    { id: "task-2", title: "Confirm review documents", client: "Taylor Reed", done: false },
  ]);
  const [notes, setNotes] = useLocalState<Record<string, string>>("example-wealth.adviser.notes", {});
  const [message, setMessage] = useState("");
  const visible = useMemo(
    () => demoClients.filter((client) => `${client.name} ${client.email}`.toLowerCase().includes(query.toLowerCase())),
    [query],
  );

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-10 lg:px-8">
      <p className="text-xs font-bold tracking-[0.18em] text-[var(--accent)]">LOCAL ADVISER DEMONSTRATION</p>
      <h1 className="mt-2 text-3xl font-semibold">Adviser dashboard</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Fictional clients and local-only workflows.</p>
      <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <section className="glass rounded-3xl p-5">
          <input aria-label="Search demo clients" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search fictional clients" className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm" />
          <div className="mt-4 space-y-2">
            {visible.map((client) => <button type="button" key={client.id} onClick={() => setSelected(client)} className={`w-full rounded-xl border p-3 text-left ${selected.id === client.id ? "border-[var(--accent)] bg-[var(--surface)]" : "border-[var(--border)]"}`}><span className="block font-semibold">{client.name}</span><span className="mt-1 block text-xs text-[var(--muted)]">{client.status} · R {client.value.toLocaleString("en-ZA")}</span></button>)}
            {!visible.length && <p className="py-6 text-sm text-[var(--muted)]">No matching demo clients.</p>}
          </div>
        </section>
        <section className="glass rounded-3xl p-5 sm:p-7">
          <h2 className="text-xl font-semibold">{selected.name}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{selected.email} · Adviser: {selected.adviser}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[var(--border)] p-4"><p className="text-xs text-[var(--muted)]">Illustrative value</p><p className="mt-2 font-semibold">R {selected.value.toLocaleString("en-ZA")}</p></div>
            <div className="rounded-xl border border-[var(--border)] p-4"><p className="text-xs text-[var(--muted)]">Risk profile</p><p className="mt-2 font-semibold">{selected.risk}</p></div>
            <div className="rounded-xl border border-[var(--border)] p-4"><p className="text-xs text-[var(--muted)]">Status</p><p className="mt-2 font-semibold">{selected.status}</p></div>
          </div>
          <label className="mt-5 block text-sm font-semibold">Client notes<textarea value={notes[selected.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [selected.id]: event.target.value }))} rows={4} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3" /></label>
        </section>
      </div>
      <section className="glass mt-5 rounded-3xl p-5 sm:p-7">
        <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Tasks and follow-ups</h2><button type="button" onClick={() => setTasks((current) => [...current, { id: `task-${Date.now()}`, title: "New demonstration task", client: selected.name, done: false }])} className="min-h-11 rounded-full border border-[var(--border)] px-4 text-sm font-semibold">Add task</button></div>
        <div className="mt-4 space-y-2">{tasks.map((task) => <label key={task.id} className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-3"><input type="checkbox" checked={task.done} onChange={() => setTasks((current) => current.map((item) => item.id === task.id ? { ...item, done: !item.done } : item))} /><span className={task.done ? "text-[var(--muted)] line-through" : ""}>{task.title} · {task.client}</span></label>)}</div>
      </section>
      <button type="button" onClick={() => setMessage("A local demonstration notification was recorded.")} className="mt-5 min-h-11 rounded-full bg-[var(--accent-fill)] px-5 text-sm font-bold text-[var(--button-text)]">Send local reminder</button>
      {message && <p role="status" className="mt-4 text-sm text-[var(--accent)]">{message}</p>}
    </main>
  );
}
