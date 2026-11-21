"use client";

import { useMemo, useState } from "react";
import { useLocalState } from "@/lib/local-store";
import { downloadPdfReport } from "@/lib/pdf-report";

type Scenario = { id: string; name: string; present: number; monthly: number; years: number; rate: number; result: number };

export function WealthPlanningLab() {
  const [present, setPresent] = useState(100000);
  const [monthly, setMonthly] = useState(2500);
  const [years, setYears] = useState(10);
  const [rate, setRate] = useState(7);
  const [inflation, setInflation] = useState(5);
  const [name, setName] = useState("Base scenario");
  const [scenarios, setScenarios] = useLocalState<Scenario[]>("example-wealth.planning.scenarios", []);

  const nominal = useMemo(() => {
    const r = rate / 100 / 12;
    const months = years * 12;
    return present * Math.pow(1 + r, months) + (r === 0 ? monthly * months : monthly * ((Math.pow(1 + r, months) - 1) / r));
  }, [monthly, present, rate, years]);

  const real = nominal / Math.pow(1 + inflation / 100, years);

  function saveScenario() {
    const scenario = { id: `scenario-${Date.now()}`, name, present, monthly, years, rate, result: nominal };
    setScenarios((current) => [
      ...current,
      scenario,
    ]);
    if (process.env.NEXT_PUBLIC_STUDIO_STORAGE_MODE === "supabase") {
      void fetch("/api/wealth-os/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          assumptions: { present, monthly, years, nominalRate: rate, inflation },
          result: { nominal, realInflationAdjusted: real },
        }),
      }).catch(() => undefined);
    }
  }

  function exportScenarios() {
    const blob = new Blob([JSON.stringify({ illustrative: true, assumptions: { present, monthly, years, nominalRate: rate, inflation }, scenarios }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "wealth-planning-illustration.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function exportPdf() {
    await downloadPdfReport(
      "wealth-planning-illustration.pdf",
      "WEALTH OS",
      "Illustrative wealth planning scenario",
      [
        { title: "Assumptions", lines: [
          `Starting amount: R ${present.toLocaleString("en-ZA")}`,
          `Monthly contribution: R ${monthly.toLocaleString("en-ZA")}`,
          `Time horizon: ${years} years`,
          `Nominal annual return: ${rate}%`,
          `Inflation assumption: ${inflation}%`,
        ] },
        { title: "Illustrative result", lines: [
          `Nominal result: R ${nominal.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`,
          `Inflation-adjusted value: R ${real.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`,
        ] },
        { title: "Formula", lines: ["Future value uses monthly compounding. Taxes, fees, timing and market volatility are not included."] },
      ],
      "This is an illustrative local demonstration, not regulated financial advice or a guarantee of investment outcomes.",
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-12 lg:px-8">
      <p className="text-xs font-bold tracking-[0.18em] text-[var(--accent)]">WEALTH PLANNING LAB</p>
      <h1 className="mt-2 text-3xl font-semibold">Illustrative growth scenarios</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">Fictional calculations only. Results are not forecasts, guarantees or personalised advice.</p>

      <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_1.25fr]">
        <section className="glass rounded-3xl p-5 sm:p-7">
          <h2 className="text-lg font-semibold">Assumptions</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm">Starting amount (R)<input type="number" value={present} onChange={(event) => setPresent(Number(event.target.value))} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3" /></label>
            <label className="text-sm">Monthly contribution (R)<input type="number" value={monthly} onChange={(event) => setMonthly(Number(event.target.value))} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3" /></label>
            <label className="text-sm">Time horizon (years)<input type="number" min={1} value={years} onChange={(event) => setYears(Number(event.target.value))} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3" /></label>
            <label className="text-sm">Nominal annual return (%)<input type="number" value={rate} onChange={(event) => setRate(Number(event.target.value))} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3" /></label>
            <label className="text-sm sm:col-span-2">Inflation assumption (%)<input type="number" value={inflation} onChange={(event) => setInflation(Number(event.target.value))} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3" /></label>
          </div>
          <details className="mt-5 rounded-xl border border-[var(--border)] p-4 text-xs leading-6 text-[var(--muted)]"><summary className="cursor-pointer font-semibold text-[var(--foreground)]">Formula and limitations</summary><p className="mt-3">Future value = P(1+r/m)<sup>mt</sup> + C × ((1+r/m)<sup>mt</sup>-1)/(r/m), with monthly compounding. Inflation-adjusted value = nominal result ÷ (1+i)<sup>t</sup>. Taxes, fees, timing and market volatility are not included.</p></details>
        </section>

        <section className="glass rounded-3xl p-5 sm:p-7">
          <p className="text-sm text-[var(--muted)]">Illustrative nominal result</p>
          <p className="mt-2 text-4xl font-semibold">R {nominal.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}</p>
          <p className="mt-4 text-sm text-[var(--muted)]">Estimated purchasing power after inflation</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--accent)]">R {real.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}</p>
          <div className="mt-6 h-3 overflow-hidden rounded-full bg-[var(--border)]"><div className="h-full rounded-full bg-[var(--accent-fill)]" style={{ width: `${Math.min(100, Math.max(8, nominal / 100000))}%` }} /></div>
          <label className="mt-6 block text-sm">Scenario name<input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3" /></label>
          <div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={saveScenario} className="min-h-11 rounded-full bg-[var(--accent-fill)] px-5 text-sm font-bold text-[var(--button-text)]">Save local scenario</button><button type="button" onClick={exportScenarios} className="min-h-11 rounded-full border border-[var(--border)] px-5 text-sm font-semibold">Export JSON</button><button type="button" onClick={() => void exportPdf()} className="min-h-11 rounded-full border border-[var(--border)] px-5 text-sm font-semibold">Export branded PDF</button></div>
        </section>
      </div>

      <section className="glass mt-5 rounded-3xl p-5 sm:p-7">
        <h2 className="text-lg font-semibold">Saved comparisons</h2>
        {scenarios.length ? <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs text-[var(--muted)]"><tr><th className="py-3">Scenario</th><th>Rate</th><th>Years</th><th>Monthly</th><th>Illustrative result</th></tr></thead><tbody>{scenarios.map((scenario) => <tr key={scenario.id} className="border-t border-[var(--border)]"><td className="py-3 pr-4 font-semibold">{scenario.name}</td><td>{scenario.rate}%</td><td>{scenario.years}</td><td>R {scenario.monthly.toLocaleString("en-ZA")}</td><td>R {scenario.result.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}</td></tr>)}</tbody></table></div> : <p className="mt-3 text-sm text-[var(--muted)]">No saved scenarios yet.</p>}
      </section>
    </main>
  );
}
