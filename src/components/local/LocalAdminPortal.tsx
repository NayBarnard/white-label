"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import {
  createWorkspaceBackup,
  defaultLocalWorkspaceSettings,
  localWorkspaceKeys,
  removeWorkspaceFile,
  resetWorkspaceData,
  restoreWorkspaceBackup,
  writeWorkspaceFile,
  type LocalDocument,
  type LocalHolding,
  type LocalPerson,
  type LocalRole,
  type LocalTransaction,
  type LocalWorkspaceSettings,
} from "@/lib/local-workspace";
import { useLocalWorkspaceValue } from "@/lib/use-local-workspace";

const roles: LocalRole[] = ["Admin", "Adviser", "Client"];
const currencies = ["USD", "EUR", "GBP", "ZAR"];

function amountMinor(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1_000_000_000_000) return null;
  return Math.round(parsed * 100);
}

function money(valueMinor: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(valueMinor / 100);
}

function download(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function LocalWorkspaceStatus({ error, loading }: { error: string; loading: boolean }) {
  if (loading) return <p role="status" className="mx-auto max-w-3xl p-8 text-sm">Opening this browser&apos;s local workspace…</p>;
  if (error) return <p role="alert" className="mx-auto max-w-3xl p-8 text-sm text-red-700">Local workspace unavailable: {error}</p>;
  return null;
}

export function LocalAdminPortal() {
  const settingsState = useLocalWorkspaceValue<LocalWorkspaceSettings>(localWorkspaceKeys.settings, defaultLocalWorkspaceSettings);
  const peopleState = useLocalWorkspaceValue<LocalPerson[]>(localWorkspaceKeys.people, []);
  const holdingsState = useLocalWorkspaceValue<LocalHolding[]>(localWorkspaceKeys.holdings, []);
  const transactionsState = useLocalWorkspaceValue<LocalTransaction[]>(localWorkspaceKeys.transactions, []);
  const documentsState = useLocalWorkspaceValue<LocalDocument[]>(localWorkspaceKeys.documents, []);
  const [query, setQuery] = useState("");
  const [personForm, setPersonForm] = useState({ name: "", email: "", role: "Client" as LocalRole });
  const [holdingForm, setHoldingForm] = useState({ clientId: "", name: "", assetClass: "", value: "", currency: "USD" });
  const [transactionForm, setTransactionForm] = useState({ clientId: "", date: new Date().toISOString().slice(0, 10), description: "", type: "Contribution", amount: "", currency: "USD" });
  const [documentClientId, setDocumentClientId] = useState("");
  const [message, setMessage] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  const states = [settingsState, peopleState, holdingsState, transactionsState, documentsState];
  const loading = states.some((state) => state.status === "loading");
  const error = states.find((state) => state.status === "error")?.error ??
    states.find((state) => state.error)?.error ?? "";
  const people = peopleState.value;
  const clients = useMemo(() => people.filter((person) => person.role === "Client" && person.status !== "Inactive"), [people]);
  const advisers = useMemo(() => people.filter((person) => person.role === "Adviser" && person.status === "Active"), [people]);
  const visiblePeople = useMemo(
    () => people.filter((person) => `${person.name} ${person.email} ${person.role}`.toLowerCase().includes(query.trim().toLowerCase())),
    [people, query],
  );
  const totalByCurrency = useMemo(() => holdingsState.value.reduce<Record<string, number>>((totals, holding) => {
    totals[holding.currency] = (totals[holding.currency] ?? 0) + holding.valueMinor;
    return totals;
  }, {}), [holdingsState.value]);

  if (loading || error) return <LocalWorkspaceStatus loading={loading} error={error} />;

  function addPerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = personForm.name.trim();
    const email = personForm.email.trim().toLowerCase();
    if (!name || !email) {
      setMessage("Enter a name and a valid email address.");
      return;
    }
    if (people.some((person) => person.email.toLowerCase() === email)) {
      setMessage("A local workspace record already uses that email address.");
      return;
    }
    const person: LocalPerson = {
      id: crypto.randomUUID(),
      name,
      email,
      role: personForm.role,
      status: "Active",
      createdAt: new Date().toISOString(),
    };
    peopleState.setValue((current) => [...current, person]);
    setPersonForm({ name: "", email: "", role: "Client" });
    setMessage(`${person.role} record added to this browser workspace. No invitation email was sent.`);
  }

  function assignAdviser(clientId: string, adviserId: string) {
    peopleState.setValue((current) => current.map((person) =>
      person.id === clientId ? { ...person, adviserId: adviserId || undefined } : person,
    ));
    setMessage("Client adviser assignment saved locally.");
  }

  function updatePerson(personId: string, update: Partial<Pick<LocalPerson, "role" | "status">>) {
    peopleState.setValue((current) => current.map((person) => person.id === personId ? { ...person, ...update } : person));
  }

  function addHolding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const valueMinor = amountMinor(holdingForm.value);
    if (!holdingForm.clientId || !holdingForm.name.trim() || !holdingForm.assetClass.trim() || valueMinor === null) {
      setMessage("Choose a client and enter a holding, asset class, and non-negative value.");
      return;
    }
    holdingsState.setValue((current) => [...current, {
      id: crypto.randomUUID(),
      clientId: holdingForm.clientId,
      name: holdingForm.name.trim(),
      assetClass: holdingForm.assetClass.trim(),
      valueMinor,
      currency: holdingForm.currency,
      valuedAt: new Date().toISOString().slice(0, 10),
    }]);
    setHoldingForm({ ...holdingForm, name: "", assetClass: "", value: "" });
    setMessage("Holding saved. The value is stored as supplied and is not independently verified.");
  }

  function addTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(transactionForm.amount);
    if (!transactionForm.clientId || !transactionForm.description.trim() || !transactionForm.date ||
      !Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 1_000_000_000_000) {
      setMessage("Choose a client and enter a dated transaction with a non-zero amount.");
      return;
    }
    transactionsState.setValue((current) => [...current, {
      id: crypto.randomUUID(),
      clientId: transactionForm.clientId,
      date: transactionForm.date,
      description: transactionForm.description.trim(),
      type: transactionForm.type,
      amountMinor: Math.round(amount * 100),
      currency: transactionForm.currency,
    }].sort((a, b) => b.date.localeCompare(a.date)));
    setTransactionForm({ ...transactionForm, description: "", amount: "" });
    setMessage("Transaction saved locally; no external account or balance was changed.");
  }

  async function addDocument(file: File | undefined) {
    if (!file) return;
    if (!documentClientId) {
      setMessage("Choose the client who owns this document.");
      return;
    }
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.type) || file.size > 25 * 1024 * 1024) {
      setMessage("Choose a PDF, JPEG, or PNG file no larger than 25 MB.");
      return;
    }
    const document: LocalDocument = {
      id: crypto.randomUUID(),
      clientId: documentClientId,
      name: file.name,
      category: "Client document",
      mimeType: file.type,
      size: file.size,
      fileId: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    try {
      await writeWorkspaceFile(document.fileId, file);
      documentsState.setValue((current) => [...current, document]);
      setMessage(`${file.name} saved to this browser's private local workspace.`);
    } catch (cause) {
      setMessage(cause instanceof Error ? `Document could not be saved: ${cause.message}` : "Document could not be saved.");
    }
  }

  async function deleteDocument(document: LocalDocument) {
    if (!window.confirm(`Permanently remove ${document.name} from this browser?`)) return;
    try {
      await removeWorkspaceFile(document.fileId);
      documentsState.setValue((current) => current.filter((entry) => entry.id !== document.id));
      setMessage("Document removed from the local workspace.");
    } catch (cause) {
      setMessage(cause instanceof Error ? `Document could not be removed: ${cause.message}` : "Document could not be removed.");
    }
  }

  async function exportBackup() {
    try {
      download("wealth-os-workspace-backup.json", await createWorkspaceBackup());
      setMessage("Workspace backup downloaded, including locally stored document files.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Workspace backup could not be created.");
    }
  }

  async function importBackup(file: File | undefined) {
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      setMessage("The selected backup exceeds the 100 MB import limit.");
      return;
    }
    if (!window.confirm("Restore this backup? It replaces all current local workspace records and files.")) return;
    try {
      await restoreWorkspaceBackup(await file.text());
      window.location.reload();
    } catch (cause) {
      setMessage(cause instanceof Error ? `Backup restore failed: ${cause.message}` : "Backup restore failed.");
    }
  }

  async function resetWorkspace() {
    if (!window.confirm("Permanently delete all local firm, client, portfolio, workflow, and document data from this browser?")) return;
    try {
      await resetWorkspaceData();
      window.location.reload();
    } catch (cause) {
      setMessage(cause instanceof Error ? `Workspace reset failed: ${cause.message}` : "Workspace reset failed.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-10 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-[var(--accent)]">STANDALONE LOCAL WORKSPACE</p>
          <h1 className="mt-2 text-3xl font-semibold">Firm administration</h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">Records and files are stored in this browser&apos;s IndexedDB. This local workspace does not authenticate users or provide server-side access control, synchronization, or backup unless you export one.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => importRef.current?.click()} className="min-h-11 rounded-full border border-[var(--border)] px-4 text-sm font-semibold">Restore backup</button>
          <button type="button" onClick={() => void exportBackup()} className="min-h-11 rounded-full border border-[var(--border)] px-4 text-sm font-semibold">Export backup</button>
          <button type="button" onClick={() => void resetWorkspace()} className="min-h-11 rounded-full border border-[var(--border)] px-4 text-sm font-semibold">Reset workspace</button>
        </div>
      </header>
      <input ref={importRef} type="file" accept="application/json" className="hidden" onChange={(event) => { void importBackup(event.target.files?.[0]); event.target.value = ""; }} />

      <section aria-label="Firm overview" className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["People", people.length],
          ["Clients", clients.length],
          ["Advisers", advisers.length],
          ["Client documents", documentsState.value.length],
        ].map(([label, count]) => (
          <article key={String(label)} className="glass rounded-2xl p-5">
            <p className="text-sm text-[var(--muted)]">{label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{count}</p>
          </article>
        ))}
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="glass rounded-3xl p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Firm identity</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">Changes are saved automatically on this device.</p>
          <div className="mt-4 grid gap-3">
            <label className="text-sm">Firm name<input value={settingsState.value.firmName} onChange={(event) => settingsState.setValue((current) => ({ ...current, firmName: event.target.value }))} maxLength={120} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3" /></label>
            <label className="text-sm">Contact email<input type="email" value={settingsState.value.contactEmail} onChange={(event) => settingsState.setValue((current) => ({ ...current, contactEmail: event.target.value }))} maxLength={254} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3" /></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">Primary colour<input type="color" value={settingsState.value.primaryColour} onChange={(event) => settingsState.setValue((current) => ({ ...current, primaryColour: event.target.value }))} className="mt-2 h-11 w-full rounded-xl" /></label>
              <label className="text-sm">Accent colour<input type="color" value={settingsState.value.accentColour} onChange={(event) => settingsState.setValue((current) => ({ ...current, accentColour: event.target.value }))} className="mt-2 h-11 w-full rounded-xl" /></label>
            </div>
          </div>
        </section>

        <section className="glass rounded-3xl p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Add a local workspace user</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">This creates a record only; it does not create credentials or send an invitation.</p>
          <form onSubmit={addPerson} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">Name<input required value={personForm.name} onChange={(event) => setPersonForm({ ...personForm, name: event.target.value })} maxLength={120} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3" /></label>
            <label className="text-sm">Email<input required type="email" value={personForm.email} onChange={(event) => setPersonForm({ ...personForm, email: event.target.value })} maxLength={254} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3" /></label>
            <label className="text-sm">Role<select value={personForm.role} onChange={(event) => setPersonForm({ ...personForm, role: event.target.value as LocalRole })} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3">{roles.map((role) => <option key={role}>{role}</option>)}</select></label>
            <button type="submit" className="mt-auto min-h-11 rounded-full bg-[var(--accent-fill)] px-4 text-sm font-bold text-[var(--button-text)]">Add user record</button>
          </form>
        </section>
      </div>

      <section className="glass mt-5 rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-lg font-semibold">People and client assignments</h2><p className="mt-1 text-xs text-[var(--muted)]">No example people are preloaded. Add real workspace records as needed.</p></div>
          <input aria-label="Search people" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or email" className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm sm:max-w-xs" />
        </div>
        {visiblePeople.length ? (
          <div className="mt-4 divide-y divide-[var(--border)]">
            {visiblePeople.map((person) => (
              <article key={person.id} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_150px_150px] sm:items-center">
                <div className="min-w-0"><p className="truncate font-semibold">{person.name}</p><p className="truncate text-xs text-[var(--muted)]">{person.email}</p></div>
                <label className="text-xs text-[var(--muted)]">Role<select aria-label={`Role for ${person.name}`} value={person.role} onChange={(event) => updatePerson(person.id, { role: event.target.value as LocalRole })} className="mt-1 min-h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-2 text-sm text-[var(--foreground)]">{roles.map((role) => <option key={role}>{role}</option>)}</select></label>
                <label className="text-xs text-[var(--muted)]">Access<select aria-label={`Access for ${person.name}`} value={person.status} onChange={(event) => updatePerson(person.id, { status: event.target.value as LocalPerson["status"] })} className="mt-1 min-h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-2 text-sm text-[var(--foreground)]"><option>Active</option><option>Onboarding</option><option>Inactive</option></select></label>
                {person.role === "Client" && <label className="text-xs text-[var(--muted)] sm:col-start-2 sm:col-span-2">Assigned adviser<select aria-label={`Adviser for ${person.name}`} value={person.adviserId ?? ""} onChange={(event) => assignAdviser(person.id, event.target.value)} className="mt-1 min-h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-2 text-sm text-[var(--foreground)]"><option value="">Unassigned</option>{advisers.map((adviser) => <option key={adviser.id} value={adviser.id}>{adviser.name}</option>)}</select></label>}
              </article>
            ))}
          </div>
        ) : <p className="mt-5 rounded-xl border border-dashed border-[var(--border)] p-6 text-sm text-[var(--muted)]">{people.length ? "No people match this search." : "Your local workspace is empty. Add an adviser or client to begin."}</p>}
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="glass rounded-3xl p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Client holdings</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">Values are manually entered local records; WEALTH OS does not verify valuations or convert currencies.</p>
          <form onSubmit={addHolding} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm sm:col-span-2">Client<select required value={holdingForm.clientId} onChange={(event) => setHoldingForm({ ...holdingForm, clientId: event.target.value })} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3"><option value="">Choose client</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
            <label className="text-sm">Holding<input required value={holdingForm.name} onChange={(event) => setHoldingForm({ ...holdingForm, name: event.target.value })} maxLength={120} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3" /></label>
            <label className="text-sm">Asset class<input required value={holdingForm.assetClass} onChange={(event) => setHoldingForm({ ...holdingForm, assetClass: event.target.value })} maxLength={80} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3" /></label>
            <label className="text-sm">Value<input required type="number" min="0" step="0.01" value={holdingForm.value} onChange={(event) => setHoldingForm({ ...holdingForm, value: event.target.value })} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3" /></label>
            <label className="text-sm">Currency<select value={holdingForm.currency} onChange={(event) => setHoldingForm({ ...holdingForm, currency: event.target.value })} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3">{currencies.map((currency) => <option key={currency}>{currency}</option>)}</select></label>
            <button type="submit" disabled={!clients.length} className="min-h-11 rounded-full bg-[var(--accent-fill)] px-4 text-sm font-bold text-[var(--button-text)] disabled:opacity-50 sm:col-span-2">Add holding</button>
          </form>
          <div className="mt-4 space-y-2">
            {Object.entries(totalByCurrency).map(([currency, total]) => <p key={currency} className="rounded-xl border border-[var(--border)] p-3 text-sm">{currency} recorded value: <strong>{money(total, currency)}</strong></p>)}
            {holdingsState.value.slice(-5).reverse().map((holding) => <p key={holding.id} className="rounded-xl border border-[var(--border)] p-3 text-sm">{people.find((person) => person.id === holding.clientId)?.name ?? "Unknown client"} · {holding.name} · {money(holding.valueMinor, holding.currency)}</p>)}
            {!holdingsState.value.length && <p className="text-sm text-[var(--muted)]">No holdings recorded.</p>}
          </div>
        </section>

        <section className="glass rounded-3xl p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Client transactions</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">Records only; no transfers, trades, or account balances are changed.</p>
          <form onSubmit={addTransaction} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm sm:col-span-2">Client<select required value={transactionForm.clientId} onChange={(event) => setTransactionForm({ ...transactionForm, clientId: event.target.value })} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3"><option value="">Choose client</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
            <label className="text-sm">Date<input required type="date" value={transactionForm.date} onChange={(event) => setTransactionForm({ ...transactionForm, date: event.target.value })} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3" /></label>
            <label className="text-sm">Type<select value={transactionForm.type} onChange={(event) => setTransactionForm({ ...transactionForm, type: event.target.value })} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3"><option>Contribution</option><option>Withdrawal</option><option>Fee</option><option>Transfer</option><option>Other</option></select></label>
            <label className="text-sm sm:col-span-2">Description<input required value={transactionForm.description} onChange={(event) => setTransactionForm({ ...transactionForm, description: event.target.value })} maxLength={160} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3" /></label>
            <label className="text-sm">Amount<input required type="number" step="0.01" value={transactionForm.amount} onChange={(event) => setTransactionForm({ ...transactionForm, amount: event.target.value })} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3" /></label>
            <label className="text-sm">Currency<select value={transactionForm.currency} onChange={(event) => setTransactionForm({ ...transactionForm, currency: event.target.value })} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3">{currencies.map((currency) => <option key={currency}>{currency}</option>)}</select></label>
            <button type="submit" disabled={!clients.length} className="min-h-11 rounded-full bg-[var(--accent-fill)] px-4 text-sm font-bold text-[var(--button-text)] disabled:opacity-50 sm:col-span-2">Add transaction record</button>
          </form>
          <div className="mt-4 space-y-2">{transactionsState.value.slice(-5).reverse().map((transaction) => <p key={transaction.id} className="rounded-xl border border-[var(--border)] p-3 text-sm">{transaction.date} · {people.find((person) => person.id === transaction.clientId)?.name ?? "Unknown client"} · {transaction.description} · {money(transaction.amountMinor, transaction.currency)}</p>)}{!transactionsState.value.length && <p className="text-sm text-[var(--muted)]">No transactions recorded.</p>}</div>
        </section>
      </div>

      <section className="glass mt-5 rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Private local client documents</h2><p className="mt-1 text-xs text-[var(--muted)]">Files are stored in IndexedDB and included in workspace backups.</p></div><div className="flex w-full flex-wrap gap-2 sm:w-auto"><select aria-label="Document client" value={documentClientId} onChange={(event) => setDocumentClientId(event.target.value)} className="min-h-11 min-w-48 flex-1 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm"><option value="">Choose client</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select><label className="flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] px-4 text-sm font-semibold">Upload file<input disabled={!clients.length} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="sr-only" onChange={(event) => { void addDocument(event.target.files?.[0]); event.target.value = ""; }} /></label></div></div>
        {documentsState.value.length ? <div className="mt-4 divide-y divide-[var(--border)]">{documentsState.value.map((document) => <div key={document.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-semibold">{document.name}</p><p className="text-xs text-[var(--muted)]">{people.find((person) => person.id === document.clientId)?.name ?? "Unknown client"} · {document.category} · {(document.size / 1024).toFixed(1)} KB</p></div><button type="button" onClick={() => void deleteDocument(document)} className="min-h-10 rounded-xl border border-[var(--border)] px-3 text-xs">Delete</button></div>)}</div> : <p className="mt-4 text-sm text-[var(--muted)]">No documents uploaded.</p>}
      </section>

      {error && <p role="alert" className="mt-5 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">Some local changes could not be saved: {error}</p>}
      {message && <p role="status" className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--accent)]">{message}</p>}
    </main>
  );
}
