"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import {
  localWorkspaceKeys,
  type LocalHolding,
  type LocalNote,
  type LocalPerson,
  type LocalTask,
} from "@/lib/local-workspace";
import { useLocalWorkspaceValue } from "@/lib/use-local-workspace";
import { downloadPdfReport } from "@/lib/pdf-report";

function money(valueMinor: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(valueMinor / 100);
}

export function LocalAdviserPortal() {
  const peopleState = useLocalWorkspaceValue<LocalPerson[]>(localWorkspaceKeys.people, []);
  const tasksState = useLocalWorkspaceValue<LocalTask[]>(localWorkspaceKeys.tasks, []);
  const notesState = useLocalWorkspaceValue<LocalNote[]>(localWorkspaceKeys.notes, []);
  const holdingsState = useLocalWorkspaceValue<LocalHolding[]>(localWorkspaceKeys.holdings, []);
  const [query, setQuery] = useState("");
  const [selectedAdviserId, setSelectedAdviserId] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [message, setMessage] = useState("");
  const states = [peopleState, tasksState, notesState, holdingsState];
  const loading = states.some((state) => state.status === "loading");
  const error = states.find((state) => state.status === "error")?.error ??
    states.find((state) => state.error)?.error ?? "";

  const advisers = useMemo(() => peopleState.value.filter((person) => person.role === "Adviser" && person.status === "Active"), [peopleState.value]);
  const adviser = advisers.find((person) => person.id === selectedAdviserId) ?? advisers[0] ?? null;
  const clients = useMemo(() => peopleState.value.filter((person) =>
    person.role === "Client" && person.status !== "Inactive" && person.adviserId === adviser?.id,
  ), [peopleState.value, adviser?.id]);
  const selectedClient = clients.find((client) => client.id === selectedClientId) ?? clients[0] ?? null;
  const visibleClients = useMemo(() => clients.filter((client) =>
    `${client.name} ${client.email}`.toLowerCase().includes(query.trim().toLowerCase()),
  ), [clients, query]);
  const clientTasks = useMemo(() => tasksState.value
    .filter((task) => task.clientId === selectedClient?.id)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate)), [tasksState.value, selectedClient?.id]);
  const clientHoldings = useMemo(() => holdingsState.value.filter((holding) => holding.clientId === selectedClient?.id), [holdingsState.value, selectedClient?.id]);
  const currentNote = notesState.value.find((note) => note.clientId === selectedClient?.id && note.adviserId === adviser?.id);

  if (loading) return <p role="status" className="mx-auto max-w-3xl p-8 text-sm">Opening this browser&apos;s local workspace…</p>;
  if (error) return <p role="alert" className="mx-auto max-w-3xl p-8 text-sm text-red-700">Local workspace unavailable: {error}</p>;

  function saveNote(body: string) {
    if (!selectedClient || !adviser) return;
    notesState.setValue((current) => {
      const existing = current.find((note) => note.clientId === selectedClient.id && note.adviserId === adviser.id);
      if (existing) return current.map((note) => note.id === existing.id ? { ...note, body, updatedAt: new Date().toISOString() } : note);
      return [...current, {
        id: crypto.randomUUID(),
        clientId: selectedClient.id,
        adviserId: adviser.id,
        body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }];
    });
  }

  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedClient || !taskTitle.trim() || !taskDueDate) return;
    tasksState.setValue((current) => [...current, {
      id: crypto.randomUUID(),
      clientId: selectedClient.id,
      title: taskTitle.trim(),
      dueDate: taskDueDate,
      status: "Open",
      createdAt: new Date().toISOString(),
    }]);
    setTaskTitle("");
    setMessage("Follow-up task saved in this browser workspace.");
  }

  function toggleTask(taskId: string) {
    tasksState.setValue((current) => current.map((task) => task.id === taskId
      ? { ...task, status: task.status === "Complete" ? "Open" : "Complete" }
      : task));
  }

  function exportClientPack() {
    if (!selectedClient || !adviser) return;
    const report = {
      reportType: "Local adviser client review pack",
      exportedAt: new Date().toISOString(),
      client: selectedClient,
      adviser,
      holdings: clientHoldings,
      tasks: clientTasks,
      note: currentNote?.body ?? "",
      limitations: "This file contains locally entered records. It is not independently verified financial data, advice, or a transaction instruction.",
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${selectedClient.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-review-pack.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function exportClientPdf() {
    if (!selectedClient || !adviser) return;
    const valuesByCurrency = clientHoldings.reduce<Record<string, number>>((totals, holding) => {
      totals[holding.currency] = (totals[holding.currency] ?? 0) + holding.valueMinor;
      return totals;
    }, {});
    await downloadPdfReport(
      `${selectedClient.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-review-pack.pdf`,
      "WEALTH OS · LOCAL WORKSPACE",
      "Client review pack",
      [
        { title: "Client", lines: [selectedClient.name, selectedClient.email, `Adviser: ${adviser.name}`, `Status: ${selectedClient.status}`] },
        { title: "Recorded holdings", lines: clientHoldings.length ? clientHoldings.map((holding) => `${holding.name} (${holding.assetClass}): ${money(holding.valueMinor, holding.currency)}`) : ["No holdings recorded."] },
        { title: "Recorded totals", lines: Object.entries(valuesByCurrency).map(([currency, value]) => money(value, currency)) },
        { title: "Adviser note", lines: [currentNote?.body.trim() || "No adviser note recorded."] },
        { title: "Follow-up tasks", lines: clientTasks.length ? clientTasks.map((task) => `${task.status} — ${task.title} (due ${task.dueDate})`) : ["No tasks recorded."] },
      ],
      "Locally entered records are not independently verified. This report is not financial advice or a transaction instruction.",
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-10 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-[var(--accent)]">STANDALONE LOCAL WORKSPACE</p>
          <h1 className="mt-2 text-3xl font-semibold">Adviser workspace</h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">Client records, notes, tasks, and holdings are stored in IndexedDB on this device. Local profile selection is not authentication or access control.</p>
        </div>
        <label className="w-full text-sm sm:max-w-xs">Local adviser profile<select aria-label="Local adviser profile" value={adviser?.id ?? ""} onChange={(event) => { setSelectedAdviserId(event.target.value); setSelectedClientId(""); }} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3">{advisers.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
      </header>

      {!adviser ? (
        <section className="glass mt-7 rounded-3xl p-6">
          <h2 className="text-xl font-semibold">No adviser profile is available</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Create an adviser record in firm administration and assign clients there to begin using this workspace.</p>
          <Link href="/admin" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-[var(--accent-fill)] px-5 text-sm font-bold text-[var(--button-text)]">Open firm administration</Link>
        </section>
      ) : (
        <>
          <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(240px,0.8fr)_1.6fr]">
            <section className="glass rounded-3xl p-5">
              <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Assigned clients</h2><span className="text-xs text-[var(--muted)]">{clients.length}</span></div>
              <input aria-label="Search clients" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search assigned clients" className="mt-4 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm" />
              <div className="mt-4 space-y-2">
                {visibleClients.map((client) => <button type="button" key={client.id} onClick={() => setSelectedClientId(client.id)} className={`w-full rounded-xl border p-3 text-left ${selectedClient?.id === client.id ? "border-[var(--accent)] bg-[var(--surface)]" : "border-[var(--border)]"}`}><span className="block font-semibold">{client.name}</span><span className="mt-1 block break-all text-xs text-[var(--muted)]">{client.email}</span><span className="mt-1 block text-xs text-[var(--muted)]">{client.status}</span></button>)}
                {!visibleClients.length && <p className="rounded-xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)]">{clients.length ? "No assigned clients match this search." : "No clients are assigned to this adviser. Assign clients in firm administration."}</p>}
              </div>
            </section>

            {selectedClient ? (
              <section className="glass rounded-3xl p-5 sm:p-7">
                <h2 className="text-xl font-semibold">{selectedClient.name}</h2>
                <p className="mt-1 break-all text-sm text-[var(--muted)]">{selectedClient.email}</p>
                <p className="mt-4 rounded-xl border border-[var(--border)] p-3 text-sm">Status: {selectedClient.status}. All displayed values come from records entered in this local workspace.</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {clientHoldings.map((holding) => <article key={holding.id} className="rounded-xl border border-[var(--border)] p-4"><p className="text-xs text-[var(--muted)]">{holding.assetClass} · valued {holding.valuedAt}</p><p className="mt-2 font-semibold">{holding.name}</p><p className="mt-1 text-sm">{money(holding.valueMinor, holding.currency)}</p></article>)}
                  {!clientHoldings.length && <p className="rounded-xl border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted)] sm:col-span-2">No portfolio holdings have been entered.</p>}
                </div>
                <label className="mt-5 block text-sm font-semibold">Adviser note<textarea aria-label="Adviser note" value={currentNote?.body ?? ""} onChange={(event) => saveNote(event.target.value)} rows={5} maxLength={10000} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 font-normal" placeholder="Record a note for this local workspace" /></label>
              </section>
            ) : <section className="glass grid min-h-64 place-items-center rounded-3xl p-6 text-center text-sm text-[var(--muted)]">Select an assigned client to review their local records.</section>}
          </div>

          <section className="glass mt-5 rounded-3xl p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Tasks and follow-ups</h2><p className="mt-1 text-xs text-[var(--muted)]">{selectedClient ? `Tasks for ${selectedClient.name}` : "Select an assigned client to manage tasks."}</p></div></div>
            {selectedClient && <form onSubmit={addTask} className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px_auto]">
              <label className="text-sm">Task<input required value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} maxLength={200} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3" /></label>
              <label className="text-sm">Due date<input required type="date" value={taskDueDate} onChange={(event) => setTaskDueDate(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3" /></label>
              <button type="submit" className="mt-auto min-h-11 rounded-full border border-[var(--border)] px-4 text-sm font-semibold">Add task</button>
            </form>}
            <div className="mt-4 space-y-2">
              {clientTasks.map((task) => <label key={task.id} className="flex min-h-12 items-center gap-3 rounded-xl border border-[var(--border)] p-3"><input type="checkbox" checked={task.status === "Complete"} onChange={() => toggleTask(task.id)} /><span className={`min-w-0 flex-1 text-sm ${task.status === "Complete" ? "text-[var(--muted)] line-through" : ""}`}>{task.title}</span><span className="shrink-0 text-xs text-[var(--muted)]">Due {task.dueDate}</span></label>)}
              {selectedClient && !clientTasks.length && <p className="text-sm text-[var(--muted)]">No follow-up tasks recorded.</p>}
            </div>
          </section>

          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" disabled={!selectedClient} onClick={exportClientPack} className="min-h-11 rounded-full border border-[var(--border)] px-5 text-sm font-semibold disabled:opacity-50">Export review pack JSON</button>
            <button type="button" disabled={!selectedClient} onClick={() => void exportClientPdf()} className="min-h-11 rounded-full border border-[var(--border)] px-5 text-sm font-semibold disabled:opacity-50">Export review pack PDF</button>
          </div>
        </>
      )}
      {states.some((state) => state.error) && <p role="alert" className="mt-5 text-sm text-red-700">A local update could not be saved: {states.find((state) => state.error)?.error}</p>}
      {message && <p role="status" className="mt-4 text-sm text-[var(--accent)]">{message}</p>}
    </main>
  );
}
