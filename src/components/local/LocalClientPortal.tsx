"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { demoAllocation, demoDocuments, demoTransactions } from "@/data/demo";
import { useLocalState } from "@/lib/local-store";

const tabs = ["Overview", "Holdings", "Transactions", "Goals", "Planning", "Documents", "Profile", "Support"] as const;
type Tab = (typeof tabs)[number];
const colors = ["#805c0a", "#64748b", "#17786c", "#5865a8", "#94a3b8"];
const history = [
  { month: "May", value: 2180 }, { month: "Jun", value: 2240 }, { month: "Jul", value: 2295 },
  { month: "Aug", value: 2350 }, { month: "Sep", value: 2410 }, { month: "Oct", value: 2485 },
];

export function LocalClientPortal() {
  const [tab, setTab] = useState<Tab>("Overview");
  const [features] = useLocalState<Record<string, boolean>>("wealth-os.admin.features", {
    planning: true, documents: true, adviserCrm: true, compliance: true, research: true,
  });
  const [query, setQuery] = useState("");
  const [transactions, setTransactions] = useLocalState("example-wealth.transactions", demoTransactions);
  const [documents, setDocuments] = useLocalState("example-wealth.documents", demoDocuments);
  const [goal, setGoal] = useLocalState("example-wealth.goal", { name: "Retirement", target: 5000000, saved: 2485320, date: "2045-06-30" });
  const [support, setSupport] = useLocalState<string[]>("example-wealth.support", []);
  const [message, setMessage] = useState("");

  const visibleTransactions = useMemo(() => transactions.filter((row) =>
    `${row.description} ${row.type} ${row.status}`.toLowerCase().includes(query.toLowerCase())
  ), [query, transactions]);

  function addContribution() {
    setTransactions((current) => [
      { id: `txn-${Date.now()}`, date: new Date().toISOString().slice(0, 10), description: "Local sample contribution", type: "Contribution", amount: 5000, status: "Completed" },
      ...current,
    ]);
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-10 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.18em] text-[var(--accent)]">ILLUSTRATIVE DEMONSTRATION</p>
          <h1 className="mt-2 text-3xl font-semibold">Welcome, Alex</h1>
        </div>
        <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--muted)]">Local browser data</span>
      </header>

      <nav className="mt-7 flex gap-2 overflow-x-auto pb-2" aria-label="Client sections">
        {tabs.filter((item) => (item !== "Planning" || features.planning) && (item !== "Documents" || features.documents)).map((item) => (
          <button key={item} type="button" onClick={() => setTab(item)} className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold ${tab === item ? "bg-[var(--accent-fill)] text-[var(--button-text)]" : "border border-[var(--border)] text-[var(--muted)]"}`}>
            {item}
          </button>
        ))}
      </nav>

      {tab === "Overview" && (
        <div className="mt-6 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
          <section className="glass rounded-3xl p-5 sm:p-7">
            <p className="text-sm text-[var(--muted)]">Illustrative portfolio value</p>
            <p className="mt-2 text-4xl font-semibold">R 2.485m</p>
            <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">+19.9% illustrative total return</p>
            <div className="mt-6 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => `R ${(Number(value) / 10).toFixed(1)}k`} />
                  <Area type="monotone" dataKey="value" stroke="#805c0a" fill="#d4af37" fillOpacity={0.22} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
          <section className="glass rounded-3xl p-5 sm:p-7">
            <h2 className="text-lg font-semibold">Asset allocation</h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={demoAllocation} dataKey="value" nameKey="name" innerRadius={55} outerRadius={82}>
                  {demoAllocation.map((_, index) => <Cell key={index} fill={colors[index]} />)}
                </Pie><Tooltip /></PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="grid grid-cols-2 gap-2 text-xs">
              {demoAllocation.map((row, index) => <li key={row.name}><span style={{ color: colors[index] }}>●</span> {row.name}: {row.value}%</li>)}
            </ul>
          </section>
        </div>
      )}

      {tab === "Holdings" && (
        <section className="glass mt-6 rounded-3xl p-5 sm:p-7">
          <h2 className="text-xl font-semibold">Investment holdings</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[["Balanced strategy", "R 1.79m", "72%"], ["Cautious strategy", "R 696k", "28%"], ["Cash", "R 174k", "7%"]].map(([name, value, allocation]) =>
              <article key={name} className="rounded-2xl border border-[var(--border)] p-4"><p className="text-sm text-[var(--muted)]">{name}</p><p className="mt-2 text-xl font-semibold">{value}</p><p className="mt-1 text-xs text-[var(--accent)]">{allocation} illustrative allocation</p></article>
            )}
          </div>
          <p className="mt-5 text-xs text-[var(--muted)]">All holdings are fictional demonstration records, not real investments.</p>
        </section>
      )}

      {tab === "Transactions" && (
        <section className="glass mt-6 rounded-3xl p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">Transactions</h2><button type="button" onClick={addContribution} className="min-h-11 rounded-full bg-[var(--accent-fill)] px-4 text-sm font-bold text-[var(--button-text)]">Add sample contribution</button></div>
          <input aria-label="Search transactions" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search transactions" className="mt-5 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm" />
          <div className="mt-4 divide-y divide-[var(--border)]">
            {visibleTransactions.length ? visibleTransactions.map((row) => <div key={row.id} className="flex items-center justify-between gap-3 py-4"><div><p className="font-semibold">{row.description}</p><p className="mt-1 text-xs text-[var(--muted)]">{row.date} · {row.type}</p></div><p className="font-semibold tabular-nums">R {row.amount.toLocaleString("en-ZA")}</p></div>) : <p className="py-8 text-sm text-[var(--muted)]">No matching transactions.</p>}
          </div>
        </section>
      )}

      {tab === "Goals" && (
        <section className="glass mt-6 rounded-3xl p-5 sm:p-7">
          <h2 className="text-xl font-semibold">Investment goal</h2>
          <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); setMessage("Investment goal saved locally."); }}>
            <label className="text-sm">Goal name<input value={goal.name} onChange={(event) => setGoal({ ...goal, name: event.target.value })} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3" /></label>
            <label className="text-sm">Target amount<input type="number" value={goal.target} onChange={(event) => setGoal({ ...goal, target: Number(event.target.value) })} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3" /></label>
            <label className="text-sm">Current saved<input type="number" value={goal.saved} onChange={(event) => setGoal({ ...goal, saved: Number(event.target.value) })} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3" /></label>
            <label className="text-sm">Target date<input type="date" value={goal.date} onChange={(event) => setGoal({ ...goal, date: event.target.value })} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3" /></label>
            <button className="min-h-11 rounded-full bg-[var(--accent-fill)] px-5 text-sm font-bold text-[var(--button-text)] md:col-span-2">Save goal</button>
          </form>
        </section>
      )}

      {tab === "Planning" && features.planning && (
        <section className="glass mt-6 rounded-3xl p-5 sm:p-7">
          <h2 className="text-xl font-semibold">Wealth planning illustrations</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">Explore transparent compound-growth assumptions, save sample scenarios locally and compare purchasing power after inflation.</p>
          <Link href="/planning" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-[var(--accent-fill)] px-5 text-sm font-bold text-[var(--button-text)]">Open planning lab</Link>
        </section>
      )}

      {tab === "Documents" && features.documents && (
        <section className="glass mt-6 rounded-3xl p-5 sm:p-7">
          <h2 className="text-xl font-semibold">Document vault</h2>
          <div className="mt-5 divide-y divide-[var(--border)]">{documents.map((doc) => <div key={doc.id} className="flex items-center justify-between gap-3 py-4"><div><p className="font-semibold">{doc.name}</p><p className="text-xs text-[var(--muted)]">{doc.category} · v{doc.version} · {doc.date}</p></div><button type="button" onClick={() => setMessage(`Preview is available for ${doc.name} in this local demo.`)} className="min-h-11 rounded-full border border-[var(--border)] px-4 text-sm">Preview</button></div>)}</div>
          <button type="button" onClick={() => setDocuments((current) => [...current, { id: `doc-${Date.now()}`, name: "Local uploaded sample", category: "Uploaded", version: "1", date: new Date().toISOString().slice(0, 10), size: "Local file" }])} className="mt-4 min-h-11 rounded-full border border-[var(--border)] px-5 text-sm font-semibold">Add local sample document</button>
        </section>
      )}

      {tab === "Profile" && (
        <section className="glass mt-6 rounded-3xl p-5 sm:p-7"><h2 className="text-xl font-semibold">Profile settings</h2><div className="mt-5 grid gap-4 md:grid-cols-2"><label className="text-sm">Display name<input defaultValue="Alex Morgan" className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3" /></label><label className="text-sm">Email<input type="email" defaultValue="alex.morgan@example.test" className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3" /></label></div><button type="button" onClick={() => setMessage("Profile settings saved locally.")} className="mt-5 min-h-11 rounded-full bg-[var(--accent-fill)] px-5 text-sm font-bold text-[var(--button-text)]">Save profile</button></section>
      )}

      {tab === "Support" && (
        <section className="glass mt-6 rounded-3xl p-5 sm:p-7"><h2 className="text-xl font-semibold">Support requests</h2><form className="mt-5" onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const value = String(data.get("request") ?? "").trim(); if (value) { setSupport((current) => [value, ...current]); form.reset(); setMessage("Support request recorded locally."); } }}><textarea name="request" required rows={4} className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3" placeholder="How can we help?" /><button className="mt-3 min-h-11 rounded-full bg-[var(--accent-fill)] px-5 text-sm font-bold text-[var(--button-text)]">Submit local request</button></form><ul className="mt-5 space-y-2">{support.map((item, index) => <li key={index} className="rounded-xl border border-[var(--border)] p-3 text-sm">{item}</li>)}</ul></section>
      )}

      {message && <p role="status" className="mt-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--accent)]">{message}</p>}
    </main>
  );
}
