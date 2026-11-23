"use client";

import Link from "next/link";
import { useMemo, useRef, useState, type FormEvent } from "react";
import {
  localWorkspaceKeys,
  readWorkspaceFile,
  writeWorkspaceFile,
  type LocalDocument,
  type LocalGoal,
  type LocalHolding,
  type LocalPerson,
  type LocalSupportRequest,
  type LocalTask,
  type LocalTransaction,
} from "@/lib/local-workspace";
import { useLocalWorkspaceValue } from "@/lib/use-local-workspace";

const tabs = ["Overview", "Holdings", "Transactions", "Goals", "Planning", "Documents", "Profile", "Support"] as const;
type Tab = (typeof tabs)[number];

function money(valueMinor: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(valueMinor / 100);
}

export function LocalClientPortal() {
  const peopleState = useLocalWorkspaceValue<LocalPerson[]>(localWorkspaceKeys.people, []);
  const holdingsState = useLocalWorkspaceValue<LocalHolding[]>(localWorkspaceKeys.holdings, []);
  const transactionsState = useLocalWorkspaceValue<LocalTransaction[]>(localWorkspaceKeys.transactions, []);
  const goalsState = useLocalWorkspaceValue<LocalGoal[]>(localWorkspaceKeys.goals, []);
  const tasksState = useLocalWorkspaceValue<LocalTask[]>(localWorkspaceKeys.tasks, []);
  const documentsState = useLocalWorkspaceValue<LocalDocument[]>(localWorkspaceKeys.documents, []);
  const supportState = useLocalWorkspaceValue<LocalSupportRequest[]>(localWorkspaceKeys.support, []);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [tab, setTab] = useState<Tab>("Overview");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [goalForm, setGoalForm] = useState({ name: "", target: "", current: "", currency: "USD", targetDate: "" });
  const [profileForm, setProfileForm] = useState<Pick<LocalPerson, "name" | "email" | "phone"> | null>(null);
  const [supportMessage, setSupportMessage] = useState("");
  const uploadRef = useRef<HTMLInputElement>(null);
  const states = [peopleState, holdingsState, transactionsState, goalsState, tasksState, documentsState, supportState];
  const loading = states.some((state) => state.status === "loading");
  const error = states.find((state) => state.status === "error")?.error ??
    states.find((state) => state.error)?.error ?? "";

  const clients = useMemo(() => peopleState.value.filter((person) => person.role === "Client" && person.status !== "Inactive"), [peopleState.value]);
  const client = clients.find((person) => person.id === selectedClientId) ?? clients[0] ?? null;
  const holdings = useMemo(() => holdingsState.value.filter((holding) => holding.clientId === client?.id), [holdingsState.value, client?.id]);
  const transactions = useMemo(() => transactionsState.value
    .filter((transaction) => transaction.clientId === client?.id)
    .filter((transaction) => `${transaction.description} ${transaction.type}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date)), [transactionsState.value, client?.id, query]);
  const goals = useMemo(() => goalsState.value.filter((goal) => goal.clientId === client?.id), [goalsState.value, client?.id]);
  const tasks = useMemo(() => tasksState.value
    .filter((task) => task.clientId === client?.id)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate)), [tasksState.value, client?.id]);
  const documents = useMemo(() => documentsState.value.filter((document) => document.clientId === client?.id), [documentsState.value, client?.id]);
  const support = useMemo(() => supportState.value
    .filter((request) => request.clientId === client?.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [supportState.value, client?.id]);
  const totalsByCurrency = useMemo(() => holdings.reduce<Record<string, number>>((totals, holding) => {
    totals[holding.currency] = (totals[holding.currency] ?? 0) + holding.valueMinor;
    return totals;
  }, {}), [holdings]);
  const allocation = useMemo(() => {
    const currency = Object.keys(totalsByCurrency)[0];
    if (!currency) return [];
    const byClass = holdings.filter((holding) => holding.currency === currency).reduce<Record<string, number>>((totals, holding) => {
      totals[holding.assetClass] = (totals[holding.assetClass] ?? 0) + holding.valueMinor;
      return totals;
    }, {});
    const total = totalsByCurrency[currency];
    return Object.entries(byClass).map(([name, value]) => ({ name, value, percent: total > 0 ? Math.round((value / total) * 1000) / 10 : 0 })).sort((a, b) => b.value - a.value);
  }, [holdings, totalsByCurrency]);

  if (loading) return <p role="status" className="mx-auto max-w-3xl p-8 text-sm">Opening this browser&apos;s local workspace…</p>;
  if (error) return <p role="alert" className="mx-auto max-w-3xl p-8 text-sm text-red-700">Local workspace unavailable: {error}</p>;

  function updateClient(update: Partial<Pick<LocalPerson, "name" | "email" | "phone" | "status">>) {
    if (!client) return;
    peopleState.setValue((current) => current.map((person) => person.id === client.id ? { ...person, ...update } : person));
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client || !profileForm) return;
    const email = profileForm.email.trim().toLowerCase();
    if (peopleState.value.some((person) => person.id !== client.id && person.email.toLowerCase() === email)) {
      setMessage("Another local workspace record uses that email address.");
      return;
    }
    updateClient({
      name: profileForm.name.trim(),
      email,
      phone: profileForm.phone?.trim() || undefined,
    });
    setMessage("Profile saved on this device. No external service was contacted.");
  }

  function addGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client || !goalForm.name.trim() || !goalForm.targetDate) return;
    const target = Number(goalForm.target);
    const current = Number(goalForm.current);
    if (!Number.isFinite(target) || !Number.isFinite(current) || target <= 0 || current < 0 || target > 1_000_000_000_000 || current > 1_000_000_000_000) {
      setMessage("Enter a positive target and a non-negative current amount.");
      return;
    }
    goalsState.setValue((items) => [...items, {
      id: crypto.randomUUID(),
      clientId: client.id,
      name: goalForm.name.trim(),
      targetMinor: Math.round(target * 100),
      currentMinor: Math.round(current * 100),
      currency: goalForm.currency,
      targetDate: goalForm.targetDate,
      updatedAt: new Date().toISOString(),
    }]);
    setGoalForm({ name: "", target: "", current: "", currency: "USD", targetDate: "" });
    setMessage("Goal saved in this local workspace.");
  }

  function updateGoal(goalId: string, value: string) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000_000_000) return;
    const currentMinor = Math.round(amount * 100);
    goalsState.setValue((items) => items.map((goal) => goal.id === goalId
      ? { ...goal, currentMinor, updatedAt: new Date().toISOString() }
      : goal));
  }

  async function addDocument(file: File | undefined) {
    if (!file || !client) return;
    if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type) || file.size > 25 * 1024 * 1024) {
      setMessage("Choose a PDF, JPEG, or PNG file no larger than 25 MB.");
      return;
    }
    const document: LocalDocument = {
      id: crypto.randomUUID(),
      clientId: client.id,
      name: file.name,
      category: "Client upload",
      mimeType: file.type,
      size: file.size,
      fileId: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    try {
      await writeWorkspaceFile(document.fileId, file);
      documentsState.setValue((current) => [...current, document]);
      setMessage(`${file.name} saved locally. It has not been sent to an adviser or firm.`);
    } catch (cause) {
      setMessage(cause instanceof Error ? `Upload failed: ${cause.message}` : "Document could not be saved.");
    }
  }

  async function downloadDocument(document: LocalDocument) {
    try {
      const file = await readWorkspaceFile(document.fileId);
      if (!file) {
        setMessage("The document file is missing from this browser. Restore a workspace backup that includes it.");
        return;
      }
      const url = URL.createObjectURL(file);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = document.name;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setMessage(cause instanceof Error ? `Document could not be opened: ${cause.message}` : "Document could not be opened.");
    }
  }

  function submitSupport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client || !supportMessage.trim()) return;
    supportState.setValue((current) => [{
      id: crypto.randomUUID(),
      clientId: client.id,
      message: supportMessage.trim(),
      createdAt: new Date().toISOString(),
      status: "Open",
    }, ...current]);
    setSupportMessage("");
    setMessage("Support request saved on this device; it has not been sent to the firm.");
  }

  function completeOnboarding() {
    if (!client) return;
    updateClient({ status: "Active" });
    setMessage("Local onboarding status marked complete. This is not a verified identity or legally recorded consent.");
  }

  if (!client) {
    return (
      <main className="mx-auto w-full max-w-4xl px-5 py-12">
        <p className="text-xs font-bold tracking-[0.18em] text-[var(--accent)]">STANDALONE LOCAL WORKSPACE</p>
        <h1 className="mt-2 text-3xl font-semibold">Client portal</h1>
        <section className="glass mt-6 rounded-3xl p-6">
          <h2 className="text-xl font-semibold">No client record is available</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Create a client record in firm administration before using the local client workspace.</p>
          <Link href="/admin" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-[var(--accent-fill)] px-5 text-sm font-bold text-[var(--button-text)]">Open firm administration</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-10 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-[var(--accent)]">STANDALONE LOCAL WORKSPACE</p>
          <h1 className="mt-2 text-3xl font-semibold">Client workspace</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Local profile selection is not sign-in. These records are stored in this browser and are not protected from other users of this device.</p>
        </div>
        {clients.length > 1 && <label className="w-full text-sm sm:max-w-xs">Local client profile<select aria-label="Local client profile" value={client.id} onChange={(event) => setSelectedClientId(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3">{clients.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>}
      </header>

      <nav className="mt-7 flex gap-2 overflow-x-auto pb-2" aria-label="Client sections">
        {tabs.map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold ${tab === item ? "bg-[var(--accent-fill)] text-[var(--button-text)]" : "border border-[var(--border)] text-[var(--muted)]"}`}>{item}</button>)}
      </nav>

      {tab === "Overview" && (
        <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <section className="glass rounded-3xl p-5 sm:p-7">
            <p className="text-sm text-[var(--muted)]">Recorded holdings</p>
            {Object.entries(totalsByCurrency).length ? Object.entries(totalsByCurrency).map(([currency, total]) => <p key={currency} className="mt-2 text-3xl font-semibold">{money(total, currency)}</p>) : <p className="mt-3 text-lg text-[var(--muted)]">No portfolio valuation has been recorded.</p>}
            <p className="mt-3 text-xs leading-5 text-[var(--muted)]">Values are manually entered records and have not been independently verified. No performance is calculated because there is no valuation history.</p>
            <div className="mt-5 space-y-2">{tasks.filter((task) => task.status === "Open").slice(0, 5).map((task) => <p key={task.id} className="rounded-xl border border-[var(--border)] p-3 text-sm">Action due {task.dueDate}: {task.title}</p>)}</div>
          </section>
          <section className="glass rounded-3xl p-5 sm:p-7">
            <h2 className="text-lg font-semibold">Recorded allocation</h2>
            {allocation.length ? <div className="mt-4 space-y-3">{allocation.map((row) => <div key={row.name}><div className="flex justify-between gap-3 text-sm"><span>{row.name}</span><span>{row.percent}%</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--border)]"><div className="h-full bg-[var(--accent-fill)]" style={{ width: `${row.percent}%` }} /></div></div>)}</div> : <p className="mt-3 text-sm text-[var(--muted)]">Add holdings with asset classes to see an allocation. Different currencies are not combined.</p>}
          </section>
          {client.status === "Onboarding" && <section className="glass rounded-3xl p-5 sm:p-7 lg:col-span-2"><h2 className="text-lg font-semibold">Local onboarding</h2><p className="mt-2 text-sm text-[var(--muted)]">This profile is marked onboarding. Completing this local step only updates the browser record; it does not verify identity, capture legal consent, or notify a firm.</p><button type="button" onClick={completeOnboarding} className="mt-4 min-h-11 rounded-full bg-[var(--accent-fill)] px-5 text-sm font-bold text-[var(--button-text)]">Mark local onboarding complete</button></section>}
          <section className="glass rounded-3xl p-5 sm:p-7 lg:col-span-2"><h2 className="text-lg font-semibold">Adviser</h2><p className="mt-2 text-sm text-[var(--muted)]">{peopleState.value.find((person) => person.id === client.adviserId)?.name ?? "No adviser assigned"}{peopleState.value.find((person) => person.id === client.adviserId)?.email ? ` · ${peopleState.value.find((person) => person.id === client.adviserId)?.email}` : ""}</p></section>
        </div>
      )}

      {tab === "Holdings" && <section className="glass mt-6 rounded-3xl p-5 sm:p-7"><h2 className="text-xl font-semibold">Portfolio holdings</h2><div className="mt-4 divide-y divide-[var(--border)]">{holdings.map((holding) => <article key={holding.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-semibold">{holding.name}</p><p className="text-xs text-[var(--muted)]">{holding.assetClass} · valuation date {holding.valuedAt}</p></div><p className="font-semibold tabular-nums">{money(holding.valueMinor, holding.currency)}</p></article>)}{!holdings.length && <p className="py-6 text-sm text-[var(--muted)]">No holdings recorded for this client.</p>}</div></section>}

      {tab === "Transactions" && <section className="glass mt-6 rounded-3xl p-5 sm:p-7"><h2 className="text-xl font-semibold">Transaction records</h2><input aria-label="Search transactions" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search descriptions or types" className="mt-4 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm" /><div className="mt-4 divide-y divide-[var(--border)]">{transactions.map((transaction) => <article key={transaction.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-semibold">{transaction.description}</p><p className="text-xs text-[var(--muted)]">{transaction.date} · {transaction.type}</p></div><p className="font-semibold tabular-nums">{money(transaction.amountMinor, transaction.currency)}</p></article>)}{!transactions.length && <p className="py-6 text-sm text-[var(--muted)]">No matching transaction records.</p>}</div></section>}

      {tab === "Goals" && <section className="glass mt-6 rounded-3xl p-5 sm:p-7"><h2 className="text-xl font-semibold">Goals</h2><form onSubmit={addGoal} className="mt-5 grid gap-3 md:grid-cols-2"><label className="text-sm">Goal name<input required value={goalForm.name} onChange={(event) => setGoalForm({ ...goalForm, name: event.target.value })} maxLength={120} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3" /></label><label className="text-sm">Currency<select value={goalForm.currency} onChange={(event) => setGoalForm({ ...goalForm, currency: event.target.value })} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3">{["USD", "EUR", "GBP", "ZAR"].map((currency) => <option key={currency}>{currency}</option>)}</select></label><label className="text-sm">Target amount<input required type="number" min="0.01" step="0.01" value={goalForm.target} onChange={(event) => setGoalForm({ ...goalForm, target: event.target.value })} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3" /></label><label className="text-sm">Current amount<input required type="number" min="0" step="0.01" value={goalForm.current} onChange={(event) => setGoalForm({ ...goalForm, current: event.target.value })} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3" /></label><label className="text-sm">Target date<input required type="date" value={goalForm.targetDate} onChange={(event) => setGoalForm({ ...goalForm, targetDate: event.target.value })} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3" /></label><button className="mt-auto min-h-11 rounded-full bg-[var(--accent-fill)] px-5 text-sm font-bold text-[var(--button-text)]">Add goal</button></form><div className="mt-6 space-y-4">{goals.map((goal) => { const progress = goal.targetMinor > 0 ? Math.min(100, Math.round((goal.currentMinor / goal.targetMinor) * 100)) : 0; return <article key={goal.id} className="rounded-2xl border border-[var(--border)] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{goal.name}</h3><p className="mt-1 text-xs text-[var(--muted)]">Target {money(goal.targetMinor, goal.currency)} by {goal.targetDate}</p></div><p className="text-sm font-semibold">{progress}%</p></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--border)]"><div className="h-full bg-[var(--accent-fill)]" style={{ width: `${progress}%` }} /></div><label className="mt-3 block text-xs text-[var(--muted)]">Current amount<input aria-label={`Current amount for ${goal.name}`} type="number" min="0" step="0.01" value={goal.currentMinor / 100} onChange={(event) => updateGoal(goal.id, event.target.value)} className="mt-1 min-h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]" /></label></article>; })}{!goals.length && <p className="text-sm text-[var(--muted)]">No goals have been recorded.</p>}</div></section>}

      {tab === "Planning" && <section className="glass mt-6 rounded-3xl p-5 sm:p-7"><h2 className="text-xl font-semibold">Planning tools</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">Explore clearly labelled, assumption-based planning illustrations. Calculations are not personalized financial advice and should not be treated as guaranteed outcomes.</p><Link href="/planning" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-[var(--accent-fill)] px-5 text-sm font-bold text-[var(--button-text)]">Open planning lab</Link></section>}

      {tab === "Documents" && <section className="glass mt-6 rounded-3xl p-5 sm:p-7"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">Client documents</h2><p className="mt-1 text-xs text-[var(--muted)]">Files are stored locally on this device, not sent to an adviser.</p></div><button type="button" onClick={() => uploadRef.current?.click()} className="min-h-11 rounded-full border border-[var(--border)] px-4 text-sm font-semibold">Upload a document</button><input ref={uploadRef} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="hidden" onChange={(event) => { void addDocument(event.target.files?.[0]); event.target.value = ""; }} /></div><div className="mt-4 divide-y divide-[var(--border)]">{documents.map((document) => <article key={document.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-semibold">{document.name}</p><p className="text-xs text-[var(--muted)]">{document.category} · {(document.size / 1024).toFixed(1)} KB · {new Date(document.createdAt).toLocaleDateString()}</p></div><button type="button" onClick={() => void downloadDocument(document)} className="min-h-10 rounded-full border border-[var(--border)] px-4 text-sm">Download</button></article>)}{!documents.length && <p className="py-6 text-sm text-[var(--muted)]">No documents are available for this local client profile.</p>}</div></section>}

      {tab === "Profile" && <section className="glass mt-6 rounded-3xl p-5 sm:p-7"><h2 className="text-xl font-semibold">Profile</h2><form onSubmit={saveProfile} className="mt-5 grid gap-4 md:grid-cols-2"><label className="text-sm">Display name<input required value={profileForm?.name ?? client.name} onChange={(event) => setProfileForm((current) => ({ email: current?.email ?? client.email, phone: current?.phone ?? client.phone, ...current, name: event.target.value }))} maxLength={120} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3" /></label><label className="text-sm">Email<input required type="email" value={profileForm?.email ?? client.email} onChange={(event) => setProfileForm((current) => ({ name: current?.name ?? client.name, email: event.target.value, phone: current?.phone ?? client.phone }))} maxLength={254} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3" /></label><label className="text-sm">Phone<input type="tel" value={profileForm?.phone ?? client.phone ?? ""} onChange={(event) => setProfileForm((current) => ({ name: current?.name ?? client.name, email: current?.email ?? client.email, phone: event.target.value }))} maxLength={40} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3" /></label><button className="mt-auto min-h-11 rounded-full bg-[var(--accent-fill)] px-5 text-sm font-bold text-[var(--button-text)]">Save profile</button></form></section>}

      {tab === "Support" && <section className="glass mt-6 rounded-3xl p-5 sm:p-7"><h2 className="text-xl font-semibold">Support requests</h2><p className="mt-2 text-sm text-[var(--muted)]">Requests are saved locally and are not delivered to the firm in standalone mode.</p><form className="mt-5" onSubmit={submitSupport}><textarea required value={supportMessage} onChange={(event) => setSupportMessage(event.target.value)} maxLength={5000} rows={4} className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3" placeholder="Describe the request" /><button className="mt-3 min-h-11 rounded-full bg-[var(--accent-fill)] px-5 text-sm font-bold text-[var(--button-text)]">Save local request</button></form><ul className="mt-5 space-y-2">{support.map((request) => <li key={request.id} className="rounded-xl border border-[var(--border)] p-3 text-sm"><span className="font-semibold">{request.status} · {new Date(request.createdAt).toLocaleString()}</span><p className="mt-1 whitespace-pre-wrap">{request.message}</p></li>)}</ul>{!support.length && <p className="mt-4 text-sm text-[var(--muted)]">No local support requests.</p>}</section>}

      {error && <p role="alert" className="mt-5 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">Some local changes could not be saved: {error}</p>}
      {message && <p role="status" className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--accent)]">{message}</p>}
    </main>
  );
}
