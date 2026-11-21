"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, FileText, StickyNote } from "lucide-react";
import { RenewalPackManager } from "@/components/adviser/RenewalPackManager";

type ProfileData = {
  client: { id: string; email: string; name: string; isActive: boolean; createdAt: string; lastSignInAt: string | null };
  portfolios: Array<{ id: string; label: string; valuation_zar: number | null; valuation_as_of: string | null }>;
  transactions: Array<{ id: string; description: string; amount: number; status: string; transacted_at: string }>;
  documents: Array<{ id: string; title: string; document_type: string; issued_at: string | null; created_at: string }>;
  requests: Array<{ id: string; request_type: string; status: string; details: string; created_at: string }>;
  notes: Array<{ id: string; note: string; author_user_id: string; created_at: string }>;
  tasks: Array<{ id: string; title: string; details: string | null; status: string; follow_up_on: string | null; complaints_flag: boolean }>;
};

export function AdviserClientProfile({ clientId }: { clientId: string }) {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("overview");
  const [note, setNote] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [reviewAt, setReviewAt] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/advisor/clients/${clientId}`, { cache: "no-store" });
      if (!response.ok) throw new Error("The authorised client profile could not be loaded.");
      setData(await response.json());
    } catch (loadError) {
      console.error("Adviser client profile could not be loaded.", loadError);
      setError("The authorised client profile could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!note.trim()) return;
    try {
      const response = await fetch(`/api/advisor/clients/${clientId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "note", note }),
      });
      if (!response.ok) throw new Error("The private note could not be saved.");
      setNote("");
      setActionMessage("Private adviser note saved.");
      await load();
    } catch (saveError) {
      console.error("Adviser note could not be saved.", saveError);
      setActionMessage("The private note could not be saved.");
    }
  }

  async function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!taskTitle.trim()) return;
    try {
      const response = await fetch(`/api/advisor/clients/${clientId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "task", title: taskTitle }),
      });
      if (!response.ok) throw new Error("The follow-up task could not be saved.");
      setTaskTitle("");
      setActionMessage("Follow-up task created.");
      await load();
    } catch (saveError) {
      console.error("Adviser task could not be saved.", saveError);
      setActionMessage("The follow-up task could not be saved.");
    }
  }

  async function scheduleReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reviewAt) return;
    try {
      const response = await fetch(`/api/advisor/clients/${clientId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: reviewAt }),
      });
      if (!response.ok) throw new Error("The review could not be scheduled.");
      setReviewAt("");
      setActionMessage("Client review scheduled.");
    } catch (scheduleError) {
      console.error("Adviser review could not be scheduled.", scheduleError);
      setActionMessage("The client review could not be scheduled.");
    }
  }

  if (loading) return <main className="mx-auto max-w-7xl px-5 py-10"><p role="status">Loading authorised client profile…</p></main>;
  if (error) return <main className="mx-auto max-w-7xl px-5 py-10"><p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">{error}</p></main>;
  if (!data) return null;

  const reportedValues = data.portfolios
    .map((portfolio) => portfolio.valuation_zar)
    .filter((value): value is number => value !== null);
  const totalValue = reportedValues.reduce((total, value) => total + value, 0);
  const tabs = ["overview", "investments", "documents", "requests", "notes", "tasks", "timeline", "renewal packs"];

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-10 lg:px-8">
      <Link href="/advisor/clients" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[var(--accent)]">
        <ArrowLeft size={16} /> Back to My Clients
      </Link>
      <header className="placeholder-glass-card mt-5 rounded-3xl p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex size-14 items-center justify-center rounded-full bg-[var(--accent-fill)] text-lg font-bold text-[var(--button-text)]">
              {data.client.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
            </span>
            <div>
              <p className="text-xs font-bold tracking-[0.16em] text-[var(--accent)]">CLIENT PROFILE</p>
              <h1 className="mt-1 text-3xl font-semibold">{data.client.name || data.client.email}</h1>
              <p className="mt-1 text-sm text-[var(--muted)]">{data.client.email}</p>
            </div>
          </div>
          <span className="rounded-full border border-[var(--border)] px-3 py-2 text-xs font-semibold">
            {data.client.isActive ? "Active" : "Inactive"}
          </span>
        </div>
        <Link href={`/advisor/clients/${clientId}/pack`} className="mt-5 inline-flex min-h-10 items-center rounded-full bg-[var(--accent-fill)] px-4 text-xs font-bold text-[var(--button-text)]">
          Generate adviser pack
        </Link>
      </header>

      <nav className="mt-5 flex max-w-full gap-2 overflow-x-auto pb-2" aria-label="Client profile sections">
        {tabs.map((item) => (
          <button
            type="button"
            key={item}
            onClick={() => setTab(item)}
            aria-pressed={tab === item}
            className={`min-h-10 shrink-0 rounded-full px-4 text-xs font-semibold ${tab === item ? "bg-[var(--accent-fill)] text-[var(--button-text)]" : "border border-[var(--border)]"}`}
          >
            {item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </nav>

      {actionMessage ? <p role="status" className="mt-4 rounded-xl border border-[var(--border)] p-3 text-sm">{actionMessage}</p> : null}

      <form onSubmit={scheduleReview} className="placeholder-glass-card mt-5 flex flex-col gap-3 rounded-2xl p-5 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1 text-sm font-semibold">
          Schedule portfolio review
          <input
            type="datetime-local"
            required
            min={new Date().toISOString().slice(0, 16)}
            value={reviewAt}
            onChange={(event) => setReviewAt(event.target.value)}
            className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3"
          />
        </label>
        <button type="submit" className="min-h-11 rounded-full bg-[var(--accent-fill)] px-5 text-sm font-bold text-[var(--button-text)]">
          Schedule review
        </button>
      </form>

      {tab === "overview" ? (
        <section className="mt-5 grid gap-4 md:grid-cols-3">
          <article className="placeholder-glass-card rounded-2xl p-5"><p className="text-xs text-[var(--muted)]">Reported portfolio value</p><p className="mt-2 text-2xl font-semibold">{reportedValues.length ? new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(totalValue) : "Not reported"}</p></article>
          <article className="placeholder-glass-card rounded-2xl p-5"><p className="text-xs text-[var(--muted)]">Investment accounts</p><p className="mt-2 text-2xl font-semibold">{data.portfolios.length}</p></article>
          <article className="placeholder-glass-card rounded-2xl p-5"><p className="text-xs text-[var(--muted)]">Outstanding requests</p><p className="mt-2 text-2xl font-semibold">{data.requests.filter((item) => item.status !== "Completed").length}</p></article>
        </section>
      ) : null}

      {tab === "investments" ? (
        <section className="placeholder-glass-card mt-5 rounded-2xl p-5">
          {data.portfolios.length ? <ul className="divide-y divide-[var(--border)]">{data.portfolios.map((portfolio) => <li key={portfolio.id} className="py-4"><p className="font-semibold">{portfolio.label}</p><p className="mt-1 text-sm text-[var(--muted)]">{portfolio.valuation_zar === null ? "Value not reported" : new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(portfolio.valuation_zar)}</p></li>)}</ul> : <p className="text-sm text-[var(--muted)]">No investment accounts are currently linked.</p>}
        </section>
      ) : null}

      {tab === "documents" ? (
        <section className="placeholder-glass-card mt-5 rounded-2xl p-5">
          {data.documents.length ? <ul className="divide-y divide-[var(--border)]">{data.documents.map((document) => <li key={document.id} className="flex items-center gap-3 py-4"><FileText size={18} /><div><p className="font-semibold">{document.title}</p><p className="text-xs text-[var(--muted)]">{document.document_type}</p></div></li>)}</ul> : <p className="text-sm text-[var(--muted)]">No client documents are currently available.</p>}
        </section>
      ) : null}

      {tab === "requests" ? (
        <section className="placeholder-glass-card mt-5 rounded-2xl p-5">
          {data.requests.length ? <ul className="divide-y divide-[var(--border)]">{data.requests.map((request) => <li key={request.id} className="py-4"><p className="font-semibold">{request.request_type}</p><p className="mt-1 text-sm text-[var(--muted)]">{request.status} · {new Date(request.created_at).toLocaleDateString("en-ZA")}</p></li>)}</ul> : <p className="text-sm text-[var(--muted)]">No outstanding or previous requests are available.</p>}
        </section>
      ) : null}

      {tab === "notes" ? (
        <section className="placeholder-glass-card mt-5 rounded-2xl p-5">
          <form onSubmit={saveNote} className="flex flex-col gap-3 sm:flex-row">
            <label className="min-w-0 flex-1 text-sm">Private internal note<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={5000} className="mt-2 min-h-24 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] p-3" /></label>
            <button type="submit" className="min-h-11 self-end rounded-full bg-[var(--accent-fill)] px-5 text-sm font-bold text-[var(--button-text)]">Save note</button>
          </form>
          <ul className="mt-5 divide-y divide-[var(--border)]">{data.notes.map((item) => <li key={item.id} className="py-4"><StickyNote size={16} className="inline" /> <span>{item.note}</span><p className="mt-1 text-xs text-[var(--muted)]">{new Date(item.created_at).toLocaleString("en-ZA")}</p></li>)}</ul>
        </section>
      ) : null}

      {tab === "tasks" ? (
        <section className="placeholder-glass-card mt-5 rounded-2xl p-5">
          <form onSubmit={saveTask} className="flex gap-3">
            <label className="min-w-0 flex-1 text-sm">Follow-up task<input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} maxLength={160} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3" /></label>
            <button type="submit" className="min-h-11 self-end rounded-full bg-[var(--accent-fill)] px-5 text-sm font-bold text-[var(--button-text)]">Create</button>
          </form>
          {data.tasks.length ? <ul className="mt-5 divide-y divide-[var(--border)]">{data.tasks.map((task) => <li key={task.id} className="py-4"><p className="font-semibold">{task.title}</p><p className="text-xs text-[var(--muted)]">{task.status}</p></li>)}</ul> : <p className="mt-5 text-sm text-[var(--muted)]">No tasks are currently linked to this client.</p>}
        </section>
      ) : null}

      {tab === "timeline" ? (
        <section className="placeholder-glass-card mt-5 rounded-2xl p-5">
          <ol className="space-y-4">
            {data.transactions.slice(0, 20).map((transaction) => <li key={transaction.id} className="border-l-2 border-[var(--accent)] pl-4"><p className="font-semibold">{transaction.description}</p><p className="text-xs text-[var(--muted)]">{transaction.status} · {new Date(transaction.transacted_at).toLocaleString("en-ZA")}</p></li>)}
            {!data.transactions.length ? <li className="text-sm text-[var(--muted)]">No authorised activity is available yet.</li> : null}
          </ol>
        </section>
      ) : null}
      {tab === "renewal packs" ? <RenewalPackManager clientId={clientId} /> : null}
    </main>
  );
}
